/* ShopNip · p32: shared shop website template. Grocery-style storefront for every shop. */
(()=>{
if(typeof V==='undefined'||!V.shop||!window.P2)return;
const A=P2.A,orig=V.shop;
const CFG=window.CFG||window.APP_CONFIG||{};
const SITE=String(CFG.SITE_URL||'https://www.shopnip.co.uk').replace(/\/$/,'');
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
const shopSlug=s=>{const b=slug(s.name),shops=(window.S&&S.shops)||[];return shops.filter(x=>slug(x.name)===b).length>1?b+'-'+String(s.id).slice(0,8):b};
const shopPath=s=>'/shop/'+shopSlug(s);
const shopURL=s=>SITE+shopPath(s);
const mapsURL=s=>{const q=[s.address,s.postcode].filter(Boolean).join(', ');return q?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q):''};
const bc=s=>{const c=s.brand_color||s.brandColor;return /^#[0-9a-fA-F]{3,8}$/.test(c||'')?c:'#0f766e'};
const cname=l=>window.canonCat?canonCat(l.category||''):(l.category||'Other')||'Other';
const tel=p=>String(p||'').replace(/\s/g,'');
const RAIL=12;
let shopQ='',obs=null,exp=new Set();

function hoursRows(txt){
  if(!window.ShopHours)return '';
  const p=ShopHours.parse(txt);if(!p.usable)return '';
  const td=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
  return ShopHours.weekRows(p.w,null).map(r=>{
    const t=String(r.label).slice(0,3)===td,c=/closed/i.test(r.hours);
    return `<div class="st-hr${t?' today':''}${c?' shut':''}"><span>${esc(r.label)}${t?' <em>Today</em>':''}</span><b>${esc(r.hours)}</b></div>`;
  }).join('');
}

function shopCard(l,s){
  return pcard({listing_id:l.id,sku:l.sku,name:l.name,images:[l.image||(l.images&&l.images[0])||'icon-192.png'],price:l.retail_price||l.price,shop_id:s.id,stock:l.stock});
}
function listings(){return A.viewL||[]}
function filtered(){
  const q=shopQ.trim().toLowerCase();
  const all=listings();
  if(!q)return all;
  return all.filter(l=>(l.name+' '+l.sku+' '+(l.category||'')+' '+cname(l)).toLowerCase().includes(q));
}
function groups(list){
  const m=new Map();
  list.forEach(l=>{const c=cname(l)||'Other';if(!m.has(c))m.set(c,[]);m.get(c).push(l)});
  return [...m.entries()].sort((a,b)=>a[0]==='Other'?1:b[0]==='Other'?-1:a[0].localeCompare(b[0],'en-GB'));
}

function headHTML(s){
  const d=s.delivery_options||{};
  const dist=window.S&&S.me&&s.lat!=null&&typeof miles==='function'?miles(S.me,s):null;
  const hs=window.ShopHours?ShopHours.status(s.opening_hours):null;
  const hsCls=hs?(hs.unknown?'unknown':hs.open?(hs.closingSoon?'soon':'live'):(hs.openingSoon?'soon':'closed')):'';
  const ready=window.P25&&typeof P25.readyBy==='function'?P25.readyBy(s):'';
  const cover=s.cover_url;
  const pill=hs?`<span class="st-pill ${hsCls}">${esc(hs.open?'Open':'Closed')}</span>`:'';
  const next=hs&&!hs.unknown&&!hs.open?hs.label:'';
  const close=hs&&hs.open?(hs.closesAt?('Closes '+hs.closesAt):''):'';
  const deliv=d.delivery?(window.P3&&P3.deliveryBy(s)==='shopnip'?'Delivery windows':(+d.delivery_radius_miles?`Delivery within ${+d.delivery_radius_miles} miles`:'Delivery')):'';
  const fee=d.delivery&&d.delivery_fee!=null&&+d.delivery_fee>0?` · ${gbp(+d.delivery_fee)}`:'';
  return `<div class="store" style="--st:${esc(bc(s))}">
    <div class="st-hero${cover?' has-cover':''}"${cover?` style="background-image:url('${esc(cover)}')"`:''}>
      <a class="st-back" href="/" data-t="home">All shops</a>
    </div>
    <section class="st-head">
      <div class="st-logo">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="${esc(s.name)} logo">`:esc((s.name||'?')[0])}</div>
      <div class="st-id">
        <h1>${esc(s.name)}</h1>
        <div class="st-meta">${pill}${next?`<span class="st-next">${esc(next)}</span>`:close?`<span class="st-next">${esc(close)}</span>`:''}${dist!=null?`<span>${dist<0.1?'Under 0.1 miles':dist.toFixed(1)+' miles'}</span>`:''}</div>
        ${ready?`<p class="st-ready">${esc(ready)}</p>`:''}
        <div class="st-tags">${d.collect!==false?'<span>Click &amp; collect</span>':''}${deliv?`<span>${esc(deliv+fee)}</span>`:''}</div>
      </div>
    </section>
    ${hs&&!hs.unknown&&!hs.open?`<div class="st-closed" role="status"><b>${esc(hs.label||'This shop is closed')}</b><p>You can still browse and place an order. It will be ready after opening.</p></div>`:''}
  </div>`;
}

function chipsInner(g){
  const q=shopQ.trim();
  return `<button type="button" class="st-chip on" data-stchip="all">All</button>${g.map(([c,items])=>`<button type="button" class="st-chip" data-stchip="${esc(slug(c))}">${esc(c)} <em>${items.length}</em></button>`).join('')}${q?`<button type="button" class="st-chip st-chip-clear" data-stqclear>Clear search</button>`:''}`;
}
function sectionHTML(s,c,items){
  const open=exp.has(c)||items.length<=RAIL,show=open?items:items.slice(0,RAIL),more=items.length-show.length;
  return `<section class="st-sec${open?' is-all':''}" id="st-sec-${esc(slug(c))}" data-stcat="${esc(c)}">
    <div class="st-sec-h"><h2>${esc(c)}</h2><span>${items.length}</span>${more?`<button type="button" class="st-all" data-stall="${esc(c)}">See all</button>`:''}</div>
    <div class="${open?'st-grid':'st-rail'}">${show.map(l=>shopCard(l,s)).join('')}</div>
  </section>`;
}
function shelvesInner(s){
  const list=filtered(),g=groups(list);
  if(!listings().length)return `<div class="st-empty"><b>This shop has no products listed yet</b><p>Please try another shop nearby.</p></div>`;
  if(!list.length)return `<div class="st-empty"><b>No products match “${esc(shopQ.trim())}”</b><p><button type="button" class="btn sm" data-stqclear>Clear search</button></p></div>`;
  return g.map(([c,items])=>sectionHTML(s,c,items)).join('');
}
function stickHTML(s){
  const g=groups(filtered());
  return `<div class="st-stick-slot"><div class="st-stick">
    <form class="st-search" role="search" action="#" data-stsearch><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" id="st_q" placeholder="Search this shop" value="${esc(shopQ)}" autocomplete="off" enterkeyhint="search" aria-label="Search this shop"></form>
    <div class="st-cats" role="tablist" aria-label="Shop categories">${chipsInner(g)}</div>
  </div></div>`;
}
function infoHTML(s){
  const maps=mapsURL(s),rows=hoursRows(s.opening_hours),phone=s.phone?tel(s.phone):'',url=shopURL(s);
  return `<section class="st-visit" aria-label="Shop information">
    <div class="st-card">
      <h2>Visit us</h2>
      <p class="st-addr">${esc([s.address,s.postcode].filter(Boolean).join(', ')||'Address on request')}</p>
      ${maps?`<a class="st-link" href="${esc(maps)}" target="_blank" rel="noopener">Open in Google Maps</a>`:''}
      ${phone?`<p class="st-phone"><a href="tel:${esc(phone)}">${esc(s.phone)}</a></p>`:''}
      <div class="st-actions">
        ${maps?`<a class="st-btn ghost" href="${esc(maps)}" target="_blank" rel="noopener">Get directions</a>`:''}
        ${phone?`<a class="st-btn ghost" href="tel:${esc(phone)}">Call shop</a>`:''}
        <button type="button" class="st-btn ghost" data-stshare="${esc(url)}">Share store</button>
      </div>
    </div>
    ${rows?`<div class="st-card"><h2>Opening hours</h2><div class="st-hours">${rows}</div></div>`:''}
  </section>`;
}
function basketBarHTML(){
  const items=S.basket||[];if(!items.length)return '';
  const n=items.reduce((a,b)=>a+b.qty,0),tot=items.reduce((a,b)=>a+(+b.price||0)*b.qty,0);
  return `<div class="st-basket" role="region" aria-label="Basket"><div class="st-basket-in"><b>${n} item${n===1?'':'s'}</b><span>${gbp(tot)}</span></div><button type="button" class="st-basket-go" data-t="basket">View basket</button></div>`;
}
function storeHTML(s){
  return `${headHTML(s)}${stickHTML(s)}<div class="st-shelves" id="st-shelves">${shelvesInner(s)}</div>${infoHTML(s)}${basketBarHTML()}`;
}

function ldjson(s){
  if(!document.querySelector('.store'))return;
  let el=document.getElementById('st-jsonld');
  if(!el){el=document.createElement('script');el.type='application/ld+json';el.id='st-jsonld';document.head.appendChild(el)}
  const maps=mapsURL(s);
  el.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Store',name:s.name,url:shopURL(s),
    image:s.logo_url||s.cover_url||undefined,telephone:s.phone||undefined,
    address:{'@type':'PostalAddress',streetAddress:s.address||undefined,postalCode:s.postcode||undefined,addressCountry:'GB'},
    hasMap:maps||undefined});
}
function clearLd(){const el=document.getElementById('st-jsonld');if(el&&!document.querySelector('.store'))el.remove()}

function stickTop(){
  const slot=document.querySelector('.st-stick-slot'),el=document.querySelector('.st-stick');
  if(!slot||!el)return;
  const h=document.querySelector('header.top,header,.top');
  const top=Math.max(0,h?Math.round(h.getBoundingClientRect().bottom):0);
  if(slot.getBoundingClientRect().top<=top){
    if(!el.classList.contains('is-fixed')){slot.style.height=el.offsetHeight+'px';el.classList.add('is-fixed')}
    el.style.top=top+'px';
  }else{el.classList.remove('is-fixed');slot.style.height='';el.style.top=''}
  syncActiveChip();
}
function setChip(id){
  id=id||'all';
  const cur=document.querySelector('.st-chip.on[data-stchip]');
  if(cur&&cur.dataset.stchip===id)return;
  document.querySelectorAll('.st-chip[data-stchip]').forEach(b=>b.classList.toggle('on',b.dataset.stchip===id));
  const chip=document.querySelector(`.st-chip[data-stchip="${CSS.escape(id)}"]`);
  if(chip)chip.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
}
function syncActiveChip(){
  const bar=document.querySelector('.st-stick');
  const line=(bar?bar.getBoundingClientRect().bottom:0)+12;
  const secs=[...document.querySelectorAll('.st-sec')];
  if(!secs.length)return;
  let id='all';
  const first=secs[0];
  if(first&&first.getBoundingClientRect().top<=line+24){
    for(const s of secs){if(s.getBoundingClientRect().top<=line+24)id=s.id.replace(/^st-sec-/,'')}
  }
  setChip(id);
}
function watchSections(){
  if(obs){obs.disconnect();obs=null}
  syncActiveChip();
}
function jump(id){
  if(!id||id==='all'){const el=document.querySelector('.st-shelves')||document.querySelector('.st-stick');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});setChip('all');return}
  const sec=document.getElementById('st-sec-'+id);if(!sec)return;
  const stick=document.querySelector('.st-stick');
  const top=(stick?stick.getBoundingClientRect().bottom:0)+8;
  const y=sec.getBoundingClientRect().top+scrollY-top;
  scrollTo({top:Math.max(0,y),behavior:'smooth'});setChip(id);
}
function paintShelves(){
  const s=A.view;if(!s)return;
  const sh=document.querySelector('.st-shelves');if(sh)sh.innerHTML=shelvesInner(s);
  const cats=document.querySelector('.st-cats');if(cats)cats.innerHTML=chipsInner(groups(filtered()));
  if(window.syncSteppers)syncSteppers();
  watchSections();stickTop();
}
function expandCat(c){
  exp.add(c);paintShelves();
  requestAnimationFrame(()=>jump(slug(c)));
}
function syncShopBasket(){
  if(!document.querySelector('.store'))return;
  const html=basketBarHTML();
  const cur=document.querySelector('.st-basket');
  if(!html){if(cur)cur.remove();return}
  if(cur)cur.outerHTML=html;else{const v=document.getElementById('view');if(v)v.insertAdjacentHTML('beforeend',html)}
}
function bindStore(){
  stickTop();watchSections();
  const q=document.getElementById('st_q');if(q&&q.value!==shopQ)q.value=shopQ;
  const fc=new URLSearchParams(location.search).get('fc');
  if(fc){const id=slug(fc.split('|')[0]);setTimeout(()=>jump(id),80)}
  ldjson(A.view);clearLd();
}

V.shop=function(id){
  if(!A.view||A.view.id!==id){shopQ='';exp=new Set();return orig(id)}
  let next=storeHTML(A.view);
  if(!/\bclass="(?:sf|foot)"/.test(next)&&typeof foot==='function')next+=foot();
  setTimeout(bindStore,0);
  return next;
};

document.addEventListener('click',e=>{
  const share=e.target.closest('[data-stshare]');
  if(share){e.preventDefault();const url=share.getAttribute('data-stshare'),title=(A.view&&A.view.name)||'ShopNip';
    if(navigator.share){navigator.share({title,text:'Order from '+title+' on ShopNip',url}).catch(()=>{});return}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(()=>typeof toast==='function'&&toast('Store link copied')).catch(()=>typeof toast==='function'&&toast('Store link: '+url))}
    else if(typeof toast==='function')toast('Store link: '+url);return}
  const chip=e.target.closest('[data-stchip]');if(chip){e.preventDefault();jump(chip.dataset.stchip);return}
  const all=e.target.closest('[data-stall]');if(all){e.preventDefault();expandCat(all.dataset.stall);return}
  if(e.target.closest('[data-stqclear]')){e.preventDefault();shopQ='';paintShelves();const i=document.getElementById('st_q');if(i)i.value='';return}
});
document.addEventListener('submit',e=>{if(!e.target.closest('[data-stsearch]'))return;e.preventDefault();const i=document.getElementById('st_q');shopQ=(i&&i.value)||'';paintShelves()});
document.addEventListener('input',e=>{if(e.target.id!=='st_q')return;shopQ=e.target.value;clearTimeout(V.shop._st);V.shop._st=setTimeout(paintShelves,120)});
addEventListener('resize',stickTop);addEventListener('scroll',stickTop,{passive:true});

const st=document.createElement('style');st.id='p32css';st.textContent=`
.store{--st:#0f766e;margin:0 0 8px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0f172a}
.st-hero{position:relative;isolation:isolate;height:120px;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);border-radius:0;overflow:hidden;
  background:
    radial-gradient(720px 260px at 88% 0%, rgba(255,255,255,.18), transparent 58%),
    radial-gradient(420px 180px at 8% 110%, rgba(15,23,42,.22), transparent 55%),
    linear-gradient(145deg, var(--st) 0%, #0b4f4a 100%);
  background-size:cover;background-position:center;background-repeat:no-repeat}
.st-hero.has-cover::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,.08) 10%,rgba(15,23,42,.45) 100%);pointer-events:none}
.st-back{position:absolute;z-index:2;top:12px;left:max(16px,calc(50vw - 50%));background:rgba(255,255,255,.96);color:#0f172a;text-decoration:none;font-weight:800;font-size:13px;padding:8px 14px;border-radius:999px;box-shadow:0 6px 18px rgba(15,23,42,.14)}
.st-head{display:grid;grid-template-columns:64px 1fr;gap:12px 14px;align-items:start;margin-top:-28px;position:relative;z-index:2}
.st-logo{width:64px;height:64px;border-radius:18px;border:3px solid #fff;background:var(--st);color:#fff;font-size:26px;font-weight:800;display:grid;place-items:center;overflow:hidden;box-shadow:0 10px 28px rgba(15,23,42,.14)}
.st-logo img{width:100%;height:100%;object-fit:cover}
.st-id{min-width:0;padding-top:32px}
.st-id h1{margin:0 0 6px;font-size:22px;letter-spacing:-.6px;line-height:1.15}
.st-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:13px;color:#475569;font-weight:600}
.st-next{color:#334155}
.st-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:800;background:#fff8eb;color:#8a5a00;border:1px solid #f5e2b8}
.st-pill.live{background:#eefaf3;color:#146c36;border-color:#b7ebc9}
.st-pill.soon{background:#fff8eb;color:#8a5a00;border-color:#f5e2b8}
.st-pill.closed{background:#fff4f2;color:#8f2d2d;border-color:#ffd0c8}
.st-pill.unknown{background:#f4f6f8;color:#667085;border-color:#e6eaf0}
.st-ready{margin:6px 0 0;font-size:13px;font-weight:700;color:var(--st)}
.st-tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
.st-tags span{background:#f0fdfa;color:#115e59;border:1px solid #ccfbf1;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}
.st-closed{background:#fff7e6;color:#92400e;border-radius:14px;padding:12px 14px;margin:12px 0 0}
.st-closed b{display:block;font-size:14px}.st-closed p{margin:4px 0 0;font-size:13px;line-height:1.4;font-weight:500}
.st-stick-slot{margin:14px -16px 0}.st-stick{background:rgba(247,248,250,.94);backdrop-filter:blur(12px);padding:8px 16px 10px;border-bottom:1px solid #e8eef0}.st-stick.is-fixed{position:fixed;left:0;right:0;z-index:19;margin:0;box-shadow:0 8px 18px rgba(15,23,42,.08)}
.st-search{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:0 12px;height:42px}
.st-search:focus-within{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.14)}
.st-search svg{flex:none;color:#64748b}
.st-search input{flex:1;border:0;outline:0;font:inherit;font-size:15px;background:none;min-width:0;color:#0f172a}
.st-cats{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin:10px -16px 0;padding:0 16px 2px}
.st-cats::-webkit-scrollbar{display:none}
.st-chip{flex:none;border:1.5px solid #e2e8f0;background:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:700;color:#334155;cursor:pointer}
.st-chip em{font-style:normal;color:#64748b;font-size:11px;margin-left:2px}
.st-chip.on{background:#0f766e;border-color:#0f766e;color:#fff}
.st-chip.on em{color:rgba(255,255,255,.8)}
.st-chip-clear{border-color:#0f766e;color:#0f766e}
.st-shelves{margin:8px 0 8px;display:grid;gap:22px}
.st-sec-h{display:flex;align-items:baseline;gap:8px;margin:0 0 10px}
.st-sec-h h2{margin:0;font-size:18px;letter-spacing:-.3px;flex:1}
.st-sec-h span{font-size:12px;font-weight:700;color:#64748b}
.st-all{margin-left:auto;border:0;background:none;font:inherit;font-size:13px;font-weight:800;color:#0f766e;cursor:pointer;padding:0}
.st-rail{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin:0 -16px;padding:2px 16px 12px;-webkit-overflow-scrolling:touch}
.st-rail::-webkit-scrollbar{display:none}
.st-rail .pc{flex:0 0 148px;width:148px;scroll-snap-align:start;min-height:268px}
.st-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.st-grid .pc{flex:auto;width:auto;min-height:268px}
.store ~ .st-stick + .st-shelves .pc .pmeta,
.st-shelves .pc .pmeta,
.st-shelves .pc .prdy{display:none}
.st-shelves .pc .pb{padding:8px 10px 10px}
.st-shelves .pc .pn{height:2.6em}
.st-empty{text-align:center;padding:36px 16px;color:#64748b}
.st-empty b{display:block;color:#0f172a;font-size:16px;margin-bottom:6px}
.st-visit{display:grid;gap:14px;margin:28px 0 24px}
.st-card{background:#fff;border:1px solid #e7ecef;border-radius:18px;padding:18px 20px;box-shadow:0 6px 22px rgba(16,24,40,.05)}
.st-card h2{margin:0 0 10px;font-size:15px;letter-spacing:-.2px}
.st-addr{margin:0 0 8px;font-size:15px;line-height:1.45;font-weight:600}
.st-link,.st-phone a{color:var(--st);font-weight:800;text-decoration:none}
.st-link:hover,.st-phone a:hover{text-decoration:underline}
.st-phone{margin:10px 0 0;font-size:15px}
.st-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.st-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--st);color:#fff;border:0;border-radius:999px;padding:10px 14px;font:inherit;font-size:13px;font-weight:800;text-decoration:none;cursor:pointer}
.st-btn.ghost{background:#fff;color:#0f172a;border:1.5px solid #e2e8f0}
.st-hours{display:grid;gap:8px}
.st-hr{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#334155}
.st-hr.today{font-weight:800;color:#0f172a}
.st-hr.today em{font-style:normal;color:var(--st);font-size:11px;margin-left:6px;font-weight:800}
.st-hr.shut b{color:#94a3b8;font-weight:600}
.st-basket{position:fixed;left:12px;right:12px;bottom:calc(70px + env(safe-area-inset-bottom,0px));z-index:32;display:flex;align-items:center;gap:12px;background:#14202e;color:#fff;border-radius:16px;padding:10px 10px 10px 16px;box-shadow:0 12px 32px rgba(15,23,42,.28)}
.st-basket-in{flex:1;min-width:0;display:flex;align-items:baseline;gap:10px}
.st-basket-in b{font-size:14px}.st-basket-in span{font-size:15px;font-weight:800}
.st-basket-go{border:0;background:#ff6b4a;color:#fff;border-radius:12px;padding:11px 16px;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
body:has(.st-basket){padding-bottom:160px}
body:has(.st-basket) .cb-fab,body:has(.st-basket) .cb-win{bottom:calc(138px + env(safe-area-inset-bottom,0px))}
@media(min-width:768px){
  .st-hero{height:180px}
  .st-head{grid-template-columns:80px 1fr;gap:16px 18px;margin-top:-36px}
  .st-logo{width:80px;height:80px;border-radius:22px;font-size:32px}
  .st-id{padding-top:44px}
  .st-id h1{font-size:30px}
  .st-stick-slot{margin-left:0;margin-right:0}
  .st-stick{border-radius:16px;border:1px solid #e8eef0}
  .st-stick.is-fixed{border-radius:0;padding-left:max(16px,calc(50vw - 600px));padding-right:max(16px,calc(50vw - 600px))}
  .st-cats{margin-left:0;margin-right:0;padding-left:0;padding-right:0}
  .st-rail{display:grid;grid-template-columns:repeat(4,1fr);overflow:visible;margin:0;padding:0;gap:14px;scroll-snap-type:none}
  .st-rail .pc,.st-grid .pc{flex:auto;width:auto}
  .st-grid{grid-template-columns:repeat(4,1fr);gap:14px}
  .st-visit{grid-template-columns:1.1fr .9fr;gap:16px;margin-top:36px}
  .st-basket{left:50%;right:auto;width:min(560px,calc(100% - 32px));transform:translateX(-50%);bottom:24px}
  body:has(.st-basket){padding-bottom:110px}
}
@media(max-width:360px){
  .st-rail .pc{flex-basis:136px;width:136px}
  .st-id h1{font-size:20px}
  .st-logo{width:56px;height:56px;border-radius:16px}
}
`;
document.head.appendChild(st);
window.P32={shopURL,shopPath,shopSlug,syncShopBasket};
window.syncShopBasket=syncShopBasket;
})();
