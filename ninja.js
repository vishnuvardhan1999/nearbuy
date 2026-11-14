/* ShopNip · ninja helper. Runs an item to the basket on add; peeks in while idle.
   Transform/opacity only, pointer-events none. Basket count updates in saveB first. */
(()=>{
const KEY='nb_ninja';
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wanted=()=>localStorage[KEY]!=='0';
const on=()=>wanted()&&!reduced();

const SVG=`<svg class="nj-svg" viewBox="0 0 64 64" aria-hidden="true">
  <ellipse class="nj-sh" cx="32" cy="58" rx="14" ry="3.2" fill="rgba(15,23,42,.22)"/>
  <g class="nj-bag">
    <path d="M40 28h14l-1.5 16H41.5z" fill="#0f766e"/>
    <path d="M44 28v-3.5a4 4 0 0 1 8 0V28" fill="none" stroke="#0b4f4a" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g class="nj-body">
    <path d="M24 30c0-2 3.5-4 8-4s8 2 8 4v12c0 3-3 6-8 6s-8-3-8-6z" fill="#0f3d3a"/>
    <path d="M26 42l-5 10M38 42l5 10" fill="none" stroke="#0f3d3a" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M22 34l-8 5M42 34l8 5" fill="none" stroke="#0f3d3a" stroke-width="3.2" stroke-linecap="round"/>
  </g>
  <g class="nj-head">
    <circle cx="32" cy="20" r="12" fill="#14202e"/>
    <path d="M20 18c2-8 22-8 24 0v4c-2 3-22 3-24 0z" fill="#0b1220"/>
    <rect x="22.5" y="18.5" width="7" height="3.4" rx="1.6" fill="#f8fafc"/>
    <rect x="34.5" y="18.5" width="7" height="3.4" rx="1.6" fill="#f8fafc"/>
    <path d="M20 16c4-3 8-4 12-4s8 1 12 4" fill="none" stroke="#ff6b4a" stroke-width="2.2" stroke-linecap="round"/>
    <path class="nj-tail" d="M44 14c6-2 9 2 8 7" fill="none" stroke="#ff6b4a" stroke-width="2.2" stroke-linecap="round"/>
  </g>
</svg>`;

let root=null,busy=0,idleT=0,ioVis=false;

function hopTarget(){const cands=[...document.querySelectorAll('.hbtn[data-t="basket"],#tabs [data-t="basket"],button[data-t="basket"]')];
  const vis=cands.filter(el=>{const r=el.getBoundingClientRect();return r.width>8&&r.height>8&&r.bottom>8&&r.top<innerHeight-8});
  return vis.find(el=>el.closest('header,.top,.top-in'))||vis.find(el=>el.closest('#tabs,nav.tabs'))||vis[0]||cands[0]||null}

function ensure(){
  if(root&&document.body.contains(root))return root;
  root=document.createElement('div');
  root.id='nb-ninja';root.className='nj';root.setAttribute('aria-hidden','true');
  root.innerHTML=`<div class="nj-bob">${SVG}<span class="nj-loot"></span></div>`;
  document.body.appendChild(root);
  return root;
}
function hide(){if(!root)return;root.className='nj';root.style.transform='translate(-120px,-120px)';root.style.opacity='0';const loot=root.querySelector('.nj-loot');if(loot)loot.innerHTML='';}
function face(x0,x1){if(!root)return;root.classList.toggle('face-left',x1<x0)}
function bump(dest){if(!dest)return;dest.classList.remove('bag-pop');void dest.offsetWidth;dest.classList.add('bag-pop');dest.addEventListener('animationend',()=>dest.classList.remove('bag-pop'),{once:true})}
function lootFrom(fromEl){
  const loot=root&&root.querySelector('.nj-loot');if(!loot)return;
  loot.innerHTML='';
  const card=fromEl&&fromEl.closest&&fromEl.closest('.pc,.li,.pim');
  const img=card&&card.querySelector&&card.querySelector('img');
  if(img&&img.src){const i=document.createElement('img');i.src=img.currentSrc||img.src;i.alt='';loot.appendChild(i)}
  else{const d=document.createElement('i');d.className='nj-dot';loot.appendChild(d)}
}
function anim(el,kfs,ms,ease){return el.animate(kfs,{duration:ms,easing:ease||'cubic-bezier(.22,.7,.28,1)',fill:'forwards'}).finished.catch(()=>{})}

function edge(side,y){
  const m=36;
  return side==='left'?{x:-m,y:y}:{x:innerWidth+m,y:y};
}

async function runToBasket(fromEl,quick){
  const dest=hopTarget();if(!fromEl||!dest)return;
  const n=ensure();
  n.getAnimations().forEach(a=>a.cancel());
  const a=fromEl.getBoundingClientRect(),b=dest.getBoundingClientRect();
  const xC=a.left+a.width/2,yC=a.top+a.height/2,xB=b.left+b.width/2,yB=b.top+b.height/2;
  const fromLeft=xC>innerWidth*.55;
  const start=edge(fromLeft?'left':'right',yC);
  const end=edge(xB<innerWidth*.5?'left':'right',yB);
  lootFrom(fromEl);
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
  n.classList.remove('has-loot','slung','is-peek');
  n.style.transform=`translate(${start.x}px,${start.y}px)`;
  await anim(n,[{transform:`translate(${start.x}px,${start.y}px) scale(.9)`,opacity:0},{transform:`translate(${xC-8}px,${yC-6}px) scale(1)`,opacity:1}],180);
  n.classList.add('is-grab');
  await anim(n,[{transform:`translate(${xC-8}px,${yC-6}px)`},{transform:`translate(${xC}px,${yC-14}px)`},{transform:`translate(${xC}px,${yC-4}px)`}],170,'cubic-bezier(.2,.8,.2,1)');
  n.classList.remove('is-grab');n.classList.add('has-loot');
  await anim(n,[{transform:`translate(${xC}px,${yC-4}px) rotate(0deg)`},{transform:`translate(${xC}px,${yC-8}px) rotate(-12deg)`},{transform:`translate(${xC}px,${yC-4}px) rotate(0deg)`}],140);
  n.classList.add('slung');
  face(xC,xB);
  const midX=xC+(xB-xC)*.5,midY=Math.min(xC,yC)<yB?yC+(yB-yC)*.4-28:yC+(yB-yC)*.45-20;
  await anim(n,[{transform:`translate(${xC}px,${yC-4}px) scale(1)`},{transform:`translate(${midX}px,${midY}px) scale(1.06)`,offset:.45},{transform:`translate(${xB}px,${yB-8}px) scale(1)`}],420);
  await anim(n,[{transform:`translate(${xB}px,${yB-8}px) scale(1)`},{transform:`translate(${xB}px,${yB}px) scale(.88)`}],120);
  bump(dest);n.classList.remove('has-loot','slung');
  face(xB,end.x);
  await anim(n,[{transform:`translate(${xB}px,${yB}px) scale(.9)`,opacity:1},{transform:`translate(${end.x}px,${yB}px) scale(.85)`,opacity:0}],170);
  n.classList.remove('is-run');hide();
}

function play(fromEl){
  if(!fromEl||!wanted())return false;
  if(reduced())return false;
  if(busy){runToBasket(fromEl,true);return true}
  busy=1;clearTimeout(idleT);
  runToBasket(fromEl,false).catch(()=>{}).finally(()=>{busy=0;scheduleIdle()});
  return true;
}

async function idlePeek(){
  if(document.hidden||busy||!on()){scheduleIdle();return}
  const n=ensure(),dest=hopTarget();
  const y=Math.min(innerHeight-120,Math.max(140,innerHeight*.62));
  const right=true,start=edge(right?'right':'left',y);
  n.getAnimations().forEach(a=>a.cancel());
  n.className='nj is-peek'+(right?'':' face-left');
  n.style.opacity='1';
  n.style.transform=`translate(${start.x}px,${start.y}px)`;
  const inX=right?innerWidth-28:28;
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
.nj{position:fixed;left:0;top:0;z-index:85;width:56px;height:56px;margin:-28px 0 0 -28px;pointer-events:none;opacity:0;will-change:transform,opacity;color:#14202e}
.nj-bob{width:56px;height:56px;position:relative;transform-origin:50% 80%}
.nj.face-left .nj-bob{transform:scaleX(-1)}
.nj .nj-svg{width:56px;height:56px;display:block;overflow:visible;filter:drop-shadow(0 4px 6px rgba(15,23,42,.22))}
.nj-loot{position:absolute;left:40px;top:26px;width:18px;height:18px;border-radius:5px;overflow:hidden;opacity:0;transform:scale(.4);box-shadow:0 2px 6px rgba(15,23,42,.2)}
.nj-loot img,.nj-dot{width:18px;height:18px;object-fit:cover;display:block;background:#0f766e;border-radius:5px}
.nj.has-loot .nj-loot{opacity:1;transform:scale(1)}
.nj.slung .nj-bag{transform:translate(-6px,-10px) rotate(-28deg);transform-origin:40px 28px}
.nj.slung .nj-loot{left:34px;top:16px;transform:rotate(-28deg) scale(.85)}
.nj.is-run .nj-bob{animation:nj-run .22s linear infinite}
.nj.is-grab .nj-bob{animation:none}
.nj.is-crouch .nj-bob{transform:scaleY(.9) translateY(3px)}
.nj.face-left.is-crouch .nj-bob{transform:scaleX(-1) scaleY(.9) translateY(3px)}
.nj.is-look .nj-head{animation:nj-look .52s ease-in-out}
.nj.is-peek .nj-bag{transform:translate(2px,2px)}
.nj .nj-bag,.nj .nj-head,.nj .nj-tail{transform-box:fill-box;transform-origin:center}
.nj.is-run .nj-tail{animation:nj-tail .22s ease-in-out infinite}
@keyframes nj-run{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.nj.face-left.is-run .nj-bob{animation-name:nj-run-l}
@keyframes nj-run-l{0%,100%{transform:scaleX(-1) translateY(0)}50%{transform:scaleX(-1) translateY(-3px)}}
@keyframes nj-look{0%,100%{transform:rotate(0)}30%{transform:rotate(-12deg)}70%{transform:rotate(12deg)}}
@keyframes nj-tail{0%,100%{transform:rotate(0)}50%{transform:rotate(12deg)}}
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

window.Ninja={play,wanted,on,set,toggleRow,syncToggle,peek:idlePeek};
})();
