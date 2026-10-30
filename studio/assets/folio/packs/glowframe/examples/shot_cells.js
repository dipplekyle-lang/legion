// GLOWFRAME micro-world (night, violet): a raft of cells with a virus drifting in, a chip names the virus.
FOLIO.scene({ build(S) {
  const F = FOLIO, W = S.W, H = S.H;
  const bg = S.layer({ p: 0.5, name: "bg" });
  S.ground(bg, { mode: "night", tone: "violet", glow: { x: W / 2, y: 900, r: 900, color: "#7A3BE0", a: 0.35 } });
  const tis = S.layer({ p: 0.9, name: "tissue" });
  S.tissue(tis, { x: W / 2, y: 1450, w: W + 200, h: 900, r: 92, fill: "#E8681B", ring: "#FFD43B", nucleus: "#FF4FB6", seed: 5 });
  const back = S.layer({ p: 0.7, blur: 3, name: "back" });
  S.tissue(back, { x: W / 2, y: 560, w: W + 200, h: 560, r: 70, fill: "#3A1C8F", ring: "#6F6BFF", nucleus: "#C060FF", seed: 9 });
  const fg = S.layer({ p: 1.1, name: "fg" });
  const v = S.virus(fg, { x: 560, y: 920, r: 120, color: "#7FE08A", spin: 0.35 });
  S.cam([{ t: 0, x: W / 2, y: 960, zoom: 1.0, rot: 0 }, { t: S.dur, x: W / 2 + 40, y: 940, zoom: 1.12, rot: 2 }]);
  S.chip({ text: "Virus", x: 560, y: 700, at: 1.2, color: "#2FBF5B", tail: "down", size: 52 });
}});
