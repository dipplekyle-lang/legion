/* GLOWFRAME — cast: the characters and the micro-world, all flat vector with one neon glow.
 *
 *  S.pod(L, {x, y, h=260, kind:"dome"|"bean"|"cube"|"cone"|"drop", color="#C4247E", eye:"orb"|"slit"|"round", eyeColor, face:1|-1,
 *            legs:true, rim:true, seed}) → P       a geometric character with one big eye; (x, y) is where it stands
 *     P.look(target, t, dur=.3)       target: "left"|"right"|"up"|"down"|"center" or [worldX, worldY]
 *     P.mood(name, t, dur=.3)         "calm"|"worried"|"angry"|"sleepy"   (the eyelid)
 *     P.hop(t, height=70, dur=.55)    a small jump          P.move(x, y, t0, t1, ease="smooth")   walk there (legs swing)
 *     P.grow(s, t0, t1)               scale (1 = as made)   P.say(t0, t1)   a talking wobble     P.g  the group
 *  S.crowd(L, {x, y, cols, rows, gap=150, h=90, kinds, colors, seed}) → rows of small pods, each its own colour and eye
 *  S.cell(L, {x, y, r=120, color="#7A3BE0", ring="#FFD43B", nucleus="#FF4FB6", wobble=.12, seed, rim=8}) → C   one cell
 *  S.tissue(L, {x, y, w, h, r=96, ring="#FFD43B", fill="#E8681B", nucleus="#FF4FB6", seed, wobble=.06}) → a packed raft of cells
 *  S.virus(L, {x, y, r=90, color="#7FE08A", spikes=14, spin=.25}) → V   a spiky ball
 * Every function draws into layer L (a S.layer) in world units; all motion is a function of t.
 */
(function () {
  "use strict";
  const F = window.FOLIO;
  const W = F.W, H = F.H;
  const SHAPES = {
    dome: { d: "M-100 -70 A100 130 0 0 1 100 -70 L100 -14 Q100 0 84 0 L-84 0 Q-100 0 -100 -14 Z", eyeY: -96, hgt: 200 },
    bean: { rect: [-90, -230, 180, 230, 90], eyeY: -140, hgt: 230 },
    cube: { rect: [-100, -190, 200, 190, 40], eyeY: -100, hgt: 190 },
    cone: { d: "M-104 -4 L-30 -206 Q0 -258 30 -206 L104 -4 Q108 0 98 0 L-98 0 Q-108 0 -104 -4 Z", eyeY: -92, hgt: 250 },
    drop: { d: "M0 -250 C34 -170 100 -126 100 -62 C100 -22 62 0 0 0 C-62 0 -100 -22 -100 -62 C-100 -126 -34 -170 0 -250 Z", eyeY: -76, hgt: 250 },
  };
  // eyelid: [slant (+ angry, - worried), sleepy]
  const MOODS = { calm: [0, 0], worried: [-1, 0], angry: [1, 0], sleepy: [0, 0.7] };

  F.plugins.push((S) => {
    S.pod = (L, o = {}) => {
      const kind = SHAPES[o.kind] ? o.kind : "dome", sh = SHAPES[kind];
      const color = o.color || "#C4247E", s0 = (o.h ?? 260) / sh.hgt, face = o.face === -1 ? -1 : 1;
      const eyeStyle = o.eye || "orb", eyeCol = o.eyeColor || (eyeStyle === "slit" ? "#FF3B3B" : "#38F5FF");
      const seed = F.hash("pod" + (o.seed ?? o.x ?? 0) + (o.y ?? 0));
      const root = F.el("g", {}, L.g), body = F.el("g", {}, root);
      const defs = L.defs;
      const legs = [];
      if (o.legs !== false) for (const sx of [-1, 1]) {            // legs first: they stay behind the body
        const g = F.el("g", {}, body);
        F.el("path", { d: "M0 0 L0 38", stroke: F.shade(color, -0.45), "stroke-width": 12, "stroke-linecap": "round", fill: "none" }, g);
        F.el("ellipse", { cx: 0, cy: 42, rx: 20, ry: 9, fill: F.shade(color, -0.5) }, g);
        legs.push({ g, sx });
      }
      const fill = F.lg(defs, [F.shade(color, 0.38), color, F.shade(color, -0.42)], -0.4, -0.2, 0.5, 1);
      const shape = sh.rect
        ? F.el("rect", { x: sh.rect[0], y: sh.rect[1], width: sh.rect[2], height: sh.rect[3], rx: sh.rect[4], fill }, body)
        : F.el("path", { d: sh.d, fill, "stroke-linejoin": "round" }, body);
      if (o.rim !== false) {                                       // a thin rim light on the lit edge, split a little red / pale
        const rim = (c, dx) => {
          const n = shape.cloneNode(); n.setAttribute("fill", "none"); n.setAttribute("stroke", c); n.setAttribute("stroke-width", 7);
          n.setAttribute("transform", `translate(${dx} 0)`); n.setAttribute("opacity", 0.8); body.appendChild(n);
        };
        rim("#FF4A4A", 3); rim(F.shade(color, 0.65), -1);
      }
      const eye = F.el("g", { transform: `translate(0 ${sh.eyeY})` }, body);
      const glow = F.el("circle", { r: 92, fill: F.rg(defs, [[0, eyeCol, 0.55], [1, eyeCol, 0]]), style: "mix-blend-mode:screen" }, eye);
      const lids = F.el("g", {}, eye);
      if (eyeStyle === "slit") {
        F.el("ellipse", { rx: 46, ry: 58, fill: "#0B0714" }, lids);
        F.el("ellipse", { rx: 12, ry: 36, fill: eyeCol }, lids);
        F.el("ellipse", { rx: 5, ry: 22, fill: "#FFF1E8", opacity: 0.9 }, lids);
      } else if (eyeStyle === "round") {
        F.el("ellipse", { rx: 46, ry: 52, fill: "#F4F8FF" }, lids);
        F.el("circle", { r: 22, fill: "#0B0714" }, lids);
        F.el("circle", { cx: -7, cy: -8, r: 7, fill: "#FFFFFF" }, lids);
      } else {                                                     // orb: a glowing white eye
        F.el("ellipse", { rx: 44, ry: 50, fill: F.rg(defs, [[0, "#FFFFFF", 1], [0.6, "#F2FFFF", 1], [1, eyeCol, 1]]) }, lids);
      }
      const clipId = F.uid("lidclip");
      const clip = F.el("clipPath", { id: clipId }, defs); F.el("ellipse", { rx: 47, ry: 53 }, clip);     // the lid never leaves the eye
      const lidG = F.el("g", { "clip-path": `url(#${clipId})` }, eye);
      const lid = F.el("polygon", { points: "0,0 0,0 0,0", fill: F.shade(color, 0.02), opacity: 0 }, lidG);
      const cx0 = o.x ?? W / 2, cy0 = o.y ?? H / 2;
      const K = { look: [[0, [0, 0]]], mood: [[0, [0, 0]]], hop: [], move: [{ t: -9, v: [cx0, cy0] }], grow: [[0, s0]], say: [] };
      const api = { g: root };
      api.look = (target, t, dur = 0.3) => {
        let v;
        if (Array.isArray(target)) { const dx = target[0] - cx0, dy = target[1] - (cy0 + sh.eyeY * s0); const d = Math.hypot(dx, dy) || 1; v = [dx / d * 15, dy / d * 12]; }
        else v = { left: [-16, 0], right: [16, 0], up: [0, -13], down: [0, 13], center: [0, 0] }[target] || [0, 0];
        K.look.push([t, K.look[K.look.length - 1][1]]); K.look.push([t + dur, v]); return api;
      };
      api.mood = (name, t, dur = 0.3) => {
        const m = MOODS[name] || MOODS.calm; K.mood.push([t, K.mood[K.mood.length - 1][1]]); K.mood.push([t + dur, m.slice()]); return api;
      };
      api.hop = (t, height = 70, dur = 0.55) => { K.hop.push([t, height, dur]); return api; };
      api.move = (x, y, t0, t1, e = "smooth") => { const last = K.move[K.move.length - 1].v; K.move.push({ t: t0, v: last, e }); K.move.push({ t: t1, v: [x, y], e }); return api; };
      api.grow = (s, t0, t1) => { K.grow.push([t0, K.grow[K.grow.length - 1][1]]); K.grow.push([t1, s0 * s]); return api; };
      api.say = (t0, t1) => { K.say.push([t0, t1]); return api; };
      const mv = (t) => F.keys(t, K.move.map((k) => ({ t: k.t, v: k.v, e: k.e })), "smooth");
      S.on((t) => {
        const [px, py] = mv(t);
        const s = F.keys(t, K.grow, "smooth");
        let lift = 0, squash = 1;
        for (const [h0, ht, hd] of K.hop) { const p = F.seg(t, h0, h0 + hd); if (p > 0 && p < 1) { lift += Math.sin(p * Math.PI) * ht; squash = 1 - 0.1 * Math.sin(p * Math.PI * 2); } }
        let wob = 0; for (const [a, b] of K.say) if (t >= a && t <= b) wob = Math.sin((t - a) * 19) * 0.03;
        const breathe = 1 + 0.012 * Math.sin(t * 2.1 + (seed % 6));
        root.setAttribute("transform", `translate(${px.toFixed(2)} ${(py - lift).toFixed(2)}) scale(${(s * face).toFixed(4)} ${(s * (squash * breathe + wob)).toFixed(4)})`);
        const lk = F.keys(t, K.look, "smooth"), md = F.keys(t, K.mood, "smooth");
        const ph = (t * 0.31 + (seed % 97) / 97) % 1, bl = ph < 0.035 ? Math.sin((ph / 0.035) * Math.PI) : 0;   // a blink every ~3 s
        lids.setAttribute("transform", `translate(${lk[0].toFixed(2)} ${lk[1].toFixed(2)}) scale(1 ${(1 - 0.92 * bl).toFixed(3)})`);
        const slant = md[0], sleepy = md[1], yEdge = -44 + sleepy * 62 + Math.abs(slant) * 24, yMid = yEdge + slant * 36;
        lid.setAttribute("points", `-64,-90 64,-90 64,${yEdge.toFixed(1)} 0,${yMid.toFixed(1)} -64,${yEdge.toFixed(1)}`);
        lid.setAttribute("opacity", (sleepy > 0.02 || Math.abs(slant) > 0.02) ? 1 : 0);
        glow.setAttribute("opacity", (0.85 + 0.15 * Math.sin(t * 2.6 + seed)).toFixed(3));
        const m2 = mv(t + 0.05), spd = Math.hypot(m2[0] - px, m2[1] - py) / 0.05;          // legs swing while it moves
        for (const lg of legs) lg.g.setAttribute("transform", `translate(${lg.sx * 42} 0) rotate(${(Math.sin(t * 11 + (lg.sx > 0 ? 0 : Math.PI)) * Math.min(1, spd / 120) * 24).toFixed(2)})`);
      });
      return api;
    };

    S.crowd = (L, o = {}) => {
      const cols = o.cols ?? 8, rows = o.rows ?? 6, gap = o.gap ?? 150, h = o.h ?? 90, x0 = o.x ?? W / 2, y0 = o.y ?? H / 2;
      const kinds = o.kinds || ["dome", "cube", "cone", "drop", "bean"], colors = o.colors || ["#C4247E", "#7A3BE0", "#1FB5C9", "#E8681B", "#3FD07A"];
      const r = F.rnd(o.seed ?? 3), items = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        items.push(S.pod(L, { x: x0 + (i - (cols - 1) / 2) * gap, y: y0 + (j - (rows - 1) / 2) * gap * 1.05 + h / 2, h, kind: kinds[Math.floor(r() * kinds.length)],
                              color: colors[Math.floor(r() * colors.length)], legs: false, rim: false, eye: r() < 0.3 ? "slit" : r() < 0.6 ? "round" : "orb", seed: i * 31 + j }));
      }
      return { pods: items };
    };

    S.cell = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, r0 = o.r ?? 120, color = o.color || "#7A3BE0", ring = o.ring || "#FFD43B", nuc = o.nucleus || "#FF4FB6";
      const wob = o.wobble ?? 0.12, seed = F.hash("cell" + (o.seed ?? x + y)), N = 14, rim = o.rim ?? 8;
      const g = F.el("g", {}, L.g);
      const body = F.el("path", { fill: F.rg(L.defs, [[0, F.shade(color, 0.25)], [1, color]]), stroke: ring, "stroke-width": rim, "stroke-linejoin": "round" }, g);
      const nucleus = F.el("ellipse", { rx: r0 * 0.34, ry: r0 * 0.3, fill: F.rg(L.defs, [[0, "#FFFFFF", 0.9], [0.35, nuc], [1, F.shade(nuc, -0.35)]]) }, g);
      const dots = [0, 1, 2].map(() => F.el("circle", { r: r0 * 0.07, fill: ring, opacity: 0.85 }, g));
      S.on((t) => {
        const pts = [];
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2, rr = r0 * (1 + wob * F.noise(i * 1.7 + t * 0.9, seed));
          pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.94]);
        }
        let d = "";
        for (let i = 0; i < N; i++) {                                // a closed smooth curve through the points
          const p0 = pts[(i + N - 1) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
          if (i === 0) d += `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
          d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
        }
        body.setAttribute("d", d + "Z");
        nucleus.setAttribute("cx", (x + r0 * 0.12 * F.noise(t * 0.6, seed + 1)).toFixed(1)); nucleus.setAttribute("cy", (y + r0 * 0.1 * F.noise(t * 0.5, seed + 2)).toFixed(1));
        dots.forEach((c, i) => { const a = i * 2.1 + t * 0.2; c.setAttribute("cx", (x + Math.cos(a + 1) * r0 * 0.55).toFixed(1)); c.setAttribute("cy", (y + Math.sin(a + 1) * r0 * 0.5).toFixed(1)); });
      });
      return { g };
    };

    S.tissue = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? W, h = o.h ?? 600, r = o.r ?? 96, rnd = F.rnd(o.seed ?? 8);
      const dx = r * 1.85, dy = r * 1.6, cols = Math.ceil(w / dx) + 1, rows = Math.ceil(h / dy) + 1, out = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        out.push(S.cell(L, { x: x - w / 2 + i * dx + (j % 2 ? dx / 2 : 0) + (rnd() - 0.5) * 8, y: y - h / 2 + j * dy + (rnd() - 0.5) * 8, r: r * (0.9 + rnd() * 0.1),
                             color: o.fill || "#E8681B", ring: o.ring || "#FFD43B", nucleus: o.nucleus || "#FF4FB6", wobble: o.wobble ?? 0.06, seed: i * 13 + j * 7, rim: o.rim ?? 7 }));
      }
      return out;
    };

    S.virus = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, r = o.r ?? 90, color = o.color || "#7FE08A", n = o.spikes ?? 14, spin = o.spin ?? 0.25;
      const g = F.el("g", {}, L.g);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        F.el("line", { x1: Math.cos(a) * r * 0.8, y1: Math.sin(a) * r * 0.8, x2: Math.cos(a) * r * 1.28, y2: Math.sin(a) * r * 1.28, stroke: F.shade(color, -0.2), "stroke-width": r * 0.1, "stroke-linecap": "round" }, g);
        F.el("circle", { cx: Math.cos(a) * r * 1.3, cy: Math.sin(a) * r * 1.3, r: r * 0.13, fill: F.shade(color, 0.3) }, g);
      }
      F.el("circle", { r, fill: F.rg(L.defs, [[0, F.shade(color, 0.35)], [0.7, color], [1, F.shade(color, -0.3)]]) }, g);
      F.el("circle", { r: r * 0.55, fill: F.shade(color, -0.25), opacity: 0.35 }, g);
      for (let i = 0; i < 6; i++) F.el("circle", { cx: Math.cos(i * 1.05) * r * 0.5, cy: Math.sin(i * 1.05) * r * 0.5, r: r * 0.09, fill: F.shade(color, 0.5), opacity: 0.8 }, g);
      S.on((t) => g.setAttribute("transform", `translate(${x} ${y}) rotate(${(t * spin * 57.3).toFixed(2)})`));
      return { g };
    };
  });
})();
