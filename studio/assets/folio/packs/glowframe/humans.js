/* GLOWFRAME — humans: flat vector people for the DAY scenes (an expert, a patient, a crowd of passers-by). Big simple head,
 * glasses, one clothing colour, warm skin. Never realistic. The same definition draws the same person in every shot.
 *
 *  S.human(L, def, {x, y, h=700, face:1|-1, pose="stand"}) → P      (x, y) is where the feet stand; h the full height
 *    def: {skin:"#D6A27A", hair:{style:"bob"|"short"|"bun"|"beanie"|"bald", color}, glasses:true|"#C4247E", mask:false,
 *          outfit:{kind:"coat"|"shirt"|"dress", main:"#F4F8FF", accent:"#5B8CFF", pants:"#2B3A67"}, cheeks:true}
 *    P.pose(name, t, dur=.5)     "stand"|"wave"|"think"|"point"|"hold"|"shrug"|"cheer"|"type"   (the hands go there; elbows follow)
 *    P.expr(name, t, dur=.3)     "neutral"|"smile"|"worried"|"surprised"|"sad"
 *    P.talk(t0, t1)              the mouth moves        P.look(dx, dy, t, dur=.3)   the eyes   P.move(x, y, t0, t1)   walk there
 *    P.hand("l"|"r") → [x, y] the hand's position in the world right now is P.handAt(t, "r")
 *  F.PEOPLE: ready-made defs: F.PEOPLE.expert, .patient, .kid, .elder, .worker — vary skin/hair/colour, keep the grammar.
 */
(function () {
  "use strict";
  const F = window.FOLIO;
  const W = F.W, H = F.H;
  const SK = F.NEON ? F.NEON.skin : ["#F2C8A6", "#D6A27A", "#A9714B", "#7A4A2E"];
  F.PEOPLE = {
    expert: { skin: SK[1], hair: { style: "beanie", color: "#7A3BE0" }, glasses: "#C4247E", outfit: { kind: "coat", main: "#F4F8FF", accent: "#5B8CFF", pants: "#2B3A67" } },
    patient: { skin: SK[1], hair: { style: "short", color: "#3A2A24" }, glasses: "#C4247E", outfit: { kind: "shirt", main: "#B7A6F0", accent: "#7A3BE0", pants: "#5A6BA8" } },
    kid: { skin: SK[2], hair: { style: "bun", color: "#241418" }, glasses: false, outfit: { kind: "shirt", main: "#FFB02E", accent: "#C4247E", pants: "#2B3A67" } },
    elder: { skin: SK[0], hair: { style: "bald", color: "#CFCFE0" }, glasses: "#2B3A67", outfit: { kind: "shirt", main: "#7FD3B0", accent: "#2B3A67", pants: "#5A5A78" } },
    worker: { skin: SK[3], hair: { style: "short", color: "#14101A" }, glasses: false, outfit: { kind: "shirt", main: "#3F9DE4", accent: "#F5C518", pants: "#2B3A67" } },
  };
  // hand targets (x, y of each hand relative to the feet at scale 1; y negative = up) per pose: [lx, ly, rx, ry]
  const POSES = {
    stand: [-205, -410, 205, -410], wave: [-205, -410, 330, -1010], think: [-205, -410, 70, -720], point: [-205, -410, 560, -700],
    hold: [-60, -520, 60, -520], shrug: [-330, -640, 330, -640], cheer: [-290, -1040, 290, -1040], type: [-120, -560, 120, -560],
  };
  const EXPR = { neutral: [0, 0, 0, 1], smile: [0.85, 0.1, 0, 1], worried: [-0.5, 0, -1, 1.05], surprised: [0, 0.8, 0.4, 1.25], sad: [-0.8, 0, -0.8, 0.95] };   // mouth curve, open, brow tilt, eye size
  const A = 190, B = 175, SHO = 150, SY = -690;

  const ik = (sx, sy, tx, ty, side) => {
    const dx = tx - sx, dy = ty - sy;
    const d = Math.min(A + B - 2, Math.max(60, Math.hypot(dx, dy))), phi = Math.atan2(dy, dx);
    const al = Math.acos(Math.max(-1, Math.min(1, (A * A + d * d - B * B) / (2 * A * d))));
    const e1 = [sx + Math.cos(phi + al) * A, sy + Math.sin(phi + al) * A], e2 = [sx + Math.cos(phi - al) * A, sy + Math.sin(phi - al) * A];
    const el = side > 0 ? (e1[0] > e2[0] ? e1 : e2) : (e1[0] < e2[0] ? e1 : e2);   // the elbow points away from the body
    const hx = sx + Math.cos(phi) * d, hy = sy + Math.sin(phi) * d;
    return { el, hand: [hx, hy] };
  };

  F.plugins.push((S) => {
    S.human = (L, def = {}, o = {}) => {
      const d = Object.assign({}, F.PEOPLE.expert, def), out = Object.assign({}, F.PEOPLE.expert.outfit, d.outfit || {});
      const skin = d.skin, skinD = F.shade(skin, -0.14), s0 = (o.h ?? 700) / 1000, face = o.face === -1 ? -1 : 1;
      const hairC = (d.hair && d.hair.color) || "#3A2A24", hairS = (d.hair && d.hair.style) || "short";
      const defs = L.defs, root = F.el("g", {}, L.g), g = F.el("g", {}, root);
      const seed = F.hash("human" + (o.x ?? 0) + (o.y ?? 0) + skin);
      const K = { pose: [{ t: -9, v: POSES[o.pose || "stand"].slice() }], expr: [{ t: -9, v: EXPR.neutral.slice() }], talk: [], look: [{ t: -9, v: [0, 0] }], move: [{ t: -9, v: [o.x ?? W / 2, o.y ?? H / 2] }] };
      // back hair
      if (hairS === "bob") F.el("path", { d: "M-150 -840 C-150 -990 150 -990 150 -840 L150 -690 Q150 -660 110 -670 L-110 -670 Q-150 -660 -150 -690 Z", fill: hairC }, g);
      // legs and shoes
      const pants = out.kind === "dress" ? skin : out.pants, legTop = out.kind === "dress" ? -300 : -340;
      for (const sx of [-1, 1]) {
        F.el("rect", { x: sx * 62 - 36, y: legTop, width: 72, height: -legTop - 36, rx: 30, fill: pants }, g);
        F.el("ellipse", { cx: sx * 62 + sx * 8, cy: -24, rx: 56, ry: 26, fill: F.shade(out.accent, -0.35) }, g);
      }
      // torso
      const tm = out.main, tc = out.kind === "dress"
        ? `M-150 -700 Q0 -740 150 -700 L210 -270 Q0 -240 -210 -270 Z`
        : `M-150 -700 Q0 -740 150 -700 L140 -330 Q0 -310 -140 -330 Z`;
      F.el("path", { d: tc, fill: F.lg(defs, [F.shade(tm, 0.12), F.shade(tm, -0.12)], 0, 0, 0, 1) }, g);
      if (out.kind === "coat") {                                     // open lab coat: shirt, tie, a pocket
        F.el("path", { d: "M-46 -730 L0 -560 L46 -730 Z", fill: "#DDE8FF" }, g);
        F.el("path", { d: "M-10 -700 L10 -700 L16 -560 L0 -520 L-16 -560 Z", fill: out.accent }, g);
        F.el("path", { d: "M-46 -735 L-70 -680 L-30 -690 Z M46 -735 L70 -680 L30 -690 Z", fill: F.shade(tm, -0.06) }, g);
        F.el("rect", { x: 70, y: -560, width: 56, height: 62, rx: 8, fill: "none", stroke: F.shade(tm, -0.2), "stroke-width": 5 }, g);
      }
      F.el("rect", { x: -34, y: -742, width: 68, height: 56, rx: 20, fill: skinD }, g);       // neck
      // head
      F.el("circle", { cx: -128, cy: -846, r: 30, fill: skin }, g); F.el("circle", { cx: 128, cy: -846, r: 30, fill: skin }, g);
      F.el("circle", { cx: 0, cy: -850, r: 132, fill: F.lg(defs, [F.shade(skin, 0.1), skin, skinD], -0.2, -0.5, 0.4, 1) }, g);
      // hair (front)
      const hairGrad = F.lg(defs, [F.shade(hairC, 0.14), hairC], 0, 0, 0, 1);
      if (hairS === "short") F.el("path", { d: "M-136 -850 C-150 -990 150 -990 136 -850 C126 -910 60 -940 0 -936 C-70 -940 -126 -900 -136 -850 Z", fill: hairGrad }, g);
      if (hairS === "bob") F.el("path", { d: "M-140 -850 C-150 -1000 150 -1000 140 -850 C140 -900 60 -930 -10 -920 C-80 -930 -140 -900 -140 -850 Z", fill: hairGrad }, g);
      if (hairS === "bun") { F.el("circle", { cx: 0, cy: -1000, r: 56, fill: hairGrad }, g); F.el("path", { d: "M-136 -850 C-146 -985 146 -985 136 -850 C120 -915 -120 -915 -136 -850 Z", fill: hairGrad }, g); }
      if (hairS === "beanie") {
        F.el("path", { d: "M-140 -868 C-146 -1010 146 -1010 140 -868 Z", fill: hairGrad }, g);
        F.el("rect", { x: -142, y: -902, width: 284, height: 46, rx: 22, fill: F.shade(hairC, -0.22) }, g);
      }
      // face
      const eyes = F.el("g", {}, g), brows = F.el("g", {}, g);
      const eyeL = F.el("ellipse", { cx: -48, cy: -846, rx: 15, ry: 19, fill: "#2B1A3A" }, eyes), eyeR = F.el("ellipse", { cx: 48, cy: -846, rx: 15, ry: 19, fill: "#2B1A3A" }, eyes);
      F.el("circle", { cx: -43, cy: -852, r: 5, fill: "#FFF" }, eyes); F.el("circle", { cx: 53, cy: -852, r: 5, fill: "#FFF" }, eyes);
      const browL = F.el("path", { fill: "none", stroke: F.shade(hairC, -0.15), "stroke-width": 9, "stroke-linecap": "round" }, brows), browR = F.el("path", { fill: "none", stroke: F.shade(hairC, -0.15), "stroke-width": 9, "stroke-linecap": "round" }, brows);
      if (d.cheeks !== false) { F.el("circle", { cx: -84, cy: -800, r: 22, fill: "#FF6F8E", opacity: 0.28 }, g); F.el("circle", { cx: 84, cy: -800, r: 22, fill: "#FF6F8E", opacity: 0.28 }, g); }
      const mouth = F.el("path", { fill: "#7A2B3A", stroke: "#5B1E2B", "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      if (d.mask) F.el("path", { d: "M-100 -826 Q0 -780 100 -826 L96 -742 Q0 -706 -96 -742 Z", fill: "#BFE6FF", stroke: "#8FC6EA", "stroke-width": 5 }, g);
      if (d.glasses) {
        const gc = typeof d.glasses === "string" ? d.glasses : "#C4247E";
        F.el("circle", { cx: -48, cy: -848, r: 42, fill: "#FFFFFF", "fill-opacity": 0.14, stroke: gc, "stroke-width": 9 }, g);
        F.el("circle", { cx: 48, cy: -848, r: 42, fill: "#FFFFFF", "fill-opacity": 0.14, stroke: gc, "stroke-width": 9 }, g);
        F.el("path", { d: "M-8 -852 Q0 -862 8 -852", fill: "none", stroke: gc, "stroke-width": 8 }, g);
      }
      // arms (drawn on top)
      const armL = F.el("path", { fill: "none", stroke: out.kind === "dress" ? skin : tm, "stroke-width": 64, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      const armR = F.el("path", { fill: "none", stroke: out.kind === "dress" ? skin : tm, "stroke-width": 64, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      const handL = F.el("circle", { r: 36, fill: skin }, g), handR = F.el("circle", { r: 36, fill: skin }, g);
      const api = { g: root };
      api.pose = (name, t, dur = 0.5) => { const last = K.pose[K.pose.length - 1].v; K.pose.push({ t, v: last }); K.pose.push({ t: t + dur, v: (POSES[name] || POSES.stand).slice(), e: "smooth" }); return api; };
      api.expr = (name, t, dur = 0.3) => { const last = K.expr[K.expr.length - 1].v; K.expr.push({ t, v: last }); K.expr.push({ t: t + dur, v: (EXPR[name] || EXPR.neutral).slice() }); return api; };
      api.talk = (t0, t1) => { K.talk.push([t0, t1]); return api; };
      api.look = (dx, dy, t, dur = 0.3) => { const last = K.look[K.look.length - 1].v; K.look.push({ t, v: last }); K.look.push({ t: t + dur, v: [dx, dy] }); return api; };
      api.move = (x, y, t0, t1) => { const last = K.move[K.move.length - 1].v; K.move.push({ t: t0, v: last }); K.move.push({ t: t1, v: [x, y] }); return api; };
      let waving = [];
      api.wave = (t0, t1) => { waving.push([t0, t1]); return api; };
      S.on((t) => {
        const [px, py] = F.keys(t, K.move, "smooth"), P = F.keys(t, K.pose, "smooth"), E = F.keys(t, K.expr, "smooth"), lk = F.keys(t, K.look, "smooth");
        const breathe = 1 + 0.008 * Math.sin(t * 2.2 + (seed % 5));
        root.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${(s0 * face).toFixed(4)} ${(s0 * breathe).toFixed(4)})`);
        let rx = P[2], ry = P[3];
        for (const [a, b] of waving) if (t >= a && t <= b) { rx += Math.sin((t - a) * 10) * 46; ry += Math.cos((t - a) * 10) * 10; }
        const L1 = ik(-SHO, SY, P[0], P[1], -1), R1 = ik(SHO, SY, rx, ry, 1);
        armL.setAttribute("d", `M${-SHO} ${SY} L${L1.el[0].toFixed(1)} ${L1.el[1].toFixed(1)} L${L1.hand[0].toFixed(1)} ${L1.hand[1].toFixed(1)}`);
        armR.setAttribute("d", `M${SHO} ${SY} L${R1.el[0].toFixed(1)} ${R1.el[1].toFixed(1)} L${R1.hand[0].toFixed(1)} ${R1.hand[1].toFixed(1)}`);
        handL.setAttribute("cx", L1.hand[0].toFixed(1)); handL.setAttribute("cy", L1.hand[1].toFixed(1));
        handR.setAttribute("cx", R1.hand[0].toFixed(1)); handR.setAttribute("cy", R1.hand[1].toFixed(1));
        // face
        const [curve, open0, tilt, eyeS] = E; let open = open0;
        for (const [a, b] of K.talk) if (t >= a && t <= b) open = Math.max(open, 0.25 + 0.5 * Math.abs(Math.sin((t - a) * 13)));
        const ph = (t * 0.27 + (seed % 89) / 89) % 1, bl = ph < 0.04 ? Math.sin((ph / 0.04) * Math.PI) : 0;
        for (const e of [eyeL, eyeR]) { e.setAttribute("ry", (19 * eyeS * (1 - 0.9 * bl)).toFixed(2)); }
        eyeL.setAttribute("cx", (-48 + lk[0]).toFixed(1)); eyeR.setAttribute("cx", (48 + lk[0]).toFixed(1)); eyeL.setAttribute("cy", (-846 + lk[1]).toFixed(1)); eyeR.setAttribute("cy", (-846 + lk[1]).toFixed(1));
        const by = -906 - (eyeS - 1) * 30;
        browL.setAttribute("d", `M-84 ${by + tilt * 14} Q-48 ${by - 12} -14 ${by - tilt * 14}`); browR.setAttribute("d", `M84 ${by + tilt * 14} Q48 ${by - 12} 14 ${by - tilt * 14}`);
        const my = -782, w = 40 + open * 10, h1 = curve * 26, h2 = open * 34;
        mouth.setAttribute("d", `M${-w} ${my} Q0 ${my + h1 * 1.6 + h2} ${w} ${my} Q0 ${my + h1 * 0.4 + h2 * 1.4 + (open > 0.05 ? 6 : 0)} ${-w} ${my} Z`);
        mouth.setAttribute("fill-opacity", open > 0.05 ? 1 : 0);
      });
      return api;
    };
  });
})();
