// GLOWFRAME day scene: an expert on a butter-yellow ground, a soft light, the lower-third tag popping in.
FOLIO.scene({ build(S) {
  const F = FOLIO, W = S.W, H = S.H;
  const bg = S.layer({ p: 0.5, name: "bg" });
  S.ground(bg, { mode: "day", tone: "yellow" });
  S.halo(bg, { x: W / 2, y: 900, r: 800, color: "#FFFFFF", a: 0.5 });
  const mid = S.layer({ p: 1, name: "mid" });
  F.el("ellipse", { cx: W / 2, cy: 1500, rx: 340, ry: 38, fill: "#C99A1E", opacity: 0.28 }, mid.g);   // a soft floor shadow
  const e = S.human(mid, F.PEOPLE.expert, { x: W / 2, y: 1500, h: 1100, pose: "stand" });
  e.expr("smile", 0.6); e.wave(1.0, 2.4); e.pose("wave", 0.9, 0.5); e.pose("think", 2.8, 0.6); e.expr("worried", 3.0); e.talk(1.2, 2.6);
  S.cam([{ t: 0, x: W / 2, y: 980, zoom: 1.0 }, { t: S.dur, x: W / 2, y: 1000, zoom: 1.08 }]);
  S.tag("Dr. Alma Reyes", { role: "Virologist", place: "University of Valencia", at: 0.8, y: 1560, color: "#2FBF5B" });
}});
