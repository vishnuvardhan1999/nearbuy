// ShopNip (a NuvonHub product) · Phase 3: basket (one shop), checkout (pay on collection/delivery), orders, owner inbox, realtime, product sheet.
(function(){
const {A,DB,M,MOCK,Q,toast}=P2;
const STEPS={collect:['placed','accepted','ready','completed'],delivery:['placed','accepted','out_for_delivery','completed']};
const LBL={placed:'Placed',accepted:'Accepted',ready:'Ready to collect',out_for_delivery:'Out for delivery',completed:'Completed',cancelled:'Cancelled',rejected:'Rejected'};
const O={mine:[],inbox:[],cur:null,shops:{},fil:'open',newIds:new Set(),ch:null};
const B=()=>S.basket; const bShop=()=>B()[0]?.shop_id||null;
const sub=()=>B().reduce((a,b)=>a+b.price*b.qty,0);
const when=t=>new Date(t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

// ---------- data (Supabase or mock) ----------
const D=MOCK?{
  async shop(id){return M.shops.find(s=>s.id===id)},
  async place(a){const lines=a.items.map(i=>{const l=M.listings.find(x=>x.id===i.listing_id);if(!l||!l.active)throw new Error('An item is no longer available');if(l.stock<i.qty)throw new Error(`Only ${l.stock} left of ${l.name}`);return {l,q:i.qty}});
    lines.forEach(x=>x.l.stock-=x.q);const s=M.shops.find(x=>x.id===a.shop),fee=a.fulfilment==='delivery'?+(s.delivery_options.delivery_fee||0):0,st=lines.reduce((t,x)=>t+x.l.retail_price*x.q,0);
    const o={id:'o'+(M.orders.length+1),order_number:'NB-'+(1001+M.orders.length),collection_pin:a.fulfilment==='collect'?String(crypto.getRandomValues(new Uint16Array(1))[0]%10000).padStart(4,'0'):null,shop_id:a.shop,customer_id:'u1',customer_name:a.name,customer_phone:a.phone,fulfilment:a.fulfilment,delivery_address:a.address,delivery_postcode:a.postcode,note:a.note,
      payment_method:a.fulfilment==='delivery'?'pay_on_delivery':'pay_on_collection',status:'placed',subtotal:st,delivery_fee:fee,total:st+fee,created_at:new Date().toISOString(),
      order_items:lines.map(x=>({listing_id:x.l.id,sku:x.l.sku,name:x.l.name,image:x.l.image,unit_price:x.l.retail_price,qty:x.q})),order_events:[{status:'placed',at:new Date().toISOString()}],shops:{name:s.name,phone:s.phone,address:s.address}};
    M.orders.unshift(o);return {id:o.id,order_number:o.order_number,total:o.total,collection_pin:o.collection_pin}},
  async mine(){return M.orders.filter(o=>o.customer_id==='u1')},
  async inbox(){return M.orders.filter(o=>o.shop_id===A.shop?.id)},
  async get(id){return M.orders.find(o=>o.id===id)},
  async status(id,st,note,cancel){const o=M.orders.find(x=>x.id===id);if(['rejected','cancelled'].includes(st))o.order_items.forEach(i=>{const l=M.listings.find(x=>x.id===i.listing_id);if(l)l.stock+=i.qty});
    if(st==='cancelled'){if(!cancel||!cancel.reason)throw new Error('Choose a cancellation reason');window.CancelBox.apply(o,cancel,cancel.role||'customer')}
    o.status=st;o.reject_reason=note||o.reject_reason;o.order_events.push({status:st,at:new Date().toISOString(),note})},
  live(){}
}:{
  async shop(id){return DB.shop(id)},
  async place(a){const {data,error}=await sb.rpc('place_order',{p_shop:a.shop,p_items:a.items,p_fulfilment:a.fulfilment,p_name:a.name,p_phone:a.phone,p_address:a.address||null,p_postcode:a.postcode||null,p_note:a.note||null,p_lat:a.lat??null,p_lng:a.lng??null});if(error)throw error;
    if(a.fulfilment==='collect'&&data?.id&&!data.collection_pin){try{const {data:p}=await sb.from('orders').select('collection_pin').eq('id',data.id).maybeSingle();if(p)data.collection_pin=p.collection_pin}catch(e){}}return data},
  async mine(){const {data,error}=await sb.from('orders').select('*,shops(name,phone,address),order_items(*)').eq('customer_id',A.user.id).order('created_at',{ascending:false}).limit(50);if(error)throw error;return data},
  async inbox(){const {data,error}=await sb.from('orders').select('*,order_items(*)').eq('shop_id',A.shop.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;return data},
  async get(id){const {data,error}=await sb.from('orders').select('*,shops(name,phone,address),order_items(*),order_events(status,note,at)').eq('id',id).single();if(error)throw error;data.order_events?.sort((a,b)=>a.at<b.at?-1:1);return data},
  async status(id,st,note,cancel){const {error}=await sb.rpc('update_order_status',{p_order:id,p_status:st,p_note:note||null,p_cancel_reason:cancel&&cancel.reason||null});if(error)throw error},
  live(filter,cb){if(O.ch)sb.removeChannel(O.ch);O.ch=sb.channel('orders-'+filter).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter},cb).subscribe()}
};

// ---------- basket ----------
function addToBasket(p,qty=1){
  if(!p.listing_id||!p.shop_id){toast('Preview item: not sold by a ShopNip shop yet');return false}
  const shopName=S.shops.find(s=>s.id===p.shop_id)?.name||A.view?.name||O.shops[p.shop_id]?.name||'this shop';
  if(bShop()&&bShop()!==p.shop_id){const cur=B()[0].shop_name;
    if(!confirm(`Your basket has items from ${cur}. A basket can only hold one shop's items.\n\nClear it and add from ${shopName}?`))return false;S.basket=[]}
  const b=B().find(x=>x.listing_id===p.listing_id);const have=b?b.qty:0;
  if(p.stock!=null&&have+qty>p.stock){toast(p.stock?`Only ${p.stock} in stock`:'Out of stock');return false}
  b?b.qty+=qty:S.basket.push({listing_id:p.listing_id,sku:p.sku,name:p.name,image:p.images?.[0]||p.image,price:+p.price,qty,shop_id:p.shop_id,shop_name:shopName,stock:p.stock});
  saveB();toast('Added to basket');return true}
const findP=(lid,sku)=>S.products.find(p=>lid?p.listing_id===lid:p.sku===sku);
// capture phase so app.js's old add handler doesn't also run
document.addEventListener('click',e=>{
  const add=e.target.closest('.add[data-sku]');
  if(add){e.preventDefault();e.stopPropagation();const p=findP(add.dataset.lid,add.dataset.sku);if(p&&addToBasket(p)){add.classList.add('done');add.innerHTML=svg('check')}return}
  const card=e.target.closest('.pc[data-psku]');if(card){e.preventDefault();e.stopPropagation();sheet(findP(card.dataset.lid,card.dataset.psku))}
},true);

// ---------- product sheet ----------
async function sheet(p){if(!p)return;let full=p;
  if(!p.description){const c=await (A.catalog?Promise.resolve(A.catalog):fetch('products.json').then(r=>r.json()).then(j=>A.catalog=j));const cp=c.find(x=>x.sku===p.sku);if(cp)full={...cp,...p,images:(p.images?.length?p.images:cp.images),description:cp.description}}
  const imgs=(full.images||[]).filter(Boolean),shop=S.shops.find(s=>s.id===p.shop_id)||A.view;
  let el=$('#sheet');if(!el){el=document.createElement('div');el.id='sheet';document.body.appendChild(el)}
  el.innerHTML=`<div class="sh-bg" data-x="close"></div><div class="sh-card" role="dialog" aria-label="${esc(p.name)}"><div class="grab"></div>
   <button class="sh-x" data-x="close" aria-label="Close">✕</button>
   <div class="sh-imgs">${imgs.map(i=>`<img src="${esc(i)}" alt="">`).join('')||'<img src="icon-192.png" alt="">'}</div>${imgs.length>1?`<div class="sh-n">${imgs.length} photos · swipe</div>`:''}
   <div class="sh-b"><h3>${esc(p.name)}</h3>${shop?`<div class="sh-shop">${svg('store')}Sold by <b>${esc(shop.name)}</b></div>`:''}
    <div class="sh-pr">${gbp(p.price)}${p.stock!=null?`<span class="sh-st ${p.stock?'':'out'}">${p.stock?(p.stock<=3?'Only '+p.stock+' left':'In stock'):'Out of stock'}</span>`:''}</div>
    <p class="sh-d">${esc((full.description||'').slice(0,700))}${(full.description||'').length>700?'…':''}</p></div>
   <div class="sh-f"><div class="qty"><button data-x="dec" aria-label="Less">−</button><span id="sq">1</span><button data-x="inc" aria-label="More">+</button></div>
    <button class="btn" data-x="add" ${p.stock===0?'disabled':''}>Add to basket · <span id="stot">${gbp(p.price)}</span></button></div></div>`;
  el.className='on';document.body.style.overflow='hidden';el._p=p;el._q=1}
document.addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(!x)return;const el=$('#sheet');e.preventDefault();
  if(x.dataset.x==='close'){el.className='';document.body.style.overflow='';return}
  if(x.dataset.x==='inc'||x.dataset.x==='dec'){el._q=Math.max(1,Math.min(99,el._q+(x.dataset.x==='inc'?1:-1)));$('#sq').textContent=el._q;$('#stot').textContent=gbp(el._p.price*el._q);return}
  if(x.dataset.x==='add'&&addToBasket(el._p,el._q)){el.className='';document.body.style.overflow=''}});

// ---------- views ----------
V.basket=function(){
  if(!B().length)return `<div class="empty">${svg('basket')}<br><b>Your basket is empty</b><br><small>Add items from a shop near you</small><br><br><button class="btn" data-t="home">Start shopping</button></div>`;
  const s=B()[0];return `<section class="sec narrow"><div class="sh"><h2>Basket</h2><a href="#" data-o="clear">Clear</a></div>
  <div class="bshop">${svg('store')}<div><small>Ordering from</small><b>${esc(s.shop_name)}</b></div><a href="#" data-shop="${esc(s.shop_id)}">View shop</a></div>
  <div class="lst">${B().map((b,i)=>`<div class="li"><img src="${esc(b.image||'icon-192.png')}" alt=""><div class="lb"><div class="ln">${esc(b.name)}</div><div class="lm"><span>${gbp(b.price)} each</span></div>
   <div class="lc"><div class="qty sm"><button data-o="dec" data-i="${i}">−</button><span>${b.qty}</span><button data-o="inc" data-i="${i}">+</button></div><b style="margin-left:auto">${gbp(b.price*b.qty)}</b></div></div></div>`).join('')}</div>
  <div class="panel"><div class="line"><span>Subtotal</span><b>${gbp(sub())}</b></div><p class="hint">Delivery fee (if any) is added at checkout. Prices are confirmed by the shop when you order.</p>
  <button class="btn full big" data-o="checkout">Go to checkout</button></div></section>`};
const CO={f:'collect',shop:null,deliv:null,err:''};
async function prepCheckout(){CO.shop=await D.shop(bShop());const d=CO.shop?.delivery_options||{};CO.deliv=null;
  if(d.delivery){if(!S.me)CO.deliv={ok:false,why:'Set your postcode to check delivery'};else if(CO.shop.lat==null)CO.deliv={ok:true};else{const mi=miles(S.me,CO.shop);CO.deliv={ok:mi<=(+d.delivery_radius_miles||0),mi,why:`You're ${mi.toFixed(1)} mi away; ${esc(CO.shop.name)} delivers within ${+d.delivery_radius_miles||0} mi`}}}
  if(d.collect===false)CO.f=CO.deliv?.ok?'delivery':'collect';}
V.checkout=function(){
  if(!B().length)return V.basket();if(!CO.shop)return '<div class="empty">Loading…</div>';
  if(!A.user)return `<section class="sec narrow"><div class="sh"><h2>Checkout</h2></div><div class="noshops"><div class="ic">${svg('account')}</div><h4>Log in to place your order</h4><p>We need an account so you can track your order and the shop can contact you.</p><button class="btn" data-o="login">Log in or sign up</button></div></section>`;
  const s=CO.shop,d=s.delivery_options||{},fee=CO.f==='delivery'?+(d.delivery_fee||0):0,u=window.CK?CK.get():{};
  return `<section class="sec narrow"><div class="sh"><h2>Checkout</h2><a href="#" data-t="basket">Edit basket</a></div>
  <form class="form" data-form="order">${CO.err?`<div class="alert">${esc(CO.err)}</div>`:''}
  <div class="panel"><h3 class="ft">How do you want it?</h3>
   <label class="opt ${d.collect===false?'dis':''}"><input type="radio" name="ful" value="collect" ${CO.f==='collect'?'checked':''} ${d.collect===false?'disabled':''}>${svg('bag')}<span><b>Click &amp; collect</b><small>${d.collect===false?'Not offered':`Free · ${esc(s.address||s.postcode||'')}`}</small></span></label>
   <label class="opt ${!d.delivery||!CO.deliv?.ok?'dis':''}"><input type="radio" name="ful" value="delivery" ${CO.f==='delivery'?'checked':''} ${!d.delivery||!CO.deliv?.ok?'disabled':''}>${svg('bolt')}<span><b>Local delivery${d.delivery?' · '+gbp(d.delivery_fee||0):''}</b><small>${!d.delivery?'This shop doesn’t deliver':CO.deliv?.ok?`Within ${+d.delivery_radius_miles||0} mi${CO.deliv.mi!=null?' · you’re '+CO.deliv.mi.toFixed(1)+' mi away':''}`:CO.deliv?.why||''}</small></span></label>
   ${d.delivery&&!S.me?'<a href="#" id="setpc2" class="hint">Set your postcode</a>':''}</div>
  <div class="panel"><h3 class="ft">Your details</h3>
   ${fld('c_name','Name','required autocomplete="name"',u.name||A.profile?.full_name||'')}${fld('c_phone','Mobile number','required type="tel" autocomplete="tel"',u.phone||'')}
   ${CO.f==='delivery'?fld('c_addr','Delivery address','required autocomplete="street-address"',u.addr||'')+fld('c_pc','Postcode','required autocomplete="postal-code" style="text-transform:uppercase"',S.pc||''):''}
   <label class="fl"><span>Note for the shop (optional)</span><textarea id="c_note" rows="2" maxlength="500" placeholder="e.g. I'll collect after 5pm"></textarea></label></div>
  <div class="panel"><h3 class="ft">Payment</h3><div class="opt on">${svg('tag')}<span><b>${CO.f==='delivery'?'Pay on delivery':'Pay on collection'}</b><small>Pay the shop by card or cash. No payment is taken now.</small></span></div></div>
  <div class="panel"><h3 class="ft">Summary · ${esc(s.name)}</h3>${B().map(b=>`<div class="line"><span>${b.qty} × ${esc(b.name)}</span><span>${gbp(b.price*b.qty)}</span></div>`).join('')}
   <div class="line"><span>Subtotal</span><span>${gbp(sub())}</span></div>${fee?`<div class="line"><span>Delivery</span><span>${gbp(fee)}</span></div>`:''}<div class="line tot"><b>Total to pay ${CO.f==='delivery'?'on delivery':'on collection'}</b><b>${gbp(sub()+fee)}</b></div></div>
  <button class="btn full big" id="placebtn">Place order · ${gbp(sub()+fee)}</button><p class="hint c">The shop will confirm your order. You can cancel until it’s accepted.</p></form></section>`};
const fld=(id,l,a,v)=>`<label class="fl"><span>${l}</span><input id="${id}" ${a} value="${esc(v)}"></label>`;
/* click & collect code: order number + PIN the customer quotes at the shop */
const ccode=(o,big)=>o&&o.fulfilment!=='delivery'&&o.collection_pin?`<div class="ccode${big?' big':''}"><small>Show or say this at the shop</small><b>${esc(o.order_number)} · PIN ${esc(o.collection_pin)}</b><span>Bring this when you collect</span></div>`:'';
if(!document.getElementById('ccss')){const st=document.createElement('style');st.id='ccss';st.textContent=`.ccode{margin:12px 0;padding:12px 14px;border:2px dashed #1f6f66;border-radius:14px;background:#effaf7;text-align:center}.ccode small{display:block;color:#475569;font-size:12px}.ccode b{display:block;font-size:20px;letter-spacing:.04em;color:#0f3d3a;margin:2px 0}.ccode span{font-size:12px;color:#64748b}.ccode.big b{font-size:28px}.ocard .ccode{margin:8px 0 0;padding:8px}.ocard .ccode b{font-size:16px}`;document.head.appendChild(st)}
window.P3CODE=ccode;
V.placed=function(r){const rate=window.Social?Social.rateHTML(O.lastShopId,O.lastShop||'this shop',r.id,'placed'):'';
  return `<section class="sec narrow"><div class="done-c"><div class="tick">${svg('check')}</div><h2>Order placed!</h2><p>Your order number is</p><div class="ono">${esc(r.order_number)}</div>${ccode({...r,fulfilment:O.lastF},true)}
  <p class="hint">${esc(O.lastShop||'The shop')} has been notified and will confirm shortly. Total ${gbp(r.total)}, to pay ${O.lastF==='delivery'?'on delivery':'on collection'}.</p>
  ${rate}
  <button class="btn full big" data-o="open" data-id="${esc(r.id)}">Track order</button><button class="btn ghost full" data-t="home" style="margin-top:8px">Keep shopping</button></div></section>`};
const chip=s=>`<span class="ost ${s}">${LBL[s]||s}</span>`;
V.orders=function(){
  if(!A.user)return `<div class="empty">${svg('orders')}<br><b>Your orders</b><br><small>Log in to see and track your orders</small><br><br><button class="btn" data-o="login">Log in</button></div>`;
  if(!O.loaded){loadMine();return '<div class="empty">Loading orders…</div>'}
  if(!O.mine.length)return `<div class="empty">${svg('orders')}<br><b>No orders yet</b><br><br><button class="btn" data-t="home">Start shopping</button></div>`;
  return `<section class="sec narrow"><div class="sh"><h2>Your orders</h2></div><div class="lst">${O.mine.map(o=>`<button class="ocard" data-o="open" data-id="${esc(o.id)}">
   <div class="oc-h"><b>${esc(o.shops?.name||'Shop')}</b>${chip(o.status)}</div><div class="oc-m">${esc(o.order_number)} · ${when(o.created_at)} · ${o.order_items?.reduce((a,i)=>a+i.qty,0)||0} items · <b>${gbp(o.total)}</b></div>${['completed','cancelled','rejected'].includes(o.status)?'':ccode(o)}</button>`).join('')}</div></section>`};
function timeline(o){const steps=STEPS[o.fulfilment]||STEPS.collect,ev={};(o.order_events||[]).forEach(e=>ev[e.status]=e);
  const end=['cancelled','rejected'].includes(o.status);const idx=steps.indexOf(o.status);
  let list=steps.map((s,i)=>({s,done:end?!!ev[s]:i<=idx,cur:!end&&i===idx,at:ev[s]?.at}));
  if(end){list=list.filter(x=>x.done);list.push({s:o.status,done:true,cur:true,bad:true,at:ev[o.status]?.at,note:ev[o.status]?.note||o.reject_reason})}
  return `<ol class="tl">${list.map(x=>`<li class="${x.done?'d':''} ${x.cur?'c':''} ${x.bad?'bad':''}"><i></i><div><b>${LBL[x.s]}</b>${x.at?`<small>${when(x.at)}</small>`:''}${x.note?`<small>“${esc(x.note)}”</small>`:''}</div></li>`).join('')}</ol>`}
function odetail(o,owner){const it=o.order_items||[];
  return `<div class="panel">${timeline(o)}</div>
  <div class="panel"><h3 class="ft">${o.fulfilment==='delivery'?'Delivery to':'Collect from'}</h3><p class="hint" style="font-size:14px;color:var(--txt)">${o.fulfilment==='delivery'?esc((o.delivery_address||'')+' '+(o.delivery_postcode||'')):esc((o.shops?.name||'')+', '+(o.shops?.address||A.shop?.address||''))}</p>
   ${owner?`<div class="line"><span>Customer</span><span>${esc(o.customer_name)}</span></div><div class="line"><span>Phone</span><a href="tel:${esc(o.customer_phone)}">${esc(o.customer_phone)}</a></div>`:o.shops?.phone?`<div class="line"><span>Shop phone</span><a href="tel:${esc(o.shops.phone)}">${esc(o.shops.phone)}</a></div>`:''}
   ${o.note?`<div class="line"><span>Note</span><span>${esc(o.note)}</span></div>`:''}${window.CancelBox?CancelBox.html(o):''}</div>
  <div class="panel"><h3 class="ft">Items</h3>${it.map(i=>`<div class="oi"><img src="${esc(i.image||'icon-192.png')}" alt=""><span>${i.qty} × ${esc(i.name)}</span><b>${gbp(i.unit_price*i.qty)}</b></div>`).join('')}
   <div class="line"><span>Subtotal</span><span>${gbp(o.subtotal??o.total)}</span></div>${+o.delivery_fee?`<div class="line"><span>Delivery</span><span>${gbp(o.delivery_fee)}</span></div>`:''}
   <div class="line tot"><b>Total · ${o.payment_method==='pay_on_delivery'?'pay on delivery':'pay on collection'}</b><b>${gbp(o.total)}</b></div></div>`}
V.order=function(id){const o=O.cur;if(!o||o.id!==id){D.get(id).then(x=>{O.cur=x;render()}).catch(e=>toast(e.message));return '<div class="empty">Loading…</div>'}
  return `<section class="sec narrow"><div class="sh"><h2>${esc(o.order_number)}</h2><a href="#" data-t="orders">All orders</a></div><div class="oc-m" style="margin-top:-8px">${esc(o.shops?.name||'')} · ${when(o.created_at)}</div>
  ${['completed','cancelled','rejected'].includes(o.status)?'':ccode(o,true)}${odetail(o,false)}${o.status==='completed'&&window.Social?Social.rateHTML(o.shop_id,o.shops?.name||'this shop',o.id,'done'):''}${o.status==='placed'?`<button class="btn ghost full" data-o="cancel" data-id="${esc(o.id)}">Cancel order</button>`:''}</section>`};
// owner inbox
const NEXT={placed:[['accepted','Accept'],['rejected','Reject']],accepted:{collect:[['ready','Mark ready to collect']],delivery:[['out_for_delivery','Out for delivery']]},ready:[['completed','Collected · complete']],out_for_delivery:[['completed','Delivered · complete']]};
const nexts=o=>{const n=NEXT[o.status];return !n?[]:Array.isArray(n)?n:n[o.fulfilment]};
V.inbox=function(){if(!A.shop)return V.myshop();if(!O.iloaded){loadInbox();return '<div class="empty">Loading orders…</div>'}
  const open=O.inbox.filter(o=>!['completed','cancelled','rejected'].includes(o.status)),L=O.fil==='open'?open:O.inbox.filter(o=>!open.includes(o));
  const nNew=O.inbox.filter(o=>o.status==='placed').length;
  return `<section class="sec"><div class="sh"><h2>Orders ${nNew?`<span class="nbadge">${nNew} new</span>`:''}</h2><a href="#" data-act="go" data-v="myshop">My shop</a></div>
  <div class="live-row"><span class="livedot"></span>${MOCK?'Live updates (mock)':'Live: new orders appear automatically'}${'Notification' in window&&Notification.permission!=='granted'?'<a href="#" data-o="notif">Enable alerts</a>':''}${MOCK?'<a href="#" data-o="sim">Simulate order</a>':''}</div>
  <div class="seg"><button data-o="fil" data-v="open" class="${O.fil==='open'?'on':''}">Open (${open.length})</button><button data-o="fil" data-v="done" class="${O.fil==='done'?'on':''}">Past (${O.inbox.length-open.length})</button></div>
  <div class="lst" style="margin-top:12px">${L.map(o=>`<div class="ocard ${o.status==='placed'?'new':''} ${O.newIds.has(o.id)?'flash':''}">
   <div class="oc-h"><b>${esc(o.order_number)} · ${esc(o.customer_name)}</b>${chip(o.status)}</div>
   <div class="oc-m">${when(o.created_at)} · ${o.fulfilment==='delivery'?'Delivery':'Collect'} · ${o.order_items.reduce((a,i)=>a+i.qty,0)} items · <b>${gbp(o.total)}</b></div>${o.cancel_reason&&window.CancelBox?`<div class="oc-n">${CancelBox.html(o)}</div>`:''}
   <div class="oc-i">${o.order_items.map(i=>`${i.qty}× ${esc(i.name.slice(0,48))}`).join('<br>')}</div>${o.note?`<div class="oc-n">“${esc(o.note)}”</div>`:''}
   <div class="acts">${nexts(o).map(([s,l])=>`<button class="btn ${s==='rejected'?'ghost':''}" data-o="st" data-id="${esc(o.id)}" data-v="${s}">${l}</button>`).join('')}
   ${['accepted','ready','out_for_delivery'].includes(o.status)?`<button class="btn ghost" data-o="st" data-id="${esc(o.id)}" data-v="cancelled">Cancel</button>`:''}<a class="btn ghost" href="tel:${esc(o.customer_phone)}">Call</a></div></div>`).join('')||'<div class="empty">No orders here yet</div>'}</div></section>`};
const _my=V.myshop;V.myshop=function(){const h=_my();if(!A.shop)return h;const n=O.inbox.filter(o=>o.status==='placed').length,op=O.inbox.filter(o=>['placed','accepted','ready','out_for_delivery'].includes(o.status)).length;
  return h.replace('<div class="stats">',`<button class="tile ${n?'hot':''}" data-o="inbox">${svg('orders')}<span><b>Orders inbox${n?` · ${n} new`:''}</b><small>${op} open order${op===1?'':'s'}</small></span></button><div class="stats">`)};

// ---------- loaders, realtime ----------
async function loadMine(){try{O.mine=await D.mine()}catch(e){toast(e.message)}O.loaded=true;if(cur[0]==='orders'||cur[0]==='account')render()}
async function loadInbox(){try{O.inbox=await D.inbox()}catch(e){toast(e.message)}O.iloaded=true;badge();if(['inbox','myshop'].includes(cur[0]))render()}
function badge(){const n=O.inbox.filter(o=>o.status==='placed').length;const t=document.querySelector('.tabs [data-t=account]');if(!t)return;let b=t.querySelector('.ob');if(!b){b=document.createElement('b');b.className='badge ob';t.appendChild(b)}b.textContent=n;b.classList.toggle('hidden',!n)}
function ding(){try{const c=new (window.AudioContext||window.webkitAudioContext)();[880,1320].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.2,c.currentTime+i*.18);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.18+.3);o.start(c.currentTime+i*.18);o.stop(c.currentTime+i*.18+.32)})}catch{}}
function alertNew(o){ding();let b=$('#nbanner');if(!b){b=document.createElement('button');b.id='nbanner';document.body.appendChild(b)}
  b.innerHTML=`${svg('orders')}<span><b>New order ${esc(o.order_number||'')}</b><small>${esc(o.customer_name||'')} · ${gbp(o.total||0)} · tap to view</small></span>`;b.dataset.o='inbox';b.className='on';clearTimeout(b._t);b._t=setTimeout(()=>b.className='',8000);
  if('Notification' in window&&Notification.permission==='granted'&&document.hidden)try{new Notification('New ShopNip order '+(o.order_number||''),{body:`${o.customer_name||''} · ${gbp(o.total||0)}`,icon:'icon-192.png'})}catch{}}
async function onOwnerChange(p){const isNew=p.eventType==='INSERT';await loadInbox();if(isNew){O.newIds.add(p.new.id);alertNew(O.inbox.find(o=>o.id===p.new.id)||p.new);setTimeout(()=>{O.newIds.delete(p.new.id)},6000)}}
function startLive(){if(MOCK||!sb)return;if(A.shop)D.live('shop_id=eq.'+A.shop.id,onOwnerChange);else if(A.user)D.live('customer_id=eq.'+A.user.id,async()=>{await loadMine();if(O.cur){O.cur=await D.get(O.cur.id);if(cur[0]==='order')render()}})}

// ---------- actions ----------
document.addEventListener('click',async e=>{const el=e.target.closest('[data-o]');if(!el)return;e.preventDefault();const a=el.dataset.o,i=+el.dataset.i;
  if(a==='inc'||a==='dec'){const b=B()[i];if(a==='inc'){if(b.stock!=null&&b.qty>=b.stock)return toast(`Only ${b.stock} in stock`);b.qty++}else if(--b.qty<1)B().splice(i,1);saveB();return render()}
  if(a==='clear'){S.basket=[];saveB();return render()}
  if(a==='checkout'){CO.err='';await prepCheckout();return route('checkout')}
  if(a==='login'){P3.after=B().length?'checkout':'orders';P2.A.tab='login';return route('account')}
  if(a==='open'){O.cur=null;return route('order',el.dataset.id)}
  if(a==='cancel'){const pack=window.CancelBox?await CancelBox.ask('customer'):null;if(!pack)return;pack.role='customer';try{await D.status(el.dataset.id,'cancelled',pack.note,pack);O.cur=await D.get(el.dataset.id);O.loaded=false;toast('Order cancelled');render()}catch(err){toast(err.message)}return}
  if(a==='inbox'){$('#nbanner')?.classList.remove('on');O.iloaded=false;route('inbox');return}
  if(a==='fil'){O.fil=el.dataset.v;return render()}
  if(a==='st'){const st=el.dataset.v;let note=null,pack=null;if(st==='rejected'){note=prompt('Reason for rejecting (shown to the customer)','Sorry, we can’t fulfil this order right now');if(note===null)return}
    if(st==='cancelled'){pack=window.CancelBox?await CancelBox.ask('seller'):null;if(!pack)return;pack.role='seller';note=pack.note}
    el.disabled=true;try{await D.status(el.dataset.id,st,note,pack);O.inbox=await D.inbox();badge();toast(LBL[st]);render()}catch(err){toast(err.message);el.disabled=false}return}
  if(a==='notif'){const r=await Notification.requestPermission();toast(r==='granted'?'Alerts on while ShopNip is open':'Alerts blocked in browser settings');return render()}
  if(a==='sim'){const l=M.listings.filter(x=>x.active&&x.stock>1).slice(0,2);const id='o'+(M.orders.length+1);
    M.orders.unshift({id,order_number:'NB-'+(1001+M.orders.length),shop_id:A.shop.id,customer_id:'u9',customer_name:'Tom Reed',customer_phone:'07700 900456',fulfilment:'delivery',delivery_address:'4 Mill Lane',delivery_postcode:'LE1 6AB',status:'placed',subtotal:l.reduce((t,x)=>t+x.retail_price,0),delivery_fee:2.5,total:l.reduce((t,x)=>t+x.retail_price,0)+2.5,payment_method:'pay_on_delivery',created_at:new Date().toISOString(),order_items:l.map(x=>({listing_id:x.id,name:x.name,image:x.image,unit_price:x.retail_price,qty:1})),order_events:[{status:'placed',at:new Date().toISOString()}]});
    return onOwnerChange({eventType:'INSERT',new:{id}})}
});
document.addEventListener('change',e=>{if(e.target.name==='ful'){CO.f=e.target.value;render()}});
document.addEventListener('submit',async e=>{if(e.target.dataset.form!=='order')return;e.preventDefault();e.stopImmediatePropagation();const btn=$('#placebtn'),v=id=>($('#'+id)?.value||'').trim();CO.err='';
  const a={shop:bShop(),items:B().map(b=>({listing_id:b.listing_id,qty:b.qty})),fulfilment:CO.f,name:v('c_name'),phone:v('c_phone'),address:v('c_addr'),postcode:v('c_pc').toUpperCase(),note:v('c_note')};
  if(!/^[0-9+\s()-]{10,16}$/.test(a.phone)){CO.err='Please enter a valid UK phone number.';return render()}
  btn.disabled=true;btn.textContent='Placing order…';
  try{const r=await placeOrder(a);scrollTo(0,0);route('placed',r)}
  catch(err){CO.err=err.message||String(err);render()}},true);
// shared order-creation path (checkout form + p13 chat): geocode delivery postcode, place via RPC/mock, clear basket
async function placeOrder(a){if(a.fulfilment==='delivery'){const g=await lookupPostcode(a.postcode).catch(()=>{throw new Error('We could not find that postcode.')});a.lat=g.lat;a.lng=g.lng;a.postcode=g.pc}
  window.CK&&CK.set({name:a.name,phone:a.phone,addr:a.address});
  const r=await D.place(a);O.lastShop=B()[0]?.shop_name;O.lastShopId=a.shop;O.lastF=a.fulfilment;S.basket=[];saveB();O.loaded=false;return r}

window.P3={orders:()=>({list:O.mine,loaded:O.loaded,load:loadMine}),add:(p,q)=>addToBasket(p,q),sheet:p=>sheet(p),prep:()=>prepCheckout(),place:a=>placeOrder(a),shop:id=>D.shop(id),basketShop:()=>bShop(),subtotal:()=>sub(),after:null,async init(){
  if(MOCK){M.orders=M.orders||[];
    if(M.shops[0]&&!Q.get('noorders')){const L=M.listings,s=M.shops[0],mk=(n,st,f,items,mins,cust,ev)=>{const st2=items.reduce((t,[l,q])=>t+l.retail_price*q,0),fee=f==='delivery'?2.5:0,t0=Date.now()-mins*60000;
      M.orders.push({id:'o'+n,order_number:'NB-'+(1000+n),collection_pin:f==='collect'?String(4800+n*7):null,shop_id:s.id,customer_id:cust==='Priya Shah'?'u1':'u'+n,customer_name:cust,customer_phone:'07700 900'+(100+n),fulfilment:f,delivery_address:f==='delivery'?'22 Granby Street':null,delivery_postcode:f==='delivery'?'LE1 6FB':null,
       note:n===3?'Please gift wrap the balloon box':null,status:st,subtotal:st2,delivery_fee:fee,total:st2+fee,payment_method:f==='delivery'?'pay_on_delivery':'pay_on_collection',created_at:new Date(t0).toISOString(),shops:{name:s.name,phone:s.phone,address:s.address},
       order_items:items.map(([l,q])=>({listing_id:l.id,sku:l.sku,name:l.name,image:l.image,unit_price:l.retail_price,qty:q})),order_events:ev.map((e,i)=>({status:e,at:new Date(t0+i*9*60000).toISOString()}))})};
     mk(3,'placed','collect',[[L[3],1],[L[1],2]],4,'Sam Patel',['placed']);mk(2,'accepted','delivery',[[L[0],3]],38,'Priya Shah',['placed','accepted']);mk(1,'completed','collect',[[L[4],2]],1500,'Jo King',['placed','accepted','ready','completed'])}
    if(Q.get('basket')){const L=M.listings.filter(l=>l.active);S.basket=[L[0],L[2],L[4]].map((l,i)=>({listing_id:l.id,sku:l.sku,name:l.name,image:l.image,price:l.retail_price,qty:i?1:2,shop_id:'s1',shop_name:M.shops[0].name,stock:l.stock}));saveB();
      S.me={lat:52.636,lng:-1.13};S.pc='LE1 6FB'}
    if(!S.shops.find(s=>s.id==='s1')&&M.shops[0])S.shops.push({...M.shops[0]});
    M.listings.forEach(l=>{if(!S.products.find(p=>p.listing_id===l.id)&&l.active)S.products.push({listing_id:l.id,sku:l.sku,name:l.name,images:[l.image],price:l.retail_price,shop_id:l.shop_id,stock:l.stock,category:l.category})})}
  if(A.shop)loadInbox();startLive();
  if(sb&&!MOCK)sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_IN'){O.loaded=false;setTimeout(()=>{startLive();if(A.shop)loadInbox();if(P3.after){const t=P3.after;P3.after=null;t==='checkout'?prepCheckout().then(()=>route('checkout')):route(t)}},400)}if(ev==='SIGNED_OUT'){O.mine=[];O.inbox=[];O.loaded=false;badge()}});
  const v=Q.get('view');
  if(v==='checkout'){await prepCheckout();window.P2_START='checkout'}
  if(v==='inbox'){O.inbox=await D.inbox();O.iloaded=true;window.P2_START='inbox'}
  if(v==='orders')window.P2_START='orders';
  if(v==='order'){O.cur=await D.get(Q.get('id')||'o2');window.P2_START='orderdetail'}
  if(v==='placed'){const p=M.listings[0];window.P2_START='placedmock'}
  if(v==='sheet'){window.P2_START='home';}if(v==='sheet')setTimeout(()=>sheet(S.products.find(p=>p.listing_id)),300);
}};
V.orderdetail=()=>V.order(O.cur.id);
V.placedmock=()=>{O.lastShop=M.shops[0].name;O.lastShopId=M.shops[0].id;O.lastF='collect';return V.placed({id:'o3',order_number:'NB-1003',total:M.orders.find(o=>o.id==='o3').total})};
})();
