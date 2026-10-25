// ShopNip (a NuvonHub product) · p25: real URLs (History API), All products page with filters, accurate "Use my location",
// UI/UX polish (price-first cards, "Ready today by", checkout postcode, toast position, mobile nav/category targets, shorter ticker).
(()=>{const {MOCK,toast}=P2;
const KEEP=['mock','demo','as','rich','multi','promos','status','dup','shop'];               // dev/test params carried across navigation
const keepQS=extra=>{const Q=new URLSearchParams(location.search),o=new URLSearchParams();KEEP.forEach(k=>Q.has(k)&&o.set(k,Q.get(k)));
  if(extra)for(const[k,v]of Object.entries(extra))if(v!==''&&v!=null&&v!==false)o.set(k,v===true?'1':v);const s=o.toString();return s?'?'+s:''};
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
const SITE=(CFG.SITE_URL||'https://nearbuy-uk.vercel.app').replace(/\/$/,'');
const INFO=['about','how','sell','faq','contact','terms','privacy'];
const SIMPLE=['basket','checkout','orders','account','register','myshop','inbox','addprod'];
const shopSlug=s=>{const b=slug(s.name);return S.shops.filter(x=>slug(x.name)===b).length>1?b+'-'+String(s.id).slice(0,8):b};
const findShop=seg=>S.shops.find(s=>shopSlug(s)===seg||String(s.id)===seg)||S.shops.find(s=>String(s.id).startsWith(seg.split('-').pop()));

// ---------- All products: state <-> URL ----------
const PF0={q:'',cat:'',shop:'',min:'',max:'',stock:false,ful:'',sort:'featured'};
const PF={...PF0};let PN=48;
function pfFromURL(){const Q=new URLSearchParams(location.search);Object.assign(PF,PF0,{q:Q.get('q')||'',cat:Q.get('cat')||'',shop:Q.get('shop_f')||'',min:Q.get('min')||'',max:Q.get('max')||'',
  stock:Q.get('stock')==='1',ful:['collect','delivery'].includes(Q.get('ful'))?Q.get('ful'):'',sort:Q.get('sort')||'featured'})}
const pfQS=()=>keepQS({q:PF.q,cat:PF.cat,shop_f:PF.shop,min:PF.min,max:PF.max,stock:PF.stock,ful:PF.ful,sort:PF.sort==='featured'?'':PF.sort});

// ---------- routing ----------
function pathFor(c){const [t,a]=c;
  if(t==='home')return '/'+keepQS();
  if(t==='products')return '/products'+pfQS();
  if(t==='search'){const q=$('#q')?.value.trim();return '/search'+keepQS({q})}
  if(t==='cat'&&CATS[a])return '/category/'+slug(CATS[a][0])+keepQS();
  if(t==='sec'&&SECTIONS[a])return '/collection/'+slug(SECTIONS[a][0])+keepQS();
  if(t==='shop'&&a){const s=S.shops.find(x=>String(x.id)===String(a));return '/shop/'+(s?shopSlug(s):encodeURIComponent(a))+keepQS()}
  if(t==='order'&&a)return '/orders/'+encodeURIComponent(a)+keepQS();
  if(INFO.includes(t)||SIMPLE.includes(t))return '/'+t+keepQS();
  return null}
function parse(){const p=decodeURIComponent(location.pathname).replace(/\/+$/,'')||'/',seg=p.split('/').filter(Boolean),Q=new URLSearchParams(location.search);
  const h=location.hash.slice(1);
  if(/^shop=/.test(h))return ['shop',h.slice(5)];if(INFO.includes(h))return [h];if(h==='account')return ['account'];
  if(p==='/')return null;
  if(seg[0]==='products')return ['products'];
  if(seg[0]==='search'){if(Q.get('q')&&$('#q'))$('#q').value=Q.get('q');return ['search']}
  if(seg[0]==='category'){const i=CATS.findIndex(c=>slug(c[0])===seg[1]);return i>=0?['cat',i]:['products']}
  if(seg[0]==='collection'){const i=SECTIONS.findIndex(c=>slug(c[0])===seg[1]);return i>=0?['sec',i]:['products']}
  if(seg[0]==='shop'&&seg[1]){const s=findShop(seg[1]);return ['shop',s?s.id:seg[1]]}
  if(seg[0]==='product'&&seg[1])return ['product',seg[1]];
  if(seg[0]==='orders'&&seg[1])return ['order',seg[1]];
  if(INFO.includes(seg[0])||SIMPLE.includes(seg[0]))return [seg[0]];
  return ['notfound']}
let restoring=false,booted=false;
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>String(x)===String(b[i]));
const _route=route;
window.route=route=function(t,...a){
  if(!booted){booted=true;const want=parse();
    if(want&&!(location.pathname==='/'&&t!=='home')){                       // explicit ?view= screenshots on "/" keep priority
      if(want[0]==='product'){pfFromURL();_route('products');setTimeout(()=>openProduct(want[1]),50);return meta()}
      if(want[0]==='products')pfFromURL();
      if(want[0]==='notfound'){_route('home');history.replaceState(null,'','/'+keepQS());return meta()}
      [t,...a]=want}}
  if(t==='products'&&!restoring&&cur[0]!=='products')PN=48;
  const r=_route(t,...a);
  const url=pathFor(cur);
  if(url&&!restoring){const now=location.pathname+location.search;
    if(location.hash&&/^#(shop=|about|how|sell|faq|contact|terms|privacy|account)/.test(location.hash))history.replaceState({r:cur},'',url);
    else if(url!==now)history.pushState({r:cur},'',url)}
  meta();return r};
addEventListener('popstate',()=>{const want=parse()||['home'];const el=$('#sheet');
  if(want[0]==='product'){openProduct(want[1]);return}
  if(el?.classList.contains('on')){el.className='';document.body.style.overflow='';sheetPushed=false}
  if(want[0]==='products')pfFromURL();
  if(same(want,cur)&&want[0]!=='products'){meta();return}
  restoring=true;try{if(want[0]==='order')route('order',want[1]);else route(...want)}finally{restoring=false}});
// in-app links: data-go="/path" and plain #info links -> History API instead of page loads
addEventListener('click',e=>{if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey)return;
  const g=e.target.closest('[data-go]');if(g){e.preventDefault();e.stopPropagation();go(g.dataset.go);return}
  const a=e.target.closest('a[href]');if(!a||a.target||a.hasAttribute('download'))return;const h=a.getAttribute('href');
  if(/^#(about|how|sell|faq|contact|terms|privacy)$/.test(h)){e.preventDefault();route(h.slice(1));return}
  if(/^\/(about|how|sell|faq|contact|terms|privacy|products|basket|orders|account)$/.test(h)&&!a.dataset.t){e.preventDefault();route(h.slice(1))}},true);
function go(path){history.pushState(null,'',path.includes('?')?path:path+keepQS());const w=parse()||['home'];if(w[0]==='products')pfFromURL();restoring=true;
  try{w[0]==='product'?openProduct(w[1]):route(...w)}finally{restoring=false}meta()}

// ---------- titles + meta per page ----------
function setMeta(title,desc,path){document.title=title;
  const m=(sel,attr,val)=>{let e=document.head.querySelector(sel);if(!e){e=document.createElement(sel.startsWith('link')?'link':'meta');const k=sel.match(/\[(\w+(?::\w+)?)="([^"]+)"\]/);e.setAttribute(k[1],k[2]);document.head.appendChild(e)}e.setAttribute(attr,val)};
  m('meta[name="description"]','content',desc);m('meta[property="og:title"]','content',title);m('meta[property="og:description"]','content',desc);
  m('meta[property="og:url"]','content',SITE+path);m('link[rel="canonical"]','href',SITE+path);m('meta[name="twitter:title"]','content',title)}
const DEF='Order from independent shops near you. Click & collect or local delivery, pay at the shop.';
function meta(){const [t,a]=cur,p=location.pathname,T=x=>x+' · ShopNip';
  const sheet=$('#sheet');if(sheet?.classList.contains('on')&&sheet._p&&p.startsWith('/product/')){const q=sheet._p;return setMeta(T(q.name),`${q.name} for ${gbp(q.price)} from a local shop. Click & collect or local delivery on ShopNip.`,p)}
  const names={about:'About',how:'How it works',sell:'Sell on ShopNip',faq:'FAQ',contact:'Contact',terms:'Terms of Use',privacy:'Privacy Policy',basket:'Your basket',checkout:'Checkout',orders:'Your orders',account:'Your account',register:'Register your shop',order:'Order details'};
  if(t==='home')return setMeta('ShopNip · Your local shops, online | Click & collect or delivery','ShopNip, a NuvonHub product: order stationery, party, gift and craft essentials from independent shops near you. Click & collect or local delivery, pay at the shop.','/');
  if(t==='products')return setMeta(T(PF.cat?PF.cat:'All products'),`Browse ${PF.cat||'every product'} from independent shops near you. Filter by shop, price, stock and click & collect or delivery.`,'/products');
  if(t==='search'){const q=$('#q')?.value.trim();return setMeta(T(q?`Search: ${q}`:'Search'),DEF,'/search')}
  if(t==='cat'&&CATS[a])return setMeta(T(CATS[a][0]),`Shop ${CATS[a][0].toLowerCase()} from independent shops near you. ${DEF}`,p);
  if(t==='sec'&&SECTIONS[a])return setMeta(T(SECTIONS[a][0]),DEF,p);
  if(t==='shop'){const s=S.shops.find(x=>String(x.id)===String(a))||A0.view;return setMeta(T(s?.name||'Shop'),s?`${s.name}${s.postcode?' ('+s.postcode+')':''} on ShopNip: order online for click & collect${s.delivery_options?.delivery?' or local delivery':''}.`:DEF,p)}
  setMeta(T(names[t]||'ShopNip'),DEF,p)}
const A0=P2.A;

// ---------- product URLs: /product/<sku> mirrors the product sheet ----------
let sheetPushed=false;
function openProduct(sku){sku=decodeURIComponent(sku);const g=S.products.find(p=>p.sku===sku&&p.offers);
  if(g)return P4.gsheet(g);const p=S.products.find(x=>x.sku===sku);if(p&&p.listing_id)return P3.sheet(p);
  const c=(P4.cat()||[]).find(x=>x.sku===sku);if(c)return P4.ssheet({...c,demo:true});
  history.replaceState(null,'','/products'+pfQS());toast('That product is no longer available');meta()}
const chk=()=>{const el=$('#sheet');if(!el)return;const on=el.classList.contains('on');
  if(on&&el._p){const want='/product/'+encodeURIComponent(el._p.sku);
    if(decodeURIComponent(location.pathname)!==decodeURIComponent(want)){history.pushState({sheet:1},'',want+keepQS());sheetPushed=true}meta()}
  else if(!on&&location.pathname.startsWith('/product/')){if(sheetPushed&&history.state?.sheet){sheetPushed=false;history.back()}else{history.replaceState({r:cur},'',pathFor(cur)||'/');meta()}}},mo=new MutationObserver(chk);
const watch=()=>{const el=$('#sheet');if(el&&!el._p25){el._p25=1;mo.observe(el,{attributes:true,attributeFilter:['class']});chk()}};
new MutationObserver(watch).observe(document.body,{childList:true});

// ---------- "Ready today by …" from the shop's opening hours ----------
const fmtT=m=>{let h=Math.floor(m/60)%24,mi=m%60;const ap=h>=12?'pm':'am';h=h%12||12;return h+(mi?':'+String(mi).padStart(2,'0'):'')+ap};
const DN=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function readyBy(shop,now=new Date()){if(!shop||!shop.opening_hours||!window.HoursPicker)return '';let w;try{w=HoursPicker.parse(shop.opening_hours).w}catch(e){return ''}if(!w)return '';
  const mins=t=>{const[h,m]=String(t).split(':').map(Number);return h*60+m},PREP=60;
  const d=(now.getDay()+6)%7,n=now.getHours()*60+now.getMinutes();
  for(let k=0;k<7;k++){const x=w[(d+k)%7];if(!x||!x.o)continue;const a=x.all?0:mins(x.a),b=x.all?1440:mins(x.b);
    let t=k?a+PREP:Math.max(Math.ceil((n+PREP)/30)*30,a+PREP);if(t>b)continue;t=Math.min(t,b);
    return k===0?'Ready today by '+fmtT(t):k===1?'Ready tomorrow by '+fmtT(t):'Ready '+DN[(d+k)%7]+' by '+fmtT(t)}
  return ''}
window.P25={readyBy};

// ---------- product card: price first, smaller shop line, ready-by ----------
const _card=P4.card;
P4.card=function(p){let h=_card(p);const s=S.shops.find(x=>x.id===p.shop_id),r=!p.demo||p.listing_id?readyBy(s):'';
  // move the price/add row above the name
  const pf=h.match(/<div class="pf">[\s\S]*?<\/button><\/div>/);if(pf){h=h.replace(pf[0],'');h=h.replace('<div class="pb">','<div class="pb">'+pf[0])}
  if(r)h=h.replace(/<\/div><\/div>$/,`<div class="prdy">${svg('bolt')}${esc(r)}</div></div></div>`);
  return h};

// ---------- All products view ----------
const offersOf=p=>p.offers&&p.offers.length?p.offers:(p.listing_id||p.demo?[{listing_id:p.listing_id,shop_id:p.shop_id,shop:S.shops.find(s=>s.id===p.shop_id)||null,price:p.price,stock:p.stock??null,updated:p.updated||'',dist:p.dist??null}]:[]);
function okO(o,f,skip){const d=o.shop?.delivery_options||{};
  if(skip!=='shop'&&f.shop&&String(o.shop_id)!==f.shop)return false;
  if(f.stock&&!(o.stock>0))return false;
  if(f.ful==='collect'&&(!o.shop||d.collect===false))return false;
  if(f.ful==='delivery'&&!(o.shop&&d.delivery&&(o.dist==null||!d.delivery_radius_miles||o.dist<=+d.delivery_radius_miles)))return false;
  if(f.min!==''&&o.price<+f.min)return false;if(f.max!==''&&o.price>+f.max)return false;return true}
function pool(){const live=S.products.filter(p=>p.offers&&p.images?.length);if(live.length)return live;const l=S.products.filter(p=>p.images?.length&&p.listing_id);return l.length?l:S.products.filter(p=>p.images?.length)}
function results(f,skip){const words=f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return pool().map(p=>{if(skip!=='cat'&&f.cat&&p.category!==f.cat)return null;
    const of=offersOf(p).filter(o=>okO(o,f,skip));if(!of.length)return null;
    if(words.length){const hay=(p.name+' '+p.category+' '+(p.brand||'')+' '+of.map(o=>o.shop?.name||'').join(' ')).toLowerCase();if(!words.every(w=>hay.includes(w.replace(/s$/,''))))return null}
    return {...p,offers:p.offers?of:undefined,listing_id:of[0].listing_id,shop_id:of[0].shop_id,stock:of[0].stock,price:Math.min(...of.map(o=>o.price)),
      dist:of.reduce((m,o)=>o.dist!=null&&(m==null||o.dist<m)?o.dist:m,null),updated:of.map(o=>o.updated||'').sort().pop()}}).filter(Boolean)}
const SORTS=[['featured','Featured'],['price','Price: low to high'],['price_desc','Price: high to low'],['newest','Newest'],['name','Name: A–Z']];
const sorters={featured:(a,b)=>(a.dist??1e9)-(b.dist??1e9)||(!!b.stock-!!a.stock),price:(a,b)=>a.price-b.price,price_desc:(a,b)=>b.price-a.price,
  newest:(a,b)=>(b.updated||'').localeCompare(a.updated||''),name:(a,b)=>a.name.localeCompare(b.name,'en-GB',{sensitivity:'base'})};
const nActive=()=>[PF.cat,PF.shop,PF.min,PF.max,PF.stock,PF.ful].filter(Boolean).length;
function panel(){const byCat={},byShop={};results(PF,'cat').forEach(p=>byCat[p.category]=(byCat[p.category]||0)+1);
  results(PF,'shop').forEach(p=>offersOf(p).forEach(o=>{if(o.shop)byShop[o.shop_id]=(byShop[o.shop_id]||0)+1}));
  const cats=[...new Set(pool().map(p=>p.category).filter(Boolean))].sort();
  const shops=S.shops.filter(s=>pool().some(p=>offersOf(p).some(o=>String(o.shop_id)===String(s.id))));
  const rad=(name,val,on,label,count)=>`<label class="pfo ${on?'on':''}"><input type="radio" name="${name}" value="${esc(val)}" ${on?'checked':''} data-pf="${name}"><span>${label}</span>${count!=null?`<em>${count}</em>`:''}</label>`;
  const tot=results({...PF,cat:''},'cat').length;
  return `<div class="pfh"><b>Filters</b><button class="pfx" data-pfclose aria-label="Close filters">✕</button></div>
  <div class="pfs"><h5>Category</h5><div class="pfl">${rad('cat','',!PF.cat,'All categories',tot)}${cats.map(c=>rad('cat',c,PF.cat===c,esc(c),byCat[c]||0)).join('')}</div></div>
  ${shops.length>1||PF.shop?`<div class="pfs"><h5>Shop</h5><div class="pfl">${rad('shop','',!PF.shop,'All shops')}${shops.map(s=>rad('shop',String(s.id),PF.shop===String(s.id),esc(s.name),byShop[s.id]||0)).join('')}</div></div>`:''}
  <div class="pfs"><h5>Price</h5><div class="pfp"><label>£<input data-pfn="min" inputmode="decimal" placeholder="Min" value="${esc(PF.min)}" aria-label="Minimum price"></label><i>to</i><label>£<input data-pfn="max" inputmode="decimal" placeholder="Max" value="${esc(PF.max)}" aria-label="Maximum price"></label></div>
   <div class="pfq">${[[0,5],[5,10],[10,20],[20,'']].map(([a,b])=>`<button data-pfr="${a}-${b}" class="${String(PF.min)===String(a||'')&&String(PF.max)===String(b)?'on':''}">${b===''?'£'+a+'+':a?`£${a}–£${b}`:'Under £'+b}</button>`).join('')}</div></div>
  <div class="pfs"><h5>Availability</h5><label class="pfc"><input type="checkbox" data-pfb="stock" ${PF.stock?'checked':''}><span>In stock only</span></label></div>
  <div class="pfs"><h5>How you get it</h5><div class="pfl">${rad('ful','',!PF.ful,'Any')}${rad('ful','collect',PF.ful==='collect',svg('bag')+'Click &amp; collect')}${rad('ful','delivery',PF.ful==='delivery',svg('bolt')+'Local delivery')}</div>
   ${PF.ful==='delivery'&&!S.me?'<p class="pfn">Set your postcode to see which shops deliver to you. <a href="#" id="setpc2">Set postcode</a></p>':''}</div>
  <div class="pff"><button class="btn ghost" data-pfclear ${nActive()?'':'disabled'}>Clear filters</button><button class="btn" data-pfclose>Show <span data-pfcount>${results(PF).length}</span> results</button></div>`}
function chips(){const c=[];const shop=S.shops.find(s=>String(s.id)===PF.shop);
  if(PF.cat)c.push(['cat',PF.cat]);if(PF.shop)c.push(['shop',shop?.name||'Shop']);
  if(PF.min!==''||PF.max!=='')c.push(['price',PF.min!==''&&PF.max!==''?`£${PF.min}–£${PF.max}`:PF.min!==''?`From £${PF.min}`:`Up to £${PF.max}`]);
  if(PF.stock)c.push(['stock','In stock']);if(PF.ful)c.push(['ful',PF.ful==='collect'?'Click & collect':'Delivery']);if(PF.q)c.push(['q',`“${PF.q}”`]);
  return c.length?`<div class="pchips">${c.map(([k,l])=>`<button data-pfrm="${k}">${esc(l)}<i aria-hidden="true">✕</i><span class="vh">Remove filter</span></button>`).join('')}<button class="pclr" data-pfclear>Clear all</button></div>`:''}
function grid(){const r=results(PF).sort(sorters[PF.sort]||sorters.featured),tot=pool().length;
  const head=`<b>${r.length}</b> ${r.length===1?'product':'products'}${r.length!==tot?` <span>of ${tot}</span>`:''}`;
  const body=r.length?`<div class="grid">${r.slice(0,PN).map(pcard).join('')}</div>${r.length>PN?`<div class="pmore"><button class="btn ghost" data-pmore>Show more (${r.length-PN} left)</button></div>`:''}`
    :`<div class="empty">${svg('search')}<br><b>No products match</b><br><span class="note">Try removing a filter or searching for something else.</span>${nActive()||PF.q?'<br><button class="btn" data-pfclear style="margin-top:12px">Clear filters</button>':''}</div>`;
  return {head,body,n:r.length}}
V.products=function(){const g=grid(),n=nActive();
  return `<section class="sec pp"><div class="pph"><h1>${esc(PF.cat||'All products')}</h1><p class="note">From independent shops near you${S.pc?' · '+esc(S.pc):''}</p></div>
  <div class="ppw"><aside class="pfil" id="pfil" aria-label="Filters">${panel()}</aside><div class="pfbg" data-pfclose></div>
  <div class="ppm"><div class="ptool"><label class="psrch">${svg('search')}<input id="pq" type="search" placeholder="Search within results" value="${esc(PF.q)}" aria-label="Search within results" autocomplete="off"></label>
   <button class="pfbtn" data-pfopen>${svg('tag')}Filters${n?` <b>${n}</b>`:''}</button>
   <label class="psort"><span>Sort</span><select data-pfsort aria-label="Sort products">${SORTS.map(([v,l])=>`<option value="${v}" ${PF.sort===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
   <div class="pcount" id="pcount" aria-live="polite">${g.head}</div><div id="pchips">${chips()}</div><div id="pres">${g.body}</div></div></div></section>${foot()}`};
function paint(full){if(cur[0]!=='products')return;history.replaceState(history.state,'','/products'+pfQS());meta();
  const g=grid(),set=(el,h)=>{if(el&&el.innerHTML!==h)el.innerHTML=h};set($('#pcount'),g.head);const ch=$('#pchips'),nh=chips();if(ch&&ch.dataset.h!==nh){ch.dataset.h=nh;ch.innerHTML=nh}const pr=$('#pres');if(pr&&pr.dataset.h!==g.body){pr.dataset.h=g.body;pr.innerHTML=g.body}
  if(full){const pa=$('#pfil'),y=pa.scrollTop,nh=panel();if(pa.dataset.h!==nh){pa.dataset.h=nh;pa.innerHTML=nh;pa.scrollTop=y}}else{const c=document.querySelector('[data-pfcount]');if(c)c.textContent=g.n}
  const b=document.querySelector('[data-pfopen]');if(b){const n=nActive();b.innerHTML=svg('tag')+'Filters'+(n?` <b>${n}</b>`:'')}
  const h=document.querySelector('.pph h1');if(h)h.textContent=PF.cat||'All products'}
const drawer=on=>{document.body.classList.toggle('pf-open',on);document.body.style.overflow=on?'hidden':'';if(on)setTimeout(()=>$('#pfil .pfx')?.focus(),50)};
addEventListener('click',e=>{const t=e.target.closest('[data-pfopen],[data-pfclose],[data-pfclear],[data-pfrm],[data-pfr],[data-pmore]');if(!t||cur[0]!=='products')return;e.preventDefault();
  if(t.dataset.pfopen!=null)return drawer(true);if(t.dataset.pfclose!=null)return drawer(false);
  if(t.dataset.pfclear!=null){Object.assign(PF,PF0,{sort:PF.sort});const q=$('#pq');if(q)q.value='';PN=48;return paint(true)}
  if(t.dataset.pfrm){const k=t.dataset.pfrm;if(k==='price'){PF.min='';PF.max=''}else if(k==='q'){PF.q='';$('#pq').value=''}else PF[k]=PF0[k];return paint(true)}
  if(t.dataset.pfr){const[a,b]=t.dataset.pfr.split('-');const on=String(PF.min)===String(+a||'')&&String(PF.max)===b;PF.min=on||!+a?'':a;PF.max=on?'':b;if(on){PF.min='';PF.max=''}PN=48;return paint(true)}
  if(t.dataset.pmore!=null){PN+=48;return paint(false)}});
addEventListener('change',e=>{const t=e.target;if(cur[0]!=='products')return;
  if(t.dataset.pf){PF[t.dataset.pf]=t.value;PN=48;paint(true)}
  else if(t.dataset.pfb){PF[t.dataset.pfb]=t.checked;PN=48;paint(true)}
  else if(t.dataset.pfn){const v=t.value.replace(/[^0-9.]/g,'');PF[t.dataset.pfn]=v===''||isNaN(+v)?'':String(+v);PN=48;paint(true)}
  else if(t.dataset.pfsort!=null){PF.sort=t.value;paint(false)}});
let pqt;addEventListener('input',e=>{if(e.target.id!=='pq')return;clearTimeout(pqt);pqt=setTimeout(()=>{PF.q=e.target.value.trim();PN=48;paint(false)},180)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('pf-open'))drawer(false);
  if(e.key==='Enter'&&e.target.dataset?.pfn!=null)e.target.blur()});
// header search submits go to the All products page with the query
$('#sf').addEventListener('submit',e=>{const q=$('#q').value.trim();if(!q)return;e.preventDefault();e.stopImmediatePropagation();$('#q').blur();PF.q=q;PN=48;route('products')},true);

// ---------- header: All products (desktop link, mega menu, mobile nav row) ----------
function headerNav(){const top=$('header.top');if(!top||$('.mnav'))return;
  const mg=top.querySelector('.mega .mgi');if(mg&&!mg.querySelector('.mg-all'))mg.insertAdjacentHTML('afterbegin','<div class="mi mg-all"><a href="/products" data-go="/products">All products</a></div>');
  top.insertAdjacentHTML('beforeend',`<nav class="mnav" aria-label="Browse"><div class="mnav-in"><a href="/products" data-go="/products" class="on">${svg('bag')}All products</a>${CATS.map(([l],i)=>`<a href="/category/${slug(l)}" data-cat="${i}">${esc(l)}</a>`).join('')}</div></nav>`)}
const syncNav=()=>{document.querySelectorAll('.navall,.mnav a[data-go],.mg-all a').forEach(a=>a.classList.toggle('cur',cur[0]==='products'));
  document.querySelectorAll('.mnav a[data-cat]').forEach(a=>a.classList.toggle('cur',cur[0]==='cat'&&String(cur[1])===a.dataset.cat))};
const _r2=route;window.route=route=function(...a){const r=_r2.apply(this,a);headerNav();syncNav();document.body.classList.remove('pf-open');if(cur[0]!=='products'&&!$('#sheet.on'))document.body.style.overflow='';return r};
// footer + hero "All products" entry points
const _foot=foot;window.foot=foot=function(){return _foot().replace('<a href="#" data-t="search">All products</a>','<a href="/products" data-go="/products">All products</a>')};

// ---------- Use my location: high accuracy -> postcodes.io -> confirm/edit ----------
let pending=null;
const normPc=s=>String(s||'').toUpperCase().replace(/\s+/g,'');
async function revGeo(lat,lng){for(const r of [100,500,2000]){try{const j=await (await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1&radius=${r}`)).json();if(j.result&&j.result[0])return j.result[0].postcode}catch(e){return null}}return null}
function geoDetect(){if(!$('#locm'))askPostcode();const st=()=>$('#loc_st'),btn=document.querySelector('[data-lgeo]'),err=$('#loc_err');
  if(!$('#loc_st'))err.insertAdjacentHTML('afterend','<div class="lst" id="loc_st" role="status" aria-live="polite"></div>');
  const say=(h,cls='')=>{const s=st();if(s){s.className='lst '+cls;s.innerHTML=h}};err.textContent='';
  if(!window.isSecureContext||!navigator.geolocation){say('Location isn’t available in this browser. Please type your postcode above.','bad');return}
  if(btn){btn.disabled=true;btn.textContent='Finding you…'}say('<i class="spin"></i>Getting an accurate fix. This can take a few seconds…');
  const done=()=>{if(btn){btn.disabled=false;btn.textContent='Use my current location again'}};
  navigator.geolocation.getCurrentPosition(async p=>{const {latitude:lat,longitude:lng,accuracy:acc}=p.coords;const pc=await revGeo(lat,lng);done();
    if(!pc){pending=null;say('We found you, but couldn’t match a UK postcode there. Please type your postcode above.','bad');return}
    pending={lat,lng,pc};const i=$('#loc_pc');if(i){i.value=pc}
    say(`We think you’re at <b>${esc(pc)}</b>${acc?` <span>(accurate to about ${acc<1000?Math.round(acc)+' m':(acc/1609).toFixed(1)+' miles'})</span>`:''}. Check it’s right, edit it if not, then tap <b>Set</b>.${acc>1000?'<br><em>Your device only gave a rough location, so please double-check.</em>':''}`,'ok');
    document.querySelector('[data-locf] .btn')?.focus()},
   e=>{done();pending=null;
    say(e.code===1?'Location access is blocked for ShopNip. To use it, allow location for this site in your browser settings. Or just type your postcode above.'
      :e.code===3?'Finding your location took too long. Try again outdoors or near a window, or type your postcode above.'
      :'We couldn’t get your location right now. Please type your postcode above.','bad')},
   {enableHighAccuracy:true,timeout:15000,maximumAge:0})}
addEventListener('click',e=>{const g=e.target.closest('[data-lgeo],#geo');if(!g)return;e.preventDefault();e.stopImmediatePropagation();geoDetect()},true);
addEventListener('submit',e=>{const f=e.target.closest('[data-locf]');if(!f||!pending)return;const v=$('#loc_pc').value;
  if(normPc(v)===normPc(pending.pc)){e.preventDefault();e.stopImmediatePropagation();const p=pending;pending=null;setMe({lat:p.lat,lng:p.lng},p.pc)}},true);

// ---------- checkout: postcode right in the form ----------
let coPrep=0;const _co=V.checkout;V.checkout=function(...a){let h=_co.apply(this,a);
  if(/Loading/.test(h)&&h.length<400&&!coPrep&&window.P3?.prep){coPrep=1;P3.prep().then(()=>{if(cur[0]==='checkout')_route('checkout')}).catch(()=>{}).finally(()=>setTimeout(()=>coPrep=0,500))}
  return h.replace('<a href="#" id="setpc2" class="hint">Set your postcode</a>',`<div class="copc"><label for="co_pc">Your postcode, to check delivery</label><div class="copc-r"><input id="co_pc" autocomplete="postal-code" placeholder="e.g. WD18 0AA" value="${esc(S.pc||'')}"><button type="button" class="btn" data-copc>Check</button></div><div class="copc-e" id="co_pc_e" role="alert"></div></div>`)};
addEventListener('click',async e=>{const b=e.target.closest('[data-copc]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const v=$('#co_pc').value.trim(),er=$('#co_pc_e');
  if(!v){er.textContent='Enter your postcode';return}b.disabled=true;b.textContent='Checking…';
  try{const r=await lookupPostcode(v);S.me={lat:r.lat,lng:r.lng};S.pc=r.pc;LOC.set(S.me,r.pc);LOC.hdr();if(window.P4)P4.regroup();
    if(window.P3?.prep)await P3.prep();route('checkout');toast('Postcode set to '+r.pc)}
  catch(err){er.textContent='Sorry, we couldn’t find that postcode.';b.disabled=false;b.textContent='Check'}},true);

// ---------- toasts at the top while a form, sheet or dialog is open ----------
const tt=()=>{const a=document.activeElement,f=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);document.body.classList.toggle('tt',!!(f||$('#locm')||$('#sheet.on')||document.body.classList.contains('pf-open')))};
addEventListener('focusin',tt);addEventListener('focusout',()=>setTimeout(tt,0));new MutationObserver(tt).observe(document.body,{childList:true,attributes:true,attributeFilter:['class']});

// ---------- styles ----------
const css=`
.vh{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
body.tt #toast{top:calc(14px + env(safe-area-inset-top));bottom:auto!important;transform:translate(-50%,-20px)}body.tt #toast.on{transform:translate(-50%,0)}
/* product cards: price first, quieter shop line, ready-by */
.pc .pb{display:flex;flex-direction:column}.pc .pb>.pf{order:-1;margin:0 0 4px;padding-top:0}.pc .pr{font-size:17px}
.pc .pmeta{font-size:10.5px;margin-top:3px;opacity:.9}.pc .pmeta svg{width:11px;height:11px}
.prdy{display:flex;align-items:center;gap:4px;margin-top:5px;font-size:10.5px;font-weight:700;color:#15803d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.prdy svg{width:11px;height:11px;flex:none;stroke:currentColor;fill:none;stroke-width:2.2}
@media(max-width:767px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px}.grid .pc{min-width:0}}
/* header: All products */
.navall{white-space:nowrap}.navall.cur{background:rgba(255,255,255,.16)}
.mega .mg-all a{display:inline-flex;align-items:center;height:100%;padding:10px 12px;color:#fff;font-weight:800;font-size:14px;white-space:nowrap}
.mnav{display:none}
@media(max-width:899px){.navall{display:none}.mnav{display:block;border-top:1px solid rgba(255,255,255,.1)}
 .mnav-in{display:flex;gap:8px;overflow-x:auto;padding:8px 16px 10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.mnav-in::-webkit-scrollbar{display:none}
 .mnav a{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font-weight:700;font-size:13.5px;white-space:nowrap}
 .mnav a svg{width:16px;height:16px;stroke:#ffb4a3;fill:none;stroke-width:2}.mnav a.on{background:#fff;color:#0f766e}.mnav a.on svg{stroke:#ff6b4a}.mnav a.cur{box-shadow:0 0 0 2px #ff6b4a inset}
 /* bigger category tap targets */
 .cats{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px 8px!important}.cat{min-height:112px;padding:4px 2px!important;font-size:12.5px!important;border-radius:14px}
 .cat .ci{width:min(76px,20vw)!important;height:min(76px,20vw)!important}}
@media(min-width:900px){.ticker .tk{animation:none!important;width:100%;justify-content:center;padding-left:0}.ticker .tk>:nth-child(n+6){display:none}}
@media(max-width:899px){.ticker .tk{animation-duration:20s!important}}
.ticker{font-size:12px}.ticker .tk{padding-top:6px!important;padding-bottom:6px!important}
/* All products page */
.pp{margin-top:20px}.pph h1{margin:0;font-size:clamp(22px,3vw,30px);font-weight:800;letter-spacing:-.5px}.pph .note{margin:4px 0 16px}
.ppw{display:grid;grid-template-columns:250px minmax(0,1fr);gap:24px;align-items:start}
.pfil{position:sticky;top:150px;max-height:calc(100vh - 170px);overflow:auto;background:#fff;border-radius:16px;box-shadow:var(--sh);padding:6px 16px 16px}
.pfh{display:flex;align-items:center;justify-content:space-between;padding:10px 0}.pfh b{font-size:16px}.pfx{display:none;border:0;background:#f1f5f4;width:40px;height:40px;border-radius:50%;font-size:16px;cursor:pointer}
.pfs{border-top:1px solid var(--line);padding:12px 0}.pfs h5{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}
.pfl{display:grid;gap:2px;max-height:260px;overflow:auto}
.pfo{display:flex;align-items:center;gap:8px;min-height:38px;padding:4px 8px;border-radius:10px;cursor:pointer;font-size:14px}.pfo:hover{background:#f4f7f6}.pfo.on{background:#e7f5f2;font-weight:700;color:#0f766e}
.pfo input{accent-color:#0f766e;margin:0}.pfo span{flex:1;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis}.pfo span svg{width:15px;height:15px;stroke:#ff6b4a;fill:none;stroke-width:2;flex:none}.pfo em{font-style:normal;font-size:12px;color:var(--mut);font-weight:600}
.pfp{display:flex;align-items:center;gap:8px}.pfp label{flex:1;display:flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:10px;padding:0 10px;height:42px;color:var(--mut)}.pfp input{border:0;outline:0;width:100%;font:inherit;font-size:16px;background:none;color:var(--txt)}.pfp i{font-style:normal;color:var(--mut);font-size:13px}
.pfq{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.pfq button,.pchips button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:36px}.pfq button.on{background:#0f766e;border-color:#0f766e;color:#fff}
.pfc{display:flex;align-items:center;gap:10px;min-height:40px;font-size:14px;cursor:pointer}.pfc input{width:18px;height:18px;accent-color:#0f766e}
.pfn{font-size:12.5px;color:var(--mut);margin:8px 0 0}.pff{display:none}
.ptool{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.psrch{flex:1 1 260px;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:0 14px;height:46px;color:var(--mut)}.psrch svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}.psrch input{flex:1;border:0;outline:0;font:inherit;font-size:16px;background:none;color:var(--txt);min-width:0}.psrch:focus-within{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.15)}
.pfbtn{display:none;align-items:center;gap:6px;height:46px;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:#fff;font:inherit;font-weight:700;font-size:14px;cursor:pointer}.pfbtn svg{width:16px;height:16px;stroke:#ff6b4a;fill:none;stroke-width:2}.pfbtn b{background:#ff6b4a;color:#fff;border-radius:999px;min-width:20px;height:20px;display:inline-grid;place-items:center;font-size:11px}
.psort{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mut);font-weight:600}.psort select{height:46px;border:1px solid var(--line);border-radius:999px;padding:0 14px;font:inherit;font-size:14px;font-weight:600;background:#fff;color:var(--txt)}
.pcount{margin:14px 0 8px;font-size:14px}.pcount span{color:var(--mut)}
.pchips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.pchips button{display:inline-flex;align-items:center;gap:6px;background:#e7f5f2;border-color:#cdeae4;color:#0f766e}.pchips button i{font-style:normal;font-size:11px}.pchips .pclr{background:none;border-color:transparent;color:var(--org2,#e8553a);text-decoration:underline}
.pmore{text-align:center;margin:20px 0}.pfbg{display:none}
@media(max-width:899px){.ppw{grid-template-columns:1fr}.pfbtn{display:inline-flex}.psort span{display:none}.psrch{flex-basis:100%}
 .pfil{position:fixed;top:auto;left:0;right:0;bottom:0;z-index:95;max-height:88vh;border-radius:20px 20px 0 0;transform:translateY(105%);transition:transform .28s var(--ease,ease);padding:0 18px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column}
 .pfil .pfh{position:sticky;top:0;background:#fff;z-index:1;padding:14px 0}.pfx{display:grid;place-items:center}
 .pff{display:flex;gap:10px;position:sticky;bottom:0;background:#fff;padding:12px 0 4px;border-top:1px solid var(--line);margin-top:auto}.pff .btn{flex:1;justify-content:center}
 .pfil{visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s}body.pf-open .pfil{transform:none;visibility:visible;transition:transform .28s ease}body.pf-open .pfbg{display:block;position:fixed;inset:0;background:rgba(10,20,20,.45);z-index:94}
 .pfl{max-height:none}.pfo{min-height:44px}}
/* location confirm */
#locm .lst{margin-top:12px;font-size:13.5px;line-height:1.45;color:#334155}#locm .lst.ok{background:#effaf7;border:1px solid #cdeae4;border-radius:12px;padding:10px 12px}#locm .lst.ok span{color:#64748b}
#locm .lst.bad{background:#fff4f2;border:1px solid #ffd6cc;border-radius:12px;padding:10px 12px;color:#9a3412}#locm .lst em{font-style:normal;color:#b45309}
#locm .spin{display:inline-block;width:14px;height:14px;border:2px solid #cbd5e1;border-top-color:#0f766e;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:p25s .8s linear infinite}@keyframes p25s{to{transform:rotate(360deg)}}
/* checkout postcode */
.copc{margin-top:12px}.copc label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}.copc-r{display:flex;gap:8px}.copc-r input{flex:1;min-width:0;height:46px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;text-transform:uppercase}.copc-e{color:#e11d48;font-size:13px;margin-top:6px}
`;
const st=document.createElement('style');st.id='p25css';st.textContent=css;document.head.appendChild(st);
})();
