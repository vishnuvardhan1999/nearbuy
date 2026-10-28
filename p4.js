// ShopNip (a NuvonHub product) · Phase 4: search + filters, SKU grouping across shops, "not stocked nearby yet" catalogue, info pages.
(()=>{const {M,MOCK,Q,toast}=P2;
const MAIL=()=>CFG.CONTACT_EMAIL||'hello@nuvonhub.com';
const F={cat:'',min:'',max:'',dist:0,stock:false,ful:'',sort:'nearest'};
const NT=()=>JSON.parse(localStorage.nb_notify||'[]'),REC=()=>JSON.parse(localStorage.nb_recent||'[]');
const POP=['Pens','Balloons','Gift wrap','Notebook','Glue','Birthday','Tape','Envelopes'];
let CAT=[];
const shopOf=id=>S.shops.find(s=>s.id===id);
const dOf=s=>s&&S.me&&s.lat!=null&&s.lng!=null?miles(S.me,s):null;
const fmi=d=>d==null?'':(d<0.1?'<0.1':d.toFixed(1))+' mi';

// ---------- grouping: one product per SKU, with every shop's offer ----------
function rows(){if(MOCK)return M.listings.filter(l=>l.active&&shopOf(l.shop_id));return S.L||[]}
function build(){const g={};
  rows().forEach(l=>{const s=shopOf(l.shop_id);if(!s||!(+l.retail_price>0))return;const k=l.sku;
    g[k]=g[k]||{sku:k,name:l.name,images:l.image?[l.image]:[],category:l.category||'',offers:[],listing:true};
    if(!g[k].images.length&&l.image)g[k].images=[l.image];
    g[k].offers.push({listing_id:l.id,shop_id:s.id,shop:s,price:+l.retail_price,cmp:+l.compare_at_price||null,stock:l.stock,updated:l.updated_at||l.created_at||'',dist:dOf(s)})});
  const out=Object.values(g).filter(p=>p.images.length).map(p=>{
    p.offers.sort((a,b)=>(!!b.stock-!!a.stock)||((a.dist??1e9)-(b.dist??1e9))||a.price-b.price);
    const b=p.offers[0];return {...p,cmp:b.cmp&&b.cmp>b.price?b.cmp:null,listing_id:b.listing_id,shop_id:b.shop_id,stock:b.stock,price:Math.min(...p.offers.map(o=>o.price)),
      dist:Math.min(...p.offers.map(o=>o.dist??1e9)),updated:p.offers.map(o=>o.updated).sort().pop()}});
  out.forEach(p=>{if(p.dist===1e9)p.dist=null});
  return out.sort((a,b)=>(a.dist??1e9)-(b.dist??1e9))}
function regroup(){const g=build();
  if(g.length){S.products=g;S.live=true;const want=NT(),now=g.filter(p=>want.includes(p.sku));
    if(now.length&&!sessionStorage.nb_nt){sessionStorage.nb_nt=1;setTimeout(()=>toast(`${now.length} item${now.length>1?'s':''} you asked about ${now.length>1?'are':'is'} now at a shop near you`),1200)}}
  else{S.live=false;if(!S.products[0]?.demo||S.products.some(p=>p.listing_id&&!p.demo))S.products=CAT.map(p=>({...p,price:+(p.trade_price*1.6).toFixed(2),demo:true}))}}
const asOffer=(p,o)=>({...p,listing_id:o.listing_id,shop_id:o.shop_id,price:o.price,stock:o.stock});

// ---------- product card ----------
function card(p){const o=p.offers||[],soon=p.demo&&!p.listing_id,s=!soon&&shopOf(p.shop_id),d=p.dist??dOf(s),on=NT().includes(p.sku);
  const meta=soon?'<div class="pmeta soonm">Not stocked near you yet</div>':o.length>1?`<div class="pmeta"><b>${o.length} shops nearby</b>${d!=null?' · nearest '+fmi(d):''}</div>`:s?`<div class="pmeta">${svg('store')}${esc(s.name)}${d!=null?' · '+fmi(d):''}</div>`:'';
  const price=soon?'':o.length>1?`<span class="pr"><small>From</small> ${gbp(p.price)}</span>`:`<span class="pr">${gbp(p.price)}</span>`;
  const btn=soon?`<button class="ntf ${on?'on':''}" data-ntf="${esc(p.sku)}">${on?svg('check')+'Notified':'Notify me'}</button>`:`<button class="add" data-sku="${esc(p.sku)}" data-lid="${esc(p.listing_id||'')}" aria-label="Add to basket">${svg('plus')}</button>`;
  return `<div class="pc ${soon?'soon':''}" data-psku="${esc(p.sku)}" data-lid="${esc(p.listing_id||'')}"><div class="pim"><img loading="lazy" src="${esc(p.images[0])}" alt="${esc(p.name)}" data-fb></div>
<div class="pb"><div class="pn">${esc(p.name)}</div>${meta}<div class="pf">${price}${btn}</div></div></div>`}

function notify(sku){const n=NT(),i=n.indexOf(sku);i<0?n.push(sku):n.splice(i,1);localStorage.nb_notify=JSON.stringify(n);
  toast(i<0?"Saved. We'll flag it here when a shop near you lists it":'Removed from your notify list');
  document.querySelectorAll(`[data-ntf="${CSS.escape(sku)}"]`).forEach(b=>{b.classList.toggle('on',i<0);b.innerHTML=i<0?svg('check')+'Notified':'Notify me'})}

// ---------- sheet: shop picker / notify ----------
const grp=sku=>S.products.find(p=>p.sku===sku&&p.offers);
async function gsheet(p,pick){await P3.sheet(asOffer(p,pick||p.offers[0]));const el=$('#sheet'),f=el.querySelector('.sh-f');
  const cur=pick||p.offers[0];el._g=p;
  const h=`<div class="pick"><h5>Choose a shop <span>${p.offers.length} nearby</span></h5>${p.offers.map((o,i)=>`<button class="po ${o.listing_id===cur.listing_id?'on':''}" data-po="${i}" ${o.stock?'':'disabled'}>
   <i></i><span class="pon"><b>${esc(o.shop.name)}</b><small>${[fmi(o.dist),o.shop.delivery_options?.delivery?'Delivery':'',o.shop.delivery_options?.collect!==false?'Collect':''].filter(Boolean).join(' · ')}${o.stock?'':' · Out of stock'}</small></span><span class="poprc">${gbp(o.price)}${o.price===p.price&&p.offers.length>1?'<em>Lowest</em>':''}</span></button>`).join('')}</div>`;
  el.querySelector('.sh-b').insertAdjacentHTML('beforeend',h)}
async function ssheet(p){await P3.sheet(p);const el=$('#sheet'),on=NT().includes(p.sku);
  el.querySelector('.sh-pr').innerHTML='<span class="sample soon">Not stocked near you yet</span>';
  el.querySelector('.sh-f').innerHTML=`<p class="sh-soon">No ShopNip shop near you sells this yet.</p><button class="btn ntf2" data-ntf="${esc(p.sku)}">${on?'On your notify list':'Notify me when it’s nearby'}</button>`}
// window capture runs before p3's document capture handler
addEventListener('click',e=>{
  const n=e.target.closest('[data-ntf]');if(n){e.preventDefault();e.stopPropagation();notify(n.dataset.ntf);if(n.classList.contains('ntf2'))n.textContent=NT().includes(n.dataset.ntf)?'On your notify list':'Notify me when it’s nearby';return}
  const po=e.target.closest('[data-po]');if(po){e.preventDefault();e.stopPropagation();const g=$('#sheet')._g;gsheet(g,g.offers[+po.dataset.po]).then(()=>{$('#sheet .sh-card').scrollTop=1e4});return}
  const add=e.target.closest('.add[data-sku]');if(add){const g=grp(add.dataset.sku);if(g&&g.offers.length>1){e.preventDefault();e.stopPropagation();gsheet(g);return}}
  const c=e.target.closest('.pc[data-psku]');if(c){const g=grp(c.dataset.psku);if(g){e.preventDefault();e.stopPropagation();gsheet(g);return}
    const p=S.products.find(x=>x.sku===c.dataset.psku)||CAT.find(x=>x.sku===c.dataset.psku);if(p&&!c.dataset.lid){e.preventDefault();e.stopPropagation();ssheet({...p,demo:true})}return}
  const t=e.target.closest('[data-fq],[data-fd],[data-ff],[data-fclr]');if(!t)return;e.preventDefault();
  if(t.dataset.fq!=null){$('#q').value=t.dataset.fq;saveRec(t.dataset.fq)}
  if(t.dataset.fd)F.dist=F.dist===+t.dataset.fd?0:+t.dataset.fd;
  if(t.dataset.ff==='stock')F.stock=!F.stock;if(['collect','delivery'].includes(t.dataset.ff))F.ful=F.ful===t.dataset.ff?'':t.dataset.ff;
  if(t.dataset.fclr==='rec')localStorage.nb_recent='[]';if(t.dataset.fclr==='all')Object.assign(F,{cat:'',min:'',max:'',dist:0,stock:false,ful:'',sort:'nearest'});
  route('search')},true);
addEventListener('change',e=>{const t=e.target;if(!t.dataset.fs)return;F[t.dataset.fs]=t.value;route('search')});

// ---------- search ----------
function saveRec(q){q=q.trim();if(q.length<2)return;const r=REC().filter(x=>x.toLowerCase()!==q.toLowerCase());r.unshift(q);localStorage.nb_recent=JSON.stringify(r.slice(0,6))}
let rt;$('#q').addEventListener('input',()=>{clearTimeout(rt);rt=setTimeout(()=>saveRec($('#q').value),1500);if(!$('#q').value)route('search')});
$('#sf').addEventListener('submit',()=>saveRec($('#q').value));
const match=(p,t)=>{const s=(p.name+' '+p.category).toLowerCase();return t.every(w=>s.includes(w.replace(/s$/,'')))};
function okOffer(o){const d=o.shop.delivery_options||{};
  if(F.stock&&!o.stock)return false;if(F.dist&&(o.dist==null||o.dist>F.dist))return false;
  if(F.ful==='delivery'&&!(d.delivery&&(o.dist==null||!d.delivery_radius_miles||o.dist<=d.delivery_radius_miles)))return false;if(F.ful==='collect'&&d.collect===false)return false;
  if(F.min!==''&&o.price<+F.min)return false;if(F.max!==''&&o.price>+F.max)return false;return true}
V.search=function(){const q=$('#q').value.trim(),t=q.toLowerCase().split(/\s+/).filter(Boolean);
  const live=S.products.filter(p=>p.offers);
  let res=live.filter(p=>(!t.length||match(p,t))&&(!F.cat||p.category===F.cat)).map(p=>{const of=p.offers.filter(okOffer);if(!of.length)return null;
    return {...p,offers:of,listing_id:of[0].listing_id,shop_id:of[0].shop_id,stock:of[0].stock,price:Math.min(...of.map(o=>o.price)),dist:of.reduce((m,o)=>o.dist!=null&&(m==null||o.dist<m)?o.dist:m,null)}}).filter(Boolean);
  const so={nearest:(a,b)=>(a.dist??1e9)-(b.dist??1e9)||a.price-b.price,price:(a,b)=>a.price-b.price,price_desc:(a,b)=>b.price-a.price,newest:(a,b)=>(b.updated||'')<(a.updated||'')?-1:1}[F.sort];res.sort(so);
  const have=new Set(live.map(p=>p.sku));
  const soon=[]||CAT.filter(p=>p.images?.length&&!have.has(p.sku)&&(!t.length||match(p,t))&&(!F.cat||p.category===F.cat)).slice(0,24).map(p=>({...p,demo:true})):[];
  const cats=[...new Set([...live,...CAT].map(p=>p.category).filter(Boolean))].sort();
  const nf=[F.cat,F.min,F.max,F.dist,F.stock,F.ful].filter(Boolean).length;
  const rec=REC();
  const chips=`${rec.length?`<div class="sgrp"><div class="sl"><span>Recent</span><a href="#" data-fclr="rec">Clear</a></div><div class="qchips">${rec.map(r=>`<button data-fq="${esc(r)}">${svg('search')}${esc(r)}</button>`).join('')}</div></div>`:''}
   <div class="sgrp"><div class="sl"><span>Popular</span></div><div class="qchips pop">${POP.map(r=>`<button data-fq="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`;
  const fil=`<div class="filters">
   <div class="frow"><label class="fsel"><span>Category</span><select data-fs="cat"><option value="">All</option>${cats.map(c=>`<option ${c===F.cat?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
    <label class="fsel"><span>Sort</span><select data-fs="sort">${[['nearest','Nearest'],['price','Price: low to high'],['price_desc','Price: high to low'],['newest','Newest']].map(([v,l])=>`<option value="${v}" ${v===F.sort?'selected':''}>${l}</option>`).join('')}</select></label></div>
   <div class="fchips">${[1,3,5,10].map(r=>`<button data-fd="${r}" class="${F.dist===r?'on':''}">${r} mi</button>`).join('')}<span class="sep"></span>
    <button data-ff="stock" class="${F.stock?'on':''}">In stock</button><button data-ff="collect" class="${F.ful==='collect'?'on':''}">${svg('bag')}Collect</button><button data-ff="delivery" class="${F.ful==='delivery'?'on':''}">${svg('bolt')}Delivery</button></div>
   <div class="frow price"><span>Price</span><label class="pf2">£<input data-fs="min" inputmode="decimal" placeholder="Min" value="${esc(F.min)}"></label><i>–</i><label class="pf2">£<input data-fs="max" inputmode="decimal" placeholder="Max" value="${esc(F.max)}"></label>${nf?`<a href="#" data-fclr="all">Clear ${nf} filter${nf>1?'s':''}</a>`:''}</div>
   ${F.dist&&!S.me?'<p class="note" style="margin:6px 0 0">Set your postcode to filter by distance. <a href="#" id="setpc2">Set postcode</a></p>':''}</div>`;
  const body=res.length?`<div class="grid">${res.slice(0,60).map(card).join('')}</div>`:live.length?`<div class="empty">${svg('search')}<br>No shop near you matches${nf?' these filters':''} yet</div>`:'';
  return `<section class="sec ssearch"><div class="sh"><h2>${q?`Results for “${esc(q)}”`:'Search'}</h2><span class="note" style="margin:0">${res.length} at shops${soon.length?` · ${soon.length} not stocked nearby`:''}</span></div>
   ${q?'':chips}${fil}${body}
   ${soon.length?`<div class="sh soonh"><h2>Not stocked nearby yet</h2></div><p class="note" style="margin:-6px 0 12px">Not sold by a ShopNip shop near you yet. Tap Notify me and we'll flag it when one does.</p><div class="grid">${soon.map(card).join('')}</div>`:''}
   ${!q&&!F.cat&&!res.length&&!live.length?`<div class="empty">${svg('search')}<br>Type to search the catalogue</div>`:''}</section>`};

// ---------- info pages ----------
const pg=(t,body,sub='')=>`<article class="info"><div class="ih"><div class="tag">ShopNip</div><h1>${t}</h1>${sub?`<p>${sub}</p>`:''}</div>${body}</article>${foot()}`;
const draft='<div class="draft"><b>Draft, have reviewed by a solicitor.</b> This text is a starting template and is not legal advice. It must be checked by a qualified solicitor before ShopNip launches publicly.</div>';
const reg='<button class="btn" id="register5">Register your shop</button>';
const INFO={
 about:()=>pg('About ShopNip',`<p class="lead"><b>ShopNip, a NuvonHub product.</b> We put your local independent shops online, so you can order from the newsagent, card shop or post office store down the road and have it delivered or ready to collect.</p>
  <div class="cards3"><div>${svg('store')}<h4>Local shops</h4><p>Only real, approved independent shops near you. No warehouses.</p></div><div>${svg('bolt')}<h4>Delivered</h4><p>Shops that deliver bring your order to your door, often the same day.</p></div><div>${svg('bag')}<h4>Or collected</h4><p>Order ahead and pick it up when it suits you. Pay at the shop.</p></div></div>
  <p>ShopNip is built and run by NuvonHub. We're in a pilot, starting with stationery, party, gift and craft shops.</p><p><a class="btn ghost" href="#how">How it works</a> <a class="btn ghost" href="#sell">Sell on ShopNip</a></p>`),
 how:()=>pg('How it works',`<h3>For shoppers</h3><ol class="steps"><li><b>Set your postcode</b> to see approved shops near you and how far away they are.</li><li><b>Search or browse</b>. If several shops stock the same item, pick the one you want.</li><li><b>Choose collect or delivery</b>. Delivery is offered when the shop delivers to your area.</li><li><b>Place your order</b> and pay the shop on collection or delivery. There's no online payment yet.</li><li><b>Track it</b> in Orders as the shop accepts and prepares it.</li></ol>
  <h3>For shops</h3><ol class="steps"><li><b>Register</b> with your shop details and postcode. We review and approve every shop.</li><li><b>List products</b> from the catalogue (photos and descriptions done for you), then set your prices and stock.</li><li><b>Get orders</b> with an alert. Accept, mark ready or out for delivery, then complete.</li></ol>${reg}`),
 sell:()=>pg('Sell on ShopNip',`<div class="free">${svg('tag')}<div><b>Free during the pilot</b><p>No setup fee, no monthly fee and no commission while we're in the pilot. We'll give plenty of notice before any pricing changes.</p></div></div>
  <div class="cards3"><div>${svg('store')}<h4>Your own online shop</h4><p>A shop page with your opening hours, delivery area and products.</p></div><div>${svg('check')}<h4>Listings done for you</h4><p>Pick from a catalogue of thousands of products with photos and descriptions. Just set your price.</p></div><div>${svg('bolt')}<h4>Collect or deliver</h4><p>Offer click &amp; collect, local delivery with your own radius and fee, or both.</p></div>
  <div>${svg('pin')}<h4>Found by locals</h4><p>Shoppers nearby see your shop first, sorted by distance.</p></div><div>${svg('orders')}<h4>Simple order inbox</h4><p>Instant alerts with a sound, plus accept, ready and complete in one tap.</p></div><div>${svg('bag')}<h4>Paid in store</h4><p>Customers pay you on collection or delivery, so the money goes straight to you.</p></div></div>${reg}`,'Bring your shop online in minutes and reach customers on your doorstep.'),
 faq:()=>pg('FAQ',[['How do I pay?','You pay the shop directly on collection or on delivery. ShopNip does not take card payments yet.'],['Which shops are on ShopNip?','Only independent shops that have registered and been approved by us. Set your postcode to see those near you.'],['Can I order from two shops at once?','Each basket is for one shop, so each shop gets a clear order. Place a separate order for each shop.'],['Can I cancel?','Yes, until the shop accepts your order. After that, contact the shop.'],['Does delivery cost extra?','Each shop sets its own delivery fee and area. You see the fee at checkout before you order.'],['How do I list my shop?','Go to <a href="#sell">Sell on ShopNip</a> and register. It is free during the pilot.'],['How do I contact you?',`Email <a href="mailto:${MAIL()}">${MAIL()}</a>.`]].map(([q,a])=>`<details class="qa"><summary>${q}</summary><p>${a}</p></details>`).join('')),
 contact:()=>pg('Contact',`<div class="panel cpanel"><p>Questions, feedback or want to bring your shop to ShopNip? Email us and we'll reply within two working days.</p><a class="btn" href="mailto:${MAIL()}">${svg('store')}${MAIL()}</a><p class="note">For a question about an order, contact the shop first. Their phone number is on your order.</p></div>`),
 terms:()=>pg('Terms of Use',draft+`<h3>1. Who we are</h3><p>ShopNip is a marketplace operated by NuvonHub ("we", "us"). Contact: ${MAIL()}.</p>
  <h3>2. What ShopNip does</h3><p>ShopNip lets you place orders with independent shops. Each sale is a contract between you and the shop. The shop is responsible for its products, prices, stock, delivery and refunds.</p>
  <h3>3. Accounts</h3><p>You must be 18 or over and give accurate details. Keep your login secure. We may suspend accounts that misuse the service.</p>
  <h3>4. Orders and payment</h3><p>Prices are set by shops and confirmed when you place an order. Payment is made directly to the shop on collection or delivery. A shop may reject an order, for example if an item is unavailable.</p>
  <h3>5. Cancellations and returns</h3><p>You can cancel until a shop accepts your order. Your rights under the Consumer Rights Act 2015 and the Consumer Contracts Regulations are not affected.</p>
  <h3>6. Shops</h3><p>Shops must be approved, list accurately, honour accepted orders and comply with the law. We may remove listings or shops at our discretion.</p>
  <h3>7. Liability</h3><p>We provide the platform "as is". Nothing in these terms limits liability that cannot be limited by law.</p>
  <h3>8. Law</h3><p>These terms are governed by the laws of England and Wales.</p><p class="note">Last updated: draft, ${new Date().getFullYear()}.</p>`),
 privacy:()=>pg('Privacy Policy',draft+`<h3>1. Controller</h3><p>NuvonHub operates ShopNip and is the data controller for the personal data described here under the UK GDPR and the Data Protection Act 2018. Contact: ${MAIL()}.</p>
  <h3>2. What we collect</h3><ul><li>Account details: email, name, phone</li><li>Order details: items, shop, collection or delivery address, notes</li><li>Your postcode or approximate location, used to show nearby shops</li><li>Shop details for registered shops</li></ul>
  <h3>3. Why, and our lawful basis</h3><p>To run your account and pass orders to the shop you chose (contract), to keep the service secure (legitimate interests), and to meet legal obligations.</p>
  <h3>4. Who we share it with</h3><p>The shop you order from receives the details it needs to fulfil your order. Our hosting and database provider, Supabase, stores data in its <b>London (UK) region</b>. Postcode lookups are made with postcodes.io. We do not sell your data.</p>
  <h3>5. On your device</h3><p>We store your basket, postcode and preferences in your browser's local storage. We do not use advertising cookies.</p>
  <h3>6. How long we keep it</h3><p>We keep account data while your account is open and order records for up to 6 years for accounting purposes.</p>
  <h3>7. Your rights</h3><p>You can ask for access, correction, deletion, restriction, portability or object to processing. Email ${MAIL()}. You can also complain to the ICO (ico.org.uk).</p><p class="note">Last updated: draft, ${new Date().getFullYear()}.</p>`)};
Object.assign(V,INFO);
const hroute=()=>{const h=location.hash.slice(1);if(INFO[h]){route(h);document.title=({about:'About',how:'How it works',sell:'Sell on ShopNip',faq:'FAQ',contact:'Contact',terms:'Terms of Use',privacy:'Privacy Policy'})[h]+' · ShopNip'}else if(INFO[cur[0]]&&!h){document.title='ShopNip · Your local shops, online';route('home')}};
addEventListener('hashchange',hroute);
// clicking a link to the current info page should still scroll to top
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a&&INFO[a.getAttribute('href').slice(1)]&&location.hash===a.getAttribute('href'))scrollTo(0,0)});

window.P4={card,regroup,F,gsheet:g=>gsheet(g),ssheet:p=>ssheet(p),cat:()=>CAT,async init(){
  CAT=A0.catalog||await fetch('products.json').then(r=>r.json()).catch(()=>[]);
  if(MOCK&&M.shops[0]&&Q.get('multi')!=='0'){ // a second approved shop sharing SKUs, to show grouping
    if(!M.shops.find(s=>s.id==='s3')){M.shops.push({id:'s3',owner_id:'u3',name:'High Street Cards & Gifts',address:'40 Market Street, Leicester',postcode:'LE1 6DP',lat:52.6335,lng:-1.1325,phone:'0116 765 4321',status:'approved',active:true,delivery_options:{collect:true,delivery:false}});
      M.listings.filter(l=>l.active).slice(0,4).forEach((l,i)=>M.listings.push({...l,id:'m'+i,shop_id:'s3',retail_price:+(l.retail_price*(i%2?0.9:1.12)).toFixed(2),stock:[5,0,14,2][i],source:'manual',updated_at:'2026-10-2'+(i+1)}))}
    if(!S.shops.find(s=>s.id==='s3'))S.shops.push(M.shops.find(s=>s.id==='s3'));
    if(Q.get('near'))(S.me={lat:52.636,lng:-1.13},S.pc='LE1 6FB')}
  regroup();
  if(Q.get('q'))$('#q').value=Q.get('q');
  ['cat','sort','min','max','ful'].forEach(k=>{if(Q.get('f'+k))F[k]=Q.get('f'+k)});if(Q.get('fdist'))F.dist=+Q.get('fdist');if(Q.get('fstock'))F.stock=true;
  if(Q.get('recent'))localStorage.nb_recent=JSON.stringify(Q.get('recent').split(','));
  const v=Q.get('view');if(v==='search')window.P2_START='search';
  if(v==='gsheet'){window.P2_START='home';setTimeout(()=>{const g=S.products.find(p=>p.offers?.length>1);g&&gsheet(g)},400)}
  if(v==='soon'){window.P2_START='home';setTimeout(()=>ssheet({...CAT.find(p=>p.images?.length),demo:true}),400)}
  const h=location.hash.slice(1);if(INFO[h])window.P2_START=h;
}};
const A0=P2.A;
})();
