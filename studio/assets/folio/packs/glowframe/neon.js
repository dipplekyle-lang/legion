/* GLOWFRAME — neon: the ground, the glow and the air of the look. Two modes: NIGHT (near-black or deep indigo, one neon
 * accent, micro-worlds and tension) and DAY (a flat pastel gradient, people and ideas). One mode per scene, never mixed.
 *
 *  S.ground(L, {mode:"night"|"day", tone, glow:{x,y,r,color,a}})   the full-bleed ground (a gradient top → bottom)
 *        night tones: navy · violet · teal · wine · green      day tones: cyan · mint · yellow · peach · lilac · sky
 *  S.halo(L, {x, y, r=420, color="#FF2E93", a=.8, pulse=0})       the soft light behind a subject (screen blend)
 *  S.rain(L, {x=0, y, w, h, color="#4FE3A0", n=70, seed, speed=26})  faint "digital rain" bits drifting up from a glow
 *  S.stars(L, {n=60, area:[x,y,w,h], color="#FFFFFF", seed})       tiny twinkling points (night)
 *  F.NEON                                                          the palette: F.NEON.accent.green/pink/blue/amber/violet/red
 */
(function () {
  "use strict";
  const F = window.FOLIO;
  const W = F.W, H = F.H;
  const NIGHT = { navy: ["#02030B", "#0E1A44"], violet: ["#0A0420", "#2C0E5E"], teal: ["#021117", "#0A3A46"],
                  wine: ["#12040F", "#3A0D33"], green: ["#020A0A", "#0A3B2C"] };
  const DAY = { cyan: ["#BDEBF2", "#EAFBF8"], mint: ["#A9F0D1", "#E8FFF3"], yellow: ["#FFD84A", "#FFF4B8"],
                peach: ["#FFC2A0", "#FFEBD9"], lilac: ["#C7A4FF", "#F0E4FF"], sky: ["#7FC4FF", "#DDF0FF"] };
  F.NEON = { night: NIGHT, day: DAY,
             accent: { green: "#4FE3A0", pink: "#FF2E93", blue: "#3F9DE4", amber: "#FFB02E", violet: "#9846E9", red: "#FF3B3B",
                       cyan: "#38F5FF", yellow: "#F5C518", magenta: "#C4247E", white: "#F2F7FF" },
             skin: ["#F2C8A6", "#D6A27A", "#A9714B", "#7A4A2E"] };

  F.plugins.push((S) => {
    S.ground = (L, o = {}) => {
      const mode = o.mode === "day" ? "day" : "night";
      const tab = mode === "day" ? DAY : NIGHT;
      const st = tab[o.tone] || tab[mode === "day" ? "cyan" : "navy"];
      L.add(`<rect data-cover="1" x="-600" y="-600" width="${W + 1200}" height="${H + 1200}" fill="${F.lg(L.defs, st, 0, 0, 0, 1)}"/>`);
      if (o.glow) S.halo(L, o.glow);
      return mode;
    };

    S.halo = (L, o = {}) => S.glow(L, { x: o.x ?? W / 2, y: o.y ?? H / 2, r: o.r ?? 420, color: o.color || F.NEON.accent.pink,
                                         a: o.a ?? 0.8, pulse: o.pulse || 0 });

    S.rain = (L, o = {}) => {
      const x0 = o.x ?? 0, w = o.w ?? W, h = o.h ?? 700, y0 = o.y ?? H - h, n = o.n ?? 70, color = o.color || F.NEON.accent.green;
      const speed = o.speed ?? 26, r = F.rnd(o.seed ?? 5);
      const g = F.el("g", { style: "mix-blend-mode:screen" }, L.g);
      const bits = [];
      for (let i = 0; i < n; i++) {
        const bw = 4 + Math.floor(r() * 10), bh = 6 + Math.floor(r() * 22), tall = r() < 0.35;
        const rect = F.el("rect", { width: tall ? 3 : bw, height: tall ? bh * 1.6 : bh, rx: 1, fill: color }, g);
        bits.push({ rect, x: x0 + r() * w, v: 0.5 + r() * 1.1, ph: r() * h, base: 0.1 + r() * 0.35 });
      }
      // a glow along the bottom edge the bits rise out of
      F.el("rect", { x: x0, y: y0 + h * 0.45, width: w, height: h * 0.55,
                     fill: F.lg(L.defs, [[0, color, 0], [1, color, 0.32]], 0, 0, 0, 1) }, g);
      S.on((t) => {
        for (const b of bits) {
          const p = ((b.ph + t * speed * b.v) % h + h) % h;           // rises, then wraps
          const y = y0 + h - p, fade = Math.min(1, p / (h * 0.25)) * Math.min(1, (h - p) / (h * 0.35));
          b.rect.setAttribute("x", b.x.toFixed(1)); b.rect.setAttribute("y", y.toFixed(1));
          b.rect.setAttribute("opacity", (b.base * fade).toFixed(3));
        }
      });
      return g;
    };

    S.stars = (L, o = {}) => {
      const n = o.n ?? 60, [ax, ay, aw, ah] = o.area || [0, 0, W, H], r = F.rnd(o.seed ?? 11), color = o.color || "#FFFFFF";
      const g = F.el("g", {}, L.g), pts = [];
      for (let i = 0; i < n; i++) pts.push({ c: F.el("circle", { cx: ax + r() * aw, cy: ay + r() * ah, r: 1.2 + r() * 2.4, fill: color }, g), ph: r() * 6, sp: 0.6 + r() * 1.6, base: 0.25 + r() * 0.6 });
      S.on((t) => { for (const p of pts) p.c.setAttribute("opacity", (p.base * (0.55 + 0.45 * Math.sin(t * p.sp + p.ph))).toFixed(3)); });
      return g;
    };
  });
})();
