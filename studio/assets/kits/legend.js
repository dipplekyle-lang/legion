/* legend.js — the LEGEND kit: warm memoir cards for a first-person sports story. A numbered chapter card, a lower
   third, a scorecard, the narrator's own line, a row of dated years.
   Fonts: Kit Num (Bebas Neue), Kit Serif (DM Serif Display), Kit Text (Lora), Kit Body (Inter). */
const CREAM=P.cream||'#F4EBDD', GOLD=P.gold||'#C99A3B', INK=P.ink||'#1B1712';
const CSS=`
.num{font-family:'Kit Num',Impact,sans-serif;letter-spacing:.04em}
.serif{font-family:'Kit Serif',Georgia,serif}
.text{font-family:'Kit Text',Georgia,serif}
.body{font-family:'Kit Body',Inter,Arial,sans-serif}
`;
const TALL = H > W, CX = W / 2;      // a Short: every scene laid out for 1080x1920
function build(){
  const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
  const t=S.type; grain(0.08);
  vig.style.background='radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 45%,rgba(20,12,4,.6) 100%)';
  if(t==='chapter'){
    ground.style.filter='sepia(.25) saturate(.9) brightness(.8)';
    scene.innerHTML=`<div class="abs" style="left:0;top:0;width:${W}px;height:${H}px;background:linear-gradient(90deg,rgba(20,12,4,.55) 0%,rgba(20,12,4,.2) 60%,rgba(20,12,4,.05) 100%)"></div>
      <div id="no" class="num" style="position:absolute;left:${TALL?90:150}px;top:${TALL?340:290}px;font-size:60px;color:${GOLD};opacity:0">No.</div>
      <div id="n" class="num" style="position:absolute;left:${TALL?80:140}px;top:${TALL?350:300}px;font-size:${TALL?380:440}px;line-height:1;color:${GOLD};text-shadow:0 20px 60px rgba(0,0,0,.5);opacity:0">${esc(String(S.n||''))}</div>
      <div id="rule" style="position:absolute;left:${TALL?80:560}px;top:520px;height:4px;width:0;background:${GOLD}"></div>
      <div id="nm" class="serif" style="position:absolute;left:${TALL?80:560}px;top:${TALL?780:380}px;width:${TALL?W-160:1200}px;font-size:${TALL?104:120}px;line-height:1.02;color:${CREAM};text-shadow:0 8px 30px rgba(0,0,0,.6)">${esc(S.name||'')}</div>
      <div id="nt" class="text" style="position:absolute;left:${TALL?82:562}px;top:560px;width:${TALL?W-160:1200}px;font-size:42px;font-style:italic;color:${CREAM};opacity:0">${esc(S.note||'')}</div>`;
    parts={no:document.getElementById('no'),n:document.getElementById('n'),rule:document.getElementById('rule'),nm:document.getElementById('nm'),nt:document.getElementById('nt')};
    const NT=TALL?780:380; fit(parts.nm,TALL?W-160:1200,TALL?104:120,64); parts.lines=lines(parts.nm);
    const h=parts.nm.getBoundingClientRect().height; parts.rule.style.top=(NT+h+24)+'px'; parts.nt.style.top=(NT+h+52)+'px';
  }
  if(t==='lower'){
    scene.innerHTML=`<div class="abs" style="left:0;top:${TALL?1020:700}px;width:${W}px;height:${TALL?500:380}px;background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.7) 100%)"></div>
      <div id="lt" class="abs" style="left:${TALL?80:120}px;top:${TALL?1260:860}px;opacity:0">
        <div class="abs" style="left:0;top:0;width:8px;height:120px;background:${GOLD}"></div>
        <div class="serif" style="position:absolute;left:36px;top:-4px;font-size:${TALL?58:64}px;color:#fff;white-space:nowrap;text-shadow:0 4px 18px rgba(0,0,0,.7)">${esc(S.name||'')}</div>
        <div class="text" style="position:absolute;left:38px;top:72px;font-size:32px;color:${CREAM};white-space:nowrap;opacity:.95">${esc(S.role||'')}</div></div>`;
    parts={lt:document.getElementById('lt')};
  }
  if(t==='scorecard'){
    ground.style.filter='sepia(.3) saturate(.8) brightness(.55)';
    scene.innerHTML=`<div id="card" class="abs" style="left:${TALL?40:410}px;top:${TALL?340:170}px;width:${TALL?W-80:1100}px;height:${TALL?1100:740}px;background:${CREAM};box-shadow:0 40px 100px rgba(0,0,0,.6);padding:50px 70px;opacity:0;background-image:repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 62px,rgba(27,23,18,.07) 62px 63px)">
        <div class="num" style="font-size:54px;color:${GOLD};letter-spacing:.14em;border-bottom:3px solid ${GOLD};padding-bottom:12px">${esc((S.title||'').toUpperCase())}</div>
        <div id="rows" style="margin-top:26px"></div>
        <div id="src" class="body" style="position:absolute;left:70px;bottom:36px;font-size:22px;color:#6E6459;font-weight:600;opacity:0">${esc(S.source||'')}</div></div>`;
    parts={card:document.getElementById('card'),src:document.getElementById('src'),rows:[]};
    (S.rows||[]).slice(0,5).forEach(r=>{const el=document.createElement('div'); el.style.cssText=`display:flex;align-items:baseline;gap:20px;height:${TALL?150:96}px;opacity:0`;
      el.innerHTML=`<span class="text" style="font-size:42px;color:${INK}">${esc(r.label||'')}</span><span style="flex:1;border-bottom:3px dotted rgba(27,23,18,.35);transform:translateY(-12px)"></span><span class="num v" style="font-size:80px;color:${INK};line-height:1">0</span>`;
      document.getElementById('rows').appendChild(el); parts.rows.push({el,v:el.querySelector('.v'),raw:String(r.value||'')})});
  }
  if(t==='line'){
    ground.style.filter='sepia(.3) saturate(.85) brightness(.6)';
    scene.innerHTML=`<div id="q" class="serif" style="position:absolute;left:0;top:${TALL?380:220}px;width:${W}px;text-align:center;font-size:260px;line-height:1;color:${GOLD};opacity:0">“</div>
      <div id="ln" class="text" style="position:absolute;left:${TALL?60:260}px;top:${TALL?600:400}px;width:${TALL?W-120:1400}px;text-align:center;font-size:${TALL?74:86}px;line-height:1.25;font-style:italic;color:${CREAM};text-shadow:0 6px 24px rgba(0,0,0,.6)"></div>
      <div id="who" class="num" style="position:absolute;left:0;top:${TALL?1300:760}px;width:${W}px;text-align:center;font-size:44px;letter-spacing:.2em;color:${GOLD};opacity:0">— ${esc((S.who||'').toUpperCase())}</div>`;
    parts={q:document.getElementById('q'),ln:document.getElementById('ln'),who:document.getElementById('who')};
    parts.words=String(S.line||'').split(/\s+/).filter(Boolean).map(w=>{const s=document.createElement('span');s.textContent=w+' ';s.style.opacity=0;parts.ln.appendChild(s);return s});
  }
  if(t==='years'){
    const ys=(S.years||[]).slice(0,5); const n=Math.max(1,ys.length); const gap=TALL?Math.min(220,950/Math.max(1,n-1)):Math.min(420,1600/n);
    scene.innerHTML=TALL?`<div class="abs" style="left:0;top:0;width:${W}px;height:${H}px;background:linear-gradient(90deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.35) 70%,rgba(0,0,0,.2) 100%)"></div>
      <div id="track" class="abs" style="left:160px;top:470px;width:3px;height:0;background:${GOLD}"></div><div id="ys"></div>`
      :`<div class="abs" style="left:0;top:640px;width:${W}px;height:440px;background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.75) 60%)"></div>
      <div id="track" class="abs" style="left:160px;top:840px;height:3px;width:0;background:${GOLD}"></div><div id="ys"></div>`;
    parts={track:document.getElementById('track'),items:[],w:gap*(n-1)};
    ys.forEach((y,i)=>{const el=document.createElement('div');
      if(TALL){el.style.cssText=`position:absolute;left:160px;top:${500+i*gap}px;width:${W-240}px;opacity:0`;
        el.innerHTML=`<div class="abs" style="left:-8px;top:30px;width:18px;height:18px;border-radius:50%;background:${GOLD};box-shadow:0 0 0 6px rgba(201,154,59,.3)"></div>
          <div class="num" style="position:absolute;left:44px;top:0;font-size:84px;color:${GOLD};line-height:1">${esc(y.year||'')}</div>
          <div class="text" style="position:absolute;left:46px;top:88px;width:${W-300}px;font-size:36px;color:${CREAM};line-height:1.2">${esc(y.label||'')}</div>`;
        document.getElementById('ys').appendChild(el); parts.items.push(el); return}
      el.style.cssText=`position:absolute;left:${160+i*gap}px;top:760px;width:${gap}px;opacity:0`;
      el.innerHTML=`<div class="abs" style="left:-9px;top:71px;width:18px;height:18px;border-radius:50%;background:${GOLD};box-shadow:0 0 0 6px rgba(201,154,59,.3)"></div>
        <div class="num" style="position:absolute;left:0;top:0;font-size:78px;color:${GOLD};line-height:1;transform:translateX(-50%)">${esc(y.year||'')}</div>
        <div class="text" style="position:absolute;left:0;top:110px;width:360px;font-size:30px;color:${CREAM};transform:translateX(-50%);text-align:center;line-height:1.2">${esc(y.label||'')}</div>`;
      document.getElementById('ys').appendChild(el); parts.items.push(el)});
  }
}
function frame(t){
  const out=1-seg(t,OUT,D), ty=S.type;
  ground.style.transform=`scale(${1+0.04*seg(t,0,D)})`;
  if(ty==='chapter'){
    const p=eo5(seg(t,.1,.9)); parts.n.style.opacity=p*out; parts.n.style.transform=`translateX(${(1-p)*-120}px)`; parts.no.style.opacity=eo3(seg(t,.5,.9))*out;
    parts.lines.forEach((l,i)=>{const q=eo5(seg(t,.5+i*.16,1.3+i*.16)); l.style.transform=`translateY(${(1-q)*105}%)`; l.style.opacity=out});
    parts.rule.style.width=((TALL?400:520)*eo5(seg(t,1.2,2.0)))+'px'; parts.nt.style.opacity=eo3(seg(t,1.7,2.3))*out;
  }
  if(ty==='lower'){
    const p=eo5(seg(t,.1,.7)); parts.lt.style.opacity=p*out; parts.lt.style.transform=`translateX(${(1-p)*-24}px)`;
  }
  if(ty==='scorecard'){
    const p=eo5(seg(t,.05,.6)); parts.card.style.opacity=p*out; parts.card.style.transform=`translateY(${(1-p)*40}px)`;
    parts.rows.forEach((r,i)=>{const q=eo5(seg(t,.6+i*.35,1.1+i*.35)); r.el.style.opacity=q*out; r.el.style.transform=`translateX(${(1-q)*20}px)`;
      const m=r.raw.match(/^([^0-9-]*)(-?[0-9][0-9,]*\.?[0-9]*)(.*)$/); if(m){const num=parseFloat(m[2].replace(/,/g,'')); if(!isNaN(num)){const dec=(m[2].split('.')[1]||'').length; const c=eo3(seg(t,.6+i*.35,1.6+i*.35)); r.v.textContent=m[1]+fmt(num*c,dec)+m[3]}else r.v.textContent=r.raw}else r.v.textContent=r.raw});
    parts.src.style.opacity=eo3(seg(t,1.2+parts.rows.length*.35,1.8+parts.rows.length*.35));
  }
  if(ty==='line'){
    parts.q.style.opacity=eo3(seg(t,.1,.8))*.9*out;
    const n=parts.words.length, span=Math.min(2.6,Math.max(1.2,n*.14));
    parts.words.forEach((w,i)=>{w.style.opacity=eo3(seg(t,.4+span*i/n,.4+span*i/n+.4))*out});
    parts.who.style.opacity=eo3(seg(t,.7+span,1.3+span))*out;
  }
  if(ty==='years'){
    const tr=parts.w*eo3(seg(t,.2,.2+parts.items.length*.5)); if(TALL) parts.track.style.height=(tr+60)+'px'; else parts.track.style.width=tr+'px'; parts.track.style.opacity=out;
    parts.items.forEach((el,i)=>{const p=eo5(seg(t,.3+i*.5,.9+i*.5)); el.style.opacity=p*out; el.style.transform=`translateY(${(1-p)*20}px)`});
  }
}
