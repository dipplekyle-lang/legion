/* GLOWFRAME — ui: data and interface props drawn as the picture (charts, scales, cards, sliders, tabs, players) and the
 * cinema moves between pictures (letterbox, glitch, dot, iris). Every one is a pure function of time.
 *
 *  S.chart(L, {x, y, w=820, h=520, values:[…], ymax, color="#6EF3C5", at=.3, dur=2.2, unknown:[idx…], ylabel, xlabels:[…], icons:[idx…]})
 *        a glowing line chart drawn point by point over a table; unknown points carry a "?"; icons: a small syringe under that column
 *  S.scale(L, {x, y, w=860, a, b, title, marker=.3, at=.3, color="#58C8FF"}) → {x, y}   a line with two labelled ends and a marker that slides to `marker`
 *  S.card(L, {x, y, w=300, h=380, label, color="#7A3BE0", labelColor, pic:(g, w, h) => {}, mark:"ok"|"no"|null, at, rot=0})   a framed picture card with a pill label above and a tick/cross
 *  S.slider(L, {x, y, w=800, left, right, leftColor="#FF6B3D", rightColor="#2FBF5B", from=.2, to=.8, t0, t1})   two pills joined by a bar; a knob slides
 *  S.tabs(L, {x, y, labels:[…], active:[[t, index], …], at})                         a row of tabs (Stage 0 … IV), the active one lit
 *  S.scrubber(L, {at, t0, t1, paused=true, y})                                       a media-player bar along the bottom, a pause icon in the middle
 *  S.dialog(L, {x, y, text, at, w=560}) · S.cursor(L, {from:[x,y], to:[x,y], t0, t1, click})   a purple question button and a hand pointer that clicks
 *  Cinema (screen space, over everything):
 *  S.letterbox({t0, t1, bars=.11})       black bars slide in (2.35:1 for an action scene) and out at t1
 *  S.glitch({t0, t1, rewind:true})       scanlines and colour-split slices, a rewind icon: "going back"
 *  S.dot({t0, t1, color="#FF3B3B"})      cut to black with one dot of light (a hard beat)
 *  S.iris({t0, t1, dir:"close"|"open", x, y, color="#04030C"})   an inky circle closes over the picture or opens onto the next scale
 */
(function () {
  "use strict";
  const F = window.FOLIO;
  const W = F.W, H = F.H;
  const SANS = '"Nunito", Arial, sans-serif', MONO = '"Kode Mono", "Share Tech Mono", monospace';

  F.plugins.push((S) => {
    const txt = (g, str, x, y, o = {}) => F.el("text", Object.assign({ x, y, "text-anchor": o.anchor || "middle", "font-family": o.mono ? MONO : SANS, "font-weight": o.weight || 800,
      "font-size": o.size || 32, fill: o.fill || "#FFFFFF" }, o.extra || {}), g).appendChild(document.createTextNode(str)).parentNode;
    const popG = (g, cx, cy, at, dur = 0.4, e = 1.6) => S.on((t) => { const p = F.eBack(F.seg(t, at, at + dur), e); g.setAttribute("transform", `translate(${cx} ${cy}) scale(${Math.max(0.001, p).toFixed(3)}) translate(${-cx} ${-cy})`); g.setAttribute("opacity", Math.min(1, p * 2).toFixed(2)); });

    S.chart = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 820, h = o.h ?? 520, col = o.color || "#6EF3C5", vals = o.values || [3, 5, 4, 3.5, 3.2, 3, 2.8], at = o.at ?? 0.3, dur = o.dur ?? 2.2;
      const ymax = o.ymax ?? Math.max(...vals) * 1.15, x0 = x - w / 2, y0 = y - h / 2, g = F.el("g", {}, L.g), n = vals.length;
      const px = (i) => x0 + 70 + (w - 110) * (n === 1 ? 0 : i / (n - 1)), py = (v) => y0 + h - 90 - (h - 150) * (v / ymax);
      for (let k = 0; k <= 4; k++) F.el("line", { x1: x0 + 60, y1: y0 + 30 + k * (h - 150) / 4, x2: x0 + w, y2: y0 + 30 + k * (h - 150) / 4, stroke: "#FFFFFF", "stroke-width": 2, opacity: 0.16, "stroke-dasharray": "6 10" }, g);
      if (o.ylabel) txt(g, o.ylabel, x0 + 8, y0 + h / 2, { size: 28, fill: "#BFD6FF", extra: { transform: `rotate(-90 ${x0 + 8} ${y0 + h / 2})` } });
      (o.xlabels || vals.map((_, i) => String(i + 1))).forEach((l, i) => txt(g, l, px(i), y0 + h - 40, { size: 26, fill: "#DCE6FF", weight: 700 }));
      (o.icons || []).forEach((i) => { const ix = px(i), iy = y0 + h - 16; F.el("rect", { x: ix - 5, y: iy - 18, width: 10, height: 30, rx: 4, fill: "#8CFF6B" }, g); F.el("rect", { x: ix - 1.5, y: iy + 12, width: 3, height: 12, fill: "#DFFFD2" }, g); });
      const d = vals.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join("");
      const glow = F.el("path", { d, fill: "none", stroke: col, "stroke-width": 20, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.2 }, g);
      const line = F.el("path", { d, fill: "none", stroke: col, "stroke-width": 8, "stroke-linecap": "round", "stroke-linejoin": "round" }, g), len = line.getTotalLength();
      const dots = vals.map((v, i) => { const un = (o.unknown || []).includes(i), c = F.el("circle", { cx: px(i), cy: py(v), r: 13, fill: un ? "#FFFFFF" : col, stroke: "#10163A", "stroke-width": 5 }, g);
        if (un) txt(g, "?", px(i) + 24, py(v) - 22, { size: 32, fill: "#FFE08A" }); return c; });
      S.on((t) => { const p = F.smooth(F.seg(t, at, at + dur)); for (const q of [line, glow]) { q.setAttribute("stroke-dasharray", `${len} ${len}`); q.setAttribute("stroke-dashoffset", (len * (1 - p)).toFixed(1)); }
        dots.forEach((c, i) => c.setAttribute("opacity", F.seg(p, i / n - 0.04, i / n + 0.04).toFixed(2))); });
      return { g };
    };

    S.scale = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 860, col = o.color || "#58C8FF", at = o.at ?? 0.3, g = F.el("g", {}, L.g);
      const x0 = x - w / 2, x1 = x + w / 2;
      const line = F.el("line", { x1: x0, y1: y, x2: x1, y2: y, stroke: col, "stroke-width": 8, "stroke-linecap": "round" }, g);
      F.el("circle", { cx: x0, cy: y, r: 14, fill: col }, g); F.el("circle", { cx: x1, cy: y, r: 14, fill: col }, g);
      txt(g, o.a || "", x0, y + 70, { fill: col, size: 38 }); txt(g, o.b || "", x1, y + 70, { fill: col, size: 38 });
      const m = F.el("path", { d: "M0 -20 L18 0 L0 20 L-18 0Z", fill: "#7DFFE6", stroke: "#0A1A18", "stroke-width": 4 }, g);
      const target = x0 + w * (o.marker ?? 0.3);
      S.on((t) => { const p = F.seg(t, at, at + 0.5), q = F.smooth(F.seg(t, at + 0.7, at + 1.8)); g.setAttribute("opacity", p.toFixed(2)); m.setAttribute("transform", `translate(${(x0 + (target - x0) * q).toFixed(1)} ${y})`); });
      if (o.title) { const k = S.div("hud", "", ""); k.textContent = o.title.toUpperCase(); Object.assign(k.style, { left: "0px", width: `${W}px`, top: `${y - 220}px`, textAlign: "center", fontFamily: MONO, fontSize: "46px", letterSpacing: "0.22em", color: "#FFFFFF", opacity: 0 }); S.on((t) => { k.style.opacity = F.seg(t, at, at + 0.4).toFixed(2); }); }
      return { x: target, y };
    };

    S.card = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 300, h = o.h ?? 380, col = o.color || "#7A3BE0", at = o.at ?? 0.3, g = F.el("g", {}, L.g);
      const inner = F.el("g", { transform: `rotate(${o.rot || 0} ${x} ${y})` }, g);
      F.el("rect", { x: x - w / 2 + 6, y: y - h / 2 + 12, width: w, height: h, rx: 28, fill: "#000", opacity: 0.25 }, inner);
      F.el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 28, fill: col }, inner);
      F.el("rect", { x: x - w / 2 + 16, y: y - h / 2 + 16, width: w - 32, height: h * 0.68, rx: 18, fill: "#FDF6FF" }, inner);
      if (o.pic) { const pg = F.el("g", { transform: `translate(${x} ${y - h / 2 + 16 + h * 0.34})` }, inner); o.pic(pg, w - 32, h * 0.68); }
      [h * 0.8, h * 0.88].forEach((dy, i) => F.el("rect", { x: x - w / 2 + 28, y: y - h / 2 + dy, width: (w - 56) * (i ? 0.55 : 0.85), height: 16, rx: 8, fill: "#FFFFFF", opacity: 0.55 }, inner));
      if (o.label) { const lc = o.labelColor || "#2FBF5B"; const lw = Math.max(150, o.label.length * 24 + 50); F.el("rect", { x: x - lw / 2, y: y - h / 2 - 46, width: lw, height: 62, rx: 31, fill: lc }, inner); txt(inner, o.label, x, y - h / 2 - 3, { size: 34 }); }
      if (o.mark) { const mc = o.mark === "ok" ? "#2FD07A" : "#FF3B6B"; F.el("circle", { cx: x + w / 2 - 34, cy: y + h / 2 - 34, r: 28, fill: "#FFFFFF" }, inner);
        F.el("path", { d: o.mark === "ok" ? `M${x + w / 2 - 48} ${y + h / 2 - 34} l10 12 l22 -26` : `M${x + w / 2 - 46} ${y + h / 2 - 46} l24 24 M${x + w / 2 - 22} ${y + h / 2 - 46} l-24 24`, stroke: mc, "stroke-width": 8, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, inner); }
      popG(g, x, y, at);
      return { g };
    };

    S.slider = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 800, g = F.el("g", {}, L.g), lc = o.leftColor || "#FF6B3D", rc = o.rightColor || "#2FBF5B", t0 = o.t0 ?? 0.8, t1 = o.t1 ?? 2.4;
      const bar = F.el("rect", { x: x - w / 2 + 90, y: y - 9, width: w - 180, height: 18, rx: 9, fill: F.lg(L.defs, [lc, "#FFC94A", rc], 0, 0, 1, 0) }, g);
      const pill = (cx, str, c) => { const pw = Math.max(170, str.length * 26 + 60); F.el("rect", { x: cx - pw / 2, y: y - 36, width: pw, height: 72, rx: 36, fill: c }, g); txt(g, str, cx, y + 12, { size: 36 }); };
      pill(x - w / 2 + 40, o.left || "", lc); pill(x + w / 2 - 40, o.right || "", rc);
      const knob = F.el("circle", { r: 22, fill: "#FFFFFF", stroke: "#2B1A5E", "stroke-width": 6 }, g);
      S.on((t) => { const p = F.smooth(F.seg(t, t0, t1)), v = (o.from ?? 0.2) + ((o.to ?? 0.8) - (o.from ?? 0.2)) * p; knob.setAttribute("cx", (x - w / 2 + 90 + (w - 180) * v).toFixed(1)); knob.setAttribute("cy", y); g.setAttribute("opacity", F.seg(t, (o.at ?? 0.2), (o.at ?? 0.2) + 0.4).toFixed(2)); });
      return { g };
    };

    S.tabs = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? 140, labels = o.labels || ["Stage 0", "Stage I", "Stage II", "Stage III", "Stage IV"], tw = 190, g = F.el("g", {}, L.g), tabs = [];
      labels.forEach((l, i) => { const cx = x + (i - (labels.length - 1) / 2) * (tw + 10); const r = F.el("rect", { x: cx - tw / 2, y: y - 34, width: tw, height: 68, rx: 14, fill: "#2B2457", stroke: "#6F6BFF", "stroke-width": 3 }, g); txt(g, l, cx, y + 11, { size: 30, fill: "#C9C4FF", weight: 700 }); tabs.push(r); });
      const act = o.active || [[0, 0]];
      S.on((t) => { let ai = act[0][1]; for (const [tt, i] of act) if (t >= tt) ai = i; tabs.forEach((r, i) => { r.setAttribute("fill", i === ai ? "#FF2E93" : "#2B2457"); r.setAttribute("stroke", i === ai ? "#FFC2E0" : "#6F6BFF"); }); g.setAttribute("opacity", F.seg(t, o.at ?? 0.2, (o.at ?? 0.2) + 0.4).toFixed(2)); });
      return { g };
    };

    S.scrubber = (L, o = {}) => {
      const g = F.el("g", {}, L.g), y = o.y ?? H - 330, t0 = o.t0 ?? 0.3, t1 = o.t1 ?? (S.dur - 0.3), x0 = 90, x1 = W - 90;
      F.el("rect", { x: x0, y: y - 6, width: x1 - x0, height: 12, rx: 6, fill: "#FFFFFF", opacity: 0.3 }, g);
      const fill = F.el("rect", { x: x0, y: y - 6, height: 12, rx: 6, fill: "#FFFFFF" }, g), knob = F.el("circle", { r: 18, fill: "#FFFFFF" }, g);
      if (o.paused !== false) { const p = F.el("g", { transform: `translate(${W / 2} ${H / 2 - 60})`, opacity: 0.92 }, g); F.el("rect", { x: -44, y: -62, width: 26, height: 124, rx: 6, fill: "#FFFFFF" }, p); F.el("rect", { x: 18, y: -62, width: 26, height: 124, rx: 6, fill: "#FFFFFF" }, p); }
      S.on((t) => { const p = F.seg(t, t0, t1); fill.setAttribute("width", ((x1 - x0) * p).toFixed(1)); knob.setAttribute("cx", (x0 + (x1 - x0) * p).toFixed(1)); knob.setAttribute("cy", y); });
      return { g };
    };

    S.dialog = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 560, g = F.el("g", {}, L.g);
      F.el("rect", { x: x - w / 2, y: y - 60, width: w, height: 120, rx: 36, fill: "#5A2CC6", stroke: "#A98BFF", "stroke-width": 5 }, g);
      txt(g, o.text || "Why is this so hard?", x, y + 14, { size: 40 });
      popG(g, x, y, o.at ?? 0.3);
      return { g };
    };

    S.cursor = (L, o = {}) => {
      const g = F.el("g", {}, L.g), [fx, fy] = o.from || [W / 2 + 200, H / 2 + 200], [tx, ty] = o.to || [W / 2, H / 2], t0 = o.t0 ?? 0.4, t1 = o.t1 ?? 1.2;
      const ring = F.el("circle", { r: 10, fill: "none", stroke: "#FFFFFF", "stroke-width": 6, opacity: 0 }, g);
      const c = F.el("path", { d: "M0 0 L0 66 L18 50 L32 82 L46 76 L32 46 L56 46 Z", fill: "#FFFFFF", stroke: "#1A1030", "stroke-width": 5, "stroke-linejoin": "round" }, g);
      S.on((t) => { const p = F.smooth(F.seg(t, t0, t1)), cx = fx + (tx - fx) * p, cy = fy + (ty - fy) * p; c.setAttribute("transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)})`);
        const k = o.click != null ? F.seg(t, o.click, o.click + 0.4) : 0; ring.setAttribute("cx", tx); ring.setAttribute("cy", ty); ring.setAttribute("r", (10 + k * 60).toFixed(1)); ring.setAttribute("opacity", (k > 0 && k < 1 ? 1 - k : 0).toFixed(2)); });
      return { g };
    };

    // ── cinema ────────────────────────────────────────────────────────
    const over = (css) => { const d = S.div("top", "", ""); Object.assign(d.style, { left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, pointerEvents: "none", opacity: 0 }, css || {}); return d; };

    S.letterbox = (o = {}) => {
      const t0 = o.t0 ?? 0, t1 = o.t1 ?? S.dur, bars = (o.bars ?? 0.11) * H, a = over(), b = over();
      Object.assign(a.style, { height: "0px", background: "#000", opacity: 1 }); Object.assign(b.style, { top: `${H}px`, height: "0px", background: "#000", opacity: 1 });
      S.on((t) => { const p = F.smooth(F.seg(t, t0, t0 + 0.35)) * (1 - F.smooth(F.seg(t, t1 - 0.3, t1))); a.style.height = `${(bars * p).toFixed(1)}px`; b.style.top = `${(H - bars * p).toFixed(1)}px`; b.style.height = `${(bars * p).toFixed(1)}px`; });
    };

    S.glitch = (o = {}) => {
      const t0 = o.t0 ?? 0, t1 = o.t1 ?? S.dur, root = over({ opacity: 1 }), slices = [];
      const lines = over({ opacity: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 3px, rgba(0,0,0,0) 3px 8px)" }); root.appendChild(lines);
      for (let i = 0; i < 9; i++) { const d = document.createElement("div"); Object.assign(d.style, { position: "absolute", left: "0px", width: `${W}px`, height: "40px", mixBlendMode: "screen", opacity: 0 }); root.appendChild(d); slices.push(d); }
      let icon = null; if (o.rewind !== false) { icon = document.createElement("div"); icon.textContent = "◀◀"; Object.assign(icon.style, { position: "absolute", left: "60px", top: "100px", fontFamily: SANS, fontWeight: 800, fontSize: "64px", color: "#FFFFFF", textShadow: "0 0 18px rgba(255,255,255,.7)" }); root.appendChild(icon); }
      S.on((t) => { const on = t >= t0 && t <= t1; lines.style.opacity = on ? 1 : 0; if (icon) icon.style.opacity = on ? (Math.floor(t * 4) % 2 ? 1 : 0.4) : 0;
        slices.forEach((d, i) => { const r = F.noise(t * 17 + i * 5.1, i + 1); const show = on && r > -0.1; d.style.opacity = show ? 0.8 : 0; d.style.top = `${Math.round(((F.noise(t * 11 + i, 9 + i) + 1) / 2) * (H - 60))}px`; d.style.height = `${24 + Math.round(Math.abs(r) * 90)}px`;
          d.style.background = i % 2 ? "rgba(255,40,110,.5)" : "rgba(40,255,230,.45)"; d.style.transform = `translateX(${Math.round(r * 60)}px)`; }); });
    };

    S.dot = (o = {}) => {
      const t0 = o.t0 ?? 0, t1 = o.t1 ?? S.dur, col = o.color || "#FF3B3B", d = over({ background: "#000" });
      const dot = document.createElement("div"); Object.assign(dot.style, { position: "absolute", left: `${W / 2 - 40}px`, top: `${H / 2 - 40}px`, width: "80px", height: "80px", borderRadius: "50%", background: `radial-gradient(circle, ${col} 0%, ${col}99 35%, ${col}00 70%)` }); d.appendChild(dot);
      S.on((t) => { const a = F.seg(t, t0, t0 + 0.12) * (1 - F.seg(t, t1 - 0.15, t1)); d.style.opacity = a.toFixed(3); dot.style.transform = `scale(${(0.8 + 0.5 * Math.sin((t - t0) * 5) * 0.5 + 0.4 * F.seg(t, t0, t1)).toFixed(3)})`; });
    };

    S.iris = (o = {}) => {
      const t0 = o.t0 ?? S.dur - 0.7, t1 = o.t1 ?? S.dur, dir = o.dir || "close", cx = o.x ?? W / 2, cy = o.y ?? H / 2, col = o.color || "#04030C", d = over({ background: col });
      const R = Math.hypot(W, H) * 0.75, N = 48;
      const circle = (r, t) => { let s = ""; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, rr = r * (1 + 0.07 * F.noise(i * 1.3 + t * 3, 7)); s += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; } return s + "Z"; };
      S.on((t) => { const p = F.smoother(F.seg(t, t0, t1)); const active = dir === "close" ? t >= t0 : t <= t1; d.style.opacity = active ? 1 : 0; if (!active) return;
        // close: a hole in the ink shrinks to nothing; open: a hole grows from nothing
        const r = dir === "close" ? R * (1 - p) : R * p; d.style.clipPath = `path(evenodd, "M0 0H${W}V${H}H0Z ${circle(Math.max(1, r), t)}")`; });
    };
  });
})();
