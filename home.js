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

/* Deliveroo-style half-screen hero: light background, product photos at the sides, postcode search in the centre. */
const HERO_L='/img/hero/left.jpg';
const HERO_R='/img/hero/right.jpg';
function hero(){
  const pc=S.pc||'';
  return `<section class="nb-hero" id="h5" aria-label="ShopNip">
    <div class="nb-hero-art" aria-hidden="true"><span class="nb-hero-cut c0"><img decoding="async" src="${HERO_L}" alt=""></span><span class="nb-hero-cut c1"><img decoding="async" src="${HERO_R}" alt=""></span></div>
    <div class="nb-hero-mid">
      <h2>Your local shops, online.</h2>
      <form class="nb-hero-card" id="nb-hero-pc" action="#" autocomplete="on">
        <label for="nb-hero-q">Enter a postcode to see shops near you</label>
        <div class="nb-hero-row">
          <span class="nb-hero-pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
          <input id="nb-hero-q" name="postcode" type="text" inputmode="text" autocomplete="postal-code" spellcheck="false" placeholder="e.g. SW1A 1AA" value="${esc(pc)}">
          <button type="submit">Search</button>
        </div>
        <button type="button" class="nb-hero-geo" data-nb-geo><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>Use my current location</button>
      </form>
    </div>
  </section>`}

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
function cats(){const want=['Packaging & Mailing','Gifts & Cards','Stationery','Art & Craft'];const on=typeof stockedNames==='function'?stockedNames():null;
  let D=want.map(n=>(window.DEPTS||[]).find(d=>d.d===n&&d.s.length)).filter(Boolean);if(on)D=D.map(d=>({...d,s:d.s.filter(([n])=>on.has(n))})).filter(d=>d.s.length);if(!D.length)return '';
  return `<section class="hm-departments" aria-label="Shop by category"><h2>Shop by category</h2><div class="hm-dept-grid">${D.map(d=>{const du='/products?cat='+encodeURIComponent(d.d);const subs=d.s.slice(0,4).map(([n,src])=>{const u='/products?cat='+encodeURIComponent(n);return `<a class="hm-dsub" href="${u}" data-go="${u}"><span><img loading="lazy" src="${esc(String(src).replace(/ /g,'%20'))}" alt="" data-fb></span><small>${esc(n)}</small></a>`}).join('');return `<article class="hm-dept"><div class="hm-dept-h"><h3>${esc(d.d)}</h3><a class="hm-dept-more" href="${du}" data-go="${du}">See more</a></div><div class="hm-dept-subs">${subs}</div></article>`}).join('')}</div></section>`}

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
  if(!list.length)return `<section class="hm-sec" id="shops"><div class="hm-h"><div><p class="hm-eye">Around the corner</p><h2>Local shops</h2></div></div>
   <div class="hm-empty">${svg('store')}<b>No shops are live yet</b><p>Independent shops are joining ShopNip.</p><a href="${SU('signup')}">Run a shop? Join ShopNip</a></div></section>`;
  const near=S.me?list.filter(s=>s.dist!=null&&s.dist<=10).length:0,openN=list.filter(s=>s._st.open).length,shown=S.openOnly?list.filter(s=>s._st.open):list,vis=showAll?shown:shown.slice(0,FIRST);
  const title=!S.me?'Local shops on ShopNip':near?`Shops near ${esc(S.pc)}`:'Nearest shops';
  const sub=S.me?'Nearest first, with today’s opening hours'
   :P2.A.user?'Add your postcode in account settings to see distances and who delivers to you'
   :`${list.length>2?plural(list.length,'independent shop')+'. ':''}<a href="#" id="setpc2">Set your location</a> to see distances and who delivers to you.`;
  const note=S.me&&!near?`<p class="hm-note">No shops within 10 miles of ${esc(S.pc)} yet. More independent shops are joining ShopNip; these are the nearest. Click &amp; collect still works.</p>`:'';
  const filt=!openN?'':`<div class="hm-seg" role="group" aria-label="Filter shops"><button type="button" data-openf="all" class="${S.openOnly?'':'on'}">All shops (${list.length})</button><button type="button" data-openf="open" class="${S.openOnly?'on':''}">Open now (${openN})</button></div>`;
  const more=shown.length>FIRST?`<button type="button" class="hm-all" data-hmall>${showAll?'Show fewer shops':`Show all ${shown.length} shops`}</button>`:'';
  const body=shown.length?`<div class="hm-shops">${vis.map(shopCard).join('')}</div>${more}`
   :`<div class="hm-empty">${svg('clock')}<b>No shops are open right now</b><p>You can still browse and order. The shop confirms when it opens.</p><button type="button" class="btn" data-openf="all">Show all shops</button></div>`;
  return `<section class="hm-sec" id="shops"><div class="hm-h"><div><p class="hm-eye">${S.me?"Your neighbourhood":"Independent favourites"}</p><h2>${title}</h2><p>${sub}</p></div></div>${note}${filt}<div class="hm-shw">${body}${mapBox(list)}</div></section>`}

function mixCats(L,n){const by={};L.forEach(p=>(by[p.category]=by[p.category]||[]).push(p));const g=Object.values(by).sort((a,b)=>b.length-a.length),out=[];
  for(let i=0;out.length<n&&g.some(x=>x[i]);i++)g.forEach(x=>{if(x[i]&&out.length<n)out.push(x[i])});return out}
function prodSec(){const ids=new Set(listShops().filter(s=>s.dist!=null&&s.dist<=10).map(s=>s.id));
  const L=live().filter(p=>p.stock>0&&(!S.me||sids(p).some(id=>ids.has(id))));const items=mixCats(L,12);
  if(!items.length)return `<section class="hm-sec hm-popular"><div class="hm-h"><div><p class="hm-eye">From local shelves</p><h2>Popular near you</h2></div></div><div class="hm-empty"><b>${S.me?'No in-stock products nearby yet':'Find what’s in stock near you'}</b><p>${S.me?'Browse the nearest shops above for their latest availability.':'Enter your postcode above to explore local shops and available products.'}</p><a href="#shops">Explore local shops</a></div></section>`;
  const from=new Set(L.flatMap(sids).filter(Boolean)).size;
  return `<section class="hm-sec"><div class="hm-h"><div><p class="hm-eye">In stock now</p><h2>Popular near you</h2><p>In stock at ${plural(from,'local shop')}</p></div>
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
  return `<section class="hm-sec" id="deals"><div class="hm-h"><div><p class="hm-eye">Deals</p><h2>Today’s deals</h2><p>End-of-day offers and price drops from local shops</p></div>${D.length>6?`<a href="#" class="hm-more" data-t="deals">See all ${D.length}${svg('arrow')}</a>`:''}</div><div class="hm-dg">${D.slice(0,6).map(dealCard).join('')}</div></section>`}
V.deals=function(){const D=dealItems();return `<div class="hm"><section class="hm-sec"><div class="hm-h"><div><h1 style="margin:0">Today’s deals</h1><p>End-of-day offers and price drops from local shops</p></div></div>
  ${D.length?`<div class="hm-dg">${D.map(dealCard).join('')}</div>`:`<div class="hm-empty">${svg('tag')}<b>No deals right now</b><p>Shops post end-of-day offers and price drops here. Check back later.</p><button type="button" class="btn" data-t="products">Browse products</button></div>`}</section></div>${foot()}`};
/* header "Deals" link -> deals view */
addEventListener('click',e=>{const a=e.target.closest('.mgd');if(!a)return;e.preventDefault();e.stopImmediatePropagation();route('deals');scrollTo(0,0)},true);
/* product tiles in the category cards and deals */
addEventListener('click',e=>{const b=e.target.closest('[data-hmp]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const sku=b.dataset.hmp;
  const g=S.products.find(p=>p.sku===sku&&p.offers);if(g&&window.P4?.gsheet)return P4.gsheet(g);const p=S.products.find(x=>x.sku===sku);if(p&&window.P3?.sheet)P3.sheet(p)},true);

const how=()=>`<section class="hm-how" id="about"><div class="hm-h"><div><p class="hm-eye">How it works</p><h2>How ShopNip works</h2><p>Every order goes straight to an independent shop near you. No warehouses.</p></div></div>
  <ol>${[['pin','Find a shop','Enter your postcode to see local shops, their opening hours and what they have in stock.'],
   ['bag','Order online','Add items to your basket and choose click &amp; collect, or delivery where offered. Each order is for one shop.'],
   ['store','Collect from your shop','Wait for the shop to confirm your order, then show your collection PIN and pay at the counter. Delivery options depend on the shop.']]
   .map(([i,t,s],k)=>`<li><span class="hm-n">${k+1}</span>${svg(i)}<b>${t}</b><p>${s}</p></li>`).join('')}</ol>
  <p class="hm-faq">Questions about payment, delivery or cancelling? <a href="/faq" data-go="/faq">Read the FAQ</a></p></section>`;

const sellBan=()=>`<section class="hm-sell" aria-label="Become a seller"><div><p class="hm-eye">Own a local shop?</p><h2>Your neighbourhood.<br>Your shop. Now online.</h2><p>Bring your shelves to nearby customers and take click &amp; collect orders with ShopNip.</p></div><div class="hm-sell-a"><a class="btn" href="${SU('register')}" data-sell>Become a seller ${svg('arrow')}</a><a class="hm-link" href="/how" data-go="/how">See how it works</a></div></section>`;
/* Shops map: pins at each live shop's own listed location (lat/lng from the shops table, same as the postcode shown on cards). Leaflet + OSM tiles load only when the map scrolls into view. */
function mapBox(list){const pins=list.filter(s=>s.lat!=null&&s.lng!=null&&(s.lat||s.lng)).map(s=>({id:s.id,n:s.name,pc:s.postcode||'',la:+s.lat,ln:+s.lng,d:s.dist,o:s._st?.label||''}));if(!pins.length)return '';
  const near=S.me&&pins[0].d!=null?pins[0]:null;
  return `<div class="hm-map"><div class="hm-mapc" id="hmmap" data-pins='${esc(JSON.stringify(pins))}'${S.me?` data-me='${esc(JSON.stringify([S.me.lat,S.me.lng]))}'`:''} role="img" aria-label="Map of shops on ShopNip"></div>
   ${near?`<a class="hm-near" href="#shop=${esc(near.id)}" data-shop="${esc(near.id)}"><small>Nearest shop</small><b>${esc(near.n)}</b><span>${fmi(near.d)} · ${esc(near.pc)}${near.o?' · '+esc(near.o):''}</span></a>`
    :`<button type="button" class="hm-near ask" data-h5loc><small>Find your nearest shop</small><b>Enter your postcode</b></button>`}</div>`}
let LL=null;const loadLeaflet=()=>LL||(LL=new Promise((ok,no)=>{const c=document.createElement('link');c.rel='stylesheet';c.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(c);
  const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>ok(window.L);s.onerror=no;document.head.appendChild(s)}));
function initMap(el){if(el.dataset.on)return;el.dataset.on=1;loadLeaflet().then(L=>{if(!el.isConnected)return;const pins=JSON.parse(el.dataset.pins),me=el.dataset.me?JSON.parse(el.dataset.me):null;
  const m=L.map(el,{scrollWheelZoom:false,attributionControl:true,zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(m);
  const ic=k=>L.divIcon({className:'hm-pin'+(k?' on':''),html:'<i></i>',iconSize:[28,28],iconAnchor:[14,28]});const pts=[];
  pins.forEach((p,k)=>{const mk=L.marker([p.la,p.ln],{icon:ic(me&&k===0),title:p.n}).addTo(m);mk.bindPopup(`<b>${esc(p.n)}</b><br>${esc(p.pc)}<br><a href="#shop=${esc(p.id)}" data-shop="${esc(p.id)}">View shop</a>`);pts.push([p.la,p.ln])});
  if(me){L.circleMarker(me,{radius:7,color:'#fff',weight:3,fillColor:'#ff6b4a',fillOpacity:1}).addTo(m).bindTooltip('You');pts.push(me)}
  pts.length>1?m.fitBounds(pts,{padding:[40,40],maxZoom:14}):m.setView(pts[0],13)}).catch(()=>{el.classList.add('off');el.textContent='Map unavailable right now.'})}
const mapIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){mapIO.unobserve(e.target);initMap(e.target)}}),{rootMargin:'200px'}):null;
new MutationObserver(()=>{const el=document.getElementById('hmmap');if(el&&!el.dataset.w){el.dataset.w=1;mapIO?mapIO.observe(el):initMap(el)}}).observe(document.body,{childList:true,subtree:true});

/* Facts strip: figures computed from live listings and shops on every render. */
const inStock=()=>live().filter(p=>p.stock>0);
function brandCounts(){const B=window.BRANDSKU||{},have=new Set(inStock().map(p=>p.sku));return Object.entries(B).map(([b,s])=>[b,s.filter(k=>have.has(k)).length]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1])}
function odo(val){
  const s=String(val);
  if(!/^\d[\d,]*$/.test(s))return `<b class="hm-od">${esc(s).replace(/ /g,'&nbsp;')}</b>`;
  let i=0;
  return `<b class="hm-od" aria-label="${esc(s)}">${s.replace(/(\d+)|([^\d]+)/g,(_,d,t)=>{
    if(t)return `<em class="hm-od-t">${esc(t).replace(/ /g,'&nbsp;')}</em>`;
    return [...d].map(ch=>{
      const to=20+(+ch);
      const cells=Array.from({length:to+1},(_,k)=>`<i>${k%10}</i>`).join('');
      return `<span class="hm-od-d" style="--to:${to};--i:${i++}"><span>${cells}</span></span>`;
    }).join('');
  })}</b>`}
function facts(){const n=inStock().length,sh=shops(),bc=brandCounts().length;if(!n&&!sh.length)return '';
  const col=sh.some(s=>(s.delivery_options||{}).collect!==false),rb=sh.map(readyBy).find(Boolean);
  const F=[n?[n.toLocaleString('en-GB'),'products in stock']:null,sh.length?[sh.length,sh.length===1?'local shop':'local shops']:null,bc?[bc,'brands stocked']:null,col?['Free','click & collect']:null,rb?[(s=>s.charAt(0).toUpperCase()+s.slice(1))(rb.replace(/^Ready /i,'')),'earliest collection']:null].filter(Boolean);
  return `<section class="hm-facts" aria-label="ShopNip in numbers">${F.map(([a,b])=>`<div>${odo(a)}<small>${esc(b)}</small></div>`).join('')}</section>`}
const TRUSTED=[['Post Offices','/img/trusted/post-offices.jpg','sq'],['Retailers','/img/trusted/retailers.jpg','md'],['Newsagents','/img/trusted/newsagents.jpg','wd'],['Convenience','/img/trusted/convenience.jpg','md'],['Stationery','/img/trusted/stationery.jpg','sq'],['Online Sellers','/img/trusted/online-sellers.jpg','wd'],['Schools','/img/trusted/schools.jpg','sq'],['Community','/img/trusted/community.jpg','wd'],['Off Licence','/img/trusted/off-licence.jpg','wd'],['Gift & Party','/img/trusted/gift-party.jpg','md']];
function trusted(){
  const tiles=TRUSTED.map(([n,src,sz])=>`<li class="${sz}"><img decoding="async" src="${src}" alt=""><span>${esc(n)}</span></li>`).join('');
  return `<section class="hm-trust" aria-label="Trusted by"><p class="hm-eye">Trusted by</p><div class="hm-tm"><ul class="hm-tt">${tiles}${tiles.replace(/<li/g,'<li aria-hidden="true"')}</ul></div></section>`}
/* Brand strip: wordmarks of brands with stock right now; CSS marquee, pauses on hover, static if reduced motion. */
function brandStrip(){const B=brandCounts().slice(0,18).map(x=>x[0]);if(B.length<4)return '';const row=B.map(b=>`<li>${esc(b)}</li>`).join('');
  return `<section class="hm-brands" aria-label="Brands in stock"><p class="hm-eye">Brands in stock</p><div class="hm-bm"><ul class="hm-bt">${row}${row.replace(/<li>/g,'<li aria-hidden="true">')}</ul></div></section>`}

const news=()=>`<section class="hm-news"><div><p class="hm-eye">Stay in the loop</p><h2>Hear about offers near you</h2><p>Get updates from independent shops and discover local offers. Unsubscribe any time.</p></div>
  <form class="nwf" id="nwf"><div class="hm-nwi"><input type="email" id="nw_e" required placeholder="you@example.com" aria-label="Email address" autocomplete="email"><input id="nw_p" placeholder="Postcode" aria-label="Postcode (optional)" value="${esc(S.pc||'')}" maxlength="8"><button class="btn" type="submit">Sign up</button></div>
  <small>See our <a href="/privacy">Privacy Policy</a>.</small><div class="nwok" id="nwok"></div></form></section>`;

V.home=function(){return `<div class="hm"><h1 class="sr">ShopNip: order from independent shops near you</h1>${hero()}${facts()}${trusted()}${shopsSec()}${sellBan()}${cats()}${dealsSec()}${prodSec()}${how()}${news()}</div>${foot()}`};

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
.nb-hero{position:relative;overflow:hidden;display:grid;place-items:center;min-height:300px;height:50vh;height:50dvh;max-height:520px;width:100vw;margin:0 0 0 calc(50% - 50vw);padding:28px 24px;background:#f4f5f6}
.nb-hero:before{content:"";position:absolute;left:-6%;top:-8%;width:38%;height:120%;background:linear-gradient(160deg,#2dd4bf 0%,#0f766e 72%);clip-path:polygon(0 0,72% 0,100% 50%,72% 100%,0 100%);opacity:.95}
.nb-hero:after{content:"";position:absolute;right:-10%;bottom:-20%;width:28%;height:70%;background:#d1fae5;border-radius:50%;filter:blur(8px);opacity:.7}
.nb-hero-mid{position:relative;z-index:2;width:min(560px,92%);text-align:center}
.nb-hero h2{margin:0 0 18px;font-size:clamp(28px,4.4vw,48px);line-height:1.12;letter-spacing:-.04em;font-weight:800;color:#0b2b29;text-wrap:balance}
.nb-hero-card{background:#fff;border-radius:14px;padding:20px 22px 16px;box-shadow:0 10px 36px rgba(16,32,56,.12);text-align:left}
.nb-hero-card label{display:block;margin:0 0 10px;font-size:14px;font-weight:700;color:#0b2b29}
.nb-hero-row{position:relative;display:flex;gap:10px;align-items:stretch}
.nb-hero-pin{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:#0f766e;pointer-events:none}
.nb-hero-pin svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
.nb-hero-row input{flex:1;min-width:0;height:48px;border:1.5px solid #d0d5dd;border-radius:10px;padding:0 14px 0 38px;font:inherit;font-size:15px;background:#fff;color:#0b2b29}
.nb-hero-row input:focus{outline:2px solid #0f766e;outline-offset:1px;border-color:#0f766e}
.nb-hero-row button[type=submit]{flex:none;height:48px;padding:0 22px;border:0;border-radius:10px;background:#0f766e;color:#fff;font:800 15px inherit;cursor:pointer}
.nb-hero-row button[type=submit]:hover{background:#0c5f59}
.nb-hero-geo{display:inline-flex;align-items:center;margin-top:12px;padding:0;border:0;background:none;color:#0f766e;font:700 14px inherit;cursor:pointer}
.nb-hero-geo svg{display:none}
.nb-hero-geo:hover{text-decoration:underline}
.nb-hero-art{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(520px,1.4fr) minmax(0,1fr);align-items:stretch;gap:18px;padding:18px 22px;pointer-events:none;z-index:1}
.nb-hero-cut{background:transparent;border:0;box-shadow:none;border-radius:0;overflow:hidden;min-width:0;min-height:0;-webkit-mask-image:radial-gradient(ellipse 78% 82% at 50% 50%,#000 52%,transparent 78%);mask-image:radial-gradient(ellipse 78% 82% at 50% 50%,#000 52%,transparent 78%)}
.nb-hero-cut.c0{grid-column:1}
.nb-hero-cut.c1{grid-column:3}
.nb-hero-cut img{width:118%;height:118%;margin:-9%;object-fit:cover;display:block;animation:nbDrift var(--dur,11s) ease-in-out var(--del,0s) infinite alternate}
.nb-hero-cut.c0 img{--dx:12px;--dy:-8px;--dur:11s}
.nb-hero-cut.c1 img{--dx:-12px;--dy:8px;--dur:12s;--del:.35s}
@keyframes nbDrift{from{transform:translate(0,0)}to{transform:translate(var(--dx,8px),var(--dy,-8px))}}
@media(max-width:1100px){
  .nb-hero-art{grid-template-columns:minmax(0,.85fr) minmax(400px,1.5fr) minmax(0,.85fr);gap:14px;padding:16px}
}
@media(max-width:767px){
  .nb-hero{height:auto;max-height:none;min-height:0;padding:28px 16px 32px;place-items:start stretch}
  .nb-hero:before{left:auto;right:0;top:0;width:84px;height:58px;background:#2dd4bf;clip-path:polygon(32% 0,100% 0,100% 100%);opacity:1}
  .nb-hero:after{display:block;filter:none;border-radius:0;left:auto;right:0;top:14%;bottom:auto;width:24%;height:44%;background:linear-gradient(200deg,#5eead4 0%,#2dd4bf 50%,#14b8a6 100%);clip-path:polygon(40% 0,100% 0,100% 100%,0 58%);opacity:1}
  .nb-hero-art{display:none}
  .nb-hero-mid{width:100%;text-align:left}
  .nb-hero h2{font-size:clamp(30px,8.2vw,38px);line-height:1.14;letter-spacing:-.035em;margin:0 0 22px;max-width:18ch;text-align:left}
  .nb-hero-card{padding:18px 16px 16px;border-radius:16px;box-shadow:0 8px 28px rgba(16,32,56,.1)}
  .nb-hero-card label{font-size:14px;font-weight:700;margin:0 0 12px}
  .nb-hero-row{flex-direction:row;gap:8px}
  .nb-hero-pin{top:50%}
  .nb-hero-row input{height:48px;border-radius:12px}
  .nb-hero-row button[type=submit]{width:auto;flex:none;height:48px;padding:0 18px;border-radius:24px;white-space:nowrap}
  .nb-hero-geo{display:flex;width:100%;justify-content:center;gap:8px;margin-top:14px;min-height:48px;padding:0 16px;border:1.5px solid #d0d5dd;border-radius:12px;background:#fff;color:#0b2b29;font:700 15px inherit;box-sizing:border-box}
  .nb-hero-geo svg{display:block;width:20px;height:20px;stroke:#0f766e;fill:none;stroke-width:2;flex:none}
  .nb-hero-geo:hover{text-decoration:none;background:#f8faf9;border-color:#0f766e}
}
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
 .hm-nwi{flex-wrap:wrap}.hm-nwi #nw_e{flex-basis:100%}.hm-nwi #nw_p{flex:1 1 100px}}
.nb-hero{margin-bottom:0}.hm{--hmgap:40px}.hm>.nb-hero+.hm-facts,.hm>.hm-facts+.hm-trust{margin-top:var(--hmgap)!important}.hm-facts{margin-top:0;border:0;border-radius:28px;box-shadow:0 18px 48px rgba(15,32,56,.08),0 1px 0 rgba(15,32,56,.04);overflow:hidden;background:#fff}
.hm-facts>div{padding:26px 24px 24px;gap:8px;border-left:1px solid #eef1f4}
.hm-facts>div:first-child{border-left:0}
.hm-facts b,.hm-facts .hm-od{font-size:clamp(32px,3vw,42px);font-weight:900;letter-spacing:-.045em;color:#0b2b29;line-height:1;font-variant-numeric:tabular-nums}
.hm-facts .hm-od,.hm-facts .hm-od span,.hm-facts .hm-od i,.hm-facts .hm-od em{font-size:inherit;color:inherit;font-weight:900;line-height:1}
.hm-facts>div>small{font-size:13px;color:#667085;font-weight:600;letter-spacing:.01em}
.hm-od{display:inline-flex;align-items:center;white-space:nowrap;height:1em;line-height:1;overflow:hidden}
.hm-od-t{font-style:normal;padding:0 .06em;font-weight:900;line-height:1}
.hm-od-d{position:relative;display:block;flex:none;width:.62em;height:1em;min-width:.62em;min-height:0;overflow:hidden;line-height:1}
.hm-od-d>span{position:absolute;left:0;top:0;display:flex;flex-direction:column;will-change:transform;transform:translateY(calc(var(--to) * -1em));line-height:1}
.hm-od-d i{display:flex;align-items:center;justify-content:center;height:1em;width:.62em;line-height:1;font-style:normal;font-weight:900}
.hm-facts.in .hm-od-d>span{animation:hmOd calc(1.15s + var(--i)*.12s) cubic-bezier(.12,.72,.14,1) both}
@keyframes hmOd{from{transform:translateY(calc(var(--from,0) * -1em))}to{transform:translateY(calc(var(--to) * -1em))}}
@media(prefers-reduced-motion:reduce){.hm-facts .hm-od-d>span,.hm-facts.in .hm-od-d>span{animation:none;transform:translateY(calc(var(--to) * -1em))}}
@media(max-width:767px){.hm-facts>div{padding:16px 16px 15px}.hm-facts b,.hm-facts .hm-od{font-size:26px}}
.hm-trust{width:100vw;margin-left:calc(50% - 50vw);margin-right:0;margin-bottom:0}
.hm-trust .hm-eye{display:block;position:relative;z-index:1;margin:0 0 10px;padding:0 max(20px,calc(50vw - 620px));background:none;color:#0f5f58}
.hm-tm{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)}
.hm-tt{list-style:none;display:flex;align-items:stretch;gap:12px;width:max-content;margin:0;padding:2px 16px 6px;animation:hmTrust 68s linear infinite}
.hm-tm:hover .hm-tt{animation-play-state:paused}
.hm-tt li{position:relative;flex:none;height:156px;width:214px;border-radius:20px;overflow:hidden;background:#e8eef0}
.hm-tt li.sq{width:208px}.hm-tt li.md{width:224px}.hm-tt li.wd{width:240px}
.hm-tt img{width:100%;height:100%;object-fit:cover;object-position:center center;display:block}
.hm-tt span{position:absolute;left:10px;bottom:10px;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.94);color:#0b2b29;font:800 12.5px inherit;letter-spacing:-.01em;box-shadow:0 4px 14px rgba(15,32,56,.12)}
@keyframes hmTrust{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.hm-tt{animation:none}.hm-tm{overflow-x:auto;-webkit-mask-image:none;mask-image:none}}
@media(max-width:767px){
  .hm{--hmgap:28px}
  .hm>.nb-hero+.hm-facts,.hm>.hm-facts+.hm-trust{margin-top:var(--hmgap)!important}
  .hm-trust .hm-eye{padding:0 16px;margin-bottom:12px}
  .hm-tt{gap:10px;padding:2px 12px 4px}
  .hm-tt li{height:124px;border-radius:16px}
  .hm-tt li.sq{width:166px}.hm-tt li.md{width:178px}.hm-tt li.wd{width:190px}
  .hm-tt span{font-size:11.5px;padding:4px 9px;left:8px;bottom:8px}
}

/* Homepage content: compact rhythm, flexible cards and touch-sized controls. */
.hm{gap:0;background:#faf7f2;--hmgap:40px}.hm>*{min-width:0}
.hm>section.hm-sec,.hm>section.hm-sell,.hm>section.hm-departments,.hm>section.hm-how,.hm>section.hm-news,.hm>section.hm-brands,.hm>section.hm-trust,.hm>section.hm-facts{margin-top:var(--hmgap)!important}
.hm-h{gap:12px;flex-wrap:wrap;margin-bottom:20px}.hm-h h2{font-size:clamp(24px,2.7vw,34px);color:#102038;letter-spacing:-.035em}.hm-h p{line-height:1.55}.hm-h .hm-eye{color:#0f766e;font-size:11px;margin-bottom:7px}
.hm-shw{grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr)}.hm-shw>.hm-shops{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-shop{text-decoration:none;border-radius:24px}.hm-shop-b{min-width:0}.hm-shop h3{overflow-wrap:anywhere}.hm-map{min-width:0}.hm-seg{max-width:100%;flex-wrap:wrap}.hm-seg button{min-height:44px}.hm-th span{width:64px;height:64px;flex-shrink:1}.hm-shop-c{height:154px}
.hm-sell{padding:clamp(24px,4vw,46px);background:linear-gradient(120deg,#102038,#0f766e);border-radius:28px;color:#fff}.hm-sell h2{font-size:clamp(28px,3vw,40px);line-height:1.12;color:#fff}.hm-sell-a .btn{display:inline-flex;align-items:center;gap:12px;min-height:48px;background:#fff;color:#0f5f58;border-radius:14px;text-decoration:none}.hm-sell-a svg{width:20px;height:20px}.hm-sell p{margin:12px 0 0;color:#fff;line-height:1.55;max-width:38em}.hm-sell .hm-eye{display:inline-flex;margin:0 0 14px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.2);color:#fff}.hm-sell .hm-link{color:#fff}.hm-sell-a{min-width:0}
.hm-departments>h2{font-size:clamp(24px,2.7vw,34px);color:#102038;letter-spacing:-.035em;margin:0 0 22px;font-weight:800}.hm-dept-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.hm-dept{display:flex;flex-direction:column;min-width:0;height:100%;padding:18px 16px 16px;border-radius:24px;background:#eef2f5;color:#102038;overflow:hidden}.hm-dept:nth-child(2){background:#fde8df}.hm-dept:nth-child(3){background:#eef1f6}.hm-dept:nth-child(4){background:#e3f4ea}.hm-dept-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px}.hm-dept-h h3{font-size:17px;line-height:1.25;margin:0;font-weight:800;overflow-wrap:anywhere}.hm-dept-more{flex-shrink:0;color:#0f766e;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap}.hm-dept-more:hover{text-decoration:underline}.hm-dept-subs{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1}.hm-dsub{display:flex;flex-direction:column;min-width:0;background:#fff;border-radius:16px;padding:10px 8px 8px;text-decoration:none;color:#334155;overflow:hidden;transition:transform .2s}.hm-dsub>span{display:grid;place-items:center;height:110px;overflow:hidden}.hm-dsub img{width:100%;height:100%;object-fit:contain}.hm-dsub small{display:block;margin-top:8px;text-align:center;font-size:12px;line-height:1.3;color:#475569;overflow-wrap:anywhere}.hm-dsub:hover{transform:translateY(-2px)}
.hm-grid{gap:14px;grid-template-columns:repeat(6,minmax(0,1fr))}.hm-grid>*{min-width:0;border-radius:20px;overflow:hidden}.hm-grid img{object-fit:contain}.hm-dg{grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr))}.hm-how{padding:clamp(22px,3vw,36px)}.hm-how ol{grid-template-columns:repeat(3,minmax(0,1fr))}.hm-how li{background:#faf7f2}.hm-how li:nth-child(2){background:#eaf5f1}.hm-how li:nth-child(3){background:#fff0e8}.hm-n{color:#0f766e}.hm-news{margin-bottom:12px}.hm-news>*,.hm-nwi>*{min-width:0}.hm a:focus-visible,.hm button:focus-visible{outline:3px solid #0f766e;outline-offset:4px}.hm-more{min-height:44px}
@media(max-width:1050px){.hm-shw{grid-template-columns:1fr}.hm-shw>.hm-shops{grid-template-columns:repeat(3,minmax(0,1fr))}.hm-map{height:260px}.hm-dept-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.hm-dsub>span{height:100px}.hm-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.hm-news{grid-template-columns:1fr}.hm-shop-c{height:130px}.hm-th{padding:12px;gap:5px}.hm-th span{width:54px;height:54px}}
@media(max-width:767px){.hm{--hmgap:28px}.hm>section.hm-sec,.hm>section.hm-sell,.hm>section.hm-departments,.hm>section.hm-how,.hm>section.hm-news,.hm>section.hm-brands,.hm>section.hm-trust,.hm>section.hm-facts{margin-top:var(--hmgap)!important}.hm-shw>.hm-shops{grid-template-columns:1fr}.hm-shop-c{height:150px}.hm-th span{width:76px;height:76px}.hm-h h2{font-size:clamp(22px,7vw,28px)}.hm-sell{grid-template-columns:1fr;gap:18px;padding:22px 18px;border-radius:22px}.hm-sell h2{font-size:26px;line-height:1.18}.hm-sell p{font-size:15px;color:#fff}.hm-sell .hm-eye{color:#fff;background:rgba(255,255,255,.22)}.hm-sell-a{justify-self:stretch;align-items:stretch;flex-direction:column;gap:12px}.hm-sell-a .btn{justify-content:center;width:100%}.hm-link{min-height:44px;display:flex;align-items:center;justify-content:center;color:#fff}.hm-dept-grid{display:grid;grid-template-columns:1fr;gap:12px;overflow:visible}.hm-dept{border-radius:20px;padding:14px}.hm-dept-h h3{font-size:17px}.hm-dsub>span{height:112px}.hm-dsub small{font-size:12px}.hm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.hm-how{padding:20px 16px}.hm-how ol{grid-template-columns:1fr}.hm-how li{padding:16px}.hm-h{align-items:flex-start}.hm-news{padding:20px 16px}.hm-news .nwf .btn{min-height:48px;width:100%}.hm-news h2{font-size:23px}.hm-shops{grid-template-columns:1fr}.hm-brands{overflow:hidden}}

`;
function armFacts(){const el=document.querySelector('.hm-facts:not([data-armed])');if(!el)return;el.dataset.armed=1;
  const spin=first=>{el.querySelectorAll('.hm-od-d').forEach(d=>{const to=parseInt(getComputedStyle(d).getPropertyValue('--to'),10)||0;d.style.setProperty('--from',first?0:Math.max(0,to-10))});el.classList.remove('in');void el.offsetWidth;el.classList.add('in')};
  const go=()=>{spin(true);clearInterval(window.__nbFactsOd);if(!matchMedia('(prefers-reduced-motion:reduce)').matches)window.__nbFactsOd=setInterval(()=>spin(false),3400)};
  if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver' in window)){go();return}
  const io=new IntersectionObserver(ents=>{if(ents.some(e=>e.isIntersecting)){go();io.disconnect()}},{threshold:.4,rootMargin:'0px 0px -8% 0px'});io.observe(el)}
new MutationObserver(()=>{armFacts();document.querySelectorAll('.sh-d:not([data-cl])').forEach(d=>{d.dataset.cl=1;if(d.textContent.length>320){d.classList.add('clamp');const b=document.createElement('button');b.type='button';b.className='sh-more';b.textContent='Read more';b.onclick=()=>{const o=d.classList.toggle('clamp');b.textContent=o?'Read more':'Show less'};d.after(b)}})}).observe(document.documentElement,{childList:true,subtree:true});
armFacts();
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
if(cur&&cur[0]==='home')render();
})();

document.addEventListener('click',e=>{
  if(e.target.closest('[data-h5loc]')){e.preventDefault();document.getElementById('loc')?.click();return}
  if(e.target.closest('[data-nb-shops]')){e.preventDefault();if(!S.me){document.getElementById('loc')?.click();return}document.getElementById('shops')?.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(e.target.closest('[data-nb-geo]')){
    e.preventDefault();
    const geo=document.getElementById('geo');if(geo){geo.click();return}
    if(!navigator.geolocation){document.getElementById('loc')?.click();return}
    navigator.geolocation.getCurrentPosition(async p=>{const me={lat:p.coords.latitude,lng:p.coords.longitude};setMe(me,await reversePc(me.lat,me.lng));requestAnimationFrame(()=>document.getElementById('shops')?.scrollIntoView({behavior:'smooth',block:'start'}))},()=>document.getElementById('loc')?.click());
  }
});
document.addEventListener('submit',e=>{
  if(e.target.id!=='nb-hero-pc')return;
  e.preventDefault();
  const v=(e.target.querySelector('input')?.value||'').trim();
  if(!v){document.getElementById('loc')?.click();return}
  (async()=>{try{const r=await lookupPostcode(v);setMe({lat:r.lat,lng:r.lng},r.pc);requestAnimationFrame(()=>document.getElementById('shops')?.scrollIntoView({behavior:'smooth',block:'start'}))}catch(err){alert('Sorry, we could not find that postcode.')}})();
});
