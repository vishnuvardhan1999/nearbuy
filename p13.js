// ShopNip (a NuvonHub product) · Phase 13: guided order chat. Rule-based (no AI API, no payments).
// Builds the normal basket via P3.add and places the order via P3.place (same path as checkout), so it lands in the seller's inbox.
(function(){
if(!window.P3||!window.P2)return;const A=P2.A,toast=P2.toast;
const C={open:false,step:'shop',shop:null,L:[],f:null,d:{},log:[],busy:false};
const PH=/^[0-9+\s()-]{10,16}$/;
const ico='<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>';
const el=document.createElement('div');el.id='nbchat';
el.innerHTML=`<button class="cb-fab" aria-label="Order by chat">${ico}<span>Order by chat</span></button>
<div class="cb-win" role="dialog" aria-label="ShopNip order assistant"><div class="cb-h"><span class="cb-av">S</span><div><b>ShopNip assistant</b><small>Order in a few taps · pay at the shop</small></div><button class="cb-x" data-c="close" aria-label="Close">✕</button></div>
<div class="cb-log" aria-live="polite"></div><div class="cb-q"></div>
<form class="cb-in"><input placeholder="Type a product or answer…" autocomplete="off" aria-label="Message"><button aria-label="Send"><svg viewBox="0 0 24 24"><path d="M4 12 20 4l-6 16-3-7z"/></svg></button></form></div>`;
document.body.appendChild(el);
const log=el.querySelector('.cb-log'),qr=el.querySelector('.cb-q'),inp=el.querySelector('.cb-in input');
const say=(h,me)=>{const m=document.createElement('div');m.className='cb-m '+(me?'me':'bot');m.innerHTML=h;log.appendChild(m);log.scrollTop=log.scrollHeight};
const bot=h=>say(h),me=t=>say(esc(t),1);
const quick=(arr,ph)=>{qr.innerHTML=arr.map(([l,v,c])=>`<button type="button" class="${c||''}" data-c="q" data-v="${esc(v)}">${l}</button>`).join('');inp.placeholder=ph||'Type a message…'};
const items=()=>S.basket.filter(b=>b.shop_id===C.shop?.id);
const bsum=()=>items().map(b=>`${b.qty} × ${esc(b.name)} <b>${gbp(b.price*b.qty)}</b>`).join('<br>');
const shops=()=>S.shops.filter(s=>!s.demo);
const toP=l=>({listing_id:l.id,sku:l.sku,name:l.name,images:[l.image],price:+l.retail_price,shop_id:C.shop.id,stock:l.stock});

function start(){log.innerHTML='';C.step='shop';C.f=null;C.d={...(window.CK?CK.get():{})};
  bot(`Hi${A.profile?.full_name?' '+esc(A.profile.full_name.split(' ')[0]):''}! I can take your order and send it straight to the shop. You pay when you collect or on delivery.`);
  const here=cur[0]==='shop'&&A.view?A.view:null,bs=P3.basketShop();
  if(here)return pickShop(here.id);
  if(bs)return bot(`You already have items from <b>${esc(S.basket[0].shop_name)}</b> in your basket.`),quick([['Continue with '+esc(S.basket[0].shop_name),'s:'+bs,'pri'],['Choose another shop','other']]);
  askShop()}
function askShop(){C.step='shop';const L=shops();
  if(!L.length)return bot('No shops are taking orders near you right now.'),quick([]);
  bot('Which shop would you like to order from?');quick(L.slice(0,8).map(s=>[esc(s.name),'s:'+s.id]),'Type a shop name…')}
async function pickShop(id){C.busy=true;try{C.shop=await P3.shop(id);C.L=(await P2.DB.shopListings(id)).filter(l=>l.active!==false&&(l.shop_id==null||l.shop_id===id));}catch(e){C.busy=false;return bot('Sorry, I could not load that shop. '+esc(e.message||''))}C.busy=false;
  if(!C.shop)return bot('Sorry, I could not find that shop.'),askShop();
  bot(`Great, ordering from <b>${esc(C.shop.name)}</b>${C.shop.opening_hours?`<br><small>Hours: ${esc(C.shop.opening_hours)}</small>`:''}`);askItems()}
function askItems(){C.step='items';const n=items().length;
  bot(n?`Your basket:<br>${bsum()}<br>Search for more, or carry on.`:'What are you looking for? Type a product, e.g. <i>envelopes</i>, <i>tape</i> or <i>pens</i>.');
  const cats=[...new Set(C.L.map(l=>l.category).filter(Boolean))].slice(0,4);
  quick([...(n?[['Done, next step','done','pri']]:[]),...cats.map(c=>[esc(c),'f:'+c])],'Search products…')}
function search(t){const w=t.toLowerCase().split(/\s+/).filter(x=>x.length>1).map(x=>x.replace(/s$/,''));
  const sc=l=>{const h=(l.name+' '+(l.category||'')).toLowerCase();return w.reduce((a,x)=>a+(h.includes(x)?1:0),0)};
  const r=C.L.map(l=>[l,sc(l)]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
  if(!r.length)return bot(`I couldn't find “${esc(t)}” at ${esc(C.shop.name)}. Try another word.`);
  bot(`Here's what I found:<div class="cb-ps">${r.map(l=>`<div class="cb-p"><img src="${esc(l.image||'icon-192.png')}" alt=""><div><span>${esc(l.name)}</span><b>${gbp(l.retail_price)}</b>${l.stock===0?'<small>Out of stock</small>':''}</div><button type="button" data-c="add" data-id="${esc(l.id)}" ${l.stock===0?'disabled':''} aria-label="Add ${esc(l.name)}">Add</button></div>`).join('')}</div>`)}
function add(id){const l=C.L.find(x=>x.id===id);if(!l)return;if(P3.add(toP(l),1)){const b=items().find(x=>x.listing_id===id);bot(`Added <b>${esc(l.name)}</b>${b&&b.qty>1?' (now '+b.qty+')':''}. Basket total ${gbp(P3.subtotal())}.`);
  quick([['Done, next step','done','pri'],['Search again','more']],'Search more products…')}}
function askFul(){C.step='ful';const d=C.shop.delivery_options||{},o=[];
  if(d.collect!==false)o.push(['Click &amp; collect · free','collect','pri']);
  if(d.delivery)o.push([`Local delivery · ${gbp(d.delivery_fee||0)}`,'delivery']);
  bot('How would you like to get it?');quick(o)}
function ask(k){C.step=k;const v=C.d[k==='addr'?'addr':k];
  const Q={name:'What name should the shop put on the order?',phone:'And your mobile number, so the shop can reach you?',addr:'What is the delivery address?',pc:'And the postcode?',note:'Any note for the shop? (optional)'};
  bot(Q[k]);quick(k==='note'?[['No note','-']]:v?[[esc('Use '+v),'=']]:[],k==='phone'?'e.g. 07700 900123':'Type here…')}
const NEXT={name:'phone',phone:'addr',addr:'pc',pc:'note'};
function nextAfter(k){let n=NEXT[k];if(C.f!=='delivery'&&(n==='addr'))n='note';n?ask(n):confirmStep()}
function confirmStep(){C.step='confirm';const d=C.shop.delivery_options||{},fee=C.f==='delivery'?+(d.delivery_fee||0):0,s=P3.subtotal();
  bot(`<div class="cb-sum"><b>${esc(C.shop.name)}</b><br>${bsum()}<hr>${fee?`Delivery <b>${gbp(fee)}</b><br>`:''}Total <b>${gbp(s+fee)}</b> · pay ${C.f==='delivery'?'on delivery':'on collection'}<hr>
   ${C.f==='delivery'?'Deliver to '+esc(C.d.addr+', '+C.d.pc):'Click &amp; collect · '+esc(C.shop.address||'')}<br>${esc(C.d.name)} · ${esc(C.d.phone)}${C.d.note?'<br>“'+esc(C.d.note)+'”':''}</div>Shall I place this order?`);
  quick([['Place order · '+gbp(s+fee),'place','pri'],['Edit items','edit'],['Start over','restart']])}
async function place(){if(!A.user){window.CK&&CK.set({name:C.d.name,phone:C.d.phone,addr:C.d.addr||''});
    bot('Please log in so you can track your order. Your basket is saved and checkout will be ready for you.');qr.innerHTML='<button type="button" class="pri" data-o="login">Log in to finish</button>';return}
  if(C.busy)return;C.busy=true;quick([]);bot('<span class="cb-dots"><i></i><i></i><i></i></span> Placing your order…');
  try{const r=await P3.place({shop:C.shop.id,items:items().map(b=>({listing_id:b.listing_id,qty:b.qty})),fulfilment:C.f,name:C.d.name,phone:C.d.phone,address:C.f==='delivery'?C.d.addr:'',postcode:C.f==='delivery'?(C.d.pc||'').toUpperCase():'',note:C.d.note||''});
    log.lastChild.remove();C.step='done';bot(`<div class="cb-ok">✓ Order <b>${esc(r.order_number)}</b> placed</div>${esc(C.shop.name)} has been notified and will confirm shortly. Total ${gbp(r.total)}.`);
    qr.innerHTML=`<button type="button" class="pri" data-c="track" data-id="${esc(r.id)}">Track order</button><button type="button" data-c="q" data-v="restart">New order</button>`}
  catch(e){log.lastChild.remove();bot('Sorry, that did not go through: '+esc(e.message||String(e)));quick([['Try again','place','pri'],['Edit items','edit']])}
  C.busy=false}
function handle(v,label){if(C.busy)return;if(label)me(label);
  if(v==='restart')return start();if(v==='other')return askShop();if(v.startsWith('s:'))return pickShop(v.slice(2));
  if(C.step==='shop'){const t=v.toLowerCase(),s=shops().find(x=>x.name.toLowerCase().includes(t));return s?pickShop(s.id):bot(`I couldn't find a shop called “${esc(v)}”.`)}
  if(v==='edit'||v==='more')return askItems();
  if(C.step==='items'){if(v==='done')return items().length?askFul():bot('Add at least one item first.');if(v.startsWith('f:')){const c=v.slice(2);return bot(`Popular in ${esc(c)}:`),search(c)}return search(v)}
  if(C.step==='ful'){if(v!=='collect'&&v!=='delivery')return bot('Please pick one of the options below.');C.f=v;return ask('name')}
  if(['name','phone','addr','pc','note'].includes(C.step)){const k=C.step;let x=v==='='?C.d[k]:v==='-'?'':v.trim();
    if(k==='name'&&x.length<2)return bot('Please type your name.');
    if(k==='phone'&&!PH.test(x))return bot('That doesn’t look like a valid UK phone number. Try again?');
    if(k==='pc'&&!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(x))return bot('Please enter a full UK postcode, e.g. WD25 8HL.');
    if(k==='addr'&&x.length<4)return bot('Please type the street address.');
    C.d[k]=k==='note'?x.slice(0,500):x;return nextAfter(k)}
  if(C.step==='confirm'&&v==='place')return place();
  bot('Tap one of the options below, or type a product to search.')}
el.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(e.target.closest('.cb-fab')){C.open=!C.open;el.classList.toggle('on',C.open);if(C.open){if(!log.children.length||C.step==='done')start();setTimeout(()=>inp.focus({preventScroll:true}),150)}return}
  if(!b)return;e.preventDefault();e.stopPropagation();const c=b.dataset.c;
  if(c==='close'){C.open=false;el.classList.remove('on');return}
  if(c==='q')return handle(b.dataset.v,b.textContent);
  if(c==='add')return add(b.dataset.id);
  if(c==='track'){C.open=false;el.classList.remove('on');document.body.insertAdjacentHTML('beforeend',`<i data-o="open" data-id="${esc(b.dataset.id)}" id="cbtrk"></i>`);const t=$('#cbtrk');t.click();t.remove()}});
el.querySelector('.cb-in').addEventListener('submit',e=>{e.preventDefault();const t=inp.value.trim();if(!t)return;inp.value='';handle(C.step==='items'||C.step==='shop'?t:t,t)});
window.P13={open(){if(!C.open)el.querySelector('.cb-fab').click()},state:C};
})();
