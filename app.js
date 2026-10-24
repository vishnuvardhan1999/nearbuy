// Nearbuy Phase 1 – static PWA. Uses Supabase when config.js is filled in, otherwise demo mode with products.json.
const CFG=window.APP_CONFIG||{};
const LIVE=CFG.SUPABASE_URL&&/^https:\/\//.test(CFG.SUPABASE_URL)&&CFG.SUPABASE_KEY&&!/YOUR_/.test(CFG.SUPABASE_KEY);
const sb=LIVE&&window.supabase?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY):null;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp=n=>'£'+Number(n).toFixed(2);
const DEMO_SHOPS=[
 {id:'demo-1',name:'Corner News & Stationers',postcode:'Demo',distance:0.3,delivery_options:{collect:true,delivery:true},demo:true},
 {id:'demo-2',name:'High Street Cards & Gifts',postcode:'Demo',distance:0.8,delivery_options:{collect:true,delivery:false},demo:true},
 {id:'demo-3',name:'Village Post Office Store',postcode:'Demo',distance:1.4,delivery_options:{collect:true,delivery:true},demo:true}];
const ICON={'Stationery & Essentials':'✏️','Stationery':'📎','Party & Event Supplies':'🎉','Art & Craft':'🎨','House Hold':'🧽','Tapes & Adhesives':'🩹','Packaging & Mailing':'📦','Toys':'🧸','Diaries & Calendars':'📅','Hardware & Electronics':'🔋','Notepads':'🗒️','Office Supplies':'🗂️','Greeting Cards':'💌','Candles':'🕯️'};
const S={products:[],shops:[],listings:[],basket:JSON.parse(localStorage.nb_basket||'[]'),pc:localStorage.nb_pc||''};
const saveB=()=>{localStorage.nb_basket=JSON.stringify(S.basket);const n=S.basket.reduce((a,b)=>a+b.qty,0);$('#bc').textContent=n;$('#bc').classList.toggle('hidden',!n)};

async function load(){
  $('#mode').textContent=LIVE?'':'Demo';$('#mode').classList.toggle('hidden',!!LIVE);
  if(S.pc)$('#loc').textContent='📍 Near '+S.pc;
  if(sb){try{
    const [l,s]=await Promise.all([
      sb.from('shop_listings').select('id,retail_price,stock,shop_id,sku,products(sku,name,images,category,description)').eq('active',true).limit(500),
      sb.from('shops').select('id,name,postcode,lat,lng,delivery_options').limit(50)]);
    if(l.error||s.error)throw l.error||s.error;
    S.shops=s.data;S.listings=l.data;
    const seen=new Set();S.products=l.data.filter(x=>x.products&&!seen.has(x.sku)&&seen.add(x.sku)).map(x=>({...x.products,price:x.retail_price,shop_id:x.shop_id}));
  }catch(e){console.warn('Supabase failed, falling back',e)}}
  if(!S.products.length){const r=await fetch('products.json');S.products=(await r.json()).map(p=>({...p,price:+(p.trade_price*1.6).toFixed(2),demo:true}));}
  if(!S.shops.length)S.shops=DEMO_SHOPS;
  saveB();route('home');
}
const card=p=>`<div class="card"><img loading="lazy" src="${esc(p.images?.[0]||'icon-192.png')}" alt="" onerror="this.src='icon-192.png'">
<div class="b"><div class="n">${esc(p.name)}</div><div class="p">${gbp(p.price)} ${p.demo?'<small>demo price</small>':''}</div>
<button class="add" data-sku="${esc(p.sku)}">Add</button></div></div>`;
const shopCard=s=>`<div class="shop"><div class="av">${esc(s.name[0])}</div><b>${esc(s.name)}</b>
<div class="m">${s.distance!=null?s.distance+' mi · ':''}${esc(s.postcode||'')}</div><div style="clear:both"></div>
${s.demo?'<span class="chip demo">Sample shop</span>':''}${s.delivery_options?.collect!==false?'<span class="chip">Click &amp; collect</span>':''}${s.delivery_options?.delivery?'<span class="chip">Delivery</span>':''}</div>`;
function cats(){const c={};S.products.forEach(p=>c[p.category]=(c[p.category]||0)+1);
  return Object.entries(c).filter(([k])=>!/image|^Other$|SIL-|^\*/i.test(k)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>k)}
function popular(){const seen={};return S.products.filter(p=>p.images?.length&&(seen[p.category]=(seen[p.category]||0)+1)<=2).slice(0,10)}
const V={
 home(){return `<h2>Shops near you <small>${S.shops[0]?.demo?'Sample data':'See all'}</small></h2><div class="hs">${S.shops.map(shopCard).join('')}</div>
 <h2>Categories</h2><div class="cats">${cats().map(c=>`<div class="cat" data-cat="${esc(c)}"><i>${ICON[c]||'🛍️'}</i>${esc(c.replace(' Supplies',''))}</div>`).join('')}</div>
 <h2>Popular products</h2><div class="grid">${popular().map(card).join('')}</div>
 ${S.products[0]?.demo?'<p class="note">Demo mode: catalogue from products.json, prices are illustrative. Connect Supabase in config.js for real shops and prices.</p>':''}`},
 search(q=$('#q').value.trim(),cat){const t=q.toLowerCase();
  const r=S.products.filter(p=>(!cat||p.category===cat)&&(!t||(p.name+' '+p.category).toLowerCase().includes(t))).slice(0,60);
  return `<h2>${cat?esc(cat):q?'Results for “'+esc(q)+'”':'Search'} <small>${r.length}${r.length==60?'+':''}</small></h2>${r.length?`<div class="grid">${r.map(card).join('')}</div>`:'<div class="empty">No matches yet</div>'}`},
 basket(){if(!S.basket.length)return '<div class="empty">🧺<br>Your basket is empty</div>';
  const tot=S.basket.reduce((a,b)=>a+b.price*b.qty,0);
  return `<h2>Basket</h2><div class="panel">${S.basket.map((b,i)=>`<div class="row"><span>${b.qty} × ${esc(b.name)}</span><span>${gbp(b.price*b.qty)} <a href="#" data-rm="${i}">✕</a></span></div>`).join('')}
  <div class="row"><b>Total</b><b>${gbp(tot)}</b></div><button class="btn" id="checkout">Checkout (click &amp; collect)</button></div>`},
 orders(){return `<h2>Orders</h2><div class="empty">📦<br>${LIVE?'Sign in to see your orders':'Orders appear here once Supabase is connected'}</div>`},
 account(){return `<h2>Account</h2><div class="panel"><div class="row"><span>Postcode</span><a href="#" id="setpc">${esc(S.pc||'Set')}</a></div>
 <div class="row"><span>Run a shop?</span><span>Suman Bros trade customers</span></div><button class="btn" id="shopsignup">Open your Nearbuy shop</button>
 <p class="note">Phase 1: shop sign-up and order flow come in Phase 2.</p></div>`}};
function route(t,...a){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));$('#view').innerHTML=V[t](...a);scrollTo(0,0)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-t],[data-cat],[data-sku],[data-rm],#setpc,#loc,#checkout,#shopsignup');if(!el)return;
 if(el.dataset.t)return route(el.dataset.t);
 if(el.dataset.cat)return route('search','',el.dataset.cat);
 if(el.dataset.sku){const p=S.products.find(x=>x.sku===el.dataset.sku),b=S.basket.find(x=>x.sku===p.sku);b?b.qty++:S.basket.push({sku:p.sku,name:p.name,price:p.price,shop_id:p.shop_id||null,qty:1});saveB();el.textContent='Added ✓';return}
 e.preventDefault();
 if(el.dataset.rm){S.basket.splice(+el.dataset.rm,1);saveB();return route('basket')}
 if(el.id==='setpc'||el.id==='loc'){const v=prompt('Your postcode',S.pc);if(v!=null){S.pc=v.toUpperCase().trim();localStorage.nb_pc=S.pc;$('#loc').textContent='📍 Near '+S.pc;}return}
 if(el.id==='checkout')return alert(LIVE?'Checkout is coming in Phase 2.':'Demo mode: checkout needs Supabase.');
 if(el.id==='shopsignup')return alert('Shop sign-up arrives in Phase 2.');});
$('#sf').addEventListener('submit',e=>{e.preventDefault();$('#q').blur();route('search')});
$('#q').addEventListener('input',()=>{if($('#q').value.length>1)route('search')});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
load();
