/* GLOWFRAME — text: every word on screen, drawn in code. Screen-space HTML over the picture, placed on the spoken word
 * (`at`, shot seconds: use S.at("phrase")). Things stay until the shot ends unless `until` is given. Faces: Kode Mono (the
 * kicker, titles, terminal), Nunito 800 (chips and labels), Lilita One (the big shouted word).
 *
 *  S.chapter({kicker, title, at=.3, until, cps=13, color="#58F0A6", y})   a chapter card: the kicker types out letter by letter
 *                                    in wide-tracked capitals, then ONE big title line appears whole beneath it, with a soft glow
 *  S.chip({text, x, y, at, until, color="#2FBF5B", textColor="#fff", size=40, tail:"down"|"left"|"right"|"none"})
 *                                    a coloured pill that pops in (a name, a category, a year); the tail points at what it names
 *  S.say(text, {x, y, at, until, w=520, tail:[dx,dy], cps=34, size=38, who})   a speech / quote bubble: white, dark text typed in,
 *                                    a curved tail toward (x+dx, y+dy); `who` adds an italic attribution line
 *  S.tag(name, {role, place, at, until, x=60, y, color="#2FBF5B", dark})  the expert lower-third: a solid tag with the name, then two small lines (dark: on a light ground)
 *  S.shout(word, {at, until, x, y, size=300, rot=-8, color="#FFFFFF", stroke="#1B0C3A"})   one huge tilted wobbling word ("Nooo")
 *  S.kick(text, {x, y, at, until, size=30, color="#8B6FE0"})                a tiny tracked-capitals line (a dateline, a "Direct quote:" line)
 * Every function returns the element; `el.hide(t)` fades it out from time t.
 */
(function () {
  "use strict";
  const F = window.FOLIO;
  const W = F.W, H = F.H;
  const MONO = '"Kode Mono", "Share Tech Mono", monospace', CHIP = '"Nunito", Arial, sans-serif', SHOUT = '"Lilita One", "Nunito", sans-serif';

  F.plugins.push((S) => {
    const px = (v) => `${Math.round(v)}px`;
    const div = (css, html = "") => { const d = S.div("hud", "", html); Object.assign(d.style, { whiteSpace: "nowrap" }, css || {}); return d; };
    // fade + a small rise in; fade out from `until`
    const life = (el, at, until, rise = 10, dur = 0.45, scaleFrom = 1) => {
      let hideAt = until ?? null;
      el.hide = (t) => { hideAt = t; return el; };
      el.style.opacity = 0;
      const base = el.dataset.tf || "";
      S.on((t) => {
        const a = F.eOut(F.seg(t, at, at + dur)), b = hideAt == null ? 1 : 1 - F.smooth(F.seg(t, hideAt, hideAt + 0.35));
        el.style.opacity = (a * b).toFixed(3);
        const s = scaleFrom + (1 - scaleFrom) * F.eBack(F.seg(t, at, at + dur), 1.6);
        el.style.transform = `${base} translateY(${Math.round((1 - a) * rise)}px) scale(${s.toFixed(3)})`.trim();
      });
      return el;
    };
    const typedTo = (el, text, at, cps) => {
      S.on((t) => { const n = Math.max(0, Math.min(text.length, Math.floor((t - at) * cps))); const s = text.slice(0, n); if (el._s !== s) { el._s = s; el.textContent = s; } });
    };

    S.chapter = (o = {}) => {
      const at = o.at ?? 0.3, cps = o.cps ?? 13, color = o.color || "#58F0A6", y = o.y ?? H * 0.4;
      const kick = (o.kicker || "").toUpperCase(), kd = kick.length / cps;
      const k = div({ left: 0, width: px(W), top: px(y), textAlign: "center", color, fontFamily: MONO, fontWeight: 500, fontSize: px(o.kSize ?? 34),
                      letterSpacing: "0.3em", textShadow: `0 0 18px ${color}88`, lineHeight: "1.2" });
      k.dataset.tf = ""; life(k, at, o.until, 0, 0.1); typedTo(k, kick, at, cps);
      const tT = at + kd + 0.18;
      const t1 = div({ left: px(W * 0.06), width: px(W * 0.88), top: px(y + 70), textAlign: "center", whiteSpace: "normal", color: "#DDFFF0", fontFamily: MONO, fontWeight: 600,
                       fontSize: px(o.size ?? 104), lineHeight: "1.08", textShadow: `0 0 28px ${color}77, 0 2px 10px rgba(0,0,0,.4)` }, "");
      t1.textContent = o.title || "";
      life(t1, tT, o.until, 0, 0.35, 0.94);
      return t1;
    };

    S.chip = (o = {}) => {
      const color = o.color || "#2FBF5B", size = o.size ?? 40, tail = o.tail || "none", at = o.at ?? 0.3;
      const d = div({ left: px(o.x ?? W / 2), top: px(o.y ?? H / 2), padding: `${Math.round(size * 0.28)}px ${Math.round(size * 0.7)}px`, borderRadius: "999px", background: color,
                      color: o.textColor || "#FFFFFF", fontFamily: CHIP, fontWeight: 800, fontSize: px(size), lineHeight: "1.1", boxShadow: `0 8px 22px rgba(0,0,0,.28), 0 0 26px ${color}66` }, "");
      d.textContent = o.text || "";
      if (tail !== "none") {
        const t = document.createElement("div"), s = Math.round(size * 0.36);
        Object.assign(t.style, { position: "absolute", width: 0, height: 0, borderLeft: `${s}px solid transparent`, borderRight: `${s}px solid transparent`, borderTop: `${Math.round(s * 1.2)}px solid ${color}` });
        if (tail === "down") Object.assign(t.style, { left: "50%", bottom: `${-Math.round(s * 1.1)}px`, marginLeft: `${-s}px` });
        if (tail === "left") Object.assign(t.style, { left: `${-Math.round(s * 1.5)}px`, top: "50%", marginTop: `${-s}px`, transform: "rotate(90deg)" });
        if (tail === "right") Object.assign(t.style, { right: `${-Math.round(s * 1.5)}px`, top: "50%", marginTop: `${-s}px`, transform: "rotate(-90deg)" });
        d.appendChild(t);
      }
      d.dataset.tf = "translate(-50%, -50%)";
      return life(d, at, o.until, 0, 0.4, 0.55);
    };

    S.say = (text, o = {}) => {
      const w = o.w ?? 520, size = o.size ?? 38, at = o.at ?? 0.3, cps = o.cps ?? 34, x = o.x ?? W / 2, y = o.y ?? H * 0.3;
      const d = div({ left: px(x), top: px(y), width: px(w), padding: "22px 30px", borderRadius: "28px", background: "#FFFFFF", color: "#1A1030", whiteSpace: "normal", fontFamily: CHIP,
                      fontWeight: 700, fontSize: px(size), lineHeight: "1.25", boxShadow: "0 10px 28px rgba(0,0,0,.32)" }, "");
      const body = document.createElement("div"); d.appendChild(body); typedTo(body, text, at + 0.15, cps);
      // reserve the final height so the bubble does not grow while it types
      const ghost = document.createElement("div"); ghost.textContent = text; ghost.style.visibility = "hidden"; ghost.style.height = "0"; ghost.style.overflow = "hidden"; d.appendChild(ghost);
      d.style.minHeight = "1px";
      if (o.who) { const wh = document.createElement("div"); wh.textContent = "— " + o.who; Object.assign(wh.style, { marginTop: "8px", fontStyle: "italic", fontWeight: 600, fontSize: px(size * 0.72), color: "#6B5A92" }); d.appendChild(wh); }
      if (o.tail) {
        const [tx, ty] = o.tail, svg = F.el("svg", { width: 120, height: 120, viewBox: "-60 -60 120 120", style: "position:absolute;left:50%;top:100%;overflow:visible;margin:-2px 0 0 -60px" });
        F.el("path", { d: `M-18 0 Q0 ${Math.max(20, ty * 0.5)} ${tx * 0.6} ${ty * 0.9} Q${tx * 0.2} ${ty * 0.4} 22 0 Z`, fill: "#FFFFFF" }, svg);
        d.appendChild(svg);
      }
      d.dataset.tf = "translate(-50%, 0)";
      return life(d, at, o.until, 8, 0.4, 0.9);
    };

    S.tag = (name, o = {}) => {
      const color = o.color || "#2FBF5B", at = o.at ?? 0.4, y = o.y ?? H * 0.74;
      const box = div({ left: px(o.x ?? 60), top: px(y) }, "");
      const n = document.createElement("div");
      n.textContent = name; Object.assign(n.style, { display: "inline-block", background: color, color: "#FFFFFF", fontFamily: CHIP, fontWeight: 800, fontSize: px(o.size ?? 48), padding: "8px 26px 10px 22px", clipPath: "polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)", boxShadow: "0 6px 18px rgba(0,0,0,.3)" });
      box.appendChild(n);
      [o.role, o.place].filter(Boolean).forEach((line, i) => { const l = document.createElement("div"); l.textContent = line; Object.assign(l.style, { fontFamily: CHIP, fontWeight: 800, fontSize: px(32), color: o.dark ? (i ? "#5A4A86" : "#2B1A5E") : (i ? "#CFE9D8" : "#FFE08A"), marginTop: "6px", marginLeft: "4px", textShadow: o.dark ? "none" : "0 2px 8px rgba(0,0,0,.5)" }); box.appendChild(l); });
      return life(box, at, o.until, 0, 0.35, 0.92);
    };

    S.shout = (word, o = {}) => {
      const at = o.at ?? 0.2, size = o.size ?? 300, rot = o.rot ?? -8;
      const d = div({ left: px(o.x ?? W / 2), top: px(o.y ?? H / 2), color: o.color || "#FFFFFF", fontFamily: SHOUT, fontSize: px(size), lineHeight: "1", letterSpacing: "0.02em",
                      webkitTextStroke: `${Math.round(size * 0.07)}px ${o.stroke || "#1B0C3A"}`, paintOrder: "stroke fill", textShadow: "0 14px 0 rgba(0,0,0,.35)" }, "");
      d.textContent = word;
      let hideAt = o.until ?? null; d.hide = (t) => { hideAt = t; return d; };
      S.on((t) => {
        const a = F.eBack(F.seg(t, at, at + 0.3), 2.2), b = hideAt == null ? 1 : 1 - F.smooth(F.seg(t, hideAt, hideAt + 0.2));
        const wob = Math.sin((t - at) * 14) * 2.2 * (1 - F.seg(t, at + 0.5, at + 1.4));
        d.style.opacity = (Math.min(1, a * 3) * b).toFixed(3);
        d.style.transform = `translate(-50%, -50%) rotate(${(rot + wob).toFixed(2)}deg) scale(${(0.4 + 0.6 * a).toFixed(3)})`;
      });
      return d;
    };

    S.kick = (text, o = {}) => {
      const d = div({ left: px(o.x ?? 60), top: px(o.y ?? 120), color: o.color || "#8B6FE0", fontFamily: MONO, fontSize: px(o.size ?? 30), letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0 }, "");
      d.dataset.tf = ""; typedTo(d, text, o.at ?? 0.2, o.cps ?? 40);
      return life(d, o.at ?? 0.2, o.until, 0, 0.2);
    };
  });
})();
