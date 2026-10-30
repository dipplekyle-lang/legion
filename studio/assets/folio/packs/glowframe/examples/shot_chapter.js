// GLOWFRAME chapter card: dark green ground, digital rain rising from the bottom, kicker typed, then the title.
// Stills: python folio.py still assets/folio/packs/glowframe/examples/shot_chapter.js --pack glowframe --dur 5 --t 0.8,2.2,4.2 --scale 0.4
FOLIO.scene({ build(S) {
  const F = FOLIO, W = S.W, H = S.H;
  const bg = S.layer({ p: 0.6, name: "bg" });
  S.ground(bg, { mode: "night", tone: "green" });
  const rain = S.layer({ p: 0.85, name: "rain" });
  S.rain(rain, { y: H - 900, h: 900, n: 90, color: "#4FE3A0", seed: 4 });
  S.cam([{ t: 0, x: W / 2, y: H / 2, zoom: 1.0 }, { t: S.dur, x: W / 2, y: H / 2, zoom: 1.05 }]);
  S.chapter({ kicker: "How do you grow an", title: "Intelligence?", at: 0.3 });
}});
