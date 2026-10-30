/* home.js: shopper homepage. Postcode first, then live shops with their opening hours, categories and products in stock.
   Replaces the homepage built by p5/p6/p7. Uses live listings only, so it never waits for the 4 MB catalogue. */
(()=>{
const EMO={'Stationery':'✏️','Party':'🎈','Art & craft':'🎨','Gift wrap':'🎁','Packaging':'📦','Tapes':'🧻','Household':'🏠','Toys':'🧸'};
const SU=h=>window.SELLER_URL?SELLER_URL(h):'seller.html'+(h?'#'+h:'');
const live=()=>S.products.filter(p=>!p.demo&&p.listing_id&&p.images?.length);
const shops=()=>S.shops.filter(s=>!s.demo);
const promos=()=>window.P5?.promos?.()||[];
const fmi=d=>d<0.1?'Under 0.1 mi':d.toFixed(1)+' mi';
const stCls=st=>st.unknown?'unknown':st.open?(st.closingSoon?'soon':'open'):(st.openingSoon?'soon':'closed');
const readyBy=s=>window.P25?.readyBy?.(s)||'';

function hero(){const art=pick(p=>!p.demo&&!!p.listing_id,4,7),s0=shops()[0];
  const where=S.pc?`<div class="hm-here">${svg('pin')}<span>Showing shops near <b>${esc(S.pc)}</b></span><button type="button" id="setpc2">Change</button></div>`
   :`<form class="hm-pc" data-hmpc novalidate><label class="sr" for="hm_pc">Your postcode</label><input id="hm_pc" autocomplete="postal-code" placeholder="Your postcode" maxlength="8"><button class="btn">Find shops</button></form>
    <div class="hm-pc-x"><button type="button" class="hm-geo" id="geo">${svg('target')}Use my current location</button><span class="hm-err" id="hm_pc_e" role="alert"></span></div>`;
  const chip=s0?(()=>{const st=shopStatus(s0),rb=readyBy(s0);return `<div class="hm-float"><span class="hm-dot ${stCls(st)}"></span><span><b>${esc(s0.name)}</b><small>${esc(st.label)}${rb?' · '+esc(rb):''}</small></span></div>`})():'';
  return `<section class="hm-hero"><div class="hm-hero-t"><p class="hm-eye">Independent shops near you</p>
   <h1>Your local shops, <em>online.</em></h1>
   <p class="hm-lead">Order from independent shops on your high street. Collect in store or get local delivery, and pay the shop when you get your order.</p>
   ${where}
   <ul class="hm-trust"><li>${svg('check')}Free click &amp; collect</li><li>${svg('check')}No card payment online</li><li>${svg('check')}Real local shops</li></ul></div>
   ${art.length>=4?`<div class="hm-art" aria-hidden="true">${art.map(p=>`<span><img src="${esc(p.images[0])}" alt="" data-fbhide></span>`).join('')}${chip}</div>`:''}</section>`}

function cats(){const L=live(),rows=CATS.map(([l,t],i)=>({l,i,n:L.filter(t).length})).sort((a,b)=>!!b.n-!!a.n);
  return `<nav class="hm-cats" aria-label="Shop by category">${rows.map(c=>`<button type="button" class="hm-cat${c.n?'':' none'}" data-cat="${c.i}"><span aria-hidden="true">${EMO[c.l]||'🛍️'}</span><b>${esc(c.l)}</b>${c.n?`<small>${c.n}</small>`:''}</button>`).join('')}
   <button type="button" class="hm-cat" data-t="products"><span aria-hidden="true">🛒</span><b>All products</b></button></nav>`}

function banner(){const b=promos().find(x=>x.type==='banner');if(!b)return '';
  return `<a href="#" class="hm-banner th-${esc(b.theme||'teal')}" data-plink="${esc(b.link||'#search')}"${b.image?` style="background-image:linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,.1)),url('${esc(b.image)}')"`:''}>
   <span class="hm-eye">${b.shop_id?'Promoted':'ShopNip'}</span><b>${esc(b.title)}</b>${b.subtitle?`<small>${esc(b.subtitle)}</small>`:''}<span class="hm-bc">${esc(b.cta||'Shop now')}${svg('arrow')}</span></a>`}

const varied=(L,n)=>{const out=CATS.map(([,t])=>L.find(t)).filter((p,i,a)=>p&&a.indexOf(p)===i);return out.concat(L.filter(p=>!out.includes(p))).slice(0,n)};
function shopCard(s){const L=live().filter(p=>p.offers?.some(o=>o.shop_id===s.id)),st=s._st,d=s.delivery_options||{},rb=readyBy(s);
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

function shopsSec(){const feat=new Set(promos().filter(p=>p.type==='featured_shop').map(p=>p.shop_id));
  const list=shops().map(s=>({...s,dist:S.me&&s.lat!=null&&s.lng!=null?miles(S.me,s):null,_st:shopStatus(s),_feat:feat.has(s.id)}));
  if(!list.length)return `<section class="hm-sec" id="shops"><div class="hm-h"><div><h2>Shops near you</h2></div></div>
   <div class="hm-empty">${svg('store')}<b>No shops are live yet</b><p>Independent shops are joining ShopNip.</p><a href="${SU('signup')}">Run a shop? List it for free</a></div></section>`;
  list.sort(S.me?(a,b)=>(a.dist??1e9)-(b.dist??1e9)||b._feat-a._feat:(a,b)=>b._feat-a._feat||b._st.open-a._st.open);
  const near=S.me?list.filter(s=>s.dist!=null&&s.dist<=10).length:0,openN=list.filter(s=>s._st.open).length,shown=S.openOnly?list.filter(s=>s._st.open):list;
  const title=S.me&&near?`${near} shop${near>1?'s':''} near ${esc(S.pc)}`:`${list.length} local shop${list.length>1?'s':''} on ShopNip`;
  const sub=S.me?'Nearest first, with today’s opening hours':'Set your postcode to see distances and who delivers to you';
  const note=S.me&&!near?`<p class="hm-note">No shops within 10 miles of ${esc(S.pc)} yet. ShopNip is starting in Watford, so the shops below are further away. Click &amp; collect still works.</p>`:'';
  const filt=`<div class="hm-seg" role="group" aria-label="Filter shops"><button type="button" data-openf="all" class="${S.openOnly?'':'on'}">All shops</button><button type="button" data-openf="open" class="${S.openOnly?'on':''}">Open now (${openN})</button></div>`;
  const body=shown.length?`<div class="hm-shops">${shown.map(shopCard).join('')}</div>`
   :`<div class="hm-empty">${svg('clock')}<b>No shops are open right now</b><p>You can still browse and order. The shop confirms when it opens.</p><button type="button" class="btn" data-openf="all">Show all shops</button></div>`;
  return `<section class="hm-sec" id="shops"><div class="hm-h"><div><h2>${title}</h2><p>${sub}</p></div></div>${note}${filt}${body}</section>`}

function mixCats(L,n){const by={};L.forEach(p=>(by[p.category]=by[p.category]||[]).push(p));const g=Object.values(by).sort((a,b)=>b.length-a.length),out=[];
  for(let i=0;out.length<n&&g.some(x=>x[i]);i++)g.forEach(x=>{if(x[i]&&out.length<n)out.push(x[i])});return out}
function prodSec(){const L=live();if(!L.length)return '';const items=mixCats(L.filter(p=>p.stock>0),12);if(!items.length)return '';
  const one=shops().length===1?shops()[0].name:'';
  return `<section class="hm-sec"><div class="hm-h"><div><h2>Ready to order</h2><p>In stock ${one?'at '+esc(one):'at shops near you'}</p></div>
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

V.home=function(){return `<div class="hm">${hero()}${cats()}${banner()}${shopsSec()}${prodSec()}${dealsSec()}${how()}${sell()}${news()}</div>${foot()}`};

document.addEventListener('submit',async e=>{const f=e.target.closest('[data-hmpc]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();
  const inp=$('#hm_pc'),er=$('#hm_pc_e'),b=f.querySelector('button'),v=inp.value.trim();
  if(!v){er.textContent='Enter your postcode, for example WD25 8HL.';inp.focus();return}
  b.disabled=true;b.textContent='Finding…';
  try{const r=await lookupPostcode(v);setMe({lat:r.lat,lng:r.lng},r.pc);requestAnimationFrame(()=>document.getElementById('shops')?.scrollIntoView({behavior:'smooth',block:'start'}))}
  catch(err){er.textContent='We couldn’t find that postcode. Check it and try again.';b.disabled=false;b.textContent='Find shops'}},true);

const css=`.hm{display:grid;gap:40px;padding:20px 0 8px}.hm .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hm-eye{margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--navy)}
.hm-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:32px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:28px;padding:48px;position:relative;overflow:hidden}
.hm-hero:before{content:'';position:absolute;right:-140px;top:-140px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,#dff3ef 0,rgba(223,243,239,0) 70%);pointer-events:none}
.hm-hero-t{position:relative}.hm-hero h1{margin:0;font-size:clamp(34px,4.4vw,54px);line-height:1.04;letter-spacing:-.035em;font-weight:800}.hm-hero h1 em{font-style:normal;color:var(--navy)}
.hm-lead{margin:16px 0 24px;font-size:17px;line-height:1.55;color:#475467;max-width:32em}
.hm-pc{display:flex;gap:8px;max-width:470px;background:#f2f5f4;border:1px solid #dbe3e1;border-radius:16px;padding:6px;transition:border-color .15s,box-shadow .15s}
.hm-pc:focus-within{border-color:var(--navy);box-shadow:0 0 0 4px rgba(15,118,110,.14)}
.hm-pc input{flex:1;min-width:0;width:100%;border:0;background:transparent;font:inherit;font-size:16px;padding:10px 12px;text-transform:uppercase;outline:none;color:var(--txt)}.hm-pc input::placeholder{text-transform:none;color:#8a94a0}
.hm-pc .btn{white-space:nowrap;align-self:stretch}
.hm-pc-x{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin-top:8px}
.hm-geo{display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:8px 0;min-height:40px;color:var(--navy);font-weight:700;font-size:14px}.hm-geo svg{width:18px;height:18px}
.hm-err{color:#b42318;font-size:14px;font-weight:600}
.hm-here{display:inline-flex;align-items:center;flex-wrap:wrap;gap:10px;background:#effaf7;border:1px solid #cdebe5;color:#134e4a;border-radius:14px;padding:10px 12px;font-size:15px}
.hm-here svg{width:20px;height:20px;color:var(--navy)}.hm-here button{background:#fff;color:var(--navy);font-weight:700;border-radius:10px;padding:7px 12px;border:1px solid #cdebe5}
.hm-trust{list-style:none;display:flex;flex-wrap:wrap;gap:8px 18px;margin:24px 0 0;padding:0;font-size:14px;color:#344054;font-weight:600}
.hm-trust li{display:flex;align-items:center;gap:6px}.hm-trust svg{width:18px;height:18px;color:var(--navy);stroke-width:2.6}
.hm-art{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:380px;width:100%;justify-self:center;padding-bottom:34px}
.hm-art>span{aspect-ratio:1;background:#f5f7f6;border:1px solid #ebefed;border-radius:22px;display:grid;place-items:center;overflow:hidden}.hm-art>span:nth-child(even){transform:translateY(24px)}
.hm-art img{width:76%;height:76%;object-fit:contain}
.hm-float{position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;align-items:center;gap:10px;background:#fff;border-radius:16px;padding:10px 16px;box-shadow:0 14px 34px rgba(16,32,56,.18);white-space:nowrap}
.hm-float b{display:block;font-size:14px}.hm-float small{display:block;color:var(--mut);font-size:12.5px}
.hm-dot{width:10px;height:10px;border-radius:50%;background:#22b35e;flex:none}.hm-dot.closed{background:#e5484d}.hm-dot.soon{background:#e0a100}.hm-dot.unknown{background:#98a2b3}
.hm-cats{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:2px;margin-top:-16px}.hm-cats::-webkit-scrollbar{display:none}
.hm-cat{flex:0 0 auto;display:flex;align-items:center;gap:10px;min-height:52px;padding:6px 14px 6px 6px;background:#fff;border:1px solid var(--line);border-radius:16px;color:var(--txt);text-align:left;transition:border-color .15s,box-shadow .15s}
.hm-cat:hover{border-color:var(--navy);box-shadow:0 4px 14px rgba(16,32,56,.08)}.hm-cat>span{width:40px;height:40px;border-radius:12px;background:#f1faf8;display:grid;place-items:center;font-size:22px;flex:none}
.hm-cat b{font-size:14px;white-space:nowrap}.hm-cat small{font-size:12px;font-weight:700;color:#475467;background:#f2f4f7;border-radius:99px;padding:2px 8px}.hm-cat.none b{color:var(--mut)}.hm-cat.none>span{filter:grayscale(.6);opacity:.7}
.hm-banner{display:flex;flex-direction:column;gap:6px;padding:26px 30px;border-radius:22px;color:#fff;background:linear-gradient(135deg,#134e4a,#0f766e) center/cover;margin-top:-16px}
.hm-banner .hm-eye{color:inherit;opacity:.85;margin:0}.hm-banner b{font-size:24px;letter-spacing:-.02em}.hm-banner small{font-size:15px;opacity:.9}
.hm-bc{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-weight:800;align-self:flex-start;background:#fff;color:#14202e;border-radius:99px;padding:8px 14px;font-size:14px}.hm-bc svg{width:16px;height:16px}
.hm-banner.th-coral{background-color:#e8553a;background-image:linear-gradient(135deg,#ff6b4a,#e8553a)}.hm-banner.th-night{background-image:linear-gradient(135deg,#1e3a8a,#172554)}
.hm-banner.th-gold{background-image:linear-gradient(135deg,#facc15,#f59e0b);color:#3b2600}.hm-banner.th-lime{background-image:linear-gradient(135deg,#a3e635,#4d7c0f);color:#1a2e05}
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
@media(max-width:900px){.hm-hero{grid-template-columns:minmax(0,1fr);padding:32px}.hm-art{display:none}.hm-how ol{grid-template-columns:1fr}.hm-sell,.hm-news{grid-template-columns:minmax(0,1fr)}.hm-sell-a{justify-self:start;flex-direction:row;align-items:center;flex-wrap:wrap;gap:18px}}
@media(max-width:760px){.hm{gap:30px;padding-top:12px}.hm-hero{padding:24px 20px;border-radius:22px}.hm-lead{font-size:15.5px;margin:10px 0 18px}.hm-trust{gap:6px 14px;font-size:13px;margin-top:16px}
 .hm-cats{margin:-14px -16px 0;padding:2px 16px}.hm-h h2{font-size:21px}.hm-h p{font-size:14px}.hm-shops{grid-template-columns:1fr}.hm-grid>:nth-child(n+9){display:none}
 .hm-how{padding:22px 18px}.hm-how ol{gap:10px}.hm-how li{padding:16px 40px 16px 16px;display:grid;grid-template-columns:28px minmax(0,1fr);column-gap:12px}.hm-how li>svg{grid-row:span 2;width:24px;height:24px;margin-top:2px}.hm-how li b{margin:0 0 4px;font-size:16px}.hm-how li p{font-size:14px}.hm-sell{padding:26px 22px}.hm-sell h2{font-size:24px}.hm-news{padding:22px 18px}
 .hm-nwi{flex-wrap:wrap}.hm-nwi #nw_e{flex-basis:100%}.hm-nwi #nw_p{flex:1 1 100px}.hm-banner{padding:20px;margin-top:-14px}.hm-banner b{font-size:20px}}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
if(cur&&cur[0]==='home')render();
})();
