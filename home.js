/* home.js: shopper homepage. Guests see what ShopNip is; signed-in customers see their saved area. Then categories,
   live shops with their opening hours, and products in stock.
   Replaces the homepage built by p5/p6/p7. Uses live listings only, so it never waits for the 4 MB catalogue. */
(()=>{
const EMO={'Stationery':'✏️','Party':'🎈','Art & craft':'🎨','Gift wrap':'🎁','Packaging':'📦','Tapes':'🧻','Household':'🏠','Toys':'🧸'};
const SU=h=>window.SELLER_URL?SELLER_URL(h):'seller.html'+(h?'#'+h:'');
const live=()=>S.products.filter(p=>!p.demo&&p.listing_id&&p.images?.length);
const shops=()=>S.shops.filter(s=>!s.demo);
const promos=()=>window.P5?.promos?.()||[];
const sids=p=>p.offers?.length?p.offers.map(o=>o.shop_id):[p.shop_id];
const fmi=d=>d<0.1?'Under 0.1 mi':d.toFixed(1)+' mi';
const stCls=st=>st.unknown?'unknown':st.open?(st.closingSoon?'soon':'open'):(st.openingSoon?'soon':'closed');
const readyBy=s=>window.P25?.readyBy?.(s)||'';

const firstName=()=>{const A=P2.A,n=(A.profile?.full_name||A.user?.user_metadata?.full_name||'').trim();return n?n.split(/\s+/)[0]:(A.user?.email||'').split('@')[0]};
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
function listShops(){const feat=new Set(promos().filter(p=>p.type==='featured_shop').map(p=>p.shop_id));
  return shops().map(s=>({...s,dist:S.me&&s.lat!=null&&s.lng!=null?miles(S.me,s):null,_st:shopStatus(s),_feat:feat.has(s.id)}))
   .sort(S.me?(a,b)=>(a.dist??1e9)-(b.dist??1e9)||b._feat-a._feat:(a,b)=>b._feat-a._feat||b._st.open-a._st.open)}

/* Hero carousel for everyone, using p5's slide markup so its auto-advance, dots, arrows and swipe apply.
   Admin "banner" promotions come first; house slides only appear when that category has live stock to picture. */
const catIdx=l=>CATS.findIndex(c=>c[0]===l);
const HOUSE=[
 {theme:'teal',k:'Shop local',title:'Your high street, online',sub:'Order from independent shops near you. Collect for free or get local delivery.',cta:'Browse products',go:'data-t="products"'},
 {theme:'coral',k:'Party',cat:'Party',title:'Party essentials, ready today',sub:'Balloons, candles and banners from shops near you.',cta:'Shop party'},
 {theme:'night',k:'Stationery',cat:'Stationery',title:'Desk and school essentials',sub:'Pens, pads and pencils from your local shop.',cta:'Shop stationery'},
 {theme:'gold',k:'Post & packaging',cat:'Packaging',title:'Posting a parcel?',sub:'Mail bags, envelopes and boxes, ready to collect.',cta:'Shop packaging'},
 {theme:'lime',k:'Click & collect',title:'Order now, collect later',sub:'Click & collect is always free, and you pay the shop when you pick up.',cta:'How it works',go:'data-about'}];
function slides(){const L=live(),out=[];
  promos().filter(b=>b.type==='banner'&&(b.placement||'hero')==='hero').forEach(b=>out.push({theme:b.theme||'teal',k:b.shop_id?'Promoted':'ShopNip',title:b.title,sub:b.subtitle,cta:b.cta||'Shop now',go:`data-plink="${esc(b.link||'#search')}"`,img:b.image,art:b.sku?L.filter(p=>p.sku===b.sku):[]}));
  HOUSE.forEach(h=>{const i=h.cat?catIdx(h.cat):-1,art=i>=0?varied(L.filter(CATS[i][1]),3):varied(L,3);
    if(h.cat&&art.length<3)return;out.push({...h,art,go:h.go||`data-cat="${i}"`})});
  return out.slice(0,6)}
function hero(){const B=slides();if(!B.length)return '';
  return `<section class="h5 hm-h5" id="h5" aria-roledescription="carousel" aria-label="Featured"><div class="h5s">${B.map((b,i)=>`<div class="h5i th-${esc(b.theme)} ${i?'':'on'}"${b.img?` style="--bg:url('${esc(b.img)}')"`:''} role="group" aria-roledescription="slide" aria-label="${i+1} of ${B.length}">
    ${b.img?'<div class="h5bg"></div>':''}<div class="h5o"></div>
    <div class="h5t"><span class="h5k">${esc(b.k)}</span><h2>${esc(b.title)}</h2>${b.sub?`<p>${esc(b.sub)}</p>`:''}<button type="button" class="h5c" ${b.go}>${esc(b.cta)}${svg('arrow')}</button></div>
    ${b.img?'':`<div class="h5p" aria-hidden="true">${(b.art||[]).slice(0,3).map((p,j)=>`<span class="cut c${j}"><img src="${esc(p.images[0])}" alt="" data-fbhide></span>`).join('')}<i class="orb o1"></i><i class="orb o2"></i></div>`}</div>`).join('')}</div>
   ${B.length>1?`<button type="button" class="h5a h5prev" data-h5go="-1" aria-label="Previous slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" class="h5a h5next" data-h5go="1" aria-label="Next slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
   <div class="h5d">${B.map((_,i)=>`<button type="button" data-h5="${i}" class="${i?'':'on'}" aria-label="Go to slide ${i+1}"><i></i></button>`).join('')}</div>`:''}</section>`}

/* Signed-in customers: a slim bar under the carousel with their saved postcode, what is near them, and quick links. */
function welcome(){if(!P2.A.user)return '';const nm=firstName(),L=listShops(),near=S.me?L.filter(s=>s.dist!=null&&s.dist<=10):[],open=near.filter(s=>s._st.open).length,bn=S.basket.reduce((a,b)=>a+b.qty,0);
  const where=S.pc?`<p class="hm-w-loc">${svg('pin')}<span>Shopping near <b>${esc(S.pc)}</b></span><a href="/account" data-hmloc>Change in account settings</a></p>`
   :`<p class="hm-w-loc warn">${svg('pin')}<span>Add your delivery postcode to see shops near you.</span><a href="/account" data-hmloc>Add it in account settings</a></p>`;
  return `<section class="hm-w"><div class="hm-w-a"><span class="hm-av" aria-hidden="true">${esc((nm||'?')[0].toUpperCase())}</span><div><b class="hm-w-name">Hi ${esc(nm)}</b>${where}</div></div>
   <div class="hm-w-b">${S.pc?`<div class="hm-w-st"><b>${near.length}</b><small>${near.length===1?'shop':'shops'} within 10 mi</small></div><div class="hm-w-st"><b>${open}</b><small>open now</small></div>`:''}
    <button type="button" class="hm-btn2" data-t="orders">${svg('orders')}Your orders</button>${bn?`<button type="button" class="btn" data-t="basket">${svg('basket')}Basket (${bn})</button>`:''}</div></section>`}

function cats(){const L=live(),rows=CATS.map(([l,t],i)=>({l,i,n:L.filter(t).length})).sort((a,b)=>!!b.n-!!a.n);
  return `<nav class="hm-cats" aria-label="Shop by category">${rows.map(c=>`<button type="button" class="hm-cat${c.n?'':' none'}" data-cat="${c.i}"><span aria-hidden="true">${EMO[c.l]||'🛍️'}</span><b>${esc(c.l)}</b>${c.n?`<small>${c.n}</small>`:''}</button>`).join('')}
   <button type="button" class="hm-cat" data-t="products"><span aria-hidden="true">🛒</span><b>All products</b></button></nav>`}

const varied=(L,n)=>{const out=CATS.map(([,t])=>L.find(t)).filter((p,i,a)=>p&&a.indexOf(p)===i);return out.concat(L.filter(p=>!out.includes(p))).slice(0,n)};
function shopCard(s){const L=live().filter(p=>sids(p).includes(s.id)),st=s._st,d=s.delivery_options||{},rb=readyBy(s);
  const fee=+d.delivery_fee?gbp(d.delivery_fee):'free',inRange=s.dist!=null&&s.dist<=(+d.delivery_radius_miles||0);
  const del=!d.delivery?'':!S.me?`Delivery within ${+d.delivery_radius_miles||0} mi · ${fee}`:inRange?`Delivers to you · ${fee}`:'Outside delivery area';
  return `<a class="hm-shop" href="#shop=${esc(s.id)}" data-shop="${esc(s.id)}">
   <div class="hm-shop-c"${s.cover_url?` style="background-image:url('${esc(s.cover_url)}')"`:''}>${s.cover_url?'':`<div class="hm-th">${varied(L,3).map(p=>`<span><img loading="lazy" src="${esc(p.images[0])}" alt="" data-fbhide></span>`).join('')}</div>`}
    <span class="hm-st ${stCls(st)}"><i></i>${esc(st.label)}</span></div>
   <div class="hm-shop-b"><span class="hm-logo">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span>
    <h3>${esc(s.name)}${s._feat?'<span class="hm-feat">Featured</span>':''}</h3>
    <p class="hm-meta">${s.dist!=null?`<span>${fmi(s.dist)}</span>`:''}${s.postcode?`<span>${esc(s.postcode)}</span>`:''}${L.length?`<span>${L.length} product${L.length>1?'s':''}</span>`:''}</p>
    <ul class="hm-tags">${d.collect!==false?'<li>Click &amp; collect · free</li>':''}${del?`<li class="${S.me&&!inRange?'off':''}">${del}</li>`:''}</ul>
    ${rb&&d.collect!==false?`<p class="hm-rb">${svg('clock')}${esc(rb)}</p>`:''}</div></a>`}

let showAll=false;const FIRST=6;
function shopsSec(){const list=listShops();
  if(!list.length)return `<section class="hm-sec" id="shops"><div class="hm-h"><div><h2>Local shops</h2></div></div>
   <div class="hm-empty">${svg('store')}<b>No shops are live yet</b><p>Independent shops are joining ShopNip.</p><a href="${SU('signup')}">Run a shop? List it for free</a></div></section>`;
  const near=S.me?list.filter(s=>s.dist!=null&&s.dist<=10).length:0,openN=list.filter(s=>s._st.open).length,shown=S.openOnly?list.filter(s=>s._st.open):list,vis=showAll?shown:shown.slice(0,FIRST);
  const title=!S.me?'Local shops on ShopNip':near?`Shops near ${esc(S.pc)}`:'Nearest shops';
  const sub=S.me?'Nearest first, with today’s opening hours'
   :P2.A.user?'Add your postcode in account settings to see distances and who delivers to you'
   :`${plural(list.length,'independent shop')}. <a href="#" id="setpc2">Set your location</a> to see distances and who delivers to you.`;
  const note=S.me&&!near?`<p class="hm-note">No shops within 10 miles of ${esc(S.pc)} yet. More independent shops are joining ShopNip; these are the nearest. Click &amp; collect still works.</p>`:'';
  const filt=`<div class="hm-seg" role="group" aria-label="Filter shops"><button type="button" data-openf="all" class="${S.openOnly?'':'on'}">All shops (${list.length})</button><button type="button" data-openf="open" class="${S.openOnly?'on':''}">Open now (${openN})</button></div>`;
  const more=shown.length>FIRST?`<button type="button" class="hm-all" data-hmall>${showAll?'Show fewer shops':`Show all ${shown.length} shops`}</button>`:'';
  const body=shown.length?`<div class="hm-shops">${vis.map(shopCard).join('')}</div>${more}`
   :`<div class="hm-empty">${svg('clock')}<b>No shops are open right now</b><p>You can still browse and order. The shop confirms when it opens.</p><button type="button" class="btn" data-openf="all">Show all shops</button></div>`;
  return `<section class="hm-sec" id="shops"><div class="hm-h"><div><h2>${title}</h2><p>${sub}</p></div></div>${note}${filt}${body}</section>`}

function mixCats(L,n){const by={};L.forEach(p=>(by[p.category]=by[p.category]||[]).push(p));const g=Object.values(by).sort((a,b)=>b.length-a.length),out=[];
  for(let i=0;out.length<n&&g.some(x=>x[i]);i++)g.forEach(x=>{if(x[i]&&out.length<n)out.push(x[i])});return out}
function prodSec(){const L=live();if(!L.length)return '';const items=mixCats(L.filter(p=>p.stock>0),12);if(!items.length)return '';
  const from=new Set(L.flatMap(sids).filter(Boolean)).size;
  return `<section class="hm-sec"><div class="hm-h"><div><h2>Ready to order</h2><p>In stock at ${plural(from,'local shop')}</p></div>
   <a href="/products" class="hm-more" data-t="products">See all ${L.length}${svg('arrow')}</a></div><div class="grid hm-grid">${items.map(pcard).join('')}</div></section>`}

function dealsSec(){const D=live().filter(p=>p.cmp>p.price).sort((a,b)=>b.cmp/b.price-a.cmp/a.price).slice(0,6);if(!D.length)return '';
  return `<section class="hm-sec"><div class="hm-h"><div><h2>Price drops</h2><p>Shops have lowered these prices</p></div></div><div class="grid hm-grid">${D.map(pcard).join('')}</div></section>`}

const how=()=>`<section class="hm-how" id="about"><div class="hm-h"><div><h2>How ShopNip works</h2><p>Every order goes straight to an independent shop near you. No warehouses.</p></div></div>
  <ol>${[['pin','Find a shop','Enter your postcode to see local shops, their opening hours and what they have in stock.'],
   ['bag','Order online','Add items to your basket and choose click & collect or local delivery. Each order is for one shop.'],
   ['store','Collect or get it delivered','The shop confirms your order. Show your collection PIN at the counter and pay the shop by card or cash.']]
   .map(([i,t,s],k)=>`<li><span class="hm-n">${k+1}</span>${svg(i)}<b>${t}</b><p>${s}</p></li>`).join('')}</ol>
  <p class="hm-faq">Questions about payment, delivery or cancelling? <a href="#faq">Read the FAQ</a></p></section>`;

const sell=()=>`<section class="hm-sell"><div><p class="hm-eye">For shop owners</p><h2>Run an independent shop?</h2>
  <p>Put your shop on ShopNip for free during the pilot. Products you buy wholesale are listed for you with photos, and you set the prices.</p>
  <ul>${['Listings filled from your wholesale orders','Click & collect and local delivery','Orders arrive in your seller dashboard'].map(t=>`<li>${svg('check')}${t}</li>`).join('')}</ul></div>
  <div class="hm-sell-a"><a class="btn" href="${SU('signup')}">Become a seller</a><a class="hm-link" href="${SU('login')}">Seller sign in</a></div></section>`;

const news=()=>`<section class="hm-news"><div><h2>Hear about offers near you</h2><p>One email a week from shops on your street. Unsubscribe any time.</p></div>
  <form class="nwf" id="nwf"><div class="hm-nwi"><input type="email" id="nw_e" required placeholder="you@example.com" aria-label="Email address" autocomplete="email"><input id="nw_p" placeholder="Postcode" aria-label="Postcode (optional)" value="${esc(S.pc||'')}" maxlength="8"><button class="btn" type="submit">Sign up</button></div>
  <small>See our <a href="/privacy">Privacy Policy</a>.</small><div class="nwok" id="nwok"></div></form></section>`;

V.home=function(){return `<div class="hm"><h1 class="sr">ShopNip: order from independent shops near you</h1>${hero()}${welcome()}${cats()}${shopsSec()}${prodSec()}${dealsSec()}${how()}${sell()}${news()}</div>${foot()}`};

addEventListener('click',e=>{const t=e.target.closest('[data-hmloc],[data-hmall]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();
  if(t.hasAttribute('data-hmloc'))return askPostcode();
  showAll=!showAll;render();if(!showAll)document.getElementById('shops')?.scrollIntoView({block:'start'})},true);

const css=`.hm{display:grid;gap:40px;padding:20px 0 8px}.hm .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hm-eye{margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--navy)}
.hm-btn2{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:12px;border:1.5px solid #cfd8d6;background:#fff;color:var(--txt);font-weight:700;font-size:15px}.hm-btn2:hover{border-color:var(--navy);color:var(--navy)}.hm-btn2 svg{width:18px;height:18px}
.hm-w{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px 24px;background:#fff;border:1px solid var(--line);border-radius:24px;padding:22px 26px}
.hm-w-a{display:flex;align-items:center;gap:16px;min-width:0}.hm-av{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-weight:800;font-size:24px;display:grid;place-items:center;flex:none}
.hm-w-name{display:block;font-size:22px;letter-spacing:-.02em;line-height:1.2}
.hm-h5 .h5t h2{font-size:29px;line-height:1.06;letter-spacing:-1.1px;font-weight:800;margin:12px 0 8px;max-width:13ch;text-wrap:balance}
@media(min-width:768px){.hm-h5{margin:0}.hm-h5 .h5t{max-width:min(560px,50%)}.hm-h5 .h5t h2{font-size:clamp(36px,4.2vw,52px);letter-spacing:-2px}
 .hm-h5 .h5p{width:44%;right:24px}.hm-h5 .h5p .c0{width:min(230px,19vw);height:min(230px,19vw);right:30%;bottom:20px}
 .hm-h5 .h5p .c1{width:min(190px,15vw);height:min(190px,15vw);right:0;bottom:130px}.hm-h5 .h5p .c2{width:min(140px,11vw);height:min(140px,11vw);right:66%;bottom:210px}}
.hm-w-loc{display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;margin:4px 0 0;color:#344054;font-size:15px}.hm-w-loc svg{width:18px;height:18px;color:var(--navy)}.hm-w-loc a{color:var(--navy);font-weight:700;font-size:14px}
.hm-w-loc.warn{color:#7a4b00}.hm-w-loc.warn svg{color:#c2410c}
.hm-w-b{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.hm-w-st{min-width:88px;padding:8px 14px;border-radius:14px;background:#f2f7f6;text-align:center}.hm-w-st b{display:block;font-size:22px;line-height:1.1}.hm-w-st small{color:var(--mut);font-size:12.5px}
.hm-w .btn{min-height:48px}.hm-w .btn svg{width:18px;height:18px}
.hm-h p a{color:var(--navy);font-weight:700}
.hm-all{display:block;margin:16px auto 0;min-height:44px;padding:0 22px;border-radius:12px;border:1.5px solid #cfd8d6;background:#fff;font-weight:700;color:var(--txt)}.hm-all:hover{border-color:var(--navy);color:var(--navy)}
.hm-cats{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:2px;margin-top:-16px}.hm-cats::-webkit-scrollbar{display:none}
.hm-cat{flex:0 0 auto;display:flex;align-items:center;gap:10px;min-height:52px;padding:6px 14px 6px 6px;background:#fff;border:1px solid var(--line);border-radius:16px;color:var(--txt);text-align:left;transition:border-color .15s,box-shadow .15s}
.hm-cat:hover{border-color:var(--navy);box-shadow:0 4px 14px rgba(16,32,56,.08)}.hm-cat>span{width:40px;height:40px;border-radius:12px;background:#f1faf8;display:grid;place-items:center;font-size:22px;flex:none}
.hm-cat b{font-size:14px;white-space:nowrap}.hm-cat small{font-size:12px;font-weight:700;color:#475467;background:#f2f4f7;border-radius:99px;padding:2px 8px}.hm-cat.none b{color:var(--mut)}.hm-cat.none>span{filter:grayscale(.6);opacity:.7}
.hm-sec{scroll-margin-top:96px}.hm-h{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px}
.hm-h h2{margin:0;font-size:26px;letter-spacing:-.02em;line-height:1.2}.hm-h p{margin:4px 0 0;color:var(--mut);font-size:15px}
.hm-more{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--navy);white-space:nowrap;font-size:15px;padding:8px 0}.hm-more svg{width:18px;height:18px}
.hm-note{margin:0 0 14px;padding:12px 14px;background:#fff8eb;border:1px solid #f5e0b5;color:#7a4b00;border-radius:14px;font-size:14px;line-height:1.5}
.hm-seg{display:inline-flex;background:#eaeeec;border-radius:12px;padding:4px;gap:4px;margin-bottom:16px}
.hm-seg button{border:0;background:none;padding:8px 14px;min-height:38px;border-radius:9px;font-weight:700;font-size:14px;color:#475467}.hm-seg button.on{background:#fff;color:var(--txt);box-shadow:0 1px 3px rgba(16,32,56,.14)}
.hm-shops{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.hm-shop{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;color:inherit;transition:box-shadow .2s,transform .2s}.hm-shop:hover{box-shadow:var(--sh2);transform:translateY(-2px)}
.hm-shop-c{position:relative;height:128px;background:linear-gradient(135deg,#134e4a,#14b8a6) center/cover}
.hm-th{position:absolute;inset:0;display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:0 16px}
.hm-th span{width:76px;height:76px;background:#fff;border-radius:14px;display:grid;place-items:center;box-shadow:0 6px 16px rgba(0,0,0,.18)}.hm-th img{width:82%;height:82%;object-fit:contain}
.hm-st{position:absolute;left:12px;top:12px;display:inline-flex;align-items:center;gap:6px;background:#fff;border-radius:99px;padding:5px 10px;font-size:12px;font-weight:800;color:#146c36;box-shadow:0 1px 4px rgba(16,32,56,.14)}
.hm-st i{width:7px;height:7px;border-radius:50%;background:#22b35e}.hm-st.closed{color:#b42318}.hm-st.closed i{background:#e5484d}.hm-st.soon{color:#8a5a00}.hm-st.soon i{background:#e0a100}.hm-st.unknown{color:#667085}.hm-st.unknown i{background:#98a2b3}
.hm-shop-b{position:relative;padding:34px 18px 18px;flex:1;display:flex;flex-direction:column}
.hm-logo{position:absolute;top:-26px;left:18px;width:52px;height:52px;border-radius:14px;background:var(--navy2);color:#fff;font-weight:800;font-size:22px;display:grid;place-items:center;border:3px solid #fff;overflow:hidden}.hm-logo img{width:100%;height:100%;object-fit:cover}
.hm-shop h3{margin:0;font-size:18px;display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.hm-feat{background:#fff1ec;color:#c2410c;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:99px;padding:3px 8px}
.hm-meta{display:flex;flex-wrap:wrap;margin:4px 0 12px;color:var(--mut);font-size:13.5px}.hm-meta span+span:before{content:'·';margin:0 7px}
.hm-tags{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}.hm-tags li{font-size:12.5px;font-weight:700;background:#effaf7;color:#0f5f58;border-radius:8px;padding:5px 9px}.hm-tags li.off{background:#f2f4f7;color:#667085}
.hm-rb{display:flex;align-items:center;gap:6px;margin:14px 0 0;padding-top:12px;border-top:1px solid #eef0f3;font-size:13.5px;font-weight:700;color:#344054}.hm-rb svg{width:17px;height:17px;color:var(--navy)}
.hm-empty{background:#fff;border:1px dashed #d0d5dd;border-radius:20px;padding:32px 20px;text-align:center;color:var(--mut);display:grid;justify-items:center}
.hm-empty svg{width:36px;height:36px;color:var(--navy)}.hm-empty b{color:var(--txt);font-size:17px;margin:8px 0 4px}.hm-empty p{margin:0 0 14px}.hm-empty a{color:var(--navy);font-weight:700}.hm-empty .btn{align-self:auto}
.hm-grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
@media(min-width:1100px){.hm-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}
.hm-how{background:#fff;border:1px solid var(--line);border-radius:24px;padding:32px;scroll-margin-top:96px}
.hm-how ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.hm-how li{position:relative;background:#f6f8f7;border-radius:18px;padding:22px 20px}.hm-how li>svg{width:28px;height:28px;color:var(--navy)}
.hm-n{position:absolute;right:18px;top:16px;font-size:13px;font-weight:800;color:#98a2b3}
.hm-how li b{display:block;font-size:17px;margin:12px 0 6px}.hm-how li p{margin:0;color:#475467;font-size:14.5px;line-height:1.55}
.hm-faq{margin:18px 0 0;font-size:14.5px;color:var(--mut)}.hm-faq a{color:var(--navy);font-weight:700}
.hm-sell{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:24px;align-items:center;background:linear-gradient(135deg,#0f3d3a,#0f766e);color:#fff;border-radius:24px;padding:40px}
.hm-sell .hm-eye{color:#99f6e4}.hm-sell h2{margin:0;font-size:30px;letter-spacing:-.02em}.hm-sell p{margin:10px 0 18px;color:#d5efea;line-height:1.55;max-width:38em}
.hm-sell ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-weight:600;font-size:14.5px}.hm-sell li{display:flex;gap:8px;align-items:center}.hm-sell li svg{width:18px;height:18px;color:#5eead4;stroke-width:2.6}
.hm-sell-a{display:flex;flex-direction:column;align-items:flex-start;gap:14px;justify-self:end}.hm-sell .btn{padding:14px 28px;font-size:16px}
.hm-link{color:#fff;font-weight:700;text-decoration:underline;text-underline-offset:3px}
.hm-news{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:24px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:24px;padding:28px 32px}
.hm-news h2{margin:0;font-size:22px}.hm-news>div>p{margin:6px 0 0;color:var(--mut)}
.hm-nwi{display:flex;gap:8px}.hm-nwi input{flex:1;min-width:0;width:100%;border:1px solid #d0d5dd;border-radius:12px;padding:12px 14px;font:inherit;font-size:15px}.hm-nwi #nw_p{flex:0 0 112px;text-transform:uppercase}
.hm-news .nwf .btn{padding:12px 20px;white-space:nowrap}.hm-news small{display:block;margin-top:8px;color:var(--mut);font-size:12.5px;opacity:1}.hm-news .nwf small a{color:var(--navy)}
.hm-news .nwok.on{color:#146c36;margin-top:8px}.hm-news .nwok.err{color:#b42318;margin-top:8px}.nwf.done .hm-nwi{opacity:.5;pointer-events:none}
@media(min-width:761px){.hm-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(86px,1fr));gap:8px;overflow:visible}
 .hm-cat{flex-direction:column;justify-content:center;text-align:center;padding:12px 6px;gap:6px;min-height:118px}.hm-cat>span{width:52px;height:52px;font-size:28px;border-radius:16px}.hm-cat b{white-space:normal;font-size:13px;line-height:1.25}}
@media(max-width:900px){.hm-how ol{grid-template-columns:1fr}.hm-sell,.hm-news{grid-template-columns:minmax(0,1fr)}.hm-sell-a{justify-self:start;flex-direction:row;align-items:center;flex-wrap:wrap;gap:18px}}
@media(max-width:760px){.hm{gap:30px;padding-top:12px} .hm-cats{margin:-14px -16px 0;padding:2px 16px}.hm-h h2{font-size:21px}.hm-h p{font-size:14px}.hm-shops{grid-template-columns:1fr}.hm-grid>:nth-child(n+9){display:none}
 .hm-how{padding:22px 18px}.hm-how ol{gap:10px}.hm-how li{padding:16px 40px 16px 16px;display:grid;grid-template-columns:28px minmax(0,1fr);column-gap:12px}.hm-how li>svg{grid-row:span 2;width:24px;height:24px;margin-top:2px}.hm-how li b{margin:0 0 4px;font-size:16px}.hm-how li p{font-size:14px}.hm-sell{padding:26px 22px}.hm-sell h2{font-size:24px}.hm-news{padding:22px 18px}
 .hm-w{padding:16px;border-radius:20px}.hm-w-name{font-size:19px}.hm-h5{margin-top:-12px}.hm-h5 .h5a,.hm-h5 .h5p .c2{display:none}.hm-av{width:46px;height:46px;font-size:20px}.hm-w-b{width:100%}.hm-w-st{flex:1}.hm-w-b>button{flex:1 1 40%}
 .hm-nwi{flex-wrap:wrap}.hm-nwi #nw_e{flex-basis:100%}.hm-nwi #nw_p{flex:1 1 100px}}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
if(cur&&cur[0]==='home')render();
})();
