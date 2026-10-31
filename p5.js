// ShopNip (a NuvonHub product) · Phase 5: premium storefront — hero carousel, ticker, deals, promotions/ads, trust, newsletter, mega-menu.
(()=>{const {M,MOCK,Q,toast,A}=P2;
Object.assign(I,{lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',heart:'<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>',
 gift:'<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8S10.5 3 8 3.5 7 8 12 8zm0 0s1.5-5 4-4.5S17 8 12 8z"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',fire:'<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 3 0-2-1-4-2-6-2 3-4 6-4 10 0 5 3 9 7 9z"/>',spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'});
const P={list:[],loaded:false};
const now=()=>Date.now(),liveP=p=>p.active&&(!p.start_at||Date.parse(p.start_at)<=now())&&(!p.end_at||Date.parse(p.end_at)>now());
const CAT=()=>P4.cat();
const cpick=(w,n=3,off=0)=>{const c=CAT().filter(p=>p.images?.length&&w.some(k=>p.name.toLowerCase().includes(k)));const o=[],f=new Set();for(let i=off;i<c.length&&o.length<n;i+=3){const k=c[i].name.slice(0,14);if(f.has(k))continue;f.add(k);o.push(c[i])}return o};
const preview=()=>!!S.products[0]?.demo;
// ---------- data ----------
const PD=MOCK||!sb?{async list(){return (M.promos||[]).filter(liveP)},
  async sub(r){const l=JSON.parse(localStorage.nb_subs||'[]');if(l.includes(r.email))return 'dup';l.push(r.email);localStorage.nb_subs=JSON.stringify(l)}}
 :{async list(){const {data,error}=await sb.from('promotions').select('*').eq('active',true).order('priority',{ascending:false}).limit(60);if(error)throw error;return data.filter(liveP)},
  async sub(r){const {error}=await sb.from('subscribers').insert(r);if(error){if(error.code==='23505')return 'dup';throw error}}};
const of=t=>P.list.filter(p=>p.type===t).sort((a,b)=>(b.priority||0)-(a.priority||0));

// ---------- house promos ----------
const HOUSE=[
 {k:'Shop local',title:'Your local shops, delivered in hours',subtitle:'Click & collect or same-day delivery from independents on your doorstep.',cta:'Start shopping',link:'#search',theme:'teal',kw:['pen','notebook','glue','tape']},
 {k:'Back to school',title:'Back to school, sorted',subtitle:'Pens, pads, pencil cases and more from shops down the road.',cta:'Shop school',link:'sec:1',theme:'night',kw:['pencil','ruler','notebook','sharpener']},
 {k:'Party season',title:'Party season starts here',subtitle:'Balloons, banners and gift bags, ready to collect today.',cta:'Shop party',link:'sec:3',theme:'coral',kw:['balloon','banner','gift bag','party']},
 {k:'Christmas',title:'Christmas, the local way',subtitle:'Wrap, cards and stocking fillers from independents near you.',cta:'Explore gifts',link:'q:gift wrap',theme:'gold',kw:['gift wrap','christmas','gift bag','ribbon']},
 {k:'For shop owners',title:'Sell on ShopNip. Free during the pilot',subtitle:'Your shop online in minutes. We list the products, you set the prices.',cta:'Register your shop',link:'#sell',theme:'lime',kw:['envelope','mailing','tape','box']}];
const banners=()=>{const b=of('banner').filter(x=>(x.placement||'hero')==='hero').map(x=>({...x,k:x.shop_id?'Promoted':'ShopNip'}));return [...b,...HOUSE].slice(0,6)};
// ---------- link handling ----------
function go(l){if(!l)return;l=String(l).trim();
  if(/^https?:\/\//.test(l))return void open(l,'_blank','noopener');
  if(l.startsWith('sec:'))return route('sec',+l.slice(4));if(l.startsWith('cat:'))return route('cat',+l.slice(4));
  if(l.startsWith('q:')){$('#q').value=l.slice(2);return route('search')}
  if(l.startsWith('max:')){Object.assign(P4.F,{max:l.slice(4),sort:'price'});$('#q').value='';return route('search')}
  if(l.startsWith('sku:')){const p=S.products.find(x=>x.sku===l.slice(4));if(p)return p.offers?P4.gsheet(p):P4.ssheet({...p,demo:true})}
  if(l==='#search')return route('search');if(l.startsWith('#shop=')){location.hash=l.slice(1);return route('shop',l.slice(6))}
  if(l==='#register')return P2.register();if(l.startsWith('#'))return void(location.hash=l)}
addEventListener('click',e=>{const t=e.target.closest('[data-plink]');if(!t)return;e.preventDefault();e.stopPropagation();go(t.dataset.plink)},true);

// ---------- cards ----------
const pct=(p,c)=>Math.round((1-p/c)*100);
const _card=P4.card;P4.card=p=>{let h=_card(p);if(p.cmp&&p.cmp>p.price){h=h.replace('<div class="pim">',`<div class="pim"><span class="disc">-${pct(p.price,p.cmp)}%</span>`).replace(/(<span class="pr">.*?)<\/span>/,`$1 <s>${gbp(p.cmp)}</s></span>`)}return h};
function dcard(p,demo){const d=pct(p.price,p.cmp),s=!demo&&S.shops.find(x=>x.id===p.shop_id);
  return `<div class="pc deal" data-psku="${esc(p.sku)}" data-lid="${esc(demo?'':p.listing_id||'')}"><div class="pim"><span class="disc">-${d}%</span>${demo?'':''}<img loading="lazy" src="${esc(p.images[0])}" alt="${esc(p.name)}" data-fb></div>
  <div class="pb"><div class="pn">${esc(p.name)}</div><div class="pmeta">${demo?'':s?esc(s.name):''}</div>
  <div class="dpr"><b>${gbp(p.price)}</b><s>${gbp(p.cmp)}</s></div><div class="dbar"><i style="width:${30+(p.sku.length*13)%60}%"></i></div>
  <div class="pf">${demo?`<button class="ntf" data-ntf="${esc(p.sku)}">Notify me</button>`:`<span class="save">Save ${gbp(p.cmp-p.price)}</span><button class="add" data-sku="${esc(p.sku)}" data-lid="${esc(p.listing_id||'')}" aria-label="Add">${svg('plus')}</button>`}</div></div></div>`}
const sponsoredCard=(p,promo)=>P4.card(p).replace('<div class="pb">','<div class="pb"><span class="spons">Sponsored</span>').replace('class="pc','class="pc sp');
// ---------- sections ----------
const head=(t,extra='',more='')=>`<div class="sh5"><h2>${t}</h2>${extra}${more}</div>`;
function hero(){const B=banners();return `<section class="h5" id="h5" aria-roledescription="carousel"><div class="h5s">${B.map((b,i)=>{const im=b.image?'':(b.sku?[S.products.find(p=>p.sku===b.sku)].filter(Boolean):cpick(b.kw||['pen'],3,i)).map((p,j)=>`<span class="cut c${j}"><img src="${esc(p.images[0])}" alt=""></span>`).join('');
  return `<div class="h5i th-${esc(b.theme||'teal')} ${i?'':'on'}" ${b.image?`style="--bg:url('${esc(b.image)}')"`:''} data-i="${i}">${b.image?'<div class="h5bg"></div>':''}<div class="h5o"></div>
   <div class="h5t"><span class="h5k">${esc(b.k||'ShopNip')}</span><h1>${esc(b.title)}</h1>${b.subtitle?`<p>${esc(b.subtitle)}</p>`:''}<button class="h5c" data-plink="${esc(b.link||'#search')}">${esc(b.cta||'Shop now')}${svg('arrow')}</button></div>
   <div class="h5p">${im}<i class="orb o1"></i><i class="orb o2"></i></div></div>`}).join('')}</div>
  <button type="button" class="h5a h5prev" data-h5go="-1" aria-label="Previous slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" class="h5a h5next" data-h5go="1" aria-label="Next slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
  <div class="h5d">${B.map((_,i)=>`<button data-h5="${i}" class="${i?'':'on'}" aria-label="Slide ${i+1}"><i></i></button>`).join('')}</div></section>`}
const trust=()=>`<div class="trust">${[['lock','Secure ordering','Sign-in & verified shops'],['store','Local shops','Independents near you'],['clock','Quick collection','Often ready same day'],['chat','Friendly support','Real people, UK based']].map(([i,t,s])=>`<div>${svg(i)}<span><b>${t}</b><small>${s}</small></span></div>`).join('')}</div>`;
function deals(){let L=S.products.filter(p=>p.cmp>p.price&&!p.demo),demo=false;
  if(!L.length)return '';L=L.sort((a,b)=>pct(b.price,b.cmp)-pct(a.price,a.cmp)).slice(0,12);
  return `<section class="sec5 deals">${head(`${svg('fire')}Deals of the day`,`<span class="cd" id="cd" aria-label="Time left today"><small>Ends in</small><b data-h>00</b>:<b data-m>00</b>:<b data-s>00</b></span>`)}
   <div class="row prods">${L.map(p=>dcard(p,demo)).join('')}</div></section>`}
function tiles(){const u5=CAT().filter(p=>p.images?.length&&p.trade_price*1.6<5),bn=cpick(['pack of','multipack','assorted'],2,2),pr=cpick(['balloon','party'],2,5),xm=cpick(['gift wrap','ribbon'],2,1);
  const T=[...of('deal').map(d=>({title:d.title,sub:d.subtitle,link:d.link,img:d.image?[d.image]:[],c:'t-teal',tag:'Deal'})),
   {title:'Under £5',sub:'Pocket-money picks',link:'max:5',img:u5.slice(3,5).map(p=>p.images[0]),c:'t-coral',tag:'Budget'},
   {title:'Bundle & save',sub:'Multipacks & value packs',link:'q:pack',img:bn.map(p=>p.images[0]),c:'t-teal',tag:'Value'},
   {title:'Party under £10',sub:'Balloons, banners, bags',link:'max:10',img:pr.map(p=>p.images[0]),c:'t-lime',tag:'Party'},
   {title:'Free click & collect',sub:'Order now, pick up today',link:'#how',img:xm.map(p=>p.images[0]),c:'t-gold',tag:'Free'}].slice(0,4);
  return `<section class="tiles">${T.map(t=>`<button class="tile ${t.c}" data-plink="${esc(t.link||'#search')}"><span class="tt"><em>${esc(t.tag)}</em><b>${esc(t.title)}</b><small>${esc(t.sub||'')}</small><u>Shop now ${svg('arrow')}</u></span><span class="ti">${t.img.map(i=>`<img src="${esc(i)}" alt="">`).join('')}</span></button>`).join('')}</section>`}
function featured(){const f=of('featured_shop').map(p=>({p,s:S.shops.find(s=>s.id===p.shop_id)})).filter(x=>x.s)[0];
  let s,p,lab='Featured shop';if(f){s=f.s;p=f.p}else{const near=S.shops.filter(x=>!x.demo).map(x=>({...x,d:S.me&&x.lat!=null?miles(S.me,x):null})).sort((a,b)=>(a.d??1e9)-(b.d??1e9))[0];if(near){s=near;lab='Shop spotlight';p={title:'Meet '+near.name,subtitle:'An independent shop near you, now on ShopNip.'}}}
  if(!s)return `<section class="feat house"><div class="fx"><span class="flb">${svg('store')}Featured shop</span><h3>Your shop could be here</h3><p>Get in front of shoppers on your street. Listing and spotlights are free during the pilot.</p><button class="btn" data-plink="#sell">Sell on ShopNip ${svg('arrow')}</button></div><div class="fi">${cpick(['gift bag','notebook','balloon'],3,4).map(x=>`<img src="${esc(x.images[0])}" alt="">`).join('')}</div></section>`;
  const items=S.products.filter(x=>x.offers?.some(o=>o.shop_id===s.id)).slice(0,4),d=S.me&&s.lat!=null?miles(S.me,s):null;
  return `<section class="feat" ${p.image||s.cover_url?`style="--bg:url('${esc(p.image||s.cover_url)}')"`:''}><div class="fx"><span class="flb">${svg('star')}${lab}</span><div class="fs"><span class="fa">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span><div><h3>${esc(p.title||s.name)}</h3><small>${esc(s.name)}${d!=null?' · '+d.toFixed(1)+' mi':''}${s.delivery_options?.delivery?' · Delivers':''}</small></div></div>
   ${p.subtitle?`<p>${esc(p.subtitle)}</p>`:''}<button class="btn" data-shop="${esc(s.id)}">Visit shop ${svg('arrow')}</button></div><div class="fi">${(items.length?items:cpick(['pen','gift'],3)).slice(0,3).map(x=>`<img src="${esc(x.images[0])}" alt="">`).join('')}</div></section>`}
function sponsored(){const sp=of('sponsored').map(x=>({x,p:S.products.find(p=>p.sku===x.sku&&p.offers)})).filter(z=>z.p);
  const house=`<div class="pc adtile" data-plink="#sell"><span class="spons">Ad · ShopNip</span><div class="adin">${svg('spark')}<b>Promote your products here</b><small>Sponsored placements are free for pilot shops.</small><u>Find out more ${svg('arrow')}</u></div></div>`;
  if(!sp.length)return house;return sp.map(z=>sponsoredCard(z.p,z.x)).join('')}
function mid(){const m=of('banner').find(x=>x.placement==='mid');
  if(m)return `<section class="mid th-${esc(m.theme||'night')}" ${m.image?`style="--bg:url('${esc(m.image)}')"`:''}><div class="h5o"></div><div class="midt"><span class="h5k">${m.shop_id?'Promoted':'ShopNip'}</span><h2>${esc(m.title)}</h2>${m.subtitle?`<p>${esc(m.subtitle)}</p>`:''}<button class="h5c" data-plink="${esc(m.link||'#search')}">${esc(m.cta||'Find out more')}${svg('arrow')}</button></div>${m.image?'':`<div class="midart">${(m.sku?[S.products.find(p=>p.sku===m.sku)].filter(Boolean):cpick(m.title.toLowerCase().split(/\W+/).filter(w=>w.length>3).concat(['party','balloon']),5,1)).map((p,i)=>`<span class="cut c${i}"><img src="${esc(p.images[0])}" alt=""></span>`).join('')}</div>`}</section>`;
  return `<section class="mid th-night"><div class="midt"><span class="h5k">ShopNip, a NuvonHub product</span><h2>The high street, in your pocket.</h2><p>Every order goes straight to an independent shop near you. No warehouses, no middlemen.</p><button class="h5c" data-plink="#about">Our story${svg('arrow')}</button></div><div class="midart">${cpick(['balloon','pen','gift bag','notebook','glitter'],5,6).map((p,i)=>`<span class="cut c${i}"><img src="${esc(p.images[0])}" alt=""></span>`).join('')}</div></section>`}
const why=()=>`<section class="sec5 why">${head('Why ShopNip')}<div class="whyg">${[['heart','Keep your high street alive','Every penny goes to a local independent, not a warehouse.'],['bolt','Ready when you are','Collect on your way home or get it delivered locally, often the same day.'],['tag','Fair local prices','Shops set their own prices, with deals and multipacks every day.'],['lock','Pay at the shop','No card details online. Pay on collection or on delivery.']].map(([i,t,s],k)=>`<div class="wy w${k}"><span>${svg(i)}</span><b>${t}</b><p>${s}</p></div>`).join('')}</div></section>`;
const news=()=>`<section class="news"><div class="nwt"><span class="h5k">${svg('mail')}Newsletter</span><h2>Get deals near you</h2><p>The best offers from shops on your street, once a week. No spam, unsubscribe any time.</p></div>
  <form class="nwf" id="nwf"><div class="nwi"><input type="email" id="nw_e" required placeholder="you@example.com" aria-label="Email address" autocomplete="email"><input id="nw_p" placeholder="Postcode" aria-label="Postcode (optional)" value="${esc(S.pc||'')}" maxlength="8"></div>
  <button class="btn" type="submit">Get deals ${svg('arrow')}</button><small>By subscribing you agree to receive emails from ShopNip. See our <a href="#privacy">Privacy Policy</a>.</small><div class="nwok" id="nwok"></div></form></section>`;
function rowSec(t,f,s,i,extra=''){const items=pick(f,12,s);if(!items.length)return '';return `<section class="sec5">${head(t,'',`<a href="#" data-sec="${i}" class="more">See all ${svg('arrow')}</a>`)}<div class="row prods">${extra}${items.map(pcard).join('')}</div></section>`}
const CROWS=[['Top-selling stationery',['pen','pencil','notebook','highlighter','marker','stapler'],'stationery'],['Birthday candles',['candle'],'candle'],['Balloons & party',['balloon','party','banner','confetti'],'balloon'],['Parcel bags & boxes',['parcel','mailing','postal','padded','box'],'parcel']];
function crow(t,f,q,k){const items=pick(f,12,k*3+1);if(!items.length)return '';return `<section class="sec5 crow">${head(t,'',`<a href="#" data-plink="q:${esc(q)}" class="more">See all ${svg('arrow')}</a>`)}<div class="row prods">${items.map(pcard).join('')}</div></section>`}
const CEMO={'Stationery':'✏️','Party':'🎈','Art & craft':'🎨','Gift wrap':'🎁','Cards':'💌','Packaging':'📦','Tapes':'🧻','Tapes & glue':'🧴','Household':'🏠','Toys':'🧸','Toys & games':'🧸','Office':'📎','School':'🎒','Seasonal':'🎄'};
function home5(){const cats=CATS.map(([l,t],i)=>{const p=pick(t,1,i*5+3)[0]||CAT().find(t);return `<button class="cat" data-cat="${i}"><span class="ci" data-emo="${CEMO[l]||'🛍️'}">${p?`<img src="${esc(p.images[0])}" alt="" onerror="this.remove()">`:''}</span>${l}</button>`}).join('');
  return `${hero()}
  ${shopsSection().replace('class="sec"','class="sec sec5"')}
  ${CROWS.map(([t,w,q],k)=>crow(t,p=>kw(...w)(p)&&(k!==2||!/candle/i.test(p.name)),q,k)).join('')}
  <!--tgrid-->
  ${trust()}
  <section class="sec5">${head('Shop by category')}<div class="cats">${cats}</div></section>
  ${deals()}${tiles()}
  ${rowSec('Best sellers',SECTIONS[0][1],SECTIONS[0][2],0)}
  ${featured()}
  ${rowSec('Back to school',SECTIONS[1][1],SECTIONS[1][2],1,sponsored())}
  ${mid()}
  ${rowSec('Art & craft picks',SECTIONS[2][1],SECTIONS[2][2],2)}${rowSec('Party time',SECTIONS[3][1],SECTIONS[3][2],3)}
  ${why()}${news()}
  <section class="sell"><div><h3>Shop owner? Sell on ShopNip</h3><p>Get a free online shop for your store. Your products are listed for you with photos and descriptions. Just set your prices.</p></div>
   <div style="display:grid;gap:16px"><ul><li>${svg('check')}Listings filled from your orders</li><li>${svg('check')}Click & collect and local delivery</li><li>${svg('check')}Free during the pilot</li></ul><button class="btn" id="register3">Register your shop</button></div></section>
  ${foot()}`}
V.home=home5;

// ---------- motion: carousel, countdown, transitions ----------
let hi=0,ht=null;
function show(i){const s=[...document.querySelectorAll('.h5i')],d=[...document.querySelectorAll('.h5d button')];if(!s.length)return;hi=(i+s.length)%s.length;
  s.forEach((e,k)=>{e.classList.toggle('on',k===hi);e.classList.toggle('prev',k===(hi-1+s.length)%s.length)});d.forEach((e,k)=>{e.classList.remove('on');e.classList.toggle('done',k<hi)});void d[hi]?.offsetWidth;d[hi]?.classList.add('on');
  clearTimeout(ht);ht=setTimeout(()=>{if(document.body.contains(s[0])&&!$('#h5').matches(':hover'))show(hi+1);else if(document.body.contains(s[0]))show(hi)},6000)}
function wire(){const h=$('#h5');if(!h)return;hi=0;show(0);let x0=null;
  h.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});h.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)show(hi+(dx<0?1:-1));x0=null});
  tick()}
addEventListener('click',e=>{const b=e.target.closest('[data-h5]');if(b){e.preventDefault();e.stopPropagation();show(+b.dataset.h5)}const a=e.target.closest('[data-h5go]');if(a){e.preventDefault();e.stopPropagation();show(hi+(+a.dataset.h5go))}},true);
function tick(){const c=$('#cd');if(!c)return;const n=new Date(),m=new Date(n);m.setHours(24,0,0,0);let s=Math.max(0,Math.floor((m-n)/1000));const p=v=>String(v).padStart(2,'0');
  c.querySelector('[data-h]').textContent=p(Math.floor(s/3600));c.querySelector('[data-m]').textContent=p(Math.floor(s%3600/60));c.querySelector('[data-s]').textContent=p(s%60)}
setInterval(tick,1000);
const _route=route,_render=render;
route=function(...a){_route(...a);const v=$('#view');v.classList.remove('vin');void v.offsetWidth;v.classList.add('vin');if(cur[0]==='home')wire()};
render=function(){_render();if(cur[0]==='home')wire()};

// ---------- newsletter ----------
document.addEventListener('submit',async e=>{if(e.target.id!=='nwf')return;e.preventDefault();e.stopImmediatePropagation();const em=$('#nw_e').value.trim().toLowerCase(),pc=$('#nw_p').value.trim().toUpperCase()||null,ok=$('#nwok'),b=e.target.querySelector('button');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ok.textContent='Please enter a valid email address.';ok.className='nwok err';return}
  b.disabled=true;try{const r=await PD.sub({email:em,postcode:pc,source:'home',consent:true});ok.textContent=r==='dup'?"You're already on the list. Thanks!":"You're in! Look out for deals near you.";ok.className='nwok on';e.target.classList.add('done')}
  catch(err){ok.textContent='Sorry, that didn’t work. Please try again later.';ok.className='nwok err';console.warn(err)}b.disabled=false},true);

// ---------- ticker + glassy header + mega menu ----------
function chrome(){const top=$('.top');if(!top||$('.ticker'))return;
  const items=[['bag','Free click & collect'],['bolt','Local delivery from shops that deliver'],['lock','Pay at the shop']];/* p25: shorter ticker */
  const one=items.map(([i,t,l])=>`<span ${l?`data-plink="${l}" class="tk-l"`:''}>${svg(i)}${t}</span>`).join('<i>•</i>');
  top.insertAdjacentHTML('afterbegin',`<div class="ticker" role="marquee" aria-label="Announcements"><div class="tk">${one}<i>•</i>${one}<i>•</i></div></div>`);
  const mm=CATS.map(([l,t],i)=>{const ps=CAT().filter(p=>p.images?.length&&t(p));const thumbs=[0,7,15,23].map(k=>ps[k]).filter(Boolean);
    return `<div class="mi"><button data-cat="${i}">${l}</button><div class="mp"><div class="mpl"><b>${l}</b><a href="#" data-cat="${i}">Shop all ${l.toLowerCase()} ${svg('arrow')}</a><a href="#" data-plink="max:5">Under £5</a><a href="#" data-plink="q:pack">Bundle & save</a></div>
     <div class="mpg">${thumbs.map(p=>`<a href="#" data-cat="${i}"><img src="${esc(p.images[0])}" alt=""><span>${esc(p.name.split(/[,–-]/)[0].slice(0,34))}</span></a>`).join('')}</div></div></div>`}).join('');
  top.insertAdjacentHTML('beforeend',`<nav class="mega desk" aria-label="Categories"><div class="wrap mgi">${mm}<span class="mgs"></span><a href="#" class="mgd" data-plink="#search">${svg('fire')}Deals</a></div></nav>`)}

async function refreshPromos(){try{P.list=await PD.list()}catch(e){P.list=[]}}
window.P5={promos:()=>P.list,go:l=>go(l),async init(){
  if(MOCK&&Q.get('rich')&&M.shops[0]){const c=CAT().filter(p=>p.images?.length);const sh=M.shops.filter(s=>s.status==='approved');let n=0;
    for(let i=0;i<c.length&&n<160;i+=Math.max(1,Math.floor(c.length/160))){const p=c[i],tp=+p.trade_price||1;sh.forEach((s,k)=>{if(k&&i%3)return;const rp=+(tp*(1.5+k*0.12)).toFixed(2);
      M.listings.push({id:'r'+i+'_'+k,shop_id:s.id,sku:p.sku,name:p.name,image:p.images[0],category:p.category,trade_price:tp,retail_price:rp,compare_at_price:i%13===0?+(rp*1.28).toFixed(2):null,stock:(i*7+k)%9?12:0,active:true,updated_at:'2026-10-'+(10+i%14)})});n++}
    P4.regroup()}
  if(MOCK&&Q.get('promos')){const g=S.products.filter(p=>p.offers);M.promos=[
    {id:'pm1',type:'banner',placement:'hero',title:'Half-term craft week',subtitle:'Glitter, paints and kits from shops near you. Up to 30% off.',cta:'Shop craft',link:'sec:2',theme:'coral',priority:10,active:true,start_at:'2026-10-20T00:00:00Z',end_at:'2026-11-02T00:00:00Z',kw:['glitter','paint','craft']},
    {id:'pm2',type:'featured_shop',title:'Leicester’s favourite card shop',subtitle:'Hand-picked cards, wrap and gifts, ready to collect in 20 minutes.',shop_id:'s3',theme:'teal',priority:5,active:true,start_at:'2026-10-01T00:00:00Z'},
    {id:'pm3',type:'sponsored',title:'Sponsored pencils',sku:g[1]?.sku,shop_id:'s1',priority:3,active:true,start_at:'2026-10-01T00:00:00Z'},
    {id:'pm4',type:'sponsored',title:'Sponsored',sku:g[5]?.sku,shop_id:'s3',priority:2,active:true,start_at:'2026-10-01T00:00:00Z'},
    {id:'pm5',type:'banner',placement:'mid',title:'Bonfire night essentials',subtitle:'Sparkler-safe gloves, glow sticks and party packs. Collect today.',cta:'Shop now',link:'q:party',theme:'night',priority:4,active:true,start_at:'2026-10-20T00:00:00Z',end_at:'2026-11-06T00:00:00Z'},
    {id:'pm6',type:'deal',title:'3 for 2 on cards',subtitle:'Mix & match',link:'q:card',theme:'teal',priority:1,active:false,start_at:'2026-10-01T00:00:00Z'}]}
  if(sb&&!MOCK&&S.L?.length){try{const {data,error}=await sb.from('shop_listings').select('id,compare_at_price').in('id',S.L.map(x=>x.id)).not('compare_at_price','is',null);
    if(!error&&data.length){const m=Object.fromEntries(data.map(x=>[x.id,x.compare_at_price]));S.L.forEach(x=>{if(m[x.id]!=null)x.compare_at_price=m[x.id]});P4.regroup()}}catch(e){}}
  await refreshPromos();chrome();
}};
})();
