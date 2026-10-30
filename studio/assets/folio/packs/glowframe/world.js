/* GLOWFRAME — world: the places and props every scene is built from. All flat vector, one neon glow, all motion from t.
 *
 *  S.isoRoom(L, {x, y, s=420, wh=330, floor, left, right, halo, props}) → R    an isometric diorama room, a cut-away corner
 *       props: [{type:"window"|"poster"|"tv"|"shelf", wall:"left"|"right", u, v, w, h, color}, {type:"box", a, b, da, db, h, color}]
 *       (with no props it draws a cosy default). R.floorXY(a, b) → [x, y] a spot on the floor (a, b in 0..1): stand a S.human there
 *  S.network(L, {x, y, w, h, n=24, color="#38F5FF", seed, pulses=6})              glowing nodes, curved links, light pulses
 *  S.maze(L, {x, y, size=520, cells=7, color="#FF2E93", seed, t0, t1, ball=true})   a neon maze; a dot solves it between t0 and t1
 *  S.circuit(L, {x, y, w, h, color="#FF4A4A", seed, density=34})                   right-angle circuit traces with glowing joints
 *  S.servers(L, {x, y, w, h, cols=4, color="#3F9DE4", alarm})                      a hall of server racks, lights blinking, one can glow red
 *  S.globe(L, {x, y, r=300, bolts=0})                                              a flat vector globe; bolts: lightning strikes at its edge
 *  S.folders(L, {x, y, cols, rows, gap, color="#FF6FB1"})                          a grid of folder icons that pop in one by one
 *  S.window(L, {x, y, w=640, h=460, title, lines, bubbles, at})                    a chat / browser window (white, rounded)
 *  S.terminal(L, {x, y, w=760, h=300, name, text, at, cps=40})                     a black rounded box, mono text typed in, diamond avatar and name plate
 *  S.arms(L, {x, y, w, color})                                                     the two glowing lightning "arms" that frame a quote screen
 *  S.stack(L, {x, y, n=5, color="#3F9DE4"})                                        an isometric stack of document cards, one glitching pink
 * L is a S.layer. Everything is placed in world units; (x, y) is the centre unless noted.
 */
(function () {
  "use strict";
  const F = window.FOLIO;
  const W = F.W, H = F.H;
  const MONO = '"Kode Mono", "Share Tech Mono", monospace', SANS = '"Nunito", Arial, sans-serif';

  F.plugins.push((S) => {
    // ── isometric room ──────────────────────────────────────────────────
    S.isoRoom = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, s = o.s ?? 420, wh = o.wh ?? 330;
      const cF = o.floor || "#F2B64D", cL = o.left || "#E8861B", cR = o.right || "#C4247E";
      const g = F.el("g", {}, L.g);
      if (o.halo !== false) S.glow(L, { x, y: y - wh / 2, r: s * 1.9, color: o.haloColor || cR, a: 0.55 });
      const P = (xx, yy) => `${xx.toFixed(1)},${yy.toFixed(1)}`;
      const fl = (a, b) => [x + (a - b) * s, y - s / 2 + (a + b) * s / 2];
      const wl = (u, v) => [x - s + u * s, y - u * s / 2 - v * wh];          // left wall: u 0 (outer) .. 1 (back corner)
      const wr = (u, v) => [x + u * s, y - s / 2 + u * s / 2 - v * wh];      // right wall: u 0 (back corner) .. 1 (outer)
      const poly = (pts, fill, extra = {}) => F.el("polygon", Object.assign({ points: pts.map((p) => P(p[0], p[1])).join(" "), fill }, extra), g);
      poly([wl(0, 0), wl(1, 0), wl(1, 1), wl(0, 1)], F.lg(L.defs, [F.shade(cL, 0.14), cL], 0, 0, 0, 1));
      poly([wr(0, 0), wr(1, 0), wr(1, 1), wr(0, 1)], F.lg(L.defs, [F.shade(cR, 0.1), F.shade(cR, -0.12)], 0, 0, 0, 1));
      poly([fl(0, 0), fl(1, 0), fl(1, 1), fl(0, 1)], F.lg(L.defs, [F.shade(cF, 0.12), cF], 0, 0, 1, 1));
      poly([wl(1, 0), wl(1, 1), wr(0, 1), wr(0, 0)], F.shade(cL, -0.3), { opacity: 0.5 });     // the back corner seam
      const wallRect = (fn, u, v, w, h, fill, extra) => poly([fn(u, v), fn(u + w, v), fn(u + w, v + h), fn(u, v + h)], fill, extra);
      const box = (a, b, da, db, hgt, color) => {
        const top = [fl(a, b), fl(a + da, b), fl(a + da, b + db), fl(a, b + db)].map((p) => [p[0], p[1] - hgt]);
        const bl = fl(a, b + db), br = fl(a + da, b + db), brr = fl(a + da, b);
        poly([bl, br, [br[0], br[1] - hgt], [bl[0], bl[1] - hgt]], F.shade(color, -0.2));
        poly([br, brr, [brr[0], brr[1] - hgt], [br[0], br[1] - hgt]], F.shade(color, -0.35));
        poly(top, F.shade(color, 0.12));
      };
      const props = o.props || [
        { type: "window", wall: "left", u: 0.32, v: 0.38, w: 0.36, h: 0.42 }, { type: "poster", wall: "right", u: 0.12, v: 0.46, w: 0.18, h: 0.3, color: "#FFD43B" },
        { type: "tv", wall: "right", u: 0.52, v: 0.28, w: 0.34, h: 0.28 }, { type: "box", a: 0.1, b: 0.55, da: 0.5, db: 0.26, h: 74, color: "#7A3BE0" },
        { type: "box", a: 0.62, b: 0.12, da: 0.22, db: 0.22, h: 56, color: "#FF4FB6" } ];
      for (const p of props) {
        const fn = p.wall === "right" ? wr : wl;
        if (p.type === "window") {
          wallRect(fn, p.u, p.v, p.w, p.h, "#FFFFFF"); wallRect(fn, p.u + 0.015, p.v + 0.02, p.w - 0.03, p.h - 0.04, p.color || "#8EE6F2");
          wallRect(fn, p.u + p.w / 2 - 0.006, p.v, 0.012, p.h, "#FFFFFF"); wallRect(fn, p.u, p.v + p.h / 2 - 0.01, p.w, 0.02, "#FFFFFF");
        } else if (p.type === "poster") { wallRect(fn, p.u, p.v, p.w, p.h, "#FFFFFF"); wallRect(fn, p.u + 0.015, p.v + 0.02, p.w - 0.03, p.h - 0.04, p.color || "#FFD43B");
        } else if (p.type === "tv") { wallRect(fn, p.u, p.v, p.w, p.h, "#1B1230"); wallRect(fn, p.u + 0.012, p.v + 0.02, p.w - 0.024, p.h - 0.04, p.color || "#38F5FF", { opacity: 0.85 });
        } else if (p.type === "shelf") { wallRect(fn, p.u, p.v, p.w, 0.03, "#FFFFFF"); for (let i = 0; i < 4; i++) wallRect(fn, p.u + 0.03 + i * p.w / 4.4, p.v + 0.03, 0.05, 0.09, ["#FF4FB6", "#38F5FF", "#FFD43B", "#7A3BE0"][i]);
        } else if (p.type === "box") box(p.a, p.b, p.da, p.db, p.h, p.color || "#7A3BE0");
      }
      return { g, floorXY: (a, b) => fl(a, b), wallXY: (side, u, v) => (side === "right" ? wr : wl)(u, v) };
    };

    // ── network ───────────────────────────────────────────────────────
    S.network = (L, o = {}) => {
      const n = o.n ?? 24, r = F.rnd(o.seed ?? 2), col = o.color || "#38F5FF", w = o.w ?? W, h = o.h ?? 800, cx = o.x ?? W / 2, cy = o.y ?? H / 2;
      const pts = [];
      for (let i = 0; i < n * 6 && pts.length < n; i++) {
        const p = [cx - w / 2 + r() * w, cy - h / 2 + r() * h];
        if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > Math.min(w, h) / 6)) pts.push(p);
      }
      const g = F.el("g", { style: "mix-blend-mode:screen" }, L.g), links = [];
      pts.forEach((p, i) => {
        const near = pts.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j]).filter((a) => a[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 2);
        for (const [, j] of near) if (j > i || !links.some((l) => l.a === j && l.b === i)) {
          const q = pts[j], mx = (p[0] + q[0]) / 2 + (r() - 0.5) * 120, my = (p[1] + q[1]) / 2 + (r() - 0.5) * 120;
          const path = F.el("path", { d: `M${p[0].toFixed(1)} ${p[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`, fill: "none", stroke: col, "stroke-width": 3, opacity: 0.55 }, g);
          links.push({ a: i, b: j, path, len: path.getTotalLength() });
        }
      });
      pts.forEach((p, i) => { const big = i === 0; F.el("circle", { cx: p[0], cy: p[1], r: big ? 46 : 10 + r() * 8, fill: col, opacity: big ? 0.9 : 0.85 }, g); F.el("circle", { cx: p[0], cy: p[1], r: big ? 90 : 26, fill: F.rg(L.defs, [[0, col, 0.5], [1, col, 0]]) }, g); });
      const pulses = Array.from({ length: o.pulses ?? 6 }, () => ({ c: F.el("circle", { r: 7, fill: "#FFFFFF" }, g), l: Math.floor(r() * links.length), ph: r(), sp: 0.12 + r() * 0.2 }));
      S.on((t) => { for (const p of pulses) { const l = links[p.l]; if (!l) continue; const u = (t * p.sp + p.ph) % 1, pt = l.path.getPointAtLength(u * l.len); p.c.setAttribute("cx", pt.x.toFixed(1)); p.c.setAttribute("cy", pt.y.toFixed(1)); p.c.setAttribute("opacity", Math.sin(u * Math.PI).toFixed(2)); } });
      return { g, nodes: pts };
    };

    // ── maze ──────────────────────────────────────────────────────────
    S.maze = (L, o = {}) => {
      const c = o.cells ?? 7, size = o.size ?? 520, cell = size / c, x0 = (o.x ?? W / 2) - size / 2, y0 = (o.y ?? H / 2) - size / 2, col = o.color || "#FF2E93", r = F.rnd(o.seed ?? 4);
      const open = Array.from({ length: c * c }, () => ({ r: false, d: false, l: false, u: false })), seen = new Set([0]), stack = [0];
      while (stack.length) {                                  // recursive backtracker
        const cur = stack[stack.length - 1], cx = cur % c, cy = Math.floor(cur / c);
        const nb = [[1, 0, "r", "l"], [-1, 0, "l", "r"], [0, 1, "d", "u"], [0, -1, "u", "d"]].filter(([dx, dy]) => cx + dx >= 0 && cx + dx < c && cy + dy >= 0 && cy + dy < c && !seen.has((cy + dy) * c + cx + dx));
        if (!nb.length) { stack.pop(); continue; }
        const [dx, dy, a, b] = nb[Math.floor(r() * nb.length)], nx = (cy + dy) * c + cx + dx;
        open[cur][a] = true; open[nx][b] = true; seen.add(nx); stack.push(nx);
      }
      const g = F.el("g", { style: "mix-blend-mode:screen" }, L.g);
      let d = "";
      for (let j = 0; j < c; j++) for (let i = 0; i < c; i++) {
        const X = x0 + i * cell, Y = y0 + j * cell, k = open[j * c + i];
        if (!k.u) d += `M${X} ${Y}L${X + cell} ${Y}`; if (!k.l) d += `M${X} ${Y}L${X} ${Y + cell}`;
        if (j === c - 1) d += `M${X} ${Y + cell}L${X + cell} ${Y + cell}`; if (i === c - 1) d += `M${X + cell} ${Y}L${X + cell} ${Y + cell}`;
      }
      F.el("path", { d, stroke: col, "stroke-width": 7, "stroke-linecap": "round", fill: "none", opacity: 0.95 }, g);
      F.el("path", { d, stroke: col, "stroke-width": 18, "stroke-linecap": "round", fill: "none", opacity: 0.22 }, g);
      // solution: BFS from the top-left to the bottom-right cell
      const prev = new Map([[0, -1]]), q = [0];
      while (q.length) { const cur = q.shift(); if (cur === c * c - 1) break; const k = open[cur];
        for (const [f, dd] of [["r", 1], ["l", -1], ["d", c], ["u", -c]]) if (k[f] && !prev.has(cur + dd)) { prev.set(cur + dd, cur); q.push(cur + dd); } }
      const path = []; for (let n = c * c - 1; n !== -1 && n !== undefined; n = prev.get(n)) path.unshift(n);
      const pos = (n) => [x0 + (n % c + 0.5) * cell, y0 + (Math.floor(n / c) + 0.5) * cell];
      const flag = pos(c * c - 1);
      F.el("path", { d: `M${flag[0]} ${flag[1] + cell * 0.3} L${flag[0]} ${flag[1] - cell * 0.3}`, stroke: "#FFD43B", "stroke-width": 5 }, g);
      F.el("path", { d: `M${flag[0]} ${flag[1] - cell * 0.3} l${cell * 0.3} ${cell * 0.12} l${-cell * 0.3} ${cell * 0.12}Z`, fill: "#FFD43B" }, g);
      if (o.ball !== false) {
        const ball = F.el("circle", { r: cell * 0.22, fill: "#FFFFFF" }, g), t0 = o.t0 ?? 0.5, t1 = o.t1 ?? (S.dur - 0.5);
        S.on((t) => { const u = F.smooth(F.seg(t, t0, t1)) * (path.length - 1), i = Math.min(path.length - 2, Math.floor(u)), p = pos(path[i]), p2 = pos(path[i + 1]), f = u - i;
          ball.setAttribute("cx", (p[0] + (p2[0] - p[0]) * f).toFixed(1)); ball.setAttribute("cy", (p[1] + (p2[1] - p[1]) * f).toFixed(1)); });
      }
      return { g };
    };

    // ── circuit ───────────────────────────────────────────────────────
    S.circuit = (L, o = {}) => {
      const x0 = (o.x ?? W / 2) - (o.w ?? W) / 2, y0 = (o.y ?? H / 2) - (o.h ?? H) / 2, w = o.w ?? W, h = o.h ?? H, col = o.color || "#FF4A4A", r = F.rnd(o.seed ?? 6), n = o.density ?? 34;
      const g = F.el("g", { style: "mix-blend-mode:screen" }, L.g);
      for (let i = 0; i < n; i++) {
        let px = x0 + r() * w, py = y0 + r() * h, d = `M${px.toFixed(0)} ${py.toFixed(0)}`, dir = Math.floor(r() * 4);
        for (let k = 0; k < 4; k++) { const len = 80 + r() * 260; dir = (dir + (r() < 0.5 ? 1 : 3)) % 4; px += [1, 0, -1, 0][dir] * len; py += [0, 1, 0, -1][dir] * len; d += `L${px.toFixed(0)} ${py.toFixed(0)}`; }
        F.el("path", { d, fill: "none", stroke: col, "stroke-width": 4, opacity: 0.55, "stroke-linejoin": "round" }, g);
        F.el("circle", { cx: px, cy: py, r: 9, fill: col, opacity: 0.9 }, g);
      }
      return { g };
    };

    // ── servers ───────────────────────────────────────────────────────
    S.servers = (L, o = {}) => {
      const w = o.w ?? W, h = o.h ?? 900, cols = o.cols ?? 4, cx = o.x ?? W / 2, cy = o.y ?? H / 2, col = o.color || "#3F9DE4", r = F.rnd(o.seed ?? 7);
      const g = F.el("g", {}, L.g), rw = w / (cols + 0.6), lights = [];
      for (let i = 0; i < cols; i++) {
        const x = cx - w / 2 + 0.3 * rw + i * rw, hh = h * (0.7 + 0.3 * (1 - Math.abs(i - (cols - 1) / 2) / cols));
        F.el("rect", { x, y: cy + h / 2 - hh, width: rw * 0.82, height: hh, rx: 16, fill: F.lg(L.defs, [F.shade(col, -0.1), F.shade(col, -0.6)], 0, 0, 0, 1) }, g);
        for (let j = 0; j < 9; j++) {
          const yy = cy + h / 2 - hh + 40 + j * (hh - 80) / 9;
          F.el("rect", { x: x + 20, y: yy, width: rw * 0.82 - 40, height: (hh - 80) / 9 - 14, rx: 6, fill: F.shade(col, 0.15), opacity: 0.45 }, g);
          lights.push({ c: F.el("circle", { cx: x + rw * 0.82 - 36, cy: yy + 12, r: 7, fill: (o.alarm === i && j === 4) ? "#FF3B3B" : "#7FFFB0" }, g), ph: r() * 6, red: o.alarm === i && j === 4 });
        }
      }
      S.on((t) => { for (const l of lights) l.c.setAttribute("opacity", (l.red ? 0.6 + 0.4 * Math.sin(t * 6) : 0.3 + 0.7 * (Math.sin(t * 2.4 + l.ph) > 0.2 ? 1 : 0.25)).toFixed(2)); });
      return { g };
    };

    // ── globe ─────────────────────────────────────────────────────────
    S.globe = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, r0 = o.r ?? 300, g = F.el("g", {}, L.g);
      F.el("circle", { cx: x, cy: y, r: r0 * 1.18, fill: F.rg(L.defs, [[0.7, "#FF3B3B", 0.5], [1, "#FF3B3B", 0]]), style: "mix-blend-mode:screen" }, g);
      F.el("circle", { cx: x, cy: y, r: r0, fill: F.rg(L.defs, [[0, "#47C6E8"], [1, "#1B5FB0"]]) }, g);
      const clip = F.el("clipPath", { id: F.uid("gc") }, L.defs); F.el("circle", { cx: x, cy: y, r: r0 }, clip);
      const land = F.el("g", { "clip-path": `url(#${clip.id})` }, g);
      [[-0.4, -0.2, 0.42], [0.35, 0.15, 0.36], [-0.1, 0.55, 0.26], [0.05, -0.62, 0.22]].forEach(([dx, dy, k]) => F.el("ellipse", { cx: x + dx * r0, cy: y + dy * r0, rx: k * r0, ry: k * r0 * 0.7, fill: "#6EDC82" }, land));
      const bolts = [];
      for (let i = 0; i < (o.bolts ?? 0); i++) bolts.push(F.el("path", { fill: "none", stroke: "#FFFFFF", "stroke-width": 6, "stroke-linejoin": "round", opacity: 0 }, g));
      S.on((t) => bolts.forEach((b, i) => {
        const a = i * 2.2 + 0.4, bx = x + Math.cos(a) * r0, by = y + Math.sin(a) * r0, k = F.noise(t * 5 + i * 3, i + 1) > 0.15 ? 1 : 0;
        let d = `M${bx.toFixed(0)} ${by.toFixed(0)}`, px = bx, py = by;
        for (let s2 = 1; s2 <= 5; s2++) { px += Math.cos(a) * 70 + F.noise(t * 9 + s2 * 2 + i, 3) * 60; py += Math.sin(a) * 70 + F.noise(t * 9 + s2, 5 + i) * 60; d += `L${px.toFixed(0)} ${py.toFixed(0)}`; }
        b.setAttribute("d", d); b.setAttribute("opacity", (k * 0.95).toFixed(2));
      }));
      return { g };
    };

    S.folders = (L, o = {}) => {
      const cols = o.cols ?? 3, rows = o.rows ?? 4, gap = o.gap ?? 150, x0 = o.x ?? W / 2, y0 = o.y ?? H / 2, col = o.color || "#FF6FB1", g = F.el("g", {}, L.g), items = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const fx = x0 + (i - (cols - 1) / 2) * gap, fy = y0 + (j - (rows - 1) / 2) * gap * 0.8, n = F.el("g", {}, g);
        F.el("path", { d: "M-46 -24 L-18 -24 L-8 -34 L46 -34 L46 30 L-46 30 Z", fill: F.shade(col, -0.2) }, n); F.el("rect", { x: -46, y: -14, width: 92, height: 44, rx: 6, fill: col }, n);
        items.push({ n, fx, fy, at: (i + j * cols) * 0.12 });
      }
      S.on((t) => { for (const it of items) { const p = F.eBack(F.seg(t, 0.2 + it.at, 0.55 + it.at), 1.8); it.n.setAttribute("transform", `translate(${it.fx} ${it.fy}) scale(${p.toFixed(3)})`); it.n.setAttribute("opacity", Math.min(1, p * 2)); } });
      return { g };
    };

    S.window = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 640, h = o.h ?? 460, at = o.at ?? 0.3, g = F.el("g", {}, L.g);
      F.el("rect", { x: x - w / 2 + 8, y: y - h / 2 + 14, width: w, height: h, rx: 26, fill: "#000", opacity: 0.25 }, g);
      F.el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 26, fill: "#FFFFFF" }, g);
      F.el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: 62, rx: 26, fill: "#E6E9FF" }, g); F.el("rect", { x: x - w / 2, y: y - h / 2 + 30, width: w, height: 32, fill: "#E6E9FF" }, g);
      ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => F.el("circle", { cx: x - w / 2 + 38 + i * 30, cy: y - h / 2 + 31, r: 9, fill: c }, g));
      (o.lines ?? []).forEach((l, i) => { F.el("rect", { x: x - w / 2 + 40, y: y - h / 2 + 100 + i * 46, width: Math.min(w - 80, l), height: 18, rx: 9, fill: i % 2 ? "#C9CFF5" : "#9AA6EE" }, g); });
      (o.bubbles ?? []).forEach((b, i) => { F.el("rect", { x: x - w / 2 + 40 + (i % 2) * 90, y: y - h / 2 + 96 + i * 78, width: w - 190, height: 56, rx: 28, fill: i % 2 ? "#FFB2D6" : "#B9C4FF" }, g); });
      S.on((t) => { const p = F.eBack(F.seg(t, at, at + 0.45), 1.6); g.setAttribute("transform", `translate(${x} ${y}) scale(${p.toFixed(3)}) translate(${-x} ${-y})`); g.setAttribute("opacity", Math.min(1, p * 2)); });
      return { g };
    };

    S.terminal = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 760, h = o.h ?? 300, at = o.at ?? 0.3, g = F.el("g", {}, L.g);
      F.el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 30, fill: "#07070C", stroke: "#1E8F63", "stroke-width": 3 }, g);
      const av = F.el("g", { transform: `translate(${x - w / 2 - 20} ${y})` }, g);
      F.el("path", { d: "M0 -92 L92 0 L0 92 L-92 0 Z", fill: "#0A1A18", stroke: "#4FE3A0", "stroke-width": 4 }, av); F.el("circle", { r: 26, fill: "#FFFFFF" }, av); F.el("circle", { r: 10, fill: "#07070C" }, av);
      if (o.name) { const nm = S.div("hud", "", ""); nm.textContent = o.name; Object.assign(nm.style, { left: `${x - w / 2 - 20}px`, top: `${y + 110}px`, transform: "translateX(-50%)", fontFamily: MONO, fontSize: "30px", letterSpacing: "0.16em", color: "#C8FFE6", textTransform: "uppercase", whiteSpace: "nowrap", opacity: 0 }); S.on((t) => { nm.style.opacity = F.seg(t, at, at + 0.3).toFixed(2); }); }
      const tx = S.div("hud", "", ""); Object.assign(tx.style, { left: `${x - w / 2 + 120}px`, top: `${y - h / 2 + 34}px`, width: `${w - 160}px`, fontFamily: MONO, fontSize: "34px", lineHeight: "1.35", color: "#EFFFF8", whiteSpace: "normal", opacity: 0 });
      const text = o.text || "", cps = o.cps ?? 40;
      S.on((t) => { tx.style.opacity = F.seg(t, at, at + 0.2).toFixed(2); const n = Math.max(0, Math.min(text.length, Math.floor((t - at - 0.3) * cps))); const sub = text.slice(0, n); if (tx._s !== sub) { tx._s = sub; tx.textContent = sub; } });
      return { g };
    };

    S.arms = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, w = o.w ?? 760, col = o.color || "#C9B8FF", g = F.el("g", { style: "mix-blend-mode:screen" }, L.g);
      for (const sx of [-1, 1]) {
        const bx = x + sx * w / 2, bolt = F.el("path", { fill: "none", stroke: col, "stroke-width": 6, "stroke-linejoin": "round" }, g);
        F.el("ellipse", { cx: bx + sx * 56, cy: y, rx: 48, ry: 92, fill: F.rg(L.defs, [[0, "#FFFFFF", 0.95], [0.5, "#B58CFF", 0.8], [1, "#7A3BE0", 0.0]]) }, g);
        S.on((t) => { let d = `M${bx + sx * 40} ${y - 170}`, py = y - 170; for (let i = 1; i <= 8; i++) { py += 42; d += `L${(bx + sx * (20 + 30 * F.noise(t * 6 + i * 1.3, sx + 3))).toFixed(0)} ${py.toFixed(0)}`; } bolt.setAttribute("d", d); });
      }
      return { g };
    };

    S.stack = (L, o = {}) => {
      const x = o.x ?? W / 2, y = o.y ?? H / 2, n = o.n ?? 5, col = o.color || "#3F9DE4", g = F.el("g", {}, L.g);
      for (let i = 0; i < n; i++) {
        const pink = i === 1, c = pink ? "#FF2E93" : F.shade(col, (i % 2) * 0.12), cy = y + (i - n / 2) * 70;
        F.el("polygon", { points: `${x - 260},${cy} ${x},${cy - 130} ${x + 260},${cy} ${x},${cy + 130}`, fill: F.shade(c, -0.25), transform: "translate(0 22)" }, g);
        F.el("polygon", { points: `${x - 260},${cy} ${x},${cy - 130} ${x + 260},${cy} ${x},${cy + 130}`, fill: F.lg(L.defs, [F.shade(c, 0.2), c], 0, 0, 1, 1) }, g);
        for (let k = 0; k < 3; k++) F.el("line", { x1: x - 140 + k * 30, y1: cy + 28 - k * 14, x2: x + 60 + k * 30, y2: cy - 72 - k * 14, stroke: pink ? "#FFD0E6" : "#E6F2FF", "stroke-width": 8, "stroke-linecap": "round", opacity: 0.6 }, g);
      }
      return { g };
    };
  });
})();
