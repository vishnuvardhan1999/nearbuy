/* ShopNip · ninja helper. Runs an item to the basket on add; peeks in while idle.
   Transform/opacity only, pointer-events none. Basket count updates in saveB first. */
(()=>{
const KEY='nb_ninja';
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wanted=()=>localStorage[KEY]!=='0';
const on=()=>wanted()&&!reduced();

const SVG=`<svg class="nj-svg" viewBox="0 0 80 80" aria-hidden="true">
  <defs>
    <linearGradient id="njg-hood" x1="18" y1="6" x2="52" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4a5b75"/><stop offset=".38" stop-color="#1c2738"/><stop offset="1" stop-color="#0a1018"/>
    </linearGradient>
    <linearGradient id="njg-hood-in" x1="24" y1="16" x2="44" y2="36" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2a3548"/><stop offset="1" stop-color="#0c111a"/>
    </linearGradient>
    <linearGradient id="njg-suit" x1="24" y1="34" x2="46" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2b3b4c"/><stop offset=".45" stop-color="#151d28"/><stop offset="1" stop-color="#070b11"/>
    </linearGradient>
    <linearGradient id="njg-limb" x1="0" y1="0" x2=".2" y2="1">
      <stop offset="0" stop-color="#2c3c4e"/><stop offset=".55" stop-color="#151c28"/><stop offset="1" stop-color="#070a10"/>
    </linearGradient>
    <linearGradient id="njg-scarf" x1="16" y1="12" x2="74" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffb199"/><stop offset=".4" stop-color="#ff6b4a"/><stop offset="1" stop-color="#d9382a"/>
    </linearGradient>
    <linearGradient id="njg-bag" x1="50" y1="30" x2="72" y2="62" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3d5c58"/><stop offset=".4" stop-color="#1a3d3a"/><stop offset="1" stop-color="#0b2422"/>
    </linearGradient>
    <radialGradient id="njg-hl" cx="34%" cy="28%" r="65%">
      <stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="njg-eye-sh" cx="50%" cy="78%" r="70%">
      <stop offset="0" stop-color="#d9dee7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g class="nj-leg nj-leg-l">
    <path d="M30 51c-2.6.2-4.4 2-4 4.6l1.8 13.2c.3 1.8 1.7 2.7 3.5 2.5l3.4-.3c1.7-.2 2.5-1.6 2.2-3.2L34.8 55c-.5-2.6-2.6-4.2-4.8-4z" fill="url(#njg-limb)"/>
    <ellipse cx="28.6" cy="69.6" rx="5.8" ry="2.8" fill="url(#njg-limb)"/>
    <ellipse cx="27.8" cy="70.8" rx="5.2" ry="1.5" fill="#07090e"/>
    <path d="M31.2 52.4l1.4 15" stroke="#6f8498" stroke-width=".7" stroke-linecap="round" opacity=".28"/>
  </g>
  <g class="nj-leg nj-leg-r">
    <path d="M38 51c2.6.2 4.4 2 4 4.6l-1.8 13.2c-.3 1.8-1.7 2.7-3.5 2.5l-3.4-.3c-1.7-.2-2.5-1.6-2.2-3.2L33.2 55c.5-2.6 2.6-4.2 4.8-4z" fill="url(#njg-limb)"/>
    <ellipse cx="39.4" cy="69.6" rx="5.8" ry="2.8" fill="url(#njg-limb)"/>
    <ellipse cx="40.2" cy="70.8" rx="5.2" ry="1.5" fill="#07090e"/>
    <path d="M36.8 52.4l-1.4 15" stroke="#6f8498" stroke-width=".7" stroke-linecap="round" opacity=".28"/>
  </g>

  <g class="nj-arm nj-arm-l">
    <path d="M27.2 38.4c-4 2.8-7.8 7.4-8.6 13" fill="none" stroke="url(#njg-limb)" stroke-width="4.2" stroke-linecap="round"/>
    <circle cx="18.4" cy="51.8" r="2.4" fill="#151c28"/>
    <circle cx="18.9" cy="51.2" r=".7" fill="#9fb4c6" opacity=".45"/>
  </g>

  <g class="nj-body">
    <path d="M25.4 37.2c0-2.8 3.8-5.2 8.8-5.2s8.8 2.4 8.8 5.2v14.4c0 3.8-3.8 6.6-8.8 6.6s-8.8-2.8-8.8-6.6z" fill="url(#njg-suit)"/>
    <path d="M28.8 37.4c1.6-1.8 4.6-2.8 7-2.6" fill="none" stroke="#8ea6b8" stroke-width="1.15" stroke-linecap="round" opacity=".4"/>
    <rect x="28.4" y="52.2" width="11.2" height="2.4" rx="1.2" fill="#0a0e14"/>
    <path d="M34.2 33.2v18.4" stroke="#000" stroke-width=".7" opacity=".22"/>
  </g>

  <g class="nj-arm nj-arm-r">
    <path d="M41.2 38.4c4 2.8 7.8 7.4 8.6 13" fill="none" stroke="url(#njg-limb)" stroke-width="4.2" stroke-linecap="round"/>
    <circle cx="50" cy="51.8" r="2.4" fill="#151c28"/>
    <circle cx="50.5" cy="51.2" r=".7" fill="#9fb4c6" opacity=".45"/>
  </g>

  <g class="nj-head">
    <path d="M18.8 28C17.6 13.2 24.2 5.2 34.2 5.2 46.4 5.2 55.2 13.6 54.4 28.2 53.8 37 46.6 41.6 34.2 41.6 22.2 41.6 19.4 36 18.8 28Z" fill="url(#njg-hood)"/>
    <path d="M22.4 27.2c.4-9.2 6-15.2 11.8-15.2 6.2 0 11.8 6.2 12 15.2 0 7.2-5.2 12.6-12 12.6s-11.6-5.4-11.8-12.6Z" fill="url(#njg-hood-in)"/>
    <path d="M20.2 22C22 11 27.6 7 34.2 7" fill="none" stroke="#c5d5e2" stroke-width="1.35" stroke-linecap="round" opacity=".42"/>
    <ellipse cx="34.2" cy="25" rx="13.2" ry="12.2" fill="#121822"/>
    <g class="nj-eyes">
      <g class="nj-eye nj-eye-l">
        <ellipse cx="28.2" cy="24.2" rx="5.7" ry="6.6" fill="#fff"/>
        <ellipse cx="28.2" cy="24.2" rx="5.7" ry="6.6" fill="url(#njg-eye-sh)"/>
        <g class="nj-pupil">
          <ellipse cx="29" cy="24.8" rx="2.55" ry="3.15" fill="#171d2a"/>
          <circle cx="28.15" cy="23.4" r="1.15" fill="#fff"/>
          <circle cx="29.7" cy="25.5" r=".4" fill="#fff" opacity=".7"/>
        </g>
        <ellipse class="nj-lid-l" cx="28.2" cy="24.2" rx="5.9" ry="6.8" fill="#121822"/>
      </g>
      <g class="nj-eye nj-eye-r">
        <ellipse cx="40.6" cy="24.2" rx="5.7" ry="6.6" fill="#fff"/>
        <ellipse cx="40.6" cy="24.2" rx="5.7" ry="6.6" fill="url(#njg-eye-sh)"/>
        <g class="nj-pupil">
          <ellipse cx="41.4" cy="24.8" rx="2.55" ry="3.15" fill="#171d2a"/>
          <circle cx="40.55" cy="23.4" r="1.15" fill="#fff"/>
          <circle cx="42.1" cy="25.5" r=".4" fill="#fff" opacity=".7"/>
        </g>
      </g>
    </g>
    <path d="M22 27.8c2.4 4.6 7.2 7 12.2 7s9.8-2.4 12.2-7" fill="none" stroke="#0a0e14" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
    <circle cx="34.2" cy="22" r="16" fill="url(#njg-hl)"/>
    <path d="M21.4 15.2c4.6-3.4 8.8-4.4 12.8-4.4 4.2 0 8.6 1.2 13.2 4.4" fill="none" stroke="url(#njg-scarf)" stroke-width="3.1" stroke-linecap="round"/>
    <circle cx="47.4" cy="15.4" r="1.7" fill="#ff6b4a"/>
    <circle cx="47.4" cy="15.4" r=".7" fill="#ffd0c2"/>
  </g>

  <g class="nj-bag">
    <path d="M51.6 38.4c-2-4.2 1.6-7.6 6.6-7.8 6.2-.2 11.8 4.6 11.2 13.2-.6 8.6-7.8 13.6-13.8 11.6-5.2-1.8-6-10.2-4-17z" fill="url(#njg-bag)"/>
    <path d="M53.4 37.6c1.2-3.4 4.8-5.4 8.4-5 3.2.4 5.4 2.2 6 4.2" fill="none" stroke="#7dcdc4" stroke-width="1.1" stroke-linecap="round" opacity=".35"/>
    <ellipse cx="58.6" cy="32.4" rx="6.2" ry="2.6" fill="#0f2a28"/>
    <path d="M54.8 32.2c-1.6-5.2 1.4-8.4 4-8.6" fill="none" stroke="#ff6b4a" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M62.4 32.2c1.8-5.4-.6-8.6-3-9" fill="none" stroke="#ff6b4a" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="58.8" cy="22.8" r="1.35" fill="#ff6b4a"/>
    <g transform="translate(58.4 46.2)" fill="#ff6b4a">
      <path d="M-3.1-1.1h6.2l-.7 6.2h-4.8z" rx="1"/>
      <path d="M-1.6-1.1v-2.1a1.6 1.6 0 0 1 3.2 0v2.1" fill="none" stroke="#ff6b4a" stroke-width="1.15" stroke-linecap="round"/>
    </g>
  </g>
  <g class="nj-tail">
    <path d="M48.2 14.6c7.4-5.2 16.6-2.2 19.4 5.2 1.6 4.2 6.8 5.6 10.2 1.6-1.4 7.4-11 10.4-17.2 5.2-3.8-3.2-8.2-6.4-12.4-12z" fill="url(#njg-scarf)"/>
    <path d="M50 14.8c5.6-3.2 12.2-1.2 14.6 3.4" fill="none" stroke="#ffd0c2" stroke-width="1.15" stroke-linecap="round" opacity=".45"/>
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
  root.innerHTML=`<i class="nj-shadow"></i><div class="nj-bob"><div class="nj-lean">${SVG}<span class="nj-loot"></span><i class="nj-fx"><i></i><i></i><i></i><i></i></i></div></div>`;
  document.body.appendChild(root);
  return root;
}
function hide(){if(!root)return;root.className='nj';root.style.transform='translate(-140px,-140px)';root.style.opacity='0';const loot=root.querySelector('.nj-loot');if(loot)loot.innerHTML='';}
function face(x0,x1){if(!root)return;root.classList.toggle('face-left',x1<x0)}
function bump(dest){if(!dest)return;dest.classList.remove('bag-pop');void dest.offsetWidth;dest.classList.add('bag-pop');dest.addEventListener('animationend',()=>dest.classList.remove('bag-pop'),{once:true})}
function spark(on){if(!root)return;root.classList.toggle('is-spark',!!on)}
function lootFrom(snap){
  const loot=root&&root.querySelector('.nj-loot');if(!loot)return;
  loot.innerHTML='';
  const src=snap&&snap.src;
  if(src){const i=document.createElement('img');i.src=src;i.alt='';loot.appendChild(i)}
  else{const d=document.createElement('i');d.className='nj-dot';loot.appendChild(d)}
}
function anim(el,kfs,ms,ease){return el.animate(kfs,{duration:ms,easing:ease||'cubic-bezier(.22,.7,.28,1)',fill:'forwards'}).finished.catch(()=>{})}

function edge(side,y){
  const m=46;
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
  if(quick){
    face(xC,xB);
    n.className='nj is-run has-loot slung'+(xB<xC?' face-left':'');
    n.style.transform=`translate(${xC}px,${yC}px)`;
    await anim(n,[{transform:`translate(${xC}px,${yC}px) scale(1)`},{transform:`translate(${xB}px,${yB-12}px) scale(1.05)`,offset:.7},{transform:`translate(${xB}px,${yB}px) scale(.9)`}],260);
    spark(1);bump(dest);n.classList.remove('has-loot','slung');
    face(xB,end.x);
    await anim(n,[{transform:`translate(${xB}px,${yB}px) scale(.9)`,opacity:1},{transform:`translate(${end.x}px,${end.y}px) scale(.85)`,opacity:0}],160);
    spark(0);hide();return;
  }
  n.className='nj is-sneak';
  face(start.x,xC);
  n.style.transform=`translate(${start.x}px,${start.y}px)`;
  await anim(n,[{transform:`translate(${start.x}px,${start.y}px) scale(.92)`,opacity:0},{transform:`translate(${(start.x+xC)*.5}px,${yC+3}px) scale(1)`,opacity:1,offset:.5},{transform:`translate(${xC-10}px,${yC-2}px) scale(1)`,opacity:1}],260);
  n.classList.remove('is-sneak');n.classList.add('is-grab');spark(1);
  await anim(n,[{transform:`translate(${xC-10}px,${yC-2}px)`},{transform:`translate(${xC}px,${yC-18}px) scale(1.06)`,offset:.42},{transform:`translate(${xC}px,${yC}px) scale(1)`}],200,'cubic-bezier(.18,.84,.22,1)');
  n.classList.remove('is-grab');n.classList.add('has-loot','slung');
  await anim(n,[{transform:`translate(${xC}px,${yC}px)`},{transform:`translate(${xC}px,${yC-6}px)`},{transform:`translate(${xC}px,${yC-2}px)`}],80);
  spark(0);n.classList.add('is-run');
  face(xC,xB);
  const midX=xC+(xB-xC)*.55,midY=yC+(yB-yC)*.4-22;
  await anim(n,[{transform:`translate(${xC}px,${yC-2}px) scale(1)`},{transform:`translate(${midX}px,${midY}px) scale(1.07)`,offset:.45},{transform:`translate(${xB}px,${yB-16}px) scale(1)`}],380);
  n.classList.remove('is-run');n.classList.add('is-toss');spark(1);
  await anim(n,[{transform:`translate(${xB}px,${yB-16}px) scale(1)`},{transform:`translate(${xB}px,${yB-24}px) scale(1.08)`,offset:.4},{transform:`translate(${xB}px,${yB-4}px) scale(.92)`}],140);
  bump(dest);n.classList.remove('has-loot','slung','is-toss');spark(0);n.classList.add('is-run');
  face(xB,end.x);
  await anim(n,[{transform:`translate(${xB}px,${yB-4}px) scale(.95)`,opacity:1},{transform:`translate(${end.x}px,${yB}px) scale(.85)`,opacity:0}],160);
  hide();
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
  const y=Math.min(innerHeight-130,Math.max(150,innerHeight*.6));
  const start=edge('right',y);
  n.getAnimations().forEach(a=>a.cancel());
  n.className='nj is-peek is-sneak face-left';
  n.style.opacity='1';
  n.style.transform=`translate(${start.x}px,${y}px)`;
  const inX=innerWidth-28;
  await anim(n,[{transform:`translate(${start.x}px,${y}px)`,opacity:1},{transform:`translate(${inX}px,${y}px)`}],300);
  n.classList.add('is-crouch');n.classList.remove('is-sneak');
  await anim(n,[{transform:`translate(${inX}px,${y}px)`},{transform:`translate(${inX}px,${y+7}px)`}],140);
  n.classList.add('is-look');
  await new Promise(r=>setTimeout(r,520));
  n.classList.add('is-wink');
  await new Promise(r=>setTimeout(r,280));
  n.classList.remove('is-wink','is-look','is-crouch');
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
.nj{position:fixed;left:0;top:0;z-index:85;width:72px;height:72px;margin:-36px 0 0 -36px;pointer-events:none;opacity:0;will-change:transform,opacity}
.nj-shadow{position:absolute;left:50%;bottom:2px;width:34px;height:9px;margin-left:-17px;border-radius:50%;background:radial-gradient(ellipse,rgba(15,23,42,.42),rgba(15,23,42,0) 70%);pointer-events:none}
.nj-bob{width:72px;height:72px;position:relative;transform-origin:50% 88%}
.nj-lean{width:72px;height:72px;transform-origin:50% 74%}
.nj.face-left .nj-bob{transform:scaleX(-1)}
.nj .nj-svg{width:72px;height:72px;display:block;overflow:visible}
.nj-loot{position:absolute;left:50px;top:38px;width:16px;height:16px;border-radius:5px;overflow:hidden;opacity:0;transform:scale(.4);box-shadow:0 2px 6px rgba(15,23,42,.2)}
.nj-loot img,.nj-dot{width:16px;height:16px;object-fit:cover;display:block;background:#0f766e;border-radius:5px}
.nj.has-loot .nj-loot{opacity:1;transform:scale(1)}
.nj.slung .nj-loot{left:42px;top:18px;transform:rotate(-26deg) scale(.85)}
.nj-fx{position:absolute;left:38px;top:16px;width:0;height:0;pointer-events:none;opacity:0}
.nj-fx i{position:absolute;width:7px;height:7px;border-radius:1px;background:linear-gradient(135deg,#fff,#ffe08a 40%,#ff6b4a);transform:rotate(45deg) scale(0);box-shadow:0 0 6px rgba(255,107,74,.6)}
.nj.is-spark .nj-fx{opacity:1}
.nj.is-spark .nj-fx i:nth-child(1){animation:nj-star .38s ease-out forwards}
.nj.is-spark .nj-fx i:nth-child(2){animation:nj-star .38s ease-out .04s forwards;left:10px;top:-8px}
.nj.is-spark .nj-fx i:nth-child(3){animation:nj-star .38s ease-out .08s forwards;left:-12px;top:-2px}
.nj.is-spark .nj-fx i:nth-child(4){animation:nj-star .38s ease-out .06s forwards;left:6px;top:10px;width:5px;height:5px}
.nj .nj-leg,.nj .nj-arm,.nj .nj-bag,.nj .nj-head,.nj .nj-tail,.nj .nj-body,.nj .nj-pupil,.nj .nj-lid-l{transform-box:fill-box;transform-origin:50% 0}
.nj .nj-head{transform-origin:50% 80%}
.nj .nj-bag{transform-origin:18% 8%}
.nj .nj-pupil{transform-origin:50% 50%}
.nj .nj-lid-l{transform-origin:50% 50%;transform:scaleY(0)}
.nj.is-sneak .nj-lean{transform:rotate(7deg)}
.nj.is-sneak .nj-bob{animation:nj-tiptoe .36s ease-in-out infinite}
.nj.face-left.is-sneak .nj-bob{animation-name:nj-tiptoe-l}
.nj.is-sneak .nj-leg-r{animation:nj-sneak-r .36s ease-in-out infinite}
.nj.is-sneak .nj-leg-l{animation:nj-sneak-l .36s ease-in-out infinite}
.nj.is-sneak .nj-arm-r{animation:nj-arm-r .36s ease-in-out infinite}
.nj.is-sneak .nj-arm-l{animation:nj-arm-l .36s ease-in-out infinite}
.nj.is-sneak .nj-tail{animation:nj-tail .36s ease-in-out infinite}
.nj.is-sneak .nj-shadow{animation:nj-shadow .36s ease-in-out infinite}
.nj.is-run .nj-lean{transform:rotate(18deg)}
.nj.is-run .nj-bob{animation:nj-bounce .26s ease-in-out infinite}
.nj.face-left.is-run .nj-bob{animation-name:nj-bounce-l}
.nj.is-run:not(.is-grab) .nj-leg-r{animation:nj-leg-r .26s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-leg-l{animation:nj-leg-l .26s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-arm-r{animation:nj-arm-r .26s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-arm-l{animation:nj-arm-l .26s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-bag{animation:nj-bag .26s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-tail{animation:nj-tail .26s ease-in-out infinite}
.nj.is-run:not(.is-grab) .nj-shadow{animation:nj-shadow .26s ease-in-out infinite}
.nj.slung .nj-bag{transform:translate(-7px,-12px) rotate(-28deg)}
.nj.slung.is-run:not(.is-grab) .nj-bag{animation-name:nj-bag-slung}
.nj.is-grab .nj-lean{transform:rotate(0) translateY(5px) scaleY(.9)}
.nj.is-grab .nj-bob,.nj.is-grab.face-left .nj-bob{animation:none}
.nj.is-toss .nj-lean{transform:rotate(-8deg) scale(1.04)}
.nj.is-toss .nj-bag{transform:translate(-2px,-22px) rotate(-62deg)}
.nj.is-toss .nj-arm-r{transform:rotate(-70deg)}
.nj.is-crouch .nj-lean{transform:scaleY(.88) translateY(5px)}
.nj.is-look .nj-head{animation:nj-look .7s ease-in-out}
.nj.is-look .nj-pupil{animation:nj-shift .7s ease-in-out}
.nj.is-wink .nj-lid-l{transform:scaleY(1)}
.nj.is-peek .nj-bag{transform:translate(2px,3px)}
.nj.is-pose .nj-lean{transform:rotate(8deg)}
.nj.is-pose .nj-leg-r{transform:rotate(14deg)}
.nj.is-pose .nj-leg-l{transform:rotate(-10deg)}
.nj.is-pose .nj-arm-r{transform:rotate(18deg)}
.nj.is-pose .nj-arm-l{transform:rotate(-22deg)}
.nj.is-pose.slung .nj-bag{transform:translate(-7px,-12px) rotate(-26deg)}
@keyframes nj-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes nj-bounce-l{0%,100%{transform:scaleX(-1) translateY(0)}50%{transform:scaleX(-1) translateY(-6px)}}
@keyframes nj-tiptoe{0%,100%{transform:translateY(0)}40%{transform:translateY(-3px)}70%{transform:translateY(-1px)}}
@keyframes nj-tiptoe-l{0%,100%{transform:scaleX(-1) translateY(0)}40%{transform:scaleX(-1) translateY(-3px)}70%{transform:scaleX(-1) translateY(-1px)}}
@keyframes nj-leg-r{0%,100%{transform:rotate(36deg)}50%{transform:rotate(-32deg)}}
@keyframes nj-leg-l{0%,100%{transform:rotate(-32deg)}50%{transform:rotate(36deg)}}
@keyframes nj-sneak-r{0%,100%{transform:rotate(16deg)}50%{transform:rotate(-12deg)}}
@keyframes nj-sneak-l{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(16deg)}}
@keyframes nj-arm-r{0%,100%{transform:rotate(-40deg)}50%{transform:rotate(30deg)}}
@keyframes nj-arm-l{0%,100%{transform:rotate(30deg)}50%{transform:rotate(-40deg)}}
@keyframes nj-bag{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(14deg)}}
@keyframes nj-bag-slung{0%,100%{transform:translate(-7px,-12px) rotate(-22deg)}50%{transform:translate(-9px,-16px) rotate(-40deg)}}
@keyframes nj-shadow{0%,100%{transform:scale(1,.9);opacity:1}50%{transform:scale(.62,.7);opacity:.5}}
@keyframes nj-look{0%,100%{transform:rotate(0)}28%{transform:rotate(-16deg)}68%{transform:rotate(14deg)}}
@keyframes nj-shift{0%,100%{transform:translate(0,0)}28%{transform:translate(-2.3px,.4px)}68%{transform:translate(2.5px,-.3px)}}
@keyframes nj-tail{0%,100%{transform:rotate(0)}50%{transform:rotate(18deg)}}
@keyframes nj-star{0%{transform:rotate(45deg) scale(0);opacity:1}70%{opacity:1}100%{transform:rotate(45deg) translate(14px,-16px) scale(.3);opacity:0}}
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

function pose(){
  clearTimeout(idleT);busy=1;
  const n=ensure();
  n.getAnimations().forEach(a=>a.cancel());
  n.className='nj is-pose slung';
  n.style.opacity='1';
  return n;
}
window.Ninja={play,wanted,on,set,toggleRow,syncToggle,peek:idlePeek,mark,pose};
})();
