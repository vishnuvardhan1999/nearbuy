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
   ${B.length>1?`<button type="button" class="h5a h5prev" data-h5go="-1" aria-label="Previous slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" class="h5a h5next" data-h5go="1" aria-label="Next slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>`:''}</section>`}

/* Signed-in customers: a slim bar under the carousel with their saved postcode, what is near them, and quick links. */
function welcome(){if(!P2.A.user)return '';const nm=firstName(),L=listShops(),near=S.me?L.filter(s=>s.dist!=null&&s.dist<=10):[],open=near.filter(s=>s._st.open).length,bn=S.basket.reduce((a,b)=>a+b.qty,0);
  const where=S.pc?`<p class="hm-w-loc">${svg('pin')}<span>Shopping near <b>${esc(S.pc)}</b></span><a href="/account" data-hmloc>Change in account settings</a></p>`
   :`<p class="hm-w-loc warn">${svg('pin')}<span>Add your delivery postcode to see shops near you.</span><a href="/account" data-hmloc>Add it in account settings</a></p>`;
  return `<section class="hm-w"><div class="hm-w-a"><span class="hm-av" aria-hidden="true">${esc((nm||'?')[0].toUpperCase())}</span><div><b class="hm-w-name">Hi ${esc(nm)}</b>${where}</div></div>
   <div class="hm-w-b">${S.pc?`<div class="hm-w-st"><b>${near.length}</b><small>${near.length===1?'shop':'shops'} within 10 mi</small></div><div class="hm-w-st"><b>${open}</b><small>open now</small></div>`:''}
    <button type="button" class="hm-btn2" data-t="orders">${svg('orders')}Your orders</button>${bn?`<button type="button" class="btn" data-t="basket">${svg('basket')}Basket (${bn})</button>`:''}</div></section>`}

/* Finer sub-categories, named after sumanbros.com's own departments. Matched by keyword on product name/category. */
const SUBCATS=window.SUBCATS=[
 ['Balloons',/\bballoons?\b/i],['Birthday Candles',/\bcandles?\b/i],['Mailing Bags & Boxes',/mail ?bag|parcel (box|bag)|\bboxes?\b/i],
 ['Padded & Bubble Envelopes',/padded|bubble/i],['Envelopes',/envelope/i],['Pens',/\bpens?\b(?!.*pencil)/i],['Colouring & Art',/colouring|crayon|paint|modelling|sketch/i],
 ['Notebooks & Pads',/notebook|notepad|exercise book|pad\b/i],['Tapes & Glue',/\btape\b|\bglue\b|adhesive|sellotape/i],['Paper Plates & Partyware',/plates?|cups?|napkin/i],
 ['Gift Bags & Wrap',/gift bag|gift wrap|ribbon|bows?\b/i],['Party Decorations',/banner|bunting|popper|party/i],['Toys',/\btoys?\b/i]]
 .map(([l,r])=>({l,r,t:p=>r.test(p.name||'')}));
/* first matching sub-category wins, so each product sits in one card */
const subOf=p=>SUBCATS.find(c=>c.t(p));
const BRANDS=/^(just stationery|tiger|simon elvin|county|3m|prima|mail lite( gold)?|artbox|helix|bic|uhu|bostik|sil|local markets)\b\s*/i;
const short=n=>{n=String(n||'').replace(/\s*\((single|pack)[^)]*\)/i,'').trim();const m=n.split(/\s*[–—-]\s+|–/);
  let head=(m[0]||'').replace(/\b[A-Z]{1,4}\d[\w/-]*|\b[A-Z]\/\d+\b/g,'').replace(/\s+/g,' ').trim();
  const parts=(m.slice(1).join(', ')).split(',').map(x=>x.trim().replace(BRANDS,'').trim()).filter(Boolean);
  const dim=x=>/\d\s*(mm|cm|m|ml|gsm)\b|×|\d\s*x\s*\d/i.test(x);
  let det=parts.filter(x=>!dim(x)).slice(0,2);if(!det.length)det=parts.filter(dim).slice(0,1);
  let d=det.join(' ').replace(/\b(PRIMA|County|Tiger)\b/g,'').replace(/\s+with holder\b/i,'').trim(),hw=head.toLowerCase().replace(/s$/,'').split(' ').pop();
  let out=(d&&new RegExp('\\b'+hw,'i').test(d)?d:(d+' '+(d?head.toLowerCase():head))).replace(/\s+/g,' ').trim();
  out=out.split(' ').slice(0,6).join(' ');return out.charAt(0).toUpperCase()+out.slice(1)};
/* Department cards (data in depts.js, mirroring sumanbros.com): 4 sub-categories each; a box opens that sub-category's search. */
const STOP=/^(and|with|the|pads?|sets?|books?)$/i;
(window.DEPTS||[]).forEach(d=>d.s.forEach(([n])=>{const k=SUBCATS.findIndex(c=>c.l===n);if(k>=0)SUBCATS.splice(k,1);
  const w=n.replace(/[&,]/g,' ').split(/\s+/).filter(x=>x.length>2&&!STOP.test(x)).map(x=>x.replace(/s$/i,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const r=new RegExp('\\b('+(w.length?w:[n]).join('|')+')','i');/* exact membership from subcats.json (the wholesaler's own category pages); keyword match only until it loads */
  SUBCATS.push({l:n,r,t:p=>window.SUBTAG?(SUBTAG[p.sku]||[]).includes(n):r.test((p.name||'')+' '+(p.category||''))})}));
(window.DEPTS||[]).forEach(d=>{const k=SUBCATS.findIndex(c=>c.l===d.d);if(k>=0)SUBCATS.splice(k,1);const subs=d.s.map(([n])=>SUBCATS.find(c=>c.l===n)).filter(Boolean);SUBCATS.push({l:d.d,t:p=>subs.some(c=>c.t(p))})});
function cats(){const D=(window.DEPTS||[]).filter(d=>d.s.length>=4).slice(0,12);if(!D.length)return '';
  const u=q=>'/products?cat='+encodeURIComponent(q);
  return `<section class="hm-cg" aria-label="Shop by department">${D.map(d=>`<div class="hm-cc"><h3>${esc(d.d)}</h3><div class="hm-cq">${d.s.slice(0,4).map(([n,img])=>`<a class="hm-ci" href="${u(n)}" data-go="${u(n)}"><span class="hm-cim"><img loading="lazy" src="${esc(img)}" alt="" data-fb></span><small>${esc(n)}</small></a>`).join('')}</div>
   <a href="${u(d.d)}" class="hm-cm" data-go="${u(d.d)}">See all ${esc(d.d)}</a></div>`).join('')}</section>`}

const varied=(L,n)=>{const out=CATS.map(([,t])=>L.find(t)).filter((p,i,a)=>p&&a.indexOf(p)===i);return out.concat(L.filter(p=>!out.includes(p))).slice(0,n)};
function shopCard(s){const L=live().filter(p=>sids(p).includes(s.id)),st=s._st,d=s.delivery_options||{},rb=readyBy(s);
  const fee=+d.delivery_fee?gbp(d.delivery_fee):'free',inRange=s.dist!=null&&s.dist<=(+d.delivery_radius_miles||0);
  const del=!d.delivery?'':!S.me?`Delivery within ${+d.delivery_radius_miles||0} mi · ${fee}`:inRange?`Delivers to you · ${fee}`:'Outside delivery area';
  return `<a class="hm-shop" href="#shop=${esc(s.id)}" data-shop="${esc(s.id)}">
   <div class="hm-shop-c"${s.cover_url?` style="background-image:url('${esc(s.cover_url)}')"`:''}>${s.cover_url?'':`<div class="hm-th">${varied(L,3).map(p=>`<span><img loading="lazy" src="${esc(p.images[0])}" alt="" data-fbhide></span>`).join('')}</div>`}
    <span class="hm-st ${stCls(st)}"><i></i>${esc(st.label)}</span></div>
   <div class="hm-shop-b"><span class="hm-logo">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span>
    <h3>${esc(s.name)}${s._feat?'<span class="hm-feat">Featured</span>':''}</h3>
    <p class="hm-meta">${s.rating_n?`<span class="hm-rate">★ ${Number(s.rating_avg).toFixed(1)} (${s.rating_n})</span>`:''}${s.dist!=null?`<span>${fmi(s.dist)}</span>`:''}${s.postcode?`<span>${esc(s.postcode)}</span>`:''}${L.length?`<span>${L.length} product${L.length>1?'s':''}</span>`:''}</p>
    <ul class="hm-tags">${s.active_offer?'<li class="eod">End-of-day deal</li>':''}${d.collect!==false?'<li>Click &amp; collect · free</li>':''}${del?`<li class="${S.me&&!inRange?'off':''}">${del}</li>`:''}</ul>
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

/* Today's deals: shops' end-of-day offers (shop_offers via social.js) plus products with a was-price (compare_at_price). */
const left=u=>{const ms=new Date(u)-Date.now();if(!(ms>0))return '';const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);return h>=24?`Ends ${new Date(u).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'})}`:h?`${h}h ${m}m left`:`${m}m left`};
function dealItems(){const shopN=id=>(S.shops.find(x=>x.id===id)||{}).name||'';
  const offers=(window.Social?.activeOffers?.()||[]).filter(o=>S.shops.some(x=>x.id===o.shop_id)).map(o=>({k:'offer',o,shop:shopN(o.shop_id)}));
  const prods=live().filter(p=>p.cmp>p.price).sort((a,b)=>b.cmp/b.price-a.cmp/a.price).map(p=>({k:'prod',p,shop:shopN(p.shop_id)}));
  return offers.concat(prods)}
function dealCard(d){if(d.k==='offer'){const o=d.o,t=left(o.valid_until);
   return `<button type="button" class="hm-dc hm-dco" data-shop="${esc(o.shop_id)}"><span class="hm-db">${o.discount_pct?esc(o.discount_pct)+'% off':'End-of-day deal'}</span><div class="hm-dim">${svg('tag')}</div>
    <b class="hm-dn">${esc(o.title)}</b>${o.detail?`<small class="hm-dd">${esc(o.detail)}</small>`:''}${o.price!=null?`<span class="hm-dp">${gbp(o.price)}</span>`:''}<small class="hm-ds">${esc(d.shop)}</small>${t?`<small class="hm-dt">${svg('clock')}${t}</small>`:''}</button>`}
  const p=d.p,pct=Math.round((1-p.price/p.cmp)*100);
  return `<button type="button" class="hm-dc" data-hmp="${esc(p.sku)}"><span class="hm-db">${pct}% off</span><div class="hm-dim"><img loading="lazy" src="${esc(p.images[0])}" alt="" data-fb></div>
   <b class="hm-dn">${esc(short(p.name))}</b><span class="hm-dp">${gbp(p.price)} <s>${gbp(p.cmp)}</s></span>${d.shop?`<small class="hm-ds">${esc(d.shop)}</small>`:''}</button>`}
function dealsSec(){const D=dealItems();if(!D.length)return '';
  return `<section class="hm-sec" id="deals"><div class="hm-h"><div><h2>Today’s deals</h2><p>End-of-day offers and price drops from local shops</p></div>${D.length>6?`<a href="#" class="hm-more" data-t="deals">See all ${D.length}${svg('arrow')}</a>`:''}</div><div class="hm-dg">${D.slice(0,6).map(dealCard).join('')}</div></section>`}
V.deals=function(){const D=dealItems();return `<div class="hm"><section class="hm-sec"><div class="hm-h"><div><h1 style="margin:0">Today’s deals</h1><p>End-of-day offers and price drops from local shops</p></div></div>
  ${D.length?`<div class="hm-dg">${D.map(dealCard).join('')}</div>`:`<div class="hm-empty">${svg('tag')}<b>No deals right now</b><p>Shops post end-of-day offers and price drops here. Check back later.</p><button type="button" class="btn" data-t="products">Browse products</button></div>`}</section></div>${foot()}`};
/* header "Deals" link -> deals view */
addEventListener('click',e=>{const a=e.target.closest('.mgd');if(!a)return;e.preventDefault();e.stopImmediatePropagation();route('deals');scrollTo(0,0)},true);
/* product tiles in the category cards and deals */
addEventListener('click',e=>{const b=e.target.closest('[data-hmp]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const sku=b.dataset.hmp;
  const g=S.products.find(p=>p.sku===sku&&p.offers);if(g&&window.P4?.gsheet)return P4.gsheet(g);const p=S.products.find(x=>x.sku===sku);if(p&&window.P3?.sheet)P3.sheet(p)},true);

const how=()=>`<section class="hm-how" id="about"><div class="hm-h"><div><h2>How ShopNip works</h2><p>Every order goes straight to an independent shop near you. No warehouses.</p></div></div>
  <ol>${[['pin','Find a shop','Enter your postcode to see local shops, their opening hours and what they have in stock.'],
   ['bag','Order online','Add items to your basket and choose click & collect or local delivery. Each order is for one shop.'],
   ['store','Collect or get it delivered','The shop confirms your order. Show your collection PIN at the counter and pay the shop by card or cash.']]
   .map(([i,t,s],k)=>`<li><span class="hm-n">${k+1}</span>${svg(i)}<b>${t}</b><p>${s}</p></li>`).join('')}</ol>
  <p class="hm-faq">Questions about payment, delivery or cancelling? <a href="#faq">Read the FAQ</a></p></section>`;

const sell=()=>`<section class="hm-sell"><div><p class="hm-eye">For shop owners</p><h2>Run an independent shop?</h2>
  <p>Put your shop on ShopNip. Your first 50 products are free to list. Products you buy wholesale are listed for you with photos, and you set the prices.</p>
  <ul>${['Listings filled from your wholesale orders','Click & collect and local delivery','Orders arrive in your seller dashboard'].map(t=>`<li>${svg('check')}${t}</li>`).join('')}</ul></div>
  <div class="hm-sell-a"><a class="btn" href="${SU('signup')}">Become a seller</a><a class="hm-link" href="${SU('login')}">Seller sign in</a></div></section>`;

const news=()=>`<section class="hm-news"><div><h2>Hear about offers near you</h2><p>One email a week from shops on your street. Unsubscribe any time.</p></div>
  <form class="nwf" id="nwf"><div class="hm-nwi"><input type="email" id="nw_e" required placeholder="you@example.com" aria-label="Email address" autocomplete="email"><input id="nw_p" placeholder="Postcode" aria-label="Postcode (optional)" value="${esc(S.pc||'')}" maxlength="8"><button class="btn" type="submit">Sign up</button></div>
  <small>See our <a href="/privacy">Privacy Policy</a>.</small><div class="nwok" id="nwok"></div></form></section>`;

V.home=function(){return `<div class="hm"><h1 class="sr">ShopNip: order from independent shops near you</h1>${hero()}${welcome()}${shopsSec()}${cats()}${dealsSec()}${prodSec()}${how()}${sell()}${news()}</div>${foot()}`};

addEventListener('click',e=>{const t=e.target.closest('[data-hmloc],[data-hmall]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();
  if(t.hasAttribute('data-hmloc'))return askPostcode();
  showAll=!showAll;render();if(!showAll)document.getElementById('shops')?.scrollIntoView({block:'start'})},true);

const css=`.nx-empty{padding:28px 16px 8px}.nx-h{font-size:18px;margin:24px 0 12px}
.nx-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.nx-cat{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;background:#fff;border:1px solid var(--line);border-radius:12px;text-align:center;font-weight:600;font-size:14px;color:var(--txt);min-height:44px;text-decoration:none}
.nx-cat:hover{border-color:var(--teal,#0f766e)}.nx-cat img{width:72px;height:72px;object-fit:contain}
.foot h5~a{display:block;padding:6px 0}
.sh-d.clamp{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.sh-more{background:none;border:0;padding:8px 0;min-height:44px;font-weight:700;color:var(--teal,#0f766e);cursor:pointer;font-size:14px}
.hm-h5 .h5d{display:none!important}
.hm-cg{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:-16px}
.hm-cg{align-items:stretch}.hm-cc{height:100%;box-sizing:border-box;background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 18px 14px;display:flex;flex-direction:column}.hm-cc h3{margin:0 0 12px;font-size:19px;letter-spacing:-.02em}
.hm-cq{display:grid;grid-template-columns:1fr 1fr;gap:12px 10px;flex:1}.hm-ci{all:unset;cursor:pointer;display:flex;flex-direction:column;gap:6px;min-width:0}
.hm-cim{aspect-ratio:1;background:#f5f7f6;border-radius:12px;display:grid;place-items:center;overflow:hidden}.hm-cim img{width:86%;height:86%;object-fit:contain;transition:transform .2s}.hm-ci:hover img{transform:scale(1.05)}
.hm-ci small{min-height:2.6em;font-size:12.5px;color:var(--txt);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.hm-cm{margin-top:12px;font-size:14px;font-weight:700;color:var(--navy);text-decoration:none}.hm-cm:hover{text-decoration:underline}
@media(max-width:1023px){.hm-cg{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.hm-cg{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:-14px -16px 0;padding:2px 16px;scrollbar-width:none}.hm-cc{flex:0 0 86%;scroll-snap-align:start}}
.hm-dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.hm-dc{all:unset;box-sizing:border-box;cursor:pointer;position:relative;display:flex;flex-direction:column;gap:4px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px}.hm-dc:hover{box-shadow:0 6px 18px rgba(16,32,56,.08)}
.hm-db{position:absolute;top:10px;left:10px;z-index:1;background:#e11d48;color:#fff;font-size:12px;font-weight:800;border-radius:8px;padding:3px 8px}
.hm-dim{aspect-ratio:1;background:#f5f7f6;border-radius:12px;display:grid;place-items:center;overflow:hidden;margin-bottom:6px}.hm-dim img{width:84%;height:84%;object-fit:contain}.hm-dim svg{width:44px;height:44px;stroke:#e11d48;fill:none;stroke-width:1.6}
.hm-dn{font-size:14px;line-height:1.3}.hm-dd{font-size:12.5px;color:#475467}.hm-dp{font-weight:800;font-size:17px;color:#b42318}.hm-dp s{font-weight:500;font-size:13px;color:#667085;margin-left:4px}
.hm-ds{font-size:12.5px;color:#475467}.hm-dt{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#b42318}.hm-dt svg{width:13px;height:13px}
.hm{display:grid;gap:40px;padding:20px 0 8px}.hm .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
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
.hm-tags{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}.hm-tags li{font-size:12.5px;font-weight:700;background:#effaf7;color:#0f5f58;border-radius:8px;padding:5px 9px}.hm-tags li.off{background:#f2f4f7;color:#667085}.hm-tags li.eod{background:#fff4e5;color:#9a6700}.hm-rate{color:var(--txt);font-weight:700}
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
new MutationObserver(()=>document.querySelectorAll('.sh-d:not([data-cl])').forEach(d=>{d.dataset.cl=1;if(d.textContent.length>320){d.classList.add('clamp');const b=document.createElement('button');b.type='button';b.className='sh-more';b.textContent='Read more';b.onclick=()=>{const o=d.classList.toggle('clamp');b.textContent=o?'Read more':'Show less'};d.after(b)}})).observe(document.documentElement,{childList:true,subtree:true});
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
if(cur&&cur[0]==='home')render();
})();
