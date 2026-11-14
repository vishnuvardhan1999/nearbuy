/* ShopNip · ninja helper. Runs an item to the basket on add; peeks in while idle.
   Transform/opacity only, pointer-events none. Basket count updates in saveB first. */
(()=>{
const KEY='nb_ninja';
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wanted=()=>localStorage[KEY]!=='0';
const on=()=>wanted()&&!reduced();

const SVG=`<svg class="nj-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="njg-head" x1="22" y1="6" x2="44" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3b4d66"/><stop offset=".45" stop-color="#1a2738"/><stop offset="1" stop-color="#0b1220"/>
    </linearGradient>
    <linearGradient id="njg-mask" x1="22" y1="14" x2="42" y2="26" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#243044"/><stop offset="1" stop-color="#070b12"/>
    </linearGradient>
    <linearGradient id="njg-suit" x1="24" y1="24" x2="42" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1b6b66"/><stop offset=".4" stop-color="#0f4743"/><stop offset="1" stop-color="#072422"/>
    </linearGradient>
    <linearGradient id="njg-limb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a5f5a"/><stop offset=".6" stop-color="#0d3a37"/><stop offset="1" stop-color="#081f1e"/>
    </linearGradient>
    <linearGradient id="njg-bag" x1="42" y1="28" x2="56" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5eead4"/><stop offset=".35" stop-color="#14b8a6"/><stop offset="1" stop-color="#0b4f4a"/>
    </linearGradient>
    <linearGradient id="njg-scarf" x1="20" y1="12" x2="48" y2="16" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffb089"/><stop offset=".5" stop-color="#ff6b4a"/><stop offset="1" stop-color="#e11d48"/>
    </linearGradient>
    <radialGradient id="njg-hl" cx="36%" cy="30%" r="62%">
      <stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g class="nj-leg nj-leg-l">
    <path d="M28.6 36.2c-2.4.3-4 2-3.6 4.4l2 12.2c.3 1.7 1.6 2.6 3.3 2.4l3.2-.3c1.6-.2 2.4-1.5 2.2-3L33.6 40c-.4-2.4-2.4-4-5-3.8z" fill="url(#njg-limb)"/>
    <ellipse cx="28.6" cy="54.4" rx="5" ry="2.1" fill="#071616"/>
    <path d="M30 37.2l1.6 14" stroke="#2a8f86" stroke-width=".8" stroke-linecap="round" opacity=".35"/>
  </g>
  <g class="nj-leg nj-leg-r">
    <path d="M35.4 36.2c2.4.3 4 2 3.6 4.4l-2 12.2c-.3 1.7-1.6 2.6-3.3 2.4l-3.2-.3c-1.6-.2-2.4-1.5-2.2-3L30.4 40c.4-2.4 2.4-4 5-3.8z" fill="url(#njg-limb)"/>
    <ellipse cx="35.4" cy="54.4" rx="5" ry="2.1" fill="#071616"/>
    <path d="M34 37.2l-1.6 14" stroke="#2a8f86" stroke-width=".8" stroke-linecap="round" opacity=".35"/>
  </g>
  <g class="nj-arm nj-arm-l">
    <path d="M25.6 29.6c-3.4 2.4-6.6 6.4-7.4 11.2" fill="none" stroke="url(#njg-limb)" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="18" cy="41.2" r="2.1" fill="#0d3a37"/>
    <circle cx="18.4" cy="40.7" r=".7" fill="#5eead4" opacity=".35"/>
  </g>
  <g class="nj-body">
    <path d="M23.8 28.2c0-2.4 3.6-4.6 8.2-4.6s8.2 2.2 8.2 4.6v12c0 3.4-3.5 6-8.2 6s-8.2-2.6-8.2-6z" fill="url(#njg-suit)"/>
    <path d="M27 28.4c1.4-1.6 4.2-2.5 6.4-2.3" fill="none" stroke="#5eead4" stroke-width="1.1" stroke-linecap="round" opacity=".45"/>
    <rect x="26.2" y="41.2" width="11.6" height="2.3" rx="1.1" fill="#0b1220"/>
    <path d="M32 24.2v16" stroke="#083230" stroke-width=".7" opacity=".35"/>
  </g>
  <g class="nj-arm nj-arm-r">
    <path d="M38.4 29.6c3.4 2.4 6.6 6.4 7.4 11.2" fill="none" stroke="url(#njg-limb)" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="46" cy="41.2" r="2.1" fill="#0d3a37"/>
    <circle cx="46.4" cy="40.7" r=".7" fill="#5eead4" opacity=".35"/>
  </g>
  <g class="nj-head">
    <circle cx="32" cy="17.6" r="11.4" fill="url(#njg-head)"/>
    <path d="M21 16.2c1.6-7.8 20.4-7.8 22 0v5.4c-1.5 3.3-20.5 3.3-22 0z" fill="url(#njg-mask)"/>
    <rect x="23" y="16.8" width="6.8" height="3.2" rx="1.6" fill="#f8fafc"/>
    <rect x="34.2" y="16.8" width="6.8" height="3.2" rx="1.6" fill="#f8fafc"/>
    <circle cx="27.2" cy="18.4" r="1.05" fill="#0b1220"/>
    <circle cx="38.4" cy="18.4" r="1.05" fill="#0b1220"/>
    <circle cx="26.6" cy="17.8" r=".35" fill="#fff"/>
    <circle cx="37.8" cy="17.8" r=".35" fill="#fff"/>
    <circle cx="32" cy="17.6" r="11.4" fill="url(#njg-hl)"/>
    <path d="M21.2 14.2c4.2-3.4 8.4-4.4 10.8-4.4s6.6 1 10.8 4.4" fill="none" stroke="url(#njg-scarf)" stroke-width="2.5" stroke-linecap="round"/>
    <path class="nj-tail" d="M43.2 13.2c6.4-2.6 10.6 1.6 9.4 8" fill="none" stroke="url(#njg-scarf)" stroke-width="2.3" stroke-linecap="round"/>
  </g>
  <g class="nj-bag">
    <path d="M41.6 29.2h14.2l-1.8 16.2H43.4z" fill="url(#njg-bag)"/>
    <path d="M42.6 29.6h12.2l-1.2 3.4H43.8z" fill="#99f6e4" opacity=".4"/>
    <path d="M44.8 29.2v-3.8a4.4 4.4 0 0 1 8.6 0v3.8" fill="none" stroke="#083532" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M43.2 38h11" stroke="#083532" stroke-width=".7" opacity=".25"/>
  </g>
</svg>`;

let root=null,busy=0,idleT=0;

function hopTarget(){const cands=[...document.querySelectorAll('.hbtn[data-t="basket"],#tabs [data-t="basket"],button[data-t="basket"]')];
  const vis=cands.filter(el=>{const r=el.getBoundingClientRect();return r.width>8&&r.height>8&&r.bottom>8&&r.top<innerHeight-8});
  return vis.find(el=>el.closest('header,.top,.top-in'))||vis.find(el=>el.closest('#tabs,nav.tabs'))||vis[0]||cands[0]||null}

function isSnap(o){return !!(o&&typeof o==='object'&&typeof o.x==='number'&&!isNaN(o.x)&&typeof o.y==='number')}

function findCard(lid,sku){
  const sels=[];
  if(lid){const v=CSS.escape(String(lid));sels.push(`.add[data-lid="${v}"]`,`.step[data-lid="${v}"]`,`.pc[data-lid="${v}"]`,`.li[data-lid="${v}"]`,`.pim[data-lid="${v}"]`)}
  if(sku){const v=CSS.escape(String(sku));sels.push(`.add[data-sku="${v}"]`,`.step[data-sku="${v}"]`,`.pc[data-psku="${v}"]`,`.pc[data-sku="${v}"]`)}
  for(const s of sels){
    let el;try{el=document.querySelector(s)}catch(e){el=null}
    if(!el)continue;
    const card=el.closest?.('.pc,.li,.pim')||el;
    const btn=card.querySelector?.('.step-plus,.add,.step')||el;
    const r=(btn||card).getBoundingClientRect();
    if(r.width>2&&r.height>2)return btn||card;
  }
  return null;
}

function readRect(el){
  if(!el||!el.getBoundingClientRect)return null;
  const card=el.closest?.('.pc,.li,.pim,.deal')||el;
  const r=el.getBoundingClientRect();
  const live=el.isConnected!==false&&r.width>2&&r.height>2;
  const rr=live?r:(card.getBoundingClientRect?card.getBoundingClientRect():r);
  if(!(rr.width>2&&rr.height>2))return null;
  const img=card.querySelector?.('img');
  return {
    x:rr.left+rr.width/2,y:rr.top+rr.height/2,w:rr.width,h:rr.height,
    src:(img&&(img.currentSrc||img.src))||'',
    lid:el.dataset?.lid||card.dataset?.lid||'',
    sku:el.dataset?.sku||el.dataset?.psku||card.dataset?.psku||card.dataset?.sku||''
  };
}

function mark(from,p){
  if(isSnap(from)&&from._ok)return from;
  const snap={x:NaN,y:NaN,w:0,h:0,src:'',lid:'',sku:'',_ok:false};
  if(from&&typeof from==='object'&&!from.nodeType){if(from.src)snap.src=from.src;if(from.lid)snap.lid=from.lid;if(from.sku)snap.sku=from.sku;if(isSnap(from)){snap.x=from.x;snap.y=from.y;snap.w=from.w||0;snap.h=from.h||0}}
  const el=from&&from.nodeType===1?from:from&&from.el;
  const got=readRect(el);
  if(got){Object.assign(snap,got);snap._ok=true}
  if(p){
    if(p.listing_id)snap.lid=snap.lid||p.listing_id;
    if(p.sku)snap.sku=snap.sku||p.sku;
    if(p.images&&p.images[0])snap.src=snap.src||p.images[0];
    if(p.image)snap.src=snap.src||p.image;
  }
  if(!snap._ok){
    const live=findCard(snap.lid,snap.sku);
    const again=readRect(live);
    if(again){if(!snap.src)snap.src=again.src;snap.x=again.x;snap.y=again.y;snap.w=again.w;snap.h=again.h;snap._ok=true}
  }
  return snap;
}

function ensure(){
  if(root&&document.body.contains(root))return root;
  root=document.createElement('div');
  root.id='nb-ninja';root.className='nj';root.setAttribute('aria-hidden','true');
  root.innerHTML=`<i class="nj-shadow"></i><div class="nj-bob"><div class="nj-lean">${SVG}<span class="nj-loot"></span></div></div>`;
  document.body.appendChild(root);
  return root;
}
function hide(){if(!root)return;root.className='nj';root.style.transform='translate(-120px,-120px)';root.style.opacity='0';const loot=root.querySelector('.nj-loot');if(loot)loot.innerHTML='';}
function face(x0,x1){if(!root)return;root.classList.toggle('face-left',x1<x0)}
function bump(dest){if(!dest)return;dest.classList.remove('bag-pop');void dest.offsetWidth;dest.classList.add('bag-pop');dest.addEventListener('animationend',()=>dest.classList.remove('bag-pop'),{once:true})}
function lootFrom(snap){
  const loot=root&&root.querySelector('.nj-loot');if(!loot)return;
  loot.innerHTML='';
  const src=snap&&snap.src;
  if(src){const i=document.createElement('img');i.src=src;i.alt='';loot.appendChild(i)}
  else{const d=document.createElement('i');d.className='nj-dot';loot.appendChild(d)}
}
function anim(el,kfs,ms,ease){return el.animate(kfs,{duration:ms,easing:ease||'cubic-bezier(.22,.7,.28,1)',fill:'forwards'}).finished.catch(()=>{})}

function edge(side,y){
  const m=40;
  return side==='left'?{x:-m,y:y}:{x:innerWidth+m,y:y};
}

async function runToBasket(from,quick){
  const dest=hopTarget();
  const snap=mark(from);
  if(!dest||!snap._ok)return;
  const n=ensure();
  n.getAnimations().forEach(a=>a.cancel());
  const b=dest.getBoundingClientRect();
  const xC=snap.x,yC=snap.y,xB=b.left+b.width/2,yB=b.top+b.height/2;
  const fromLeft=xC>innerWidth*.55;
  const start=edge(fromLeft?'left':'right',yC);
  const end=edge(xB<innerWidth*.5?'left':'right',yB);
  lootFrom(snap);
  n.style.opacity='1';
  n.classList.add('is-run');
  if(quick){
    face(xC,xB);
    n.classList.add('has-loot','slung');
    n.style.transform=`translate(${xC}px,${yC}px)`;
    await anim(n,[{transform:`translate(${xC}px,${yC}px) scale(1)`},{transform:`translate(${xB}px,${yB-10}px) scale(1.05)`,offset:.7},{transform:`translate(${xB}px,${yB}px) scale(.9)`}],280);
    bump(dest);n.classList.remove('has-loot','slung');
    face(xB,end.x);
    await anim(n,[{transform:`translate(${xB}px,${yB}px) scale(.9)`,opacity:1},{transform:`translate(${end.x}px,${end.y}px) scale(.85)`,opacity:0}],180);
    n.classList.remove('is-run');hide();return;
  }
  face(start.x,xC);
  n.classList.remove('has-loot','slung','is-peek','is-grab');
  n.style.transform=`translate(${start.x}px,${start.y}px)`;
  await anim(n,[{transform:`translate(${start.x}px,${start.y}px) scale(.9)`,opacity:0},{transform:`translate(${xC-8}px,${yC-6}px) scale(1)`,opacity:1}],200);
  n.classList.add('is-grab');
  await anim(n,[{transform:`translate(${xC-8}px,${yC-6}px)`},{transform:`translate(${xC}px,${yC-16}px)`},{transform:`translate(${xC}px,${yC-2}px)`}],180,'cubic-bezier(.2,.8,.2,1)');
  n.classList.remove('is-grab');n.classList.add('has-loot');
  await anim(n,[{transform:`translate(${xC}px,${yC-2}px) rotate(0deg)`},{transform:`translate(${xC}px,${yC-8}px) rotate(-10deg)`},{transform:`translate(${xC}px,${yC-2}px) rotate(0deg)`}],130);
  n.classList.add('slung');
  face(xC,xB);
  const midX=xC+(xB-xC)*.5,midY=yC+(yB-yC)*.42-24;
  await anim(n,[{transform:`translate(${xC}px,${yC-2}px) scale(1)`},{transform:`translate(${midX}px,${midY}px) scale(1.06)`,offset:.45},{transform:`translate(${xB}px,${yB-8}px) scale(1)`}],420);
  await anim(n,[{transform:`translate(${xB}px,${yB-8}px) scale(1)`},{transform:`translate(${xB}px,${yB}px) scale(.88)`}],110);
  bump(dest);n.classList.remove('has-loot','slung');
  face(xB,end.x);
  await anim(n,[{transform:`translate(${xB}px,${yB}px) scale(.9)`,opacity:1},{transform:`translate(${end.x}px,${yB}px) scale(.85)`,opacity:0}],170);
  n.classList.remove('is-run');hide();
}

function play(from){
  if(!from||!wanted())return false;
  if(reduced())return false;
  const snap=mark(from);
  if(!snap._ok)return false;
  if(busy){runToBasket(snap,true);return true}
  busy=1;clearTimeout(idleT);
  runToBasket(snap,false).catch(()=>{}).finally(()=>{busy=0;scheduleIdle()});
  return true;
}

async function idlePeek(){
  if(document.hidden||busy||!on()){scheduleIdle();return}
  const n=ensure();
  const y=Math.min(innerHeight-120,Math.max(140,innerHeight*.62));
  const start=edge('right',y);
  n.getAnimations().forEach(a=>a.cancel());
  n.className='nj is-peek';
  n.style.opacity='1';
  n.style.transform=`translate(${start.x}px,${start.y}px)`;
  const inX=innerWidth-30;
  await anim(n,[{transform:`translate(${start.x}px,${y}px)`,opacity:1},{transform:`translate(${inX}px,${y}px)`}],280);
  n.classList.add('is-crouch');
  await anim(n,[{transform:`translate(${inX}px,${y}px)`},{transform:`translate(${inX}px,${y+6}px)`}],140);
  n.classList.add('is-look');
  await new Promise(r=>setTimeout(r,520));
  n.classList.remove('is-look','is-crouch');
  await anim(n,[{transform:`translate(${inX}px,${y}px)`,opacity:1},{transform:`translate(${start.x}px,${y}px)`,opacity:0}],240);
  hide();scheduleIdle();
}
function scheduleIdle(){
  clearTimeout(idleT);
  if(document.hidden||!on())return;
  idleT=setTimeout(()=>idlePeek().catch(()=>scheduleIdle()),10000+Math.random()*5000);
}

function set(v){
  localStorage[KEY]=v?'1':'0';
  if(!v){clearTimeout(idleT);if(root){root.getAnimations().forEach(a=>a.cancel());hide()}}
  else scheduleIdle();
  document.querySelectorAll('[data-ninja-toggle]').forEach(syncToggle);
}
function syncToggle(el){
  const w=wanted(),r=reduced(),a=w&&!r;
  el.setAttribute('aria-pressed',a?'true':'false');
  el.classList.toggle('on',a);
  const sm=el.querySelector('small');
  if(sm)sm.textContent=!w?'Off · turns the running ninja off':r?'On, but a simple hop is used because your device asks for less motion':'On · he runs your items to the basket';
}
function toggleRow(){
  const w=wanted(),r=reduced(),a=w&&!r;
  return `<button type="button" class="at ${a?'on':''}" data-ninja-toggle aria-pressed="${a?'true':'false'}"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M8 8.2h8M9.2 8l-1.2.8M14.8 8l1.2.8"/><path d="M8.5 14.5c0-1.4 1.6-2.5 3.5-2.5s3.5 1.1 3.5 2.5V18c0 1-1.6 1.8-3.5 1.8S8.5 19 8.5 18z"/><path d="M16.5 13.5 19 15M7.5 13.5 5 15"/></svg><span><b>Ninja helper</b><small>${!w?'Off · turns the running ninja off':r?'On, but a simple hop is used because your device asks for less motion':'On · he runs your items to the basket'}</small></span></button>`;
}

document.addEventListener('click',e=>{const t=e.target.closest('[data-ninja-toggle]');if(!t)return;e.preventDefault();set(!wanted())});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(idleT);if(root&&!busy){root.getAnimations().forEach(a=>a.cancel());hide()}}else scheduleIdle()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleIdle,{once:true});else scheduleIdle();

const st=document.createElement('style');st.id='ninja-css';st.textContent=`
.nj{position:fixed;left:0;top:0;z-index:85;width:64px;height:64px;margin:-32px 0 0 -32px;pointer-events:none;opacity:0;will-change:transform,opacity}
.nj-shadow{position:absolute;left:50%;bottom:1px;width:30px;height:8px;margin-left:-15px;border-radius:50%;background:radial-gradient(ellipse,rgba(15,23,42,.4),rgba(15,23,42,0) 70%);pointer-events:none}
.nj-bob{width:64px;height:64px;position:relative;transform-origin:50% 85%}
.nj-lean{width:64px;height:64px;transform-origin:50% 72%}
.nj.face-left .nj-bob{transform:scaleX(-1)}
.nj .nj-svg{width:64px;height:64px;display:block;overflow:visible}
.nj-loot{position:absolute;left:42px;top:30px;width:18px;height:18px;border-radius:5px;overflow:hidden;opacity:0;transform:scale(.4);box-shadow:0 2px 6px rgba(15,23,42,.2)}
.nj-loot img,.nj-dot{width:18px;height:18px;object-fit:cover;display:block;background:#0f766e;border-radius:5px}
.nj.has-loot .nj-loot{opacity:1;transform:scale(1)}
.nj.slung .nj-loot{left:34px;top:14px;transform:rotate(-28deg) scale(.85)}
.nj .nj-leg,.nj .nj-arm,.nj .nj-bag,.nj .nj-head,.nj .nj-tail,.nj .nj-body{transform-box:fill-box;transform-origin:50% 0}
.nj .nj-head{transform-origin:50% 80%}
.nj .nj-bag{transform-origin:20% 0}
.nj.is-run .nj-lean{transform:rotate(16deg)}
.nj.is-run .nj-bob{animation:nj-bounce .3s ease-in-out infinite}
.nj.face-left.is-run .nj-bob{animation-name:nj-bounce-l}
.nj.is-run:not(.is-grab) .nj-leg-r{animation:nj-leg-r .3s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-leg-l{animation:nj-leg-l .3s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-arm-r{animation:nj-arm-r .3s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-arm-l{animation:nj-arm-l .3s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-bag{animation:nj-bag .3s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-tail{animation:nj-tail .3s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-shadow{animation:nj-shadow .3s ease-in-out infinite}
.nj.slung .nj-bag{transform:translate(-8px,-13px) rotate(-30deg)}
.nj.slung.is-run:not(.is-grab) .nj-bag{animation-name:nj-bag-slung}
.nj.is-grab .nj-lean{transform:rotate(0) translateY(4px) scaleY(.92)}
.nj.is-grab .nj-bob,.nj.is-grab.face-left .nj-bob{animation:none}
.nj.is-crouch .nj-lean{transform:scaleY(.9) translateY(3px)}
.nj.is-look .nj-head{animation:nj-look .52s ease-in-out}
.nj.is-peek .nj-bag{transform:translate(2px,2px)}
@keyframes nj-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes nj-bounce-l{0%,100%{transform:scaleX(-1) translateY(0)}50%{transform:scaleX(-1) translateY(-6px)}}
@keyframes nj-leg-r{0%,100%{transform:rotate(34deg)}50%{transform:rotate(-30deg)}}
@keyframes nj-leg-l{0%,100%{transform:rotate(-30deg)}50%{transform:rotate(34deg)}}
@keyframes nj-arm-r{0%,100%{transform:rotate(-42deg)}50%{transform:rotate(32deg)}}
@keyframes nj-arm-l{0%,100%{transform:rotate(32deg)}50%{transform:rotate(-42deg)}}
@keyframes nj-bag{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(16deg)}}
@keyframes nj-bag-slung{0%,100%{transform:translate(-8px,-13px) rotate(-24deg)}50%{transform:translate(-9px,-15px) rotate(-42deg)}}
@keyframes nj-shadow{0%,100%{transform:scale(1,.9);opacity:1}50%{transform:scale(.62,.7);opacity:.55}}
@keyframes nj-look{0%,100%{transform:rotate(0)}30%{transform:rotate(-14deg)}70%{transform:rotate(14deg)}}
@keyframes nj-tail{0%,100%{transform:rotate(0)}50%{transform:rotate(16deg)}}
[data-ninja-toggle]{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;text-align:left;background:#fff;border:1px solid #e6e9ee;border-radius:14px;padding:14px 16px;font:inherit;color:#0f172a;cursor:pointer;pointer-events:auto}
[data-ninja-toggle]:hover{border-color:#1f6f66;box-shadow:0 6px 18px rgba(15,23,42,.08)}
[data-ninja-toggle] svg{width:26px;height:26px;flex:none;stroke:#1f6f66;fill:none}
[data-ninja-toggle] span{display:flex;flex-direction:column;min-width:0}
[data-ninja-toggle] b{display:block;font-size:15px;font-weight:800;line-height:1.2}
[data-ninja-toggle] small{display:block;color:#64748b;font-size:13px;margin-top:3px;line-height:1.35;font-weight:500}
[data-ninja-toggle].on{border-color:#bfe6d4;background:#f3fbf6}
.si [data-ninja-toggle]{margin:16px 0 28px}
@media (prefers-reduced-motion:reduce){.nj{display:none!important}}
`;
document.head.appendChild(st);

window.Ninja={play,wanted,on,set,toggleRow,syncToggle,peek:idlePeek,mark};
})();
