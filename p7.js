/* p7: storefront-style customer homepage. Top: horizontally scrolling strip of tall colourful promo cards.
   Below: white tile cards with a 2x2 grid of real catalogue products. Existing sections (shops near you, deals…) follow. */
(()=>{
const CAT=()=>P4.cat().filter(p=>p.images?.length);
const nm=p=>{const h=p.name.split(/\s?[-–]\s?|[,(]/);let t=(/^(toys?|disposable|party)$/i.test(h[0].trim())&&h[1]?h[1]:h[0]).trim();if(t.length>22)t=t.slice(0,22).replace(/\s+\S*$/,'');t=t.replace(/\b([A-Z])([A-Z]+)\b/g,(m,a,b)=>a+b.toLowerCase());return esc(t)};
const price=p=>+(p.price||((+p.trade_price||1)*1.6)).toFixed(2);
const head=p=>p.name.split(/\s[-–]\s?|\s?[-–]\s|[,(]/)[0].trim().toLowerCase();
// product "type": name head (e.g. "balloon", "gift bag"); generic heads like "Toys"/"Disposable" use the next segment
const TYPES=['glue stick','double sided tape','bubble wrap','gift wrap','gift bag','gift tag','greeting card','pencil case','exercise book','bin bag','cling film','paper plate','tea light','balloon','banner','bunting','candle','napkin','cup','plate','foil','bow','ribbon','envelope','label','box','tape','glue','highlighter','sharpener','ruler','scissor','notebook','marker','pencil','pen','glove','cloth','water gun','water pistol','blaster','aqua shot','bubble','toy set','football','clay','paint','crayon','glitter','sketch'];
const ALIAS={'water pistol':'water gun','blaster':'water gun','aqua shot':'water gun'};
const sub=p=>{let h=head(p);if(/^(toys?|disposable|party)$/.test(h))h=(p.name.split(/\s?[-–]\s?/)[1]||h).trim().toLowerCase();return h};
// product "type": first known keyword in the (sub)head, else the head itself
const tkey=p=>{const h=sub(p);const k=TYPES.find(k=>h.includes(k));return k?(ALIAS[k]||k):h.replace(/s$/,'')};
function uniq(list,n,used={t:new Set(),i:new Set()}){const out=[];for(const p of list){if(out.length>=n)break;const t=tkey(p),im=p.images[0];if(used.t.has(t)||used.i.has(im))continue;used.t.add(t);used.i.add(im);out.push(p)}return out}
function find(test,n,off=0){const c=CAT().filter(test);return uniq(c.slice(off).concat(c.slice(0,off)),n)}
// one product per keyword group (matched on the name head), then fallback to distinct types from the tile's pool
const hk=(...w)=>p=>{const h=head(p);return w.some(k=>new RegExp('\\b'+k+'s?\\b').test(h))};
function mix(groups,fb,n=4,off=0){const used={t:new Set(),i:new Set()},out=[];
  for(const g of groups){if(out.length>=n)break;const c=CAT().filter(hk(...g));out.push(...uniq(c.slice(off%Math.max(c.length,1)).concat(c),1,used))}
  if(out.length<n&&fb)out.push(...uniq(CAT().filter(fb),n-out.length,used));return out}
const kw=(...w)=>p=>{const n=p.name.toLowerCase();return w.some(k=>n.includes(k))};
const img=p=>`<img loading="lazy" src="${esc(p.images[0])}" alt="${esc(p.name)}" onerror="this.style.visibility='hidden'">`;
// ---------- promo strip ----------
function dealsPool(){let L=uniq(S.products.filter(p=>p.cmp>p.price&&!p.demo&&p.images?.length),4).map(p=>({p,d:Math.round((1-p.price/p.cmp)*100),real:true}));
  if(L.length<4){const d=[30,25,20,35];const u={t:new Set(L.map(x=>tkey(x.p))),i:new Set(L.map(x=>x.p.images[0]))};L=L.concat(uniq([['balloon'],['gift bag'],['glitter'],['notebook'],['pen']].flatMap(g=>CAT().filter(hk(...g)).slice(9)),4-L.length,u).map((p,i)=>({p,d:d[i%4],real:false})))}return L}
function cards(){const promos=(window.P5?.promos?.()||[]).filter(x=>x.type==='banner'&&['hero','strip'].includes(x.placement||'hero'));
  const dl=dealsPool(),preview=dl.some(x=>!x.real);
  const pop=uniq(S.products.filter(p=>p.offers?.length&&p.images?.length),4);const popL=pop.length>=4?pop:mix([['tape'],['envelope'],['highlighter'],['scissors']],kw('tape','envelope','highlighter','scissors'),4,3);
  const u2=CAT().filter(p=>price(p)<=2);
  const house=[
   {c:'pc-teal',k:'Welcome offer',t:'Free delivery on your first order',s:'From shops on your street',cta:'Start shopping',link:'#search',hero:find(kw('gift bag','balloon','notebook'),3,2)},
   {c:'pc-red',k:'Deals',t:'Deals ending soon',cta:'See all deals',link:'#search',grid:dl.slice(0,4),badge:true,note:preview?'Preview prices':''},
   {c:'pc-coral',k:'Seasonal',t:'Party season',s:'Balloons, banners & bags',cta:'Shop party',link:'q:party',life:find(kw('balloon'),1,4)[0]},
   {c:'pc-gold',k:'Budget',t:'Everything under £2',s:'Pocket-money picks',cta:'Shop under £2',link:'max:2',hero:find(p=>price(p)<=2&&u2.includes(p),3,20)},
   {c:'pc-navy',k:'Near you',t:'Popular deals near you',cta:'Explore',link:'#search',grid:popL.slice(0,4)},
   {c:'pc-lime',k:'Back to school',t:'Back to school, sorted',s:'Pens, pads & pencil cases',cta:'Shop school',link:'sec:1',hero:find(kw('pencil case','ruler','sharpener'),3,1)}];
  const fromPromo=promos.map((b,i)=>{const th={coral:'pc-coral',gold:'pc-gold',night:'pc-navy',lime:'pc-lime',teal:'pc-teal'}[b.theme]||'pc-teal';
    return {c:th,k:b.shop_id?'Promoted':'ShopNip',t:b.title,s:b.subtitle,cta:b.cta||'Shop now',link:b.link||'#search',bg:b.image,hero:b.image?null:(b.sku?[S.products.find(p=>p.sku===b.sku)].filter(Boolean):find(kw(...(b.kw||['pen'])),3,i))}});
  return [house[0],...fromPromo,...house.slice(1)].slice(0,9)}
function card(c){const body=c.grid?`<div class="pg2">${c.grid.map(x=>{const p=x.p||x;return `<span>${img(p)}${c.badge?`<em>-${x.d}%</em>`:''}</span>`}).join('')}</div>`
   :c.life?`<div class="plife">${img(c.life)}</div>`:c.bg?`<div class="pbg" style="background-image:url('${esc(c.bg)}')"></div>`:`<div class="phero">${(c.hero||[]).map((p,i)=>`<span class="h${i}">${img(p)}</span>`).join('')}</div>`;
  return `<a href="#" class="pcard ${c.c}" data-plink="${esc(c.link)}"><span class="pk">${esc(c.k)}</span><b class="pt">${esc(c.t)}</b>${c.s?`<small class="ps">${esc(c.s)}</small>`:''}${body}<span class="pcta">${esc(c.cta)} ${svg('arrow')}</span>${c.note?`<i class="pnote">${esc(c.note)}</i>`:''}</a>`}
const strip=()=>`<section class="pstrip" aria-label="Offers"><div class="psr" id="psr">${cards().map(card).join('')}</div>
  <button type="button" class="psa prev" data-psgo="-1" aria-label="Scroll offers left"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" class="psa next" data-psgo="1" aria-label="Scroll offers right"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></section>`;
// ---------- tile grid ----------
const TILES=[
 ['Back to school','sec:1',[['pencil case'],['ruler'],['sharpener'],['exercise book'],['highlighter']],kw('pencil case','ruler','sharpener','exercise book','highlighter','eraser')],
 ['Party essentials','q:party',[['balloon'],['banner','bunting'],['candle'],['paper plate','cup','napkin']],p=>/party/i.test(p.category)],
 ['Gift wrap & cards','q:gift wrap',[['gift wrap','brown paper'],['bow'],['gift bag'],['greeting card','card','gift tag','tag']],kw('gift','bow','card','tag','wrap')],
 ['Art & craft','sec:2',[['paint set','paint'],['crayon','wax crayon'],['glitter pot','glitter shaker'],['sketch pad','sketch book'],['modelling clay']],p=>p.category==='Art & Craft'],
 ['Packaging','q:mailing',[['label'],['envelope'],['box','parcel box','postal tube'],['bubble wrap'],['tape']],p=>/packaging|mailing|envelope/i.test(p.category)],
 ['Household','q:household',[['napkin'],['cling film','foil'],['bin bag'],['cloth','glove','sponge','cloth peg']],p=>/house hold|bin bags|gloves/i.test(p.category)],
 ['Tapes & glue','q:tape',[['tape'],['glue','super glue'],['glue stick'],['double sided tape']],p=>p.category==='Tapes & Adhesives'],
 ['Toys & games','q:toy',[['toy set'],['water pistol','water gun'],['football'],['chess set','draughts set'],['play clay']],p=>/toys/i.test(p.category)]];
const grid=()=>`<section class="tgrid">${TILES.map(([t,l,g,f],i)=>{const ps=mix(g,f,4,i);if(ps.length<4)return '';
  return `<div class="tcard"><a href="#" class="th" data-plink="${esc(l)}"><h3>${esc(t)}</h3>${svg('arrow')}</a><div class="t4">${ps.map(p=>`<a href="#" data-plink="q:${esc(p.name.split(/[,–(]| - /)[0].trim().slice(0,30))}"><span>${img(p)}</span><small>${nm(p)}</small></a>`).join('')}</div>
   <a href="#" class="tm" data-plink="${esc(l)}">See more</a></div>`}).join('')}</section>`;
// ---------- install over p5's home ----------
const _home=V.home;
V.home=function(...a){let h=_home.apply(this,a);
  h=h.replace(/<section class="h5"[\s\S]*?<\/section>/,strip()+grid()).replace(/<section class="tiles">[\s\S]*?<\/section>/,'');
  return h};
addEventListener('click',e=>{const b=e.target.closest('[data-psgo]');if(!b)return;e.preventDefault();e.stopPropagation();const r=$('#psr');r.scrollBy({left:(+b.dataset.psgo)*r.clientWidth*.8,behavior:'smooth'})},true);
const upd=()=>{const r=$('#psr');if(!r)return;const s=r.closest('.pstrip');s.classList.toggle('atstart',r.scrollLeft<8);s.classList.toggle('atend',r.scrollLeft+r.clientWidth>=r.scrollWidth-8)};
document.addEventListener('scroll',e=>{if(e.target.id==='psr')upd()},true);new MutationObserver(()=>upd()).observe(document.getElementById('view'),{childList:true});
const css=`.pstrip{position:relative;margin:14px 0 18px}.psr{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:2px 2px 6px}.psr::-webkit-scrollbar{display:none}
.pcard{flex:0 0 calc((100% - 56px)/5);min-height:340px;scroll-snap-align:start;border-radius:20px;padding:18px 16px 16px;display:flex;flex-direction:column;text-decoration:none;color:#fff;position:relative;overflow:hidden;box-shadow:0 10px 26px rgba(16,24,40,.12);transition:transform .2s}
.pcard:hover{transform:translateY(-3px)}.pk{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.85}.pt{font-size:21px;line-height:1.15;letter-spacing:-.5px;margin:6px 0 4px;font-weight:800}.ps{font-size:13px;opacity:.9}
.pcta{margin-top:auto;display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:13px;background:rgba(255,255,255,.95);color:#14202e;border-radius:999px;padding:8px 14px;align-self:flex-start}.pcta svg{width:15px;height:15px}
.pnote{position:absolute;top:16px;right:14px;font-style:normal;font-size:10px;font-weight:700;background:rgba(0,0,0,.25);padding:3px 7px;border-radius:99px}
.pc-teal{background:linear-gradient(160deg,#0f766e,#0b3b38)}.pc-red{background:linear-gradient(160deg,#e11d48,#9f1239)}.pc-coral{background:linear-gradient(160deg,#ff6b4a,#e8553a)}.pc-gold{background:linear-gradient(160deg,#facc15,#f59e0b);color:#3b2600}.pc-navy{background:linear-gradient(160deg,#1e3a8a,#172554)}.pc-lime{background:linear-gradient(160deg,#a3e635,#4d7c0f);color:#1a2e05}
.pc-gold .pcta,.pc-lime .pcta{background:#14202e;color:#fff}
.pg2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.pg2 span{background:#fff;border-radius:12px;aspect-ratio:1;display:grid;place-items:center;position:relative;overflow:hidden}.pg2 img{width:84%;height:84%;object-fit:contain}
.pg2 em{position:absolute;left:5px;top:5px;background:#dc2626;color:#fff;font-style:normal;font-size:11px;font-weight:800;padding:2px 6px;border-radius:6px}
.phero{position:relative;flex:1;min-height:150px;margin:10px 0}.phero span{position:absolute;background:#fff;border-radius:16px;display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.18);overflow:hidden}.phero img{width:86%;height:86%;object-fit:contain}
.phero .h0{width:62%;aspect-ratio:1;left:4%;top:8%;transform:rotate(-5deg)}.phero .h1{width:46%;aspect-ratio:1;right:2%;top:0;transform:rotate(6deg)}.phero .h2{width:44%;aspect-ratio:1;right:10%;bottom:0;transform:rotate(-2deg)}
.plife{flex:1;margin:12px -16px 12px;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.95) 0 38%,rgba(255,255,255,.25) 39% 52%,transparent 53%);display:grid;place-items:center;min-height:160px}.plife img{width:62%;max-height:170px;object-fit:contain;filter:drop-shadow(0 12px 18px rgba(0,0,0,.25))}
.pbg{flex:1;margin:10px 0;border-radius:14px;background-size:cover;background-position:center;min-height:150px}
.psa{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.2);display:grid;place-items:center;cursor:pointer;z-index:2}.psa svg{width:22px;height:22px;fill:none;stroke:#14202e;stroke-width:2.4}
.psa.next{right:-10px}.psa.prev{left:-10px}.pstrip.atstart .psa.prev,.pstrip.atend .psa.next{opacity:0;pointer-events:none}
.tgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:0 0 26px}.tcard{background:#fff;border-radius:18px;padding:14px;border:1px solid #eceef2;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(16,24,40,.04)}
.tcard .th{display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:inherit}.tcard h3{margin:0;font-size:17px;letter-spacing:-.3px}.tcard .th svg{width:30px;height:30px;padding:7px;border-radius:50%;background:#e6f4f2;stroke:#0f766e;fill:none;stroke-width:2.4}
.t4{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0 8px}.t4 a{text-decoration:none;color:inherit;min-width:0}.t4 span{display:grid;place-items:center;aspect-ratio:1;background:#f6f7f9;border-radius:12px;overflow:hidden}.t4 img{width:82%;height:82%;object-fit:contain;transition:transform .2s}.t4 a:hover img{transform:scale(1.06)}
.t4 small{display:block;font-size:12px;margin-top:5px;color:#344054;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tm{margin-top:auto;font-size:13px;font-weight:700;color:#0f766e;text-decoration:none}
@media(max-width:1100px){.pcard{flex-basis:calc((100% - 42px)/4)}.tgrid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.pcard{flex-basis:46%;min-height:290px;padding:14px 12px 12px}.pt{font-size:17px}.psa{display:none}.tgrid{grid-template-columns:1fr 1fr;gap:10px}.tcard{padding:11px;border-radius:16px}.tcard h3{font-size:15px}.t4{gap:7px}.t4 small{font-size:11px}.tcard .th svg{width:26px;height:26px;padding:6px}.psr{gap:10px;margin:0 -16px;padding:2px 16px 6px;scroll-padding:16px}}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
window.P7T={tkey};
if(cur&&cur[0]==='home')render();
})();
/* p12: premium full-width homepage + full-screen About us section (#about). */
(()=>{
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const realShops=()=>S.shops.filter(s=>!s.demo&&(!s.status||s.status==='approved'));
const realProducts=()=>S.products.filter(p=>!p.demo&&p.offers?.length);
const value=()=>`<div class="vstrip" aria-label="Why shop with ShopNip">${[['store','Local shops','Independents near you'],['bolt','Same-day delivery','From shops that deliver locally'],['bag','Pay at the shop','On collection or delivery'],['heart','Support local','Your money stays on your high street']].map(([i,t,s])=>`<div class="vs">${svg(i)}<span><b>${t}</b><small>${s}</small></span></div>`).join('')}</div>`;
function about(){const ns=realShops().length,np=realProducts().length;
  const stats=ns&&np?`<div class="abst"><div><b>${ns}</b><small>local shop${ns>1?'s':''} live</small></div><div><b>${np}</b><small>product${np>1?'s':''} to order</small></div></div>`:'';
  const vals=[['store','Real independent shops','Every shop is a local independent, reviewed and approved by us. No warehouses.'],['bolt','Collect or local delivery','Pick up on your way home, or have it delivered by shops that deliver nearby.'],['lock','Pay at the shop','Pay the shop on collection or delivery. Online payments are coming later.'],['check','Always up to date','Shop listings fill automatically from each shop’s wholesale orders.']];
  const steps=[['pin','Set your postcode','See the local shops near you.'],['search','Browse & compare','Search everything stocked on your high street.'],['bag','Order ahead','Choose click & collect or local delivery.'],['heart','Pay at the shop','Collect, pay and support local.']];
  return `<section class="about12" id="about" aria-labelledby="ab-h"><div class="abin">
   <div class="abtop rv"><span class="abk">About ShopNip · a NuvonHub product</span><h2 id="ab-h">Your high street, <em>in your pocket.</em></h2>
    <p>ShopNip is a local marketplace for the independent shops around you. Order from the newsagent, card shop or craft store down the road, then collect it or have it delivered locally. We’re starting with a pilot in Watford, helping local shops get found, get orders and keep the high street thriving.</p>${stats}</div>
   <div class="abv">${vals.map(([i,t,s],k)=>`<div class="rv" style="--d:${k*80}ms"><span>${svg(i)}</span><b>${t}</b><p>${s}</p></div>`).join('')}</div>
   <div class="abhow rv"><h3>How it works</h3><ol>${steps.map(([i,t,s],k)=>`<li><span class="abn">${k+1}</span>${svg(i)}<b>${t}</b><small>${s}</small></li>`).join('')}</ol></div>
   <div class="abcta rv"><button class="abb pri" data-plink="#search">Start shopping ${svg('arrow')}</button><a class="abb sec" href="seller.html">Become a seller ${svg('arrow')}</a></div>
  </div><i class="abo a1"></i><i class="abo a2"></i></section>`}
const _h=V.home;
V.home=function(...a){let h=_h.apply(this,a);
  h=h.replace(/<div class="trust">[\s\S]*?<\/span><\/div><\/div>/,value());
  h=h.replace(/<section class="sec5 why">[\s\S]*?<\/section>/,about());
  if(!h.includes('id="about"'))h=h.replace('<section class="news"',about()+'<section class="news"');
  h=h.replace(/data-plink="#about"/g,'data-about');
  return `<div class="h12">${h}</div>`};
function toAbout(){const go=()=>{const el=$('#about');if(!el)return;const top=$('.top');scrollTo({top:el.getBoundingClientRect().top+scrollY-(top?top.offsetHeight:0),behavior:RM()?'auto':'smooth'})};
  if(cur[0]!=='home'){if(location.hash)history.replaceState(null,'',location.pathname+location.search);route('home');requestAnimationFrame(()=>requestAnimationFrame(go))}else go()}
addEventListener('click',e=>{const a=e.target.closest('[data-about]');if(!a)return;e.preventDefault();e.stopPropagation();toAbout()},true);
window.P12={about:toAbout};
// scroll reveal
let io;function reveal(){const v=$('#view');if(!v||!v.querySelector('.h12'))return;
  const els=v.querySelectorAll('.h12>section:not(.pstrip),.h12>.vstrip,.h12 .tcard,.h12 .rv');
  if(RM()||!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
  io?.disconnect();io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{rootMargin:'0px 0px -6% 0px',threshold:.06});
  els.forEach(e=>{if(!e.classList.contains('in')){e.classList.add('rv');io.observe(e)}})}
new MutationObserver(reveal).observe(document.getElementById('view'),{childList:true});reveal();
if(cur&&cur[0]==='home')render();
})();
