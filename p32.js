/* ShopNip · p32: shared shop website template. Same storefront for every shop. */
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

function hoursRows(txt){
  if(!window.ShopHours)return '';
  const p=ShopHours.parse(txt);if(!p.usable)return '';
  const td=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
  return ShopHours.weekRows(p.w,null).map(r=>{
    const t=String(r.label).slice(0,3)===td,c=/closed/i.test(r.hours);
    return `<div class="st-hr${t?' today':''}${c?' shut':''}"><span>${esc(r.label)}${t?' <em>Today</em>':''}</span><b>${esc(r.hours)}</b></div>`;
  }).join('');
}

function headHTML(s){
  const d=s.delivery_options||{};
  const dist=window.S&&S.me&&s.lat!=null&&typeof miles==='function'?miles(S.me,s).toFixed(1)+' miles away':'';
  const hs=window.ShopHours?ShopHours.status(s.opening_hours):null;
  const hsCls=hs?(hs.unknown?'unknown':(hs.openingSoon||hs.closingSoon)?'soon':hs.open?'live':'closed'):'';
  const cover=s.cover_url?` style="background-image:url('${esc(s.cover_url)}')"`:'';
  const maps=mapsURL(s);
  const rows=hoursRows(s.opening_hours);
  const cats=[...new Set((A.viewL||[]).map(cname))].filter(c=>c&&c!=='Other').sort((a,b)=>a.localeCompare(b,'en-GB'));
  const ready=window.P25&&typeof P25.readyBy==='function'?P25.readyBy(s):'';
  const url=shopURL(s);
  const phone=s.phone?tel(s.phone):'';
  return `<div class="store" style="--st:${esc(bc(s))}">
    <div class="st-hero"${cover}>
      <a class="st-back" href="/" data-t="home">All shops</a>
      <div class="st-hero-txt">
        <p class="st-kicker">Independent shop on ShopNip</p>
        <h1>${esc(s.name)}</h1>
      </div>
    </div>
    <section class="st-bar">
      <div class="st-logo">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="${esc(s.name)} logo">`:esc((s.name||'?')[0])}</div>
      <div class="st-id">
        <div class="st-meta">${hs?`<span class="st-pill ${hsCls}">${esc(hs.label)}</span>`:''}${dist?`<span>${esc(dist)}</span>`:''}${s.postcode?`<span>${esc(s.postcode)}</span>`:''}</div>
        ${hs&&hs.notice?`<p class="st-notice">${esc(hs.notice)}</p>`:''}
        ${ready?`<p class="st-ready">${esc(ready)}</p>`:''}
        <div class="st-tags">${d.collect!==false?'<span>Click &amp; collect</span>':''}${d.delivery?`<span>Delivery${+d.delivery_radius_miles?' within '+(+d.delivery_radius_miles)+' miles':''}${d.delivery_fee!=null?' · '+gbp(d.delivery_fee):''}</span>`:''}</div>
        <div class="st-actions">
          ${maps?`<a class="st-btn" href="${esc(maps)}" target="_blank" rel="noopener">Get directions</a>`:''}
          ${phone?`<a class="st-btn ghost" href="tel:${esc(phone)}">Call shop</a>`:''}
          <button type="button" class="st-btn ghost" data-stshare="${esc(url)}">Share store</button>
        </div>
      </div>
    </section>
    <section class="st-visit" aria-label="Visit this shop">
      <div class="st-card">
        <h2>Visit us</h2>
        <p class="st-addr">${esc([s.address,s.postcode].filter(Boolean).join(', ')||'Address on request')}</p>
        ${maps?`<a class="st-link" href="${esc(maps)}" target="_blank" rel="noopener">Open in Google Maps</a>`:''}
        ${phone?`<p class="st-phone"><a href="tel:${esc(phone)}">${esc(s.phone)}</a></p>`:''}
        <p class="st-url"><span>Store page</span><a href="${esc(shopPath(s))}">${esc(url.replace(/^https:\/\//,''))}</a></p>
      </div>
      ${rows?`<div class="st-card"><h2>Opening hours</h2><div class="st-hours">${rows}</div></div>`:''}
    </section>
    ${cats.length?`<section class="st-depts" aria-label="What this shop sells"><h2>What you’ll find here</h2><div class="st-chips">${cats.map(c=>`<span>${esc(c)}</span>`).join('')}</div></section>`:''}
  </div>`;
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

V.shop=function(id){
  const h=orig(id);
  if(!A.view||A.view.id!==id)return h;
  let next=h.replace(/<div class="shero"[\s\S]*?<\/section>/,headHTML(A.view));
  if(!/\bclass="(?:sf|foot)"/.test(next)&&typeof foot==='function')next+=foot();
  setTimeout(()=>{ldjson(A.view);clearLd()},0);
  return next;
};

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-stshare]');if(!b)return;
  e.preventDefault();
  const url=b.getAttribute('data-stshare'),title=(A.view&&A.view.name)||'ShopNip';
  if(navigator.share){navigator.share({title,text:'Order from '+title+' on ShopNip',url}).catch(()=>{});return}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(()=>typeof toast==='function'&&toast('Store link copied')).catch(()=>typeof toast==='function'&&toast('Store link: '+url))}
  else if(typeof toast==='function')toast('Store link: '+url);
});

const st=document.createElement('style');st.id='p32css';st.textContent=`
.store{--st:#0f766e;margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0f172a}
.st-hero{position:relative;isolation:isolate;height:220px;width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);border-radius:0;overflow:hidden;
  background:
    radial-gradient(720px 260px at 88% 0%, rgba(255,255,255,.18), transparent 58%),
    radial-gradient(420px 180px at 8% 110%, rgba(15,23,42,.22), transparent 55%),
    linear-gradient(145deg, var(--st) 0%, #0b4f4a 100%);
  background-size:cover;background-position:center;background-repeat:no-repeat}
.st-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,.12) 20%,rgba(15,23,42,.62) 100%);pointer-events:none}
.st-back{position:absolute;z-index:2;top:16px;left:max(16px,calc(50vw - 50%));background:rgba(255,255,255,.96);color:#0f172a;text-decoration:none;font-weight:800;font-size:13px;padding:8px 14px;border-radius:999px;box-shadow:0 6px 18px rgba(15,23,42,.14)}
.st-back:hover{background:#fff}
.st-hero-txt{position:absolute;z-index:2;left:max(20px,calc(50vw - 50%));right:max(20px,calc(50vw - 50%));bottom:28px;color:#fff}
.st-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.86)}
.st-hero-txt h1{margin:0;font-size:30px;letter-spacing:-.7px;line-height:1.15;color:#fff;text-shadow:0 2px 18px rgba(15,23,42,.28)}
.st-bar{display:grid;grid-template-columns:72px 1fr;gap:14px 16px;align-items:start;margin-top:-28px;position:relative;z-index:2}
.st-logo{width:72px;height:72px;border-radius:20px;border:4px solid #fff;background:var(--st);color:#fff;font-size:30px;font-weight:800;display:grid;place-items:center;overflow:hidden;box-shadow:0 10px 28px rgba(15,23,42,.14)}
.st-logo img{width:100%;height:100%;object-fit:cover}
.st-id{padding-top:36px;min-width:0}
.st-meta{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;font-size:14px;color:#475569;font-weight:600}
.st-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 10px;font-size:12.5px;font-weight:800;background:#fff8eb;color:#8a5a00;border:1px solid #f5e2b8}
.st-pill.live{background:#eefaf3;color:#146c36;border-color:#b7ebc9}
.st-pill.soon{background:#fff8eb;color:#8a5a00;border-color:#f5e2b8}
.st-pill.closed{background:#fff4f2;color:#8f2d2d;border-color:#ffd0c8}
.st-pill.unknown{background:#f4f6f8;color:#667085;border-color:#e6eaf0}
.st-notice,.st-ready{margin:8px 0 0;font-size:14px;color:#334155;line-height:1.45}
.st-ready{font-weight:700;color:var(--st)}
.st-tags{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.st-tags span{background:#f0fdfa;color:#115e59;border:1px solid #ccfbf1;border-radius:999px;padding:6px 11px;font-size:13px;font-weight:700}
.st-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.st-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--st);color:#fff;border:0;border-radius:999px;padding:11px 16px;font:inherit;font-size:14px;font-weight:800;text-decoration:none;cursor:pointer}
.st-btn.ghost{background:#fff;color:#0f172a;border:1.5px solid #e2e8f0}
.st-btn:hover{filter:brightness(1.05)}
.st-visit{display:grid;gap:14px;margin:28px 0 0}
.st-card{background:#fff;border:1px solid #e7ecef;border-radius:18px;padding:18px 20px;box-shadow:0 6px 22px rgba(16,24,40,.05)}
.st-card h2{margin:0 0 10px;font-size:15px;letter-spacing:-.2px}
.st-addr{margin:0 0 8px;font-size:15px;line-height:1.45;font-weight:600}
.st-link,.st-phone a,.st-url a{color:var(--st);font-weight:800;text-decoration:none}
.st-link:hover,.st-phone a:hover,.st-url a:hover{text-decoration:underline}
.st-phone{margin:10px 0 0;font-size:15px}
.st-url{margin:14px 0 0;padding-top:14px;border-top:1px solid #eef2f4}
.st-url span{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:4px}
.st-url a{word-break:break-all;font-size:14px}
.st-hours{display:grid;gap:8px}
.st-hr{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#334155}
.st-hr.today{font-weight:800;color:#0f172a}
.st-hr.today em{font-style:normal;color:var(--st);font-size:11px;margin-left:6px;font-weight:800}
.st-hr.shut b{color:#94a3b8;font-weight:600}
.st-depts{margin:28px 0 4px}
.st-depts h2{margin:0 0 12px;font-size:18px;letter-spacing:-.3px}
.st-chips{display:flex;flex-wrap:wrap;gap:8px}
.st-chips span{background:#fff;border:1px solid #e2e8f0;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:700;color:#334155}
.store ~ .sf{margin-top:40px}
@media(min-width:768px){
  .st-hero{height:300px}
  .st-hero-txt h1{font-size:40px}
  .st-hero-txt{bottom:36px}
  .st-bar{grid-template-columns:88px 1fr;gap:18px 22px;margin-top:-36px}
  .st-logo{width:88px;height:88px;border-radius:22px;font-size:36px}
  .st-id{padding-top:48px}
  .st-visit{grid-template-columns:1.1fr .9fr;gap:16px;margin-top:40px}
  .st-depts{margin-top:40px}
  .store ~ .sf{margin-top:40px}
}
`;
document.head.appendChild(st);
window.P32={shopURL,shopPath,shopSlug};
})();
