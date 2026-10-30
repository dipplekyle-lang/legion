/* surge.js — the SURGE kit (FAST style): flat "hand-made" graphics learned from two fast-cut doc-shorts — cards,
   flipbooks, pages, highlighter bars, type slams — animated STEPPED (10 fps GLOW / 7.5-12 fps PAPER) while footage
   runs at 30 fps. Devices live in surge/core.js, cards.js, type.js, hero.js, docs.js (KITS["surge"]["libs"]).
   Rendered with shutter 1: a stepped element lands in one frame, never a blended one. */
const CSS = `
.scard{position:absolute}.sbox{position:absolute;inset:0;overflow:hidden}
.sglow{position:absolute;inset:-5%;opacity:.3}.sglow img{transform:scale(1.03)}
.scard.glow .sbox{box-shadow:0 0 3px rgba(255,255,255,.75),0 0 22px rgba(255,255,255,.32),0 0 70px rgba(255,255,255,.16)}
.scard.glow2 .sbox{box-shadow:0 0 10px #fff,0 0 50px rgba(255,255,255,.9),0 0 140px rgba(255,255,255,.6),0 0 300px rgba(255,255,255,.3)}
.smear{opacity:.8;filter:url(#hsmear)}.smear .sbox{box-shadow:none}
.pcard .sbox{box-shadow:0 12px 34px rgba(0,0,0,.20);-webkit-mask-image:linear-gradient(90deg,rgba(0,0,0,.25),#000 3%,#000 97%,rgba(0,0,0,.25))}
.hdl{position:absolute;width:14px;height:14px;z-index:3;background:#000}.hdl.lit{background:#fff;box-shadow:0 0 10px rgba(255,255,255,.9)}
.deck{position:absolute;inset:0;transform-origin:50% 50%}.cut .sbox{box-shadow:0 6px 18px rgba(0,0,0,.55)}.dcard .sbox{box-shadow:0 10px 30px rgba(0,0,0,.28)}
.kpage{position:absolute;left:0;width:1920px;text-align:center;font-family:'Kit Sans';font-weight:800;letter-spacing:-.02em;white-space:nowrap;line-height:1.2}
.slab{position:absolute;font-family:'Kit Slab';line-height:1;color:#000}
.lett{position:absolute;font-family:'Kit Slab';line-height:1;letter-spacing:-.01em}
.lett span{color:transparent;-webkit-background-clip:text;background-clip:text;background-size:6px 6px,cover;background-position:0 0,center;filter:contrast(1.1)}
.lett span.solid{background:#F4F4F4;-webkit-background-clip:text;background-clip:text}
.didone{position:absolute;font-family:'Kit Didone';font-weight:900;line-height:1;color:#FCFCFB;text-shadow:0 0 18px rgba(255,255,255,.55),0 0 70px rgba(255,255,255,.3)}
.hword{position:absolute;font-family:'Kit Serif';font-style:italic;font-weight:600;line-height:1.2;color:#FCFCFB;
 text-shadow:0 0 6px rgba(255,255,255,.55),0 0 26px rgba(255,255,255,.35),0 0 90px rgba(255,255,255,.22),0 0 220px rgba(255,255,255,.12)}
.hword.defocus{filter:blur(12px);opacity:.7}.hword.bloom{filter:blur(8px);text-shadow:0 0 20px #fff,0 0 60px #fff,0 0 160px #fff}
.comet{position:absolute;height:12px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.45) 60%,#fff 96%,rgba(255,255,255,.6));
 box-shadow:0 0 24px rgba(255,255,255,.55);transform:rotate(-3deg);transform-origin:100% 50%;filter:blur(1.5px)}
.gdot{position:absolute;width:9px;height:9px;border-radius:50%;background:#2BD14A;box-shadow:0 0 6px #2BD14A}
.hbox{position:absolute;border:2px solid #9F515E}.htag{position:absolute;left:2px;top:-30px;font-family:'Kit Mono';font-size:21px;color:#F2F2F2;white-space:nowrap}
.pinkbar{position:absolute;left:1360px;width:22px;height:96px;background:#DA9CA2}
.fsub{position:absolute;left:0;width:1920px;text-align:center;font-family:'Kit Sans';font-weight:600;font-size:30px;color:#7A7A7A}
.dlabel{position:absolute;left:120px;top:110px;padding-left:16px;border-left:1px solid rgba(255,255,255,.8);font-family:'Kit Sans'}
.dlabel b{display:block;font-weight:700;font-size:44px;line-height:1.05;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.85),0 0 28px rgba(0,0,0,.6)}.dlabel i{display:block;font-style:normal;font-size:17px;color:#9A9A9A;margin-top:4px}
.term{position:absolute;left:0;top:118px;width:1920px;height:860px;padding-top:30px;text-align:center;white-space:pre;font-family:'Kit Term';font-size:108px;line-height:99px;color:#5EDE8D;transform-origin:50% 50%;background:radial-gradient(ellipse 48% 58% at 50% 50%,rgba(50,170,90,.20),rgba(0,0,0,0));text-shadow:0 0 6px rgba(94,222,141,.85),0 0 30px rgba(94,222,141,.5),0 0 100px rgba(60,200,110,.4)}
.scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 2px,transparent 2px 4px)}
.hlayer,.hunder{position:absolute;inset:0}
.hl{position:absolute;left:140px;top:420px;width:1660px;font-family:'Kit Sans';font-weight:700;font-size:70px;line-height:125px;letter-spacing:-.012em;color:#fff}
.hbar{position:absolute}.mk{white-space:nowrap}.hbar.mul{mix-blend-mode:multiply}
.acam{position:absolute;inset:0;transform-origin:50% 50%}
.para{position:absolute;left:-340px;top:-30px;width:2620px;text-indent:880px;font-family:'Kit Sans';font-weight:400;font-size:138px;line-height:213px;letter-spacing:-.012em;color:#2A2A2A}
.acard{position:absolute;width:768px;transform-origin:0 0}
.ah{font-family:'Kit Sans';font-weight:700;font-size:40px;line-height:1.22;color:#151515;letter-spacing:-.012em;width:88%}.aph{position:relative;height:430px;margin-top:14px;overflow:hidden}
.strip{position:absolute;background:#fff;padding:20px 28px 24px;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.sh{font-family:'Kit Sans';font-weight:700;font-size:46px;line-height:1.15;color:#141414;letter-spacing:-.01em}.ss{font-family:'Kit Sans';font-size:22px;color:#5A5A5A;margin-top:10px}
.sl{height:9px;background:#D9D9D9;margin-top:12px;width:92%}.sl.s2{width:64%}
.strip.list{padding:16px 30px}.strip.list .sh{font-size:72px;font-weight:800}
.strip.dark{background:#0F1927}.strip.dark .sh{color:#fff}.strip.dark .ss{color:#9AA4B4}
.bloomglow{position:absolute;left:460px;top:290px;width:1000px;height:500px;border-radius:50%;background:radial-gradient(closest-side,#fff 0,#fff 45%,rgba(255,255,255,.6) 70%,rgba(255,255,255,0) 100%);filter:blur(30px)}
.clip{position:absolute;background:#fff;padding:10px;box-shadow:12px 14px 0 rgba(0,0,0,.35)}
`;
function build() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute"><filter id="hsmear" x="-10%" width="120%"><feGaussianBlur stdDeviation="16 0"/></filter><filter id="vsmear0" y="-20%" height="140%"><feGaussianBlur stdDeviation="0 22"/></filter><filter id="vsmear1" y="-20%" height="140%"><feGaussianBlur stdDeviation="0 8"/></filter></svg>');
  const t = String(S.type || 'canvas'); parts.dev = DEV[t] || DEV.canvas; parts.dev.build();
  window.__wait = Promise.all(WAIT);
}
function frame(t) { const f = fr(t); parts.dev.frame(f); }
