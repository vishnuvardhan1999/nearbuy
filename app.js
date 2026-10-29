// ShopNip (a NuvonHub product) – homepage v2. Supabase when config.js is filled in; catalogue falls back to products.json.
// Shops are ONLY real registered shops (shops.active=true). Sample shops appear only with ?demo=1.
const CFG=window.APP_CONFIG||{};
const LIVE=!!(CFG.SUPABASE_URL&&/^https:\/\//.test(CFG.SUPABASE_URL)&&CFG.SUPABASE_KEY&&!/YOUR_/.test(CFG.SUPABASE_KEY));
const DEMO=new URLSearchParams(location.search).get('demo')==='1';
const sb=LIVE&&window.supabase?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY):null;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp=n=>'£'+Number(n).toFixed(2);
const I={home:'<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 basket:'<path d="M5 8h14l-1.5 11h-11z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',orders:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
 account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 5 5 9-10"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',bag:'<path d="M6 7h12l1 14H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
 bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',tag:'<path d="M20 12 12 20l-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',store:'<path d="M3 9 5 4h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6"/>',
 pin:'<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>'};
const svg=n=>`<svg viewBox="0 0 24 24">${I[n]}</svg>`;
const S={products:[],shops:[],basket:JSON.parse(localStorage.nb_basket||'[]'),pc:localStorage.nb_pc||'',me:JSON.parse(localStorage.nb_me||'null'),radius:+(localStorage.nb_r||5)};
const DEMO_SHOPS=[{id:'d1',name:'Corner News & Stationers',postcode:'Sample',lat:0,lng:0,demoMi:0.3,rating:4.8,mins:'25–35',open:true,delivery_options:{collect:true,delivery:true},cat:'Stationery'},
 {id:'d2',name:'High Street Cards & Gifts',postcode:'Sample',demoMi:0.8,rating:4.6,mins:'30–45',open:true,delivery_options:{collect:true,delivery:false},cat:'Party'},
 {id:'d3',name:'Village Post Office Store',postcode:'Sample',demoMi:1.4,rating:4.7,mins:'40–55',open:false,delivery_options:{collect:true,delivery:true},cat:'Craft'}];

const saveB=()=>{localStorage.nb_basket=JSON.stringify(S.basket);const n=S.basket.reduce((a,b)=>a+b.qty,0);document.querySelectorAll('[data-bc]').forEach(e=>{e.textContent=n;e.classList.toggle('hidden',!n)})};
const miles=(a,b)=>{const R=3958.8,r=x=>x*Math.PI/180,dLa=r(b.lat-a.lat),dLo=r(b.lng-a.lng),h=Math.sin(dLa/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
async function lookupPostcode(pc){const r=await fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(pc.replace(/\s+/g,'')));const j=await r.json();if(j.status!==200)throw new Error('Postcode not found');return{lat:j.result.latitude,lng:j.result.longitude,pc:j.result.postcode}}
async function reversePc(lat,lng){try{const j=await (await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1`)).json();return j.result?.[0]?.postcode||'Current location'}catch{return 'Current location'}}
function setMe(me,pc){S.me=me;S.pc=pc;localStorage.nb_me=JSON.stringify(me);localStorage.nb_pc=pc;$('#pc').textContent=pc;if(window.P4)P4.regroup();render()}

async function load(){
  if(S.pc)$('#pc').textContent=S.pc;
  $('#tabs').innerHTML=['home','search','basket','orders','account'].map(t=>`<button data-t="${t}" class="${t==='home'?'on':''}">${svg(t)}${t[0].toUpperCase()+t.slice(1)}${t==='basket'?'<b class="badge hidden" data-bc>0</b>':''}</button>`).join('');
  if(sb){try{
    const [l,s]=await Promise.all([
      sb.from('shop_listings').select('id,retail_price,shop_id,sku,name,image,category,trade_price,stock,updated_at').eq('active',true).gt('retail_price',0).limit(2000),
      sb.from('shops').select('id,name,postcode,lat,lng,delivery_options,logo_url,cover_url,opening_hours').eq('active',true).eq('status','approved').limit(500)]);
    if(s.error)throw s.error; S.shops=s.data||[];
    if(!l.error){const ok=new Set(S.shops.map(s=>s.id)),best={};S.L=l.data.filter(x=>ok.has(x.shop_id));S.L.filter(x=>x.image).forEach(x=>{if(!best[x.sku]||x.retail_price<best[x.sku].price)best[x.sku]={listing_id:x.id,stock:x.stock,sku:x.sku,name:x.name,images:[x.image],category:x.category||'',price:+x.retail_price,shop_id:x.shop_id,listing:true}});S.products=Object.values(best);S.live=S.products.length>0}
  }catch(e){console.warn('Supabase unavailable',e)}}
  if(DEMO&&!S.shops.length)S.shops=DEMO_SHOPS.map(s=>({...s,demo:true}));
  if(!S.products.length){S.products=(await (await fetch('products.json')).json()).map(p=>({...p,price:+(p.trade_price*1.6).toFixed(2),demo:true}))}
  saveB();if(window.P2)await P2.init();if(window.P3)await P3.init();if(window.P4)await P4.init();if(window.P5)await P5.init();const m=location.hash.match(/^#shop=(.+)/);m?route('shop',m[1]):route(window.P2_START||'home');
}
// ---------- curation ----------
const has=p=>p.images&&p.images.length;
function pick(test,n=12,seed=1){const pool=S.products.filter(p=>has(p)&&test(p)),out=[],fam=new Set();
  if(!pool.length)return out;const step=Math.max(1,Math.floor(pool.length/(n*2)));
  for(let k=0;k<step&&out.length<n;k++)for(let i=(k*7+seed)%step;i<pool.length&&out.length<n;i+=step){const p=pool[i],f=p.name.toLowerCase().split(/[\s–-]+/).slice(0,2).join(' ');if(fam.has(f)||out.includes(p))continue;fam.add(f);out.push(p)}
  return out}
const kw=(...w)=>p=>{const s=(p.name+' '+p.category).toLowerCase();return w.some(x=>s.includes(x))};
const CATS=[['Stationery',kw('pen ','pens','pencil','notebook')],['Party',kw('balloon','party')],['Art & craft',p=>p.category==='Art & Craft'],['Gift wrap',kw('gift wrap','gift bag','wrapping')],
 ['Packaging',p=>/Packaging|Mailing|Envelopes|postal/i.test(p.category)],['Tapes',p=>/Tapes/.test(p.category)],['Household',p=>p.category==='House Hold'],['Toys',p=>/Toys/.test(p.category)]];
const SECTIONS=[['Best sellers',p=>!/copier paper/i.test(p.name),3],['Back to school',kw('pencil','notebook','ruler','eraser','sharpener','highlighter','glue stick','pencil case','exercise book'),5],
 ['Art & craft picks',p=>p.category==='Art & Craft'||kw('paint','glitter','craft','colouring')(p),2],['Party time',kw('balloon','party','banner','candle','napkin','gift bag'),4]];
// ---------- templates ----------
const pcard=p=>window.P4?P4.card(p):`<div class="pc" data-psku="${esc(p.sku)}" data-lid="${esc(p.listing_id||'')}"><div class="pim"><img loading="lazy" src="${esc(p.images[0])}" alt="${esc(p.name)}" data-fb></div>
<div class="pb"><div class="pn">${esc(p.name)}</div><div class="pf"><span class="pr">${gbp(p.price)}</span><button class="add" data-sku="${esc(p.sku)}" data-lid="${esc(p.listing_id||'')}" aria-label="Add to basket">${svg('plus')}</button></div></div></div>`;
const grads=['linear-gradient(135deg,#134e4a,#14b8a6)','linear-gradient(135deg,#ff6b4a,#f43f5e)','linear-gradient(135deg,#4d7c0f,#84cc16)'];
function scard(s,i){const imgs=s.cover_url?'':pick(()=>true,3,i*11+2).map(p=>`<img src="${esc(p.images[0])}" alt="">`).join('');const d=s.dist!=null?s.dist.toFixed(1)+' mi':'';
 const open=s.open!==false;return `<div class="shop" data-shop="${esc(s.id)}"><div class="cover" style="background:${s.cover_url?`center/cover url('${esc(s.cover_url)}')`:grads[i%3]}"><div class="imgs">${imgs}</div><span class="open ${open?'':'closed'}"><i></i>${open?'Open now':'Closed'}</span></div>
 <div class="sb"><div class="sav">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</div><h4>${esc(s.name)}${s.demo?'<span class="sample">Sample</span>':''}</h4>
 <div class="meta">${s.rating?`<span class="star">${svg('star')}${s.rating}</span><span class="dot"></span>`:'<span class="star">New</span><span class="dot"></span>'}${d?`<span>${d}</span><span class="dot"></span>`:''}<span>${s.mins||'30–60'} min</span></div>
 <div class="tags">${s.delivery_options?.collect!==false?'<span class="tg">Click & collect</span>':''}${s.delivery_options?.delivery?'<span class="tg">Delivery</span>':''}</div></div></div>`}
function shopsSection(){
  let list=S.shops.map(s=>({...s,dist:s.demo?s.demoMi:(S.me&&s.lat!=null&&s.lng!=null?miles(S.me,s):null)}));
  if(S.me)list=list.filter(s=>s.dist!=null&&s.dist<=S.radius).sort((a,b)=>a.dist-b.dist);
  const n=list.length,head=S.me?(n?`${n} shop${n>1?'s':''} near you`:'Shops near you'):(n?`All shops (${n})`:'Shops');
  const filt=S.me?`<div class="dist">${[1,3,5,10].map(r=>`<button data-r="${r}" class="${r===S.radius?'on':''}">${r} mi</button>`).join('')}<button class="geo" id="geo">${svg('target')}Use my location</button></div>`:`<div class="noshops" style="padding:14px"><p style="margin:0 0 10px">Showing all shops. Set your location to see distances and shops near you.</p><button class="btn" id="setpc2">Set your location</button> <button class="btn ghost" id="geo">Use my current location</button></div>`;
  const body=n?`<div class="row">${list.map(scard).join('')}</div>`:`<div class="noshops"><div class="ic">${svg('store')}</div><h4>No ShopNip shops near you yet</h4>
   <p>${S.me?`Nothing within ${S.radius} miles of ${esc(S.pc)}. Try a wider distance.`:'Set your location to find registered shops nearby.'}</p>${S.me?'':'<button class="btn" id="setpc2">Set your location</button>'}</div>`;
  return `<section class="sec"><div class="sh"><h2>${head}${DEMO&&n?'<span class="sample">Sample</span>':''}</h2></div>${filt}${body}</section>`}
function home(){
  const h1=pick(kw('pen','notebook','glue'),3,4),h2=pick(kw('pencil','ruler','notebook'),3,9),h3=pick(kw('balloon','gift bag'),3,2);
  const art=a=>`<div class="art">${a.map(p=>`<img src="${esc(p.images[0])}" alt="">`).join('')}</div>`;
  const cats=CATS.map(([l,t],i)=>{const p=pick(t,1,i*5+3)[0];return `<button class="cat" data-cat="${i}"><span class="ci">${p?`<img src="${esc(p.images[0])}" alt="">`:''}</span>${l}</button>`}).join('');
  const secs=SECTIONS.map(([t,f,s],i)=>`<section class="sec"><div class="sh"><h2>${t}</h2><a href="#" data-sec="${i}">See all</a></div><div class="row prods">${pick(f,12,s).map(pcard).join('')}</div></section>`).join('');
  return `<section class="hero"><div class="slides" id="slides">
   <div class="slide s1"><div class="tag">Shop local</div><h3>Your local shops, delivered in hours</h3><p>Click & collect or same-day delivery from independents near you.</p><button class="cta" data-t="search">Start shopping</button>${art(h1)}</div>
   <div class="slide s2"><div class="tag">New term</div><h3>Back to school essentials</h3><p>Pens, pads and pencil cases.</p><button class="cta" data-sec="1">Shop now</button>${art(h2)}</div>
   <div class="slide s3"><div class="tag">Celebrate</div><h3>Party &amp; gifts</h3><p>Balloons, wrap and cards.</p><button class="cta" data-sec="3">Explore</button>${art(h3)}</div>
  </div><div class="dots" id="dots"><i class="on"></i><i></i><i></i></div></section>
  <div class="chips"><button class="chip" data-t="search">${svg('bag')}Click &amp; collect</button><button class="chip" data-t="search">${svg('bolt')}Same-day delivery</button><button class="chip" data-sec="0">${svg('tag')}Offers</button><button class="chip" id="register2">${svg('store')}Sell on ShopNip</button></div>
  ${shopsSection()}
  
  <section class="sec"><div class="sh"><h2>Shop by category</h2></div><div class="cats">${cats}</div></section>
  ${secs}
  <section class="sell"><div><h3>Shop owner? Sell on ShopNip</h3><p>Get a free online shop for your store. Your products are listed for you with photos and descriptions. Just set your prices.</p></div>
   <div style="display:grid;gap:16px"><ul><li>${svg('check')}Listings filled from your orders</li><li>${svg('check')}Click & collect and local delivery</li><li>${svg('check')}No setup fee</li></ul><button class="btn" id="register3">Register your shop</button></div></section>
  
  ${foot()}`}
function foot(){return `<footer class="foot"><div class="fcols"><div><a class="brand" href="#"><span class="mark dk"></span><span class="word" style="color:var(--navy)">Shop<b>Nip</b></span></a><p>Independent shops, on your doorstep.</p></div>
   <div><h5>Shop</h5><a href="#" data-t="search">All products</a><a href="#" data-sec="0">Best sellers</a><a href="#" data-sec="3">Party</a></div>
   <div><h5>Sellers</h5><a href="#sell">Sell on ShopNip</a><a href="#" id="register4">Register your shop</a><a href="#how">How it works</a></div>
   <div><h5>ShopNip</h5><a href="#about">About</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></div><div><h5>Legal</h5><a href="/terms">Terms of Use</a><a href="/privacy">Privacy Policy</a><a href="/seller-terms">Seller Terms</a><a href="/cookies">Cookie Notice</a></div></div>
   <div class="fb"><span>© ${new Date().getFullYear()} ShopNip</span><span>ShopNip is a product of NuvonHub Private Limited (India)</span></div></footer>`}
function list(title,items){return `<section class="sec"><div class="sh"><h2>${esc(title)}</h2><span class="note" style="margin:0">${items.length} items</span></div>${items.length?`<div class="grid">${items.map(pcard).join('')}</div>`:`<div class="empty">${svg('search')}<br>No matches yet</div>`}</section>`}
const V={home,
 search(q=$('#q').value.trim()){const t=q.toLowerCase();return list(q?`Results for “${q}”`:'All products',S.products.filter(p=>has(p)&&(!t||(p.name+' '+p.category).toLowerCase().includes(t))).slice(0,60))},
 cat(i){return list(CATS[i][0],S.products.filter(p=>has(p)&&CATS[i][1](p)).slice(0,60))},
 sec(i){return list(SECTIONS[i][0],pick(SECTIONS[i][1],48,SECTIONS[i][2]))},
 basket(){if(!S.basket.length)return `<div class="empty">${svg('basket')}<br>Your basket is empty</div>`;const tot=S.basket.reduce((a,b)=>a+b.price*b.qty,0);
  return `<section class="sec"><div class="sh"><h2>Basket</h2></div><div class="panel">${S.basket.map((b,i)=>`<div class="line"><span>${b.qty} × ${esc(b.name)}</span><span>${gbp(b.price*b.qty)} <a href="#" data-rm="${i}">✕</a></span></div>`).join('')}
  <div class="line"><b>Total</b><b>${gbp(tot)}</b></div><button class="btn full" id="checkout">Checkout</button></div></section>`},
 orders(){return `<div class="empty">${svg('orders')}<br>${LIVE?'Sign in to see your orders':'Your orders will appear here'}</div>`},
 account(){return `<section class="sec"><div class="sh"><h2>Account</h2></div><div class="panel"><div class="line"><span>Postcode</span><a href="#" id="setpc2">${esc(S.pc||'Set')}</a></div>
  <button class="btn full" id="register">Register your shop</button></div></section>`}};
let cur=['home'];
function route(t,...a){cur=[t,...a];document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===(V[t]&&['cat','sec'].includes(t)?'search':t)));if(!V[t]){t="home";a=[];cur=[t]}$("#view").innerHTML=V[t](...a);if(t==='home')carousel();scrollTo(0,0)}
function render(){const y=scrollY;$('#view').innerHTML=V[cur[0]](...cur.slice(1));if(cur[0]==='home')carousel();scrollTo(0,y)}
function carousel(){const s=$('#slides'),d=[...document.querySelectorAll('#dots i')];if(!s)return;
 s.addEventListener('scroll',()=>{const i=Math.round(s.scrollLeft/s.clientWidth);d.forEach((e,k)=>e.classList.toggle('on',k===i))},{passive:true});
 clearInterval(window._ct);window._ct=setInterval(()=>{if(!document.body.contains(s)||innerWidth>=768)return;const i=(Math.round(s.scrollLeft/s.clientWidth)+1)%3;s.scrollTo({left:i*s.clientWidth,behavior:'smooth'})},5000)}
async function askPostcode(){const v=prompt('Enter your postcode',S.pc);if(!v)return;try{const r=await lookupPostcode(v.trim());setMe({lat:r.lat,lng:r.lng},r.pc)}catch(e){alert('Sorry, we could not find that postcode.')}}
document.addEventListener('click',e=>{const el=e.target.closest('[data-t],[data-cat],[data-sec],[data-sku],[data-rm],[data-r],[data-shop],#loc,#setpc2,#geo,#checkout,[id^=register]');if(!el)return;e.preventDefault();
 if(el.dataset.t)return route(el.dataset.t);if(el.dataset.cat)return route('cat',+el.dataset.cat);if(el.dataset.sec)return route('sec',+el.dataset.sec);
 if(el.dataset.shop&&!S.shops.find(s=>s.id===el.dataset.shop)?.demo){location.hash='shop='+el.dataset.shop;return route('shop',el.dataset.shop)}
 if(el.dataset.r){S.radius=+el.dataset.r;localStorage.nb_r=S.radius;return render()}
 if(el.dataset.sku){const p=S.products.find(x=>x.sku===el.dataset.sku),b=S.basket.find(x=>x.sku===p.sku);b?b.qty++:S.basket.push({sku:p.sku,name:p.name,price:p.price,shop_id:p.shop_id||null,qty:1});saveB();el.classList.add('done');el.innerHTML=svg('check');return}
 if(el.dataset.rm){S.basket.splice(+el.dataset.rm,1);saveB();return route('basket')}
 if(el.id==='loc'||el.id==='setpc2')return askPostcode();
 if(el.id==='geo'){if(!navigator.geolocation)return askPostcode();/* explicit user tap only */navigator.geolocation.getCurrentPosition(async p=>{const me={lat:p.coords.latitude,lng:p.coords.longitude};setMe(me,await reversePc(me.lat,me.lng))},()=>askPostcode());return}
 if(el.id==='checkout')return alert('Checkout is coming in Phase 2.');
 if(el.id.startsWith('register'))return window.P2?P2.register():(location.href='seller.html');});
$('#sf').addEventListener('submit',e=>{e.preventDefault();$('#q').blur();route('search')});
$('#q').addEventListener('input',()=>{if($('#q').value.length>1)route('search')});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
load();
