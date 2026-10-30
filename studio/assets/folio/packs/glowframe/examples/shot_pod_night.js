// GLOWFRAME night scene: a one-eyed pod in a magenta halo, stars, a slow push-in, a chip that names it.
FOLIO.scene({ build(S) {
  const F = FOLIO, W = S.W, H = S.H;
  const bg = S.layer({ p: 0.5, name: "bg" });
  S.ground(bg, { mode: "night", tone: "navy" });
  S.stars(bg, { n: 70, seed: 3 });
  const mid = S.layer({ p: 1, name: "mid" });
  S.halo(mid, { x: W / 2, y: 1040, r: 760, color: "#C4247E", a: 0.75, pulse: 0.06 });
  F.el("ellipse", { cx: W / 2, cy: 1330, rx: 380, ry: 46, fill: "#C4247E", opacity: 0.35 }, mid.g);   // a pool of light on the floor
  const pod = S.pod(mid, { x: W / 2, y: 1320, h: 640, kind: "dome", color: "#C4247E", eye: "orb", eyeColor: "#38F5FF" });
  pod.look("left", 0.8, 0.4); pod.look("right", 2.2, 0.4); pod.look("center", 3.4, 0.4); pod.hop(2.8, 90, 0.6); pod.mood("worried", 3.6, 0.4);
  S.cam([{ t: 0, x: W / 2, y: 980, zoom: 1.0 }, { t: S.dur, x: W / 2, y: 1030, zoom: 1.16 }]);
  S.chip({ text: "Agent", x: W / 2, y: 560, at: 1.0, color: "#2FBF5B", tail: "down", size: 54 });
}});
