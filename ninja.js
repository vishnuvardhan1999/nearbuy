/* ShopNip · ninja helper. Picks up an item, stows it, and runs it to the basket (~2.2s); peeks in while idle.
   Mask stays on. Transform/opacity only, pointer-events none. Basket count updates in saveB first. */
(()=>{
const KEY='nb_ninja';
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wanted=()=>localStorage[KEY]!=='0';
const on=()=>wanted()&&!reduced();

const SVG=`<svg class="nj-svg" viewBox="0 0 80 80" aria-hidden="true">
  <defs>
    <linearGradient id="njg-hood" x1="18" y1="4" x2="52" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6a7d94"/><stop offset=".26" stop-color="#2c3a4c"/><stop offset=".68" stop-color="#141b25"/><stop offset="1" stop-color="#070a0f"/>
    </linearGradient>
    <linearGradient id="njg-hood-in" x1="26" y1="16" x2="44" y2="36" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#334257"/><stop offset="1" stop-color="#0a0e14"/>
    </linearGradient>
    <linearGradient id="njg-suit" x1="24" y1="33" x2="46" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3a4d60"/><stop offset=".4" stop-color="#18212c"/><stop offset="1" stop-color="#080b10"/>
    </linearGradient>
    <linearGradient id="njg-limb" x1="0" y1="0" x2=".15" y2="1">
      <stop offset="0" stop-color="#3a4d60"/><stop offset=".55" stop-color="#161d27"/><stop offset="1" stop-color="#070a10"/>
    </linearGradient>
    <linearGradient id="njg-scarf" x1="16" y1="10" x2="80" y2="26" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffc8b6"/><stop offset=".42" stop-color="#ff6b4a"/><stop offset="1" stop-color="#c02922"/>
    </linearGradient>
    <linearGradient id="njg-scarf-fold" x1="68" y1="16" x2="80" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff8a6c"/><stop offset="1" stop-color="#9a1a18"/>
    </linearGradient>
    <linearGradient id="njg-bag" x1="51" y1="32" x2="72" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3aafa3"/><stop offset=".36" stop-color="#0f766e"/><stop offset="1" stop-color="#0a4743"/>
    </linearGradient>
    <linearGradient id="njg-bag-in" x1="54" y1="33" x2="68" y2="39" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0d4440"/><stop offset="1" stop-color="#062422"/>
    </linearGradient>
    <linearGradient id="njg-rim" x1="18" y1="7" x2="38" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#e4eef6"/><stop offset="1" stop-color="#e4eef6" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="njg-hl" cx="33%" cy="24%" r="60%">
      <stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".42" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="njg-eye-sh" cx="50%" cy="80%" r="70%">
      <stop offset="0" stop-color="#c5cedb"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g class="nj-leg nj-leg-l">
    <path d="M30.2 51.2c-2.4.2-4.1 1.8-3.8 4.2l1.6 12.8c.24 1.7 1.6 2.5 3.3 2.3l3.1-.3c1.55-.18 2.3-1.5 2-3L34.4 54.8c-.46-2.4-2.4-3.8-4.2-3.6z" fill="url(#njg-limb)"/>
    <ellipse cx="28.8" cy="69.4" rx="5.4" ry="2.5" fill="url(#njg-limb)"/>
    <ellipse cx="28.2" cy="70.5" rx="4.9" ry="1.25" fill="#05070b"/>
    <path d="M31.2 52.6l1.2 14.4" stroke="#8aa0b4" stroke-width=".55" stroke-linecap="round" opacity=".3"/>
  </g>
  <g class="nj-leg nj-leg-r">
    <path d="M37.8 51.2c2.4.2 4.1 1.8 3.8 4.2l-1.6 12.8c-.24 1.7-1.6 2.5-3.3 2.3l-3.1-.3c-1.55-.18-2.3-1.5-2-3L33.6 54.8c.46-2.4 2.4-3.8 4.2-3.6z" fill="url(#njg-limb)"/>
    <ellipse cx="39.2" cy="69.4" rx="5.4" ry="2.5" fill="url(#njg-limb)"/>
    <ellipse cx="39.8" cy="70.5" rx="4.9" ry="1.25" fill="#05070b"/>
    <path d="M36.8 52.6l-1.2 14.4" stroke="#8aa0b4" stroke-width=".55" stroke-linecap="round" opacity=".3"/>
  </g>

  <g class="nj-arm nj-arm-l">
    <path d="M27.4 38.2c-3.8 2.6-7.4 7-8.2 12.4" fill="none" stroke="url(#njg-limb)" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="18.9" cy="51.2" r="2.25" fill="#151c28"/>
    <circle cx="19.35" cy="50.65" r=".55" fill="#c5d4e2" opacity=".5"/>
  </g>

  <g class="nj-body">
    <path d="M26 37c0-2.5 3.6-4.8 8.2-4.8s8.2 2.3 8.2 4.8v14.2c0 3.5-3.6 6.2-8.2 6.2s-8.2-2.7-8.2-6.2z" fill="url(#njg-suit)"/>
    <path d="M28.8 37.2c1.5-1.6 4.2-2.5 6.6-2.3" fill="none" stroke="url(#njg-rim)" stroke-width="1.05" stroke-linecap="round" opacity=".6"/>
    <rect x="28.8" y="51.8" width="10.4" height="2" rx="1" fill="#0a0e14"/>
    <path d="M34.2 33.6v17.6" stroke="#000" stroke-width=".55" opacity=".2"/>
  </g>

  <g class="nj-arm nj-arm-r">
    <path d="M41 38.2c3.8 2.6 7.4 7 8.2 12.4" fill="none" stroke="url(#njg-limb)" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="49.6" cy="51.2" r="2.25" fill="#151c28"/>
    <circle cx="50.05" cy="50.65" r=".55" fill="#c5d4e2" opacity=".5"/>
  </g>

  <g class="nj-head">
    <path d="M19.8 27.2C18.8 13.4 24.8 5.4 34.2 5.4 45.6 5.4 53.6 13.6 53 27.4 52.5 36.4 45.8 41.2 34.2 41.2 23 41.2 20.4 35.4 19.8 27.2Z" fill="url(#njg-hood)"/>
    <path d="M23.2 26.6c.3-8.4 5.4-13.8 11-13.8 5.7 0 10.8 5.6 11 13.8.1 6.4-4.7 11.4-11 11.4S23.1 33 23.2 26.6Z" fill="url(#njg-hood-in)"/>
    <path d="M20.8 21.2C22.5 10.8 27.8 7.2 34.2 7.2" fill="none" stroke="url(#njg-rim)" stroke-width="1.3" stroke-linecap="round" opacity=".58"/>
    <g class="nj-eyes">
      <g class="nj-eye nj-eye-l">
        <ellipse cx="28.3" cy="24.5" rx="5.15" ry="5.7" fill="#0b0f15"/>
        <ellipse cx="28.3" cy="24.5" rx="5.15" ry="5.7" fill="none" stroke="#6a7d94" stroke-width=".45" opacity=".28"/>
        <ellipse cx="28.3" cy="24.5" rx="4.35" ry="4.85" fill="#fff"/>
        <ellipse cx="28.3" cy="24.5" rx="4.35" ry="4.85" fill="url(#njg-eye-sh)"/>
                <path d="M24.6 22.3c1-1.45 2.3-2.15 3.7-2.15 1.4 0 2.7.7 3.7 2.15" fill="none" stroke="#0b0f15" stroke-width=".6" stroke-linecap="round" opacity=".4"/>
        <g class="nj-pupil">
          <ellipse cx="28.95" cy="25.05" rx="1.95" ry="2.4" fill="#151a24"/>
          <circle cx="28.3" cy="23.95" r=".8" fill="#fff"/>
          <circle cx="29.55" cy="25.6" r=".26" fill="#fff" opacity=".65"/>
        </g>
        <ellipse class="nj-lid-l" cx="28.3" cy="24.5" rx="4.55" ry="5.05" fill="#0b0f15"/>
      </g>
      <g class="nj-eye nj-eye-r">
        <ellipse cx="40.3" cy="24.5" rx="5.15" ry="5.7" fill="#0b0f15"/>
        <ellipse cx="40.3" cy="24.5" rx="5.15" ry="5.7" fill="none" stroke="#6a7d94" stroke-width=".45" opacity=".28"/>
        <ellipse cx="40.3" cy="24.5" rx="4.35" ry="4.85" fill="#fff"/>
        <ellipse cx="40.3" cy="24.5" rx="4.35" ry="4.85" fill="url(#njg-eye-sh)"/>
                <path d="M36.6 22.3c1-1.45 2.3-2.15 3.7-2.15 1.4 0 2.7.7 3.7 2.15" fill="none" stroke="#0b0f15" stroke-width=".6" stroke-linecap="round" opacity=".4"/>
        <g class="nj-pupil">
          <ellipse cx="40.95" cy="25.05" rx="1.95" ry="2.4" fill="#151a24"/>
          <circle cx="40.3" cy="23.95" r=".8" fill="#fff"/>
          <circle cx="41.55" cy="25.6" r=".26" fill="#fff" opacity=".65"/>
        </g>
      </g>
    </g>
    <path d="M23.6 28.6c2.1 3.2 6.2 4.9 10.6 4.9s8.5-1.7 10.6-4.9" fill="none" stroke="#070a0f" stroke-width="1.25" stroke-linecap="round" opacity=".45"/>
    <ellipse cx="34.2" cy="21.6" rx="15" ry="15.2" fill="url(#njg-hl)"/>
    <path d="M21.8 15.5c4.4-3 8.4-3.95 12.4-3.95 4.1 0 8.3 1.1 12.6 3.95" fill="none" stroke="url(#njg-scarf)" stroke-width="2.65" stroke-linecap="round"/>
    <path d="M22 14.75c4.3-2.7 8.2-3.5 12.2-3.5" fill="none" stroke="#ffe4da" stroke-width=".7" stroke-linecap="round" opacity=".5"/>
    <ellipse cx="47.15" cy="15.55" rx="1.9" ry="1.7" fill="#ff6b4a"/>
    <ellipse cx="47.35" cy="15.1" rx=".7" ry=".5" fill="#ffd6c8"/>
  </g>

  <g class="nj-bag">
    <path d="M54.6 33c-1.55-4.5 1.5-8 4.3-8.3" fill="none" stroke="#ff6b4a" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M63 33c1.55-4.7-.45-8.15-3.05-8.5" fill="none" stroke="#ff6b4a" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M54.6 32.5c-1.5-4.2 1.5-7.6 4.1-7.85" fill="none" stroke="#ffc2b0" stroke-width=".55" stroke-linecap="round" opacity=".5"/>
    <circle cx="58.85" cy="23.85" r="1.2" fill="#ff6b4a"/>
    <circle cx="59.05" cy="23.55" r=".4" fill="#ffd6c8"/>
    <path d="M52.4 36.2c0-1.4 1.15-2.5 2.7-2.5h11.4c1.55 0 2.7 1.1 2.7 2.5v16c0 2.1-1.7 3.6-3.8 3.6H56.2c-2.1 0-3.8-1.5-3.8-3.6z" fill="url(#njg-bag)"/>
    <path d="M64.4 36.4c1.2.5 1.5 1.2 1.5 2.3v13.4c0 1.5-.7 2.6-2 3.1" fill="none" stroke="#062422" stroke-width="2" stroke-linecap="round" opacity=".22"/>
    <ellipse cx="59.35" cy="33.9" rx="7" ry="2.2" fill="url(#njg-bag-in)"/>
    <path d="M54.4 36.8c1.4-2.4 4.4-3.5 7.8-3.15 2.2.25 3.9 1.25 4.7 2.55" fill="none" stroke="#b8efe8" stroke-width=".85" stroke-linecap="round" opacity=".45"/>
    <g class="nj-flap">
      <path d="M52.3 34.2c.15-2.6 3.15-4.5 7.05-4.5s6.9 1.9 7.05 4.5c0 1.15-1.25 1.85-2.35 1.85H54.65c-1.1 0-2.35-.7-2.35-1.85z" fill="#0e5f58"/>
      <path d="M53.4 33.2c1.5-1.7 4.1-2.5 6.4-2.4 2.1.1 4 .9 5 2.2" fill="none" stroke="#9ee4dc" stroke-width=".7" stroke-linecap="round" opacity=".45"/>
    </g>
        <g transform="translate(59.3 47.3)" fill="#ff6b4a">
      <path d="M-2.25-1.15h4.5l-.5 4.15c-.08.5-.48.85-.95.85h-2.6c-.47 0-.87-.35-.95-.85z"/>
      <path d="M-1.05-1.15v-1.5a1.3 1.3 0 0 1 2.6 0v1.5" fill="none" stroke="#ff6b4a" stroke-width="1" stroke-linecap="round"/>
    </g>
  </g>
    <g class="nj-tail">
    <path d="M47.2 15.1c5.6 1.4 11.2 6.6 15 12 1.8 2.6 5.2 3.8 8.2 1.8-2.6 4.6-9.4 5-13.8 1.4-3.6-2.8-7-8.6-9.4-15.2z" fill="url(#njg-scarf-fold)"/>
    <path d="M47.4 13.6c7.4-3.6 16.4-1.2 20.4 5.6 2.2 3.6 7 5.2 11.8 1.8-2.2 6.4-12 9.6-18.6 5.2-4-2.6-9-6.6-13.6-12.6z" fill="url(#njg-scarf)"/>
    <path d="M69.4 20.4c3.6 2 8.2 1.4 10.4-2.8-1.4 5.6-8 8.6-13.8 5.8-1.5-.7-1.5-2.2-.2-3.1 1.2-.8 2.3-.7 3.6.1z" fill="url(#njg-scarf-fold)"/>
    <path d="M49.2 13.9c6-2.6 13.6 0 17.2 5.2" fill="none" stroke="#ffe4da" stroke-width="1.05" stroke-linecap="round" opacity=".55"/>
  </g>
</svg>`;

let root=null,busy=0,idleT=0,queue=[],gen=0,at=null;

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
function hide(){gen++;if(!root)return;root.className='nj';root.style.transform='translate(-140px,-140px)';root.style.opacity='0';const loot=root.querySelector('.nj-loot');if(loot){loot.getAnimations().forEach(a=>a.cancel());loot.innerHTML='';loot.style.cssText=''}at=null;}
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
function restPos(){
  const y=Math.min(innerHeight-130,Math.max(150,innerHeight*.6));
  return {x:innerWidth+46,y};
}
const EASE='cubic-bezier(.22,.68,.28,1)';
const SOFT='cubic-bezier(.33,.1,.2,1)';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function clampY(y){return Math.min(innerHeight-72,Math.max(64,y))}
function sidePos(fromX,y){
  const useRight=(innerWidth+48-fromX)>=(fromX+48);
  return {x:useRight?innerWidth+48:-48,y:clampY(y)};
}
function quad(a,c,b,t){const u=1-t;return{x:u*u*a.x+2*u*t*c.x+t*t*b.x,y:u*u*a.y+2*u*t*c.y+t*t*b.y}}
function liftFor(a,b){return Math.min(58,Math.max(26,Math.hypot(b.x-a.x,b.y-a.y)*.2))}
function arcKfs(a,b,lift,opt){
  const c={x:(a.x+b.x)*.5,y:(a.y+b.y)*.5-lift};
  const n=6,k=[];
  for(let i=0;i<=n;i++){
    const t=i/n,p=quad(a,c,b,t),kf={transform:`translate(${p.x}px,${p.y}px)`,offset:i/n,opacity:1};
    if(opt&&opt.fadeIn)kf.opacity=i===0?0:1;
    if(opt&&opt.fadeOut)kf.opacity=i>=n-1?(i===n?0:.7):1;
    k.push(kf);
  }
  return k;
}
function lootEl(){return root&&root.querySelector('.nj-loot')}
function lootAnim(kfs,ms,ease){const el=lootEl();if(!el)return Promise.resolve();el.getAnimations().forEach(a=>a.cancel());return anim(el,kfs,ms,ease)}
function clearLoot(){const el=lootEl();if(!el)return;el.getAnimations().forEach(a=>a.cancel());el.innerHTML='';el.style.cssText=''}

async function runToBasket(from){
  const dest=hopTarget();
  const snap=mark(from);
  if(!dest||!snap._ok)return;
  const my=++gen;
  const alive=()=>my===gen&&wanted()&&!reduced()&&root;
  const n=ensure();
  n.getAnimations().forEach(a=>a.cancel());
  const lo=lootEl();if(lo)lo.getAnimations().forEach(a=>a.cancel());
  const b=dest.getBoundingClientRect();
  const xC=snap.x,yC=snap.y,xB=b.left+b.width/2,yB=b.top+b.height/2;
  const onStage=at&&root&&parseFloat(root.style.opacity||'0')>0;
  const start=onStage?at:sidePos(xC,yC);
  const side=start.x>xC?1:-1;
  const pick={x:xC+side*58,y:yC+12};
  const drop={x:xB+(xB>innerWidth*.5?-48:48),y:yB+46};
  const exit=sidePos(xB,yB);
  const go=async(kfs,ms,ease)=>{if(!alive())return false;await anim(n,kfs,ms,ease);return alive()};

  lootFrom(snap);
  n.style.opacity='1';
  n.className='nj is-run'+(onStage?' bag-shut':'');
  face(start.x,pick.x);
  n.style.transform=`translate(${start.x}px,${start.y}px)`;
  if(!await go(arcKfs(start,pick,liftFor(start,pick),onStage?null:{fadeIn:1}),onStage?400:460,EASE))return;
  at=pick;

  n.classList.remove('is-run','bag-shut');
  n.classList.add('is-reach','has-loot');
  const hold=lootAnim([
    {transform:'translate(16px,12px) scale(.5)',opacity:0},
    {transform:'translate(6px,6px) scale(1.08)',opacity:1,offset:.5},
    {transform:'translate(2px,2px) scale(1)',opacity:1}
  ],320,EASE);
  if(!await go([
    {transform:`translate(${pick.x}px,${pick.y}px)`},
    {transform:`translate(${pick.x}px,${pick.y+7}px)`,offset:.4},
    {transform:`translate(${pick.x}px,${pick.y}px)`}
  ],320,SOFT))return;
  await hold;

  n.classList.remove('is-reach');
  n.classList.add('is-stow');
  const stow=lootAnim([
    {transform:'translate(2px,2px) scale(1)',opacity:1},
    {transform:'translate(8px,-8px) scale(.55)',opacity:1,offset:.45},
    {transform:'translate(10px,-4px) scale(.2)',opacity:0}
  ],320,SOFT);
  if(!await go([
    {transform:`translate(${pick.x}px,${pick.y}px)`},
    {transform:`translate(${pick.x}px,${pick.y-4}px)`,offset:.35},
    {transform:`translate(${pick.x}px,${pick.y}px)`}
  ],320,SOFT))return;
  await stow;
  n.classList.remove('is-stow','has-loot');
  n.classList.add('bag-shut');
  clearLoot();
  await wait(40);
  if(!alive())return;

  n.classList.add('is-run');
  face(pick.x,drop.x);
  if(!await go(arcKfs(pick,drop,liftFor(pick,drop)+10),520,EASE))return;
  at=drop;

  n.classList.remove('is-run','bag-shut');
  n.classList.add('is-drop','has-loot');
  lootFrom(snap);
  const tip=lootAnim([
    {transform:'translate(8px,0) scale(.2)',opacity:0},
    {transform:'translate(10px,-18px) scale(1.05)',opacity:1,offset:.3},
    {transform:'translate(14px,-36px) scale(1)',opacity:1,offset:.7},
    {transform:'translate(16px,-52px) scale(.4)',opacity:0}
  ],340,EASE);
  if(!await go([
    {transform:`translate(${drop.x}px,${drop.y}px)`},
    {transform:`translate(${drop.x}px,${drop.y-10}px)`,offset:.4},
    {transform:`translate(${drop.x}px,${drop.y+2}px)`}
  ],340,SOFT))return;
  await tip;
  bump(dest);
  n.classList.remove('has-loot','is-drop');
  clearLoot();
  at={x:drop.x,y:drop.y+2};

  if(queue.length){n.classList.add('is-run','bag-shut');return}
  n.classList.add('is-nod');
  await wait(180);
  if(!alive())return;
  n.classList.remove('is-nod');
  n.classList.add('is-run');
  face(at.x,exit.x);
  if(!await go(arcKfs(at,exit,liftFor(at,exit),{fadeOut:1}),220,EASE))return;
  hide();
}

function play(from){
  if(!from||!wanted())return false;
  if(reduced())return false;
  const snap=mark(from);
  if(!snap._ok)return false;
  if(busy){queue.push(snap);return true}
  busy=1;clearTimeout(idleT);
  (async function next(s){try{await runToBasket(s)}catch(_){}const n=queue.shift();if(n)return next(n);busy=0;scheduleIdle()})(snap);
  return true;
}

async function idlePeek(){
  if(document.hidden||busy||!on()){scheduleIdle();return}
  const n=ensure();
  const start=restPos();
  const y=start.y;
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
.nj-loot{position:absolute;left:48px;top:34px;width:22px;height:22px;border-radius:6px;overflow:hidden;opacity:0;transform:scale(.4);box-shadow:0 1px 2px rgba(15,23,42,.28),0 0 0 2px #fff;z-index:2}
.nj-loot img,.nj-dot{width:22px;height:22px;object-fit:cover;display:block;background:#fff;border-radius:6px}
.nj.has-loot .nj-loot{opacity:1}
.nj.slung .nj-loot{left:42px;top:18px;transform:rotate(-26deg) scale(.85)}
.nj-fx{position:absolute;left:38px;top:16px;width:0;height:0;pointer-events:none;opacity:0}
.nj-fx i{position:absolute;width:7px;height:7px;border-radius:1px;background:linear-gradient(135deg,#fff,#ffe08a 40%,#ff6b4a);transform:rotate(45deg) scale(0);box-shadow:0 0 6px rgba(255,107,74,.6)}
.nj.is-spark .nj-fx{opacity:1}
.nj.is-spark .nj-fx i:nth-child(1){animation:nj-star .38s ease-out forwards}
.nj.is-spark .nj-fx i:nth-child(2){animation:nj-star .38s ease-out .04s forwards;left:10px;top:-8px}
.nj.is-spark .nj-fx i:nth-child(3){animation:nj-star .38s ease-out .08s forwards;left:-12px;top:-2px}
.nj.is-spark .nj-fx i:nth-child(4){animation:nj-star .38s ease-out .06s forwards;left:6px;top:10px;width:5px;height:5px}
.nj .nj-leg,.nj .nj-arm,.nj .nj-bag,.nj .nj-head,.nj .nj-tail,.nj .nj-body,.nj .nj-pupil,.nj .nj-lid-l,.nj .nj-flap{transform-box:fill-box;transform-origin:50% 0}
.nj .nj-head{transform-origin:50% 80%}
.nj .nj-bag{transform-origin:18% 8%}
.nj .nj-pupil{transform-origin:50% 50%}
.nj .nj-lid-l{transform-origin:50% 50%;transform:scaleY(0)}
.nj .nj-flap{transform-origin:50% 8%;transform:rotate(-88deg);opacity:0;transition:transform .28s cubic-bezier(.22,.68,.28,1),opacity .18s ease}
.nj.bag-shut .nj-flap,.nj.is-stow .nj-flap{transform:rotate(0);opacity:1}
.nj.is-reach .nj-lean{transform:rotate(5deg) translateY(3px)}
.nj.is-reach .nj-arm-r{transform:rotate(-62deg)}
.nj.is-reach .nj-arm-l{transform:rotate(14deg)}
.nj.is-reach .nj-head{transform:rotate(6deg)}
.nj.is-stow .nj-lean{transform:rotate(-2deg)}
.nj.is-stow .nj-arm-r{transform:rotate(-36deg)}
.nj.is-stow .nj-arm-l{transform:rotate(10deg)}
.nj.is-stow .nj-bag{animation:nj-bag-bounce .3s cubic-bezier(.22,.68,.28,1)}
.nj.is-nod .nj-lean{transform:rotate(-4deg)}
.nj.is-nod .nj-head{animation:nj-nod .32s cubic-bezier(.22,.68,.28,1)}
.nj.is-nod .nj-arm-r{transform:rotate(-50deg)}
.nj.is-nod .nj-arm-l{transform:rotate(8deg)}
.nj.is-sneak .nj-lean{transform:rotate(7deg)}
.nj.is-sneak .nj-bob{animation:nj-tiptoe .36s ease-in-out infinite}
.nj.face-left.is-sneak .nj-bob{animation-name:nj-tiptoe-l}
.nj.is-sneak .nj-leg-r{animation:nj-sneak-r .36s ease-in-out infinite}
.nj.is-sneak .nj-leg-l{animation:nj-sneak-l .36s ease-in-out infinite}
.nj.is-sneak .nj-arm-r{animation:nj-arm-r .36s ease-in-out infinite}
.nj.is-sneak .nj-arm-l{animation:nj-arm-l .36s ease-in-out infinite}
.nj.is-sneak .nj-tail{animation:nj-tail .36s ease-in-out infinite}
.nj.is-sneak .nj-shadow{animation:nj-shadow .36s ease-in-out infinite}
.nj.is-run .nj-lean{transform:rotate(7deg)}
.nj.is-run .nj-bob{animation:nj-run-bob .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.face-left.is-run .nj-bob{animation-name:nj-run-bob-l}
.nj.is-run:not(.is-grab) .nj-leg-r{animation:nj-run-leg-r .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.is-run:not(.is-grab) .nj-leg-l{animation:nj-run-leg-l .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.is-run:not(.is-grab):not(.is-carry):not(.bag-shut) .nj-arm-r{animation:nj-run-arm-r .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.is-run:not(.is-grab):not(.is-carry) .nj-arm-l{animation:nj-run-arm-l .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.is-run:not(.is-grab) .nj-bag{animation:nj-bag .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.is-run:not(.is-grab) .nj-tail{animation:nj-tail .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.is-run:not(.is-grab) .nj-shadow{animation:nj-shadow .4s cubic-bezier(.45,.08,.55,.92) infinite}
.nj.is-run.bag-shut:not(.is-grab) .nj-arm-r{animation:none;transform:rotate(-32deg)}
.nj.is-run.bag-shut:not(.is-grab) .nj-bag{animation-name:nj-bag-carry}
.nj.is-carry .nj-lean{transform:rotate(6deg)}
.nj.is-carry .nj-arm-r{animation:none;transform:rotate(-42deg)}
.nj.is-carry .nj-arm-l{animation:none;transform:rotate(16deg)}
.nj.is-carry .nj-loot{left:46px;top:28px;transform:rotate(-8deg) scale(.95)}
.nj.is-drop .nj-lean{transform:rotate(-6deg) translateY(2px)}
.nj.is-drop .nj-arm-r{transform:rotate(-58deg)}
.nj.is-drop .nj-bag{transform:rotate(-16deg) translate(1px,-4px)}
.nj.is-drop .nj-loot{left:50px;top:30px;transform:scale(.2);opacity:0}
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
@keyframes nj-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes nj-bounce-l{0%,100%{transform:scaleX(-1) translateY(0)}50%{transform:scaleX(-1) translateY(-3px)}}
@keyframes nj-tiptoe{0%,100%{transform:translateY(0)}40%{transform:translateY(-3px)}70%{transform:translateY(-1px)}}
@keyframes nj-tiptoe-l{0%,100%{transform:scaleX(-1) translateY(0)}40%{transform:scaleX(-1) translateY(-3px)}70%{transform:scaleX(-1) translateY(-1px)}}
@keyframes nj-leg-r{0%,100%{transform:rotate(18deg)}50%{transform:rotate(-14deg)}}
@keyframes nj-leg-l{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(18deg)}}
@keyframes nj-sneak-r{0%,100%{transform:rotate(16deg)}50%{transform:rotate(-12deg)}}
@keyframes nj-sneak-l{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(16deg)}}
@keyframes nj-arm-r{0%,100%{transform:rotate(-22deg)}50%{transform:rotate(16deg)}}
@keyframes nj-arm-l{0%,100%{transform:rotate(16deg)}50%{transform:rotate(-22deg)}}
@keyframes nj-bag{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(14deg)}}
@keyframes nj-bag-slung{0%,100%{transform:translate(-7px,-12px) rotate(-22deg)}50%{transform:translate(-9px,-16px) rotate(-40deg)}}
@keyframes nj-shadow{0%,100%{transform:scale(1,.9);opacity:1}50%{transform:scale(.62,.7);opacity:.5}}
@keyframes nj-look{0%,100%{transform:rotate(0)}28%{transform:rotate(-16deg)}68%{transform:rotate(14deg)}}
@keyframes nj-shift{0%,100%{transform:translate(0,0)}28%{transform:translate(-2.3px,.4px)}68%{transform:translate(2.5px,-.3px)}}
@keyframes nj-tail{0%,100%{transform:rotate(0)}50%{transform:rotate(18deg)}}
@keyframes nj-star{0%{transform:rotate(45deg) scale(0);opacity:1}70%{opacity:1}100%{transform:rotate(45deg) translate(14px,-16px) scale(.3);opacity:0}}
@keyframes nj-run-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes nj-run-bob-l{0%,100%{transform:scaleX(-1) translateY(0)}50%{transform:scaleX(-1) translateY(-2px)}}
@keyframes nj-run-leg-r{0%,100%{transform:rotate(13deg)}50%{transform:rotate(-11deg)}}
@keyframes nj-run-leg-l{0%,100%{transform:rotate(-11deg)}50%{transform:rotate(13deg)}}
@keyframes nj-run-arm-r{0%,100%{transform:rotate(-18deg)}50%{transform:rotate(12deg)}}
@keyframes nj-run-arm-l{0%,100%{transform:rotate(12deg)}50%{transform:rotate(-18deg)}}
@keyframes nj-bag-carry{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(8deg)}}
@keyframes nj-bag-bounce{0%{transform:rotate(0) scale(1)}32%{transform:rotate(-7deg) scale(1.06,.94)}58%{transform:rotate(4deg) scale(.97,1.04)}100%{transform:rotate(0) scale(1)}}
@keyframes nj-nod{0%,100%{transform:rotate(0)}40%{transform:rotate(14deg)}70%{transform:rotate(-3deg)}}
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
