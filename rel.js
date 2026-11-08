/* rel.js: order reliability for ShopNip (customer + seller).
   - stock check on accept, customer substitution choice, total never goes up
   - no auto-accept: sound -> SMS/WhatsApp -> call -> decline + instant refund
   - pause/busy + auto-pause after missed orders
   - live delivery status with promised time + late notice
   - proof of delivery, one-owner problem cases, instant refunds on decline
   Shared state lives in localStorage (nb_rel) so the customer tab, seller tab and
   support.html see the same order in ?mock=1. Live hooks (Supabase/Twilio) fail safe. */
(()=>{
const Q=new URLSearchParams(location.search);
const FAST=Q.get('fast')==='1';
const MIN=60000;
const T={accept:FAST?60e3:15*MIN,sms:FAST?15e3:3*MIN,call:FAST?35e3:8*MIN,caseReply:FAST?60e3:2*60*MIN,late:15*MIN};
const MISSED_PAUSE=2;
const KEY='nb_rel';
const PREFS={refund:'Refund it',swap:'Swap for the same price or less',ask:'Ask me first'};
const STAGES=['accepted','picking','out_for_delivery','completed'];
const STAGE_LBL={placed:'Waiting for the shop',accepted:'Accepted',picking:'Picking your items',ready:'Ready to collect',out_for_delivery:'Out for delivery',completed:'Delivered',rejected:'Declined',cancelled:'Cancelled',awaiting_customer:'Waiting for your choice'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp=n=>'£'+(Math.round((+n||0)*100)/100).toFixed(2);
const hm=t=>new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
const onSeller=/seller\.html/i.test(location.pathname);
const onSupport=/support\.html/i.test(location.pathname);
const isMock=()=>Q.get('mock')==='1'||(window.NBSeller&&NBSeller.MOCK)||(window.P2&&P2.MOCK);
function toast(m){try{(window.NBSeller&&NBSeller.toast||window.P2&&P2.toast||window.toast||console.log)(m)}catch(_){console.log(m)}}

/* ---------- store ---------- */
function load(){try{return JSON.parse(localStorage[KEY]||'{}')}catch(_){return {}}}
function save(s){try{localStorage[KEY]=JSON.stringify(s)}catch(_){/* quota: drop photos */try{Object.values(s.orders||{}).forEach(o=>{if(o.proof)o.proof.photo=null;if(o.case)o.case.photo=null});localStorage[KEY]=JSON.stringify(s)}catch(__){}}}
function st(){const s=load();s.orders=s.orders||{};s.shops=s.shops||{};return s}
function get(num){return st().orders[num]||null}
function put(num,patch){const s=st();const o=s.orders[num]=Object.assign(s.orders[num]||{num},patch);save(s);emit();return o}
function shop(id){return st().shops[id]||{paused:false,missed:0}}
function putShop(id,patch){const s=st();s.shops[id]=Object.assign(s.shops[id]||{paused:false,missed:0},patch);save(s);emit();return s.shops[id]}
const subs=new Set();function emit(){subs.forEach(f=>{try{f()}catch(_){}})}
addEventListener('storage',e=>{if(e.key===KEY)emit()});
function notify(num,msg,kind){const o=get(num)||{num};const n=(o.notices||[]).concat([{at:Date.now(),msg,kind:kind||'info'}]);put(num,{notices:n});if(!onSeller)toast(msg)}

/* ---------- money: total can only go down ---------- */
function lineTotal(i){return (+i.unit_price||0)*(+i.qty||0)}
function recompute(o){
  const items=o.items||[];
  let sub=0;items.forEach(i=>{if(i.refunded)return;if(i.swap&&i.swap.accepted)sub+=Math.min(+i.swap.price,+i.unit_price)*i.qty;else if(i.swap&&!i.swap.accepted&&i.swap.dearerOk)sub+=+i.swap.price*i.qty;else sub+=lineTotal(i)});
  const fee=+o.delivery_fee||0;let total=Math.round((sub+fee)*100)/100;
  const cap=+o.total_at_place;if(cap&&total>cap&&!o.dearer_ok)total=cap; // never up without a yes
  return total}
function refund(num,amount,reason){
  const o=get(num);if(!o||!(amount>0))return o;
  const r={amount:Math.round(amount*100)/100,reason,at:Date.now(),method:'none'};
  try{if(window.WAL&&typeof WAL.refund==='function'){WAL.refund(num,r.amount,reason);r.method='wallet'}
      else if(window.WAL&&typeof WAL.credit==='function'){WAL.credit(r.amount,reason+' · '+num);r.method='wallet'}}catch(_){}
  put(num,{refunds:(o.refunds||[]).concat([r])});
  const how=r.method==='wallet'?'back in your ShopNip wallet now':(o.paid?'refunded to your card now':'taken off what you pay — nothing was charged');
  notify(num,`Refunded now: ${gbp(r.amount)} (${reason}), ${how}.`,'good');
  return get(num)}

/* ---------- order lifecycle ---------- */
function promisedAt(o){
  if(o.promised_at)return o.promised_at;
  const w=o.delivery_window;if(w){const m=String(w).match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);if(m){const d=new Date(o.placed_at||Date.now());d.setHours(+m[3],+m[4],0,0);if(d.getTime()<(o.placed_at||0))d.setDate(d.getDate()+1);return d.getTime()}}
  return (o.placed_at||Date.now())+(o.fulfilment==='delivery'?60:30)*MIN}
function onPlaced(snap){
  const now=Date.now();
  const o=put(snap.num,Object.assign({placed_at:now,status:'placed',deadline:now+T.accept,escal:[],notices:[],refunds:[]},snap));
  put(snap.num,{promised_at:promisedAt(o)});
  notify(snap.num,`Order sent to ${snap.shop_name||'the shop'}. They have ${FAST?'1 minute (test mode)':'15 minutes'} to accept and check every item, or we decline it for you and you pay nothing.`);
}
function setStatus(num,status,extra){const o=get(num);if(!o)return;const ev=(o.events||[]).concat([{status,at:Date.now()}]);return put(num,Object.assign({status,events:ev},extra||{}))}
/* seller confirms accept with per-item stock. stock: {idx:true|false}, swaps: {idx:{name,price}} */
function accept(num,stock,swaps){
  const o=get(num);if(!o)return null;const items=(o.items||[]).map((i,ix)=>Object.assign({},i,{in_stock:stock[ix]!==false}));
  const out=items.filter(i=>!i.in_stock);
  put(num,{items,stock_checked_at:Date.now()});
  if(!out.length){setStatus(num,'accepted');notify(num,'Accepted. The shop has checked every item and it’s all in stock.','good');return get(num)}
  const keyOut=out.filter(i=>i.key);
  if(keyOut.length&&o.cancel_if_key){
    setStatus(num,'cancelled',{cancel_reason:'key_item_missing'});
    notify(num,`${keyOut.map(i=>i.name).join(', ')} is out of stock, and you asked us to cancel if that happened. Order cancelled.`,'bad');
    const paid=o.refunds&&o.refunds.length?0:recompute(o);refund(num,paid,'order cancelled');return get(num)}
  const pref=o.pref||'ask';
  items.forEach((i,ix)=>{if(i.in_stock)return;
    if(pref==='refund'){i.refunded=true}
    else if(pref==='swap'){const s=swaps&&swaps[ix];if(s&&+s.price<=+i.unit_price){i.swap={name:s.name,price:+s.price,accepted:true}}else i.refunded=true}
    else {i.pending=true;const s=swaps&&swaps[ix];if(s)i.swap={name:s.name,price:+s.price,accepted:false,dearer:+s.price>+i.unit_price}}});
  const before=+o.total_at_place||recompute(o);
  put(num,{items});const now=get(num);const after=recompute(now);put(num,{total:after});
  const names=out.map(i=>i.name).join(', ');
  if(pref==='ask'){setStatus(num,'accepted',{awaiting_customer:true});notify(num,`Accepted, but ${names} ${out.length>1?'are':'is'} out of stock. Choose what you’d like below${keyOut.length?' — or cancel the order if you need that item':''}.`,'warn')}
  else{setStatus(num,'accepted');const sw=items.filter(i=>i.swap&&i.swap.accepted);notify(num,`Accepted. Out of stock: ${names}. ${sw.length?'Swapped for the same price or less: '+sw.map(i=>i.name+' → '+i.swap.name).join(', ')+'. ':''}${keyOut.length?'You can still cancel the order below if you need that item.':''}`,'warn')}
  if(before-after>0.004)refund(num,before-after,'out-of-stock items');
  return get(num)}
/* customer answers an "ask me first" item */
function choose(num,ix,choice){
  const o=get(num);if(!o)return;const items=o.items.slice();const i=Object.assign({},items[ix]);items[ix]=i;const before=recompute(o);
  if(choice==='swap'&&i.swap){i.swap=Object.assign({},i.swap,{accepted:true});if(i.swap.dearer){i.swap.dearerOk=true;i.swap.accepted=false}}
  else i.refunded=true;
  i.pending=false;
  const dearer=choice==='swap'&&i.swap&&i.swap.dearer;
  put(num,{items,dearer_ok:o.dearer_ok||dearer});
  const n=get(num),after=recompute(n);put(num,{total:after,awaiting_customer:n.items.some(x=>x.pending)});
  if(before-after>0.004)refund(num,before-after,i.name+' not available');
  notify(num,choice==='swap'?(dearer?`You agreed to swap to ${i.swap.name} for ${gbp(i.swap.price)}.`:`Swap confirmed: ${i.swap.name}.`):`${i.name} removed and refunded.`,'info')}
function customerCancel(num){const o=get(num);if(!o)return;setStatus(num,'cancelled',{cancel_reason:'customer_key_item'});
  const left=recompute(o)-0;refund(num,left,'order cancelled');notify(num,'Order cancelled. The shop has been told.','info')}
function decline(num,why){const o=get(num);if(!o||['rejected','cancelled'].includes(o.status))return;
  setStatus(num,'rejected',{reject_reason:why});
  notify(num,`Sorry, ${o.shop_name||'the shop'} couldn’t take this order (${why}). You haven’t been left waiting — it’s cancelled now.`,'bad');
  refund(num,recompute(o),'order declined')}
function timeoutDecline(num,from){const o=get(num);if(!o||o.status!=='placed'||o.timed_out)return false;
  put(num,{timed_out:true});decline(num,'no reply in time');
  const sid=o.shop_id||'s1',sh=shop(sid),missed=(sh.missed||0)+1;
  const pause=missed>=MISSED_PAUSE;putShop(sid,{missed,paused:pause||sh.paused,reason:pause?`Paused automatically after ${missed} missed orders`:sh.reason});
  return {missed,paused:pause}}
function stage(num,s){const o=get(num);if(!o)return;setStatus(num,s);
  const msg={picking:'The shop is picking your items now.',out_for_delivery:o.driver==='shop'?'Out for delivery with the shop’s own driver.':'Out for delivery.',completed:'Delivered. Proof of delivery is saved on your order.',ready:'Ready to collect.'}[s];if(msg)notify(num,msg,'good')}
function proof(num,p){put(num,{proof:Object.assign({at:Date.now()},p)})}
/* problem cases: one owner at a time, never "speak to them instead" */
function openCase(num,c){const o=get(num);const now=Date.now();
  put(num,{case:Object.assign({id:'C-'+String(now).slice(-6),opened_at:now,owner:'shop',status:'open',respond_by:now+T.caseReply,log:[{at:now,who:'customer',msg:c.note||'Problem reported'}]},c)});
  notify(num,`Problem reported. ${o&&o.shop_name||'The shop'} owns this case and can resend or refund. If they don’t reply by ${hm(now+T.caseReply)}, ShopNip takes it over — you won’t need to chase anyone.`,'info')}
function resolveCase(num,action,who){const o=get(num);if(!o||!o.case)return;const c=Object.assign({},o.case);
  c.status='resolved';c.resolution=action;c.resolved_by=who;c.log=(c.log||[]).concat([{at:Date.now(),who,msg:action==='refund'?'Refunded':'Resending the item'}]);put(num,{case:c});
  if(action==='refund'){const amt=c.item!=null&&o.items[c.item]?lineTotal(o.items[c.item]):recompute(o);refund(num,amt,'problem with your order')}
  else notify(num,`${who==='shopnip'?'ShopNip':'The shop'} is resending the item at no cost to you.`,'good')}

/* ---------- ticks: escalation, timeouts, late, case takeover ---------- */
function tick(){
  const s=st(),now=Date.now();
  Object.values(s.orders).forEach(o=>{
    if(o.status==='placed'&&o.deadline){
      const esc_=o.escal||[];const add=k=>{if(!esc_.includes(k)){esc_.push(k);put(o.num,{escal:esc_});return true}return false};
      if(onSeller){
        const sinceP=now-o.placed_at,P=window.P33&&NBSeller.D.shop?P33.prefs(NBSeller.D.shop):{sms:true,whatsapp:true,call:false};
        if(add('sound')){try{ding()}catch(_){}toast(`New order ${o.num}: accept within ${FAST?'1 minute':'15 minutes'}`)}
        if(sinceP>=T.sms&&add('text')){const ch=[P.sms&&'SMS',P.whatsapp&&'WhatsApp'].filter(Boolean);if(window.P33&&P33.escalate&&NBSeller.D.shop)P33.escalate(NBSeller.D.shop,o,'reminder');else toast(`Still waiting on ${o.num}: ${ch.length?ch.join(' and ')+' sent':'text alerts are off'}`)}
        if(sinceP>=T.call&&add('call')){toast(`No reply on ${o.num}: calling your phone now`);if(window.P33&&P33.escalate&&NBSeller.D.shop)P33.escalate(NBSeller.D.shop,o,'call')}
      }
      if(now>=o.deadline){const r=timeoutDecline(o.num);if(r&&onSeller){toast(`${o.num} declined: no reply in time. The customer has been refunded.`);if(r.paused)toast('Shop paused after '+r.missed+' missed orders. Unpause when you’re ready.')}}
    }
    if(o.fulfilment==='delivery'&&!['completed','rejected','cancelled'].includes(o.status)&&o.promised_at&&now>o.promised_at+T.late&&!o.late_notified){
      put(o.num,{late_notified:now});notify(o.num,`Sorry, your delivery is running late (promised by ${hm(o.promised_at)}). The shop has been told and it’s still on its way.`,'warn')}
    if(o.case&&o.case.status==='open'&&o.case.owner==='shop'&&now>o.case.respond_by){const c=Object.assign({},o.case,{owner:'shopnip',taken_at:now});c.log=(c.log||[]).concat([{at:now,who:'shopnip',msg:'No reply from the shop, ShopNip has taken over'}]);put(o.num,{case:c});notify(o.num,'The shop didn’t reply in time, so ShopNip now owns your case and will sort it.','info')}
  });
}
function ding(){const c=new (window.AudioContext||window.webkitAudioContext)();[880,1320,880].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.25,c.currentTime+i*.2);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.2+.3);o.start(c.currentTime+i*.2);o.stop(c.currentTime+i*.2+.32)})}
function simulate(num,ms){const o=get(num);if(!o)return;const sh=x=>x&&x-ms;put(num,{placed_at:o.placed_at-ms,deadline:sh(o.deadline),promised_at:sh(o.promised_at),case:o.case?Object.assign({},o.case,{respond_by:o.case.respond_by-ms}):o.case});tick()}

/* ---------- shared UI bits ---------- */
const CSS=`.rel{background:#fff;border:1px solid #e7e9ee;border-radius:14px;padding:14px;margin:14px 0;font-size:14px}.rel h3,.rel h4{margin:0 0 8px;font-size:15px}
.rel .n{padding:10px 12px;border-radius:10px;margin:6px 0;background:#eef6f5;color:#134e4a}.rel .n.warn{background:#fff7e6;color:#8a5300}.rel .n.bad{background:#fff1ee;color:#b42318}.rel .n.good{background:#e9f8ef;color:#146c2e}
.rel .n small{display:block;opacity:.75}.rel .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}.rel .bt{border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:700;background:#0f766e;color:#fff;cursor:pointer;min-height:44px}
.rel .bt.g{background:#fff;color:#0f766e;border:1.5px solid #0f766e}.rel .bt.d{background:#fff;color:#b42318;border:1.5px solid #f1b5a8}.rel .mut{color:#667085;font-size:13px}
.rel .steps{display:flex;gap:4px;margin:8px 0}.rel .steps i{flex:1;height:6px;border-radius:3px;background:#e7e9ee}.rel .steps i.on{background:#0f766e}.rel .sl{display:flex;justify-content:space-between;font-size:12px;color:#667085;gap:4px}
.rel .it{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid #f0f1f4;align-items:center;flex-wrap:wrap}.rel .it s{color:#98a2b3}.rel img.pf{max-width:100%;max-height:220px;border-radius:10px;margin-top:6px}
.rel label.o{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1.5px solid #e7e9ee;border-radius:10px;margin:6px 0;cursor:pointer}.rel label.o:has(input:checked){border-color:#0f766e;background:#f2fbf9}
.rel input[type=text],.rel textarea,.rel select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d5dbd9;border-radius:10px;font:inherit;font-size:16px}
.relm{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center}.relm .rel{width:100%;max-width:520px;max-height:92vh;overflow:auto;margin:0;border-radius:18px 18px 0 0}
@media(min-width:700px){.relm{align-items:center}.relm .rel{border-radius:18px}}
.relpause{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:14px;margin:0 0 14px;background:#e9f8ef;border:1.5px solid #9bd8b0}.relpause.p{background:#fff1ee;border-color:#f1b5a8}
.relpause b{font-size:15px}.relpause .bt{min-height:44px}`;
function css(){if(document.getElementById('relcss'))return;const s=document.createElement('style');s.id='relcss';s.textContent=CSS;document.head.appendChild(s)}
function modal(html,bind){css();const m=document.createElement('div');m.className='relm';m.innerHTML=`<div class="rel" role="dialog">${html}</div>`;m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-x]'))m.remove()});document.body.appendChild(m);bind&&bind(m);return m}
function photo(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const k=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=img.width*k;c.height=img.height*k;c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.7))};img.onerror=()=>res(r.result);img.src=r.result};r.onerror=rej;r.readAsDataURL(file)})}
function stepper(o){const del=o.fulfilment==='delivery',steps=del?STAGES:['accepted','picking','ready','completed'],lbl=del?['Accepted','Picking','Out for delivery','Delivered']:['Accepted','Picking','Ready','Collected'];
  const ix=steps.indexOf(o.status);return `<div class="steps">${steps.map((s,i)=>`<i class="${i<=ix?'on':''}"></i>`).join('')}</div><div class="sl">${lbl.map(l=>`<span>${l}</span>`).join('')}</div>`}
function itemsHTML(o,cust){return (o.items||[]).map((i,ix)=>`<div class="it"><span>${i.qty} × ${i.refunded||i.in_stock===false&&!i.swap?`<s>${esc(i.name)}</s>`:esc(i.name)}${i.key?' <b class="mut">· key item</b>':''}${i.in_stock===false?` <span class="mut">· out of stock${i.refunded?', refunded':''}</span>`:i.in_stock===true?' <span class="mut">· in stock ✓</span>':''}${i.swap?`<br><span class="mut">Swap: ${esc(i.swap.name)} ${gbp(i.swap.price)}${i.swap.accepted?' ✓':''}</span>`:''}</span>
  ${cust&&i.pending&&o.status!=='cancelled'?`<span class="row">${i.swap&&!i.swap.dearer?`<button class="bt" data-rc="swap" data-ix="${ix}">Swap</button>`:''}${i.swap&&i.swap.dearer?`<button class="bt g" data-rc="swap" data-ix="${ix}">Yes, swap for ${gbp(i.swap.price)}</button>`:''}<button class="bt g" data-rc="refund" data-ix="${ix}">Refund it</button></span>`:`<b>${gbp(lineTotal(i))}</b>`}</div>`).join('')}
function noticesHTML(o){return (o.notices||[]).slice(-6).reverse().map(n=>`<div class="n ${n.kind}">${esc(n.msg)}<small>${hm(n.at)}</small></div>`).join('')}

/* ---------- customer side (index.html) ---------- */
function custInit(){
  css();
  let pending=null;
  // checkout: substitution pref + key items, paused shop guard
  const decorateCheckout=()=>{const f=document.querySelector('form[data-form=order]');if(!f||f.querySelector('#relpref'))return;
    const bk=(()=>{try{return JSON.parse(localStorage.nb_basket||'[]')}catch(_){return []}})();const sid=bk[0]&&bk[0].shop_id;const sh=sid&&shop(sid);
    const pay=[...f.querySelectorAll('.panel')].find(p=>/Payment/.test(p.textContent))||f.querySelector('.panel:last-of-type');
    const box=document.createElement('div');box.className='panel';box.id='relpref';
    box.innerHTML=`${sh&&sh.paused?`<div class="alert" role="status">This shop is busy right now and isn’t taking orders. Please try again a little later.</div>`:''}<h3 class="ft">If something is out of stock</h3>
     <div class="rel" style="border:0;padding:0;margin:0">${Object.entries(PREFS).map(([k,l],i)=>`<label class="o"><input type="radio" name="relpref" value="${k}" ${k==='ask'?'checked':''}><span><b>${l}</b><br><span class="mut">${k==='refund'?'We take it off your total straight away.':k==='swap'?'Never dearer than what you chose.':'The shop checks with you before changing anything.'}</span></span></label>`).join('')}
     <p class="mut" style="margin:10px 0 4px">Need any of these? Tick an item to cancel the whole order if it’s out of stock.</p>
     ${bk.map((b,i)=>`<label class="o"><input type="checkbox" name="relkey" value="${i}"><span>${esc(b.qty+' × '+b.name)}</span></label>`).join('')}
     <p class="mut">The shop checks every item when they accept and you’re told straight away. Your total can only go down after you order.</p></div>`;
    pay.parentNode.insertBefore(box,pay);
    if(sh&&sh.paused){const b=f.querySelector('#placebtn');if(b){b.disabled=true;b.textContent='Shop is busy right now'}}};
  addEventListener('submit',e=>{const f=e.target;if(!f.dataset||f.dataset.form!=='order')return;
    const bk=(()=>{try{return JSON.parse(localStorage.nb_basket||'[]')}catch(_){return []}})();const sid=bk[0]&&bk[0].shop_id;
    if(sid&&shop(sid).paused){e.preventDefault();e.stopImmediatePropagation();toast('This shop is busy right now. Please try again later.');return}
    const keys=[...f.querySelectorAll('input[name=relkey]:checked')].map(x=>+x.value);
    const ful=(f.querySelector('input[name=ful]:checked')||{}).value||'collect';
    pending={pref:(f.querySelector('input[name=relpref]:checked')||{}).value||'ask',cancel_if_key:keys.length>0,shop_id:sid,shop_name:bk[0]&&bk[0].shop_name,fulfilment:ful,delivery_window:(f.querySelector('#c_window')||{}).value||null,driver:ful==='delivery'?'shop':null,
      items:bk.map((b,i)=>({name:b.name,qty:b.qty,unit_price:+b.price,listing_id:b.listing_id,key:keys.includes(i)}))}},true);
  // "Order placed" screen -> register order
  const onPlacedView=()=>{const n=document.querySelector('.done-c');if(!n||!pending)return;const mm=n.textContent.match(/NB-\d+/);if(!mm)return;const num=mm[0];if(get(num)){pending=null;return}
    const m=window.P2&&P2.M&&(P2.M.orders||[]).find(o=>o.order_number===num);
    const sub=pending.items.reduce((t,i)=>t+lineTotal(i),0),fee=m?+m.delivery_fee||0:0,total=m?+m.total:sub+fee;
    onPlaced(Object.assign({num,subtotal:sub,delivery_fee:fee,total,total_at_place:total,driver:m&&m.delivery_window?'shopnip':pending.driver},pending));pending=null;
    n.insertAdjacentHTML('beforeend',`<div class="rel" id="relplaced" style="text-align:left"><div class="n">The shop has ${FAST?'1 minute (test mode)':'15 minutes'} to accept and check every item. You’ll see it here straight away.</div></div>`)};
  // order detail
  const decorateOrder=()=>{const sec=[...document.querySelectorAll('#view section.sec')].find(s=>s.querySelector('a[data-t=orders]'));if(!sec)return;
    const num=(sec.querySelector('h2')||{}).textContent;if(!num)return;let o=get(num.trim());
    if(!o){const m=window.P2&&P2.M&&(P2.M.orders||[]).find(x=>x.order_number===num.trim());if(m&&isMock()){o=put(m.order_number,{shop_id:m.shop_id,shop_name:m.shops&&m.shops.name,fulfilment:m.fulfilment,status:m.status,placed_at:Date.parse(m.created_at),deadline:Date.parse(m.created_at)+T.accept,total:+m.total,total_at_place:+m.total,delivery_fee:+m.delivery_fee||0,delivery_window:m.delivery_window,pref:'ask',items:(m.order_items||[]).map(i=>({name:i.name,qty:i.qty,unit_price:+i.unit_price,listing_id:i.listing_id})),notices:[],refunds:[]});put(o.num,{promised_at:promisedAt(o)})}}
    if(!o)return;let box=sec.querySelector('#relbox');if(!box){box=document.createElement('div');box.id='relbox';const anchor=sec.querySelector('.panel');sec.insertBefore(box,anchor||null)}
    const html=custOrderHTML(get(o.num));if(box._h!==html){box.innerHTML=html;box._h=html}
    const r=get(o.num);syncP2(r);
    // keep the older order panels consistent with the live state above
    sec.querySelectorAll('.panel').forEach(p=>{if(p.querySelector('ol.tl')&&p.style.display!=='none')p.style.display='none'});
    const tot=sec.querySelector('.panel .line.tot b:last-child');if(tot&&r.total!=null&&tot.textContent!==gbp(r.total))tot.textContent=gbp(r.total);
    const cb=sec.querySelector('button[data-o=cancel]');if(cb)cb.style.display=r.status==='placed'?'':'none'};
  const run=()=>{decorateCheckout();onPlacedView();decorateOrder()};
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  subs.add(run);setInterval(()=>{tick();run()},4000);
  document.addEventListener('click',async e=>{const t=e.target.closest('[data-rc],[data-rcan],[data-rprob],[data-relgo],[data-rsim]');if(!t)return;e.preventDefault();e.stopPropagation();
    const sec=t.closest('#relbox');const num=t.dataset.relgo||(sec&&sec.dataset.num)||t.dataset.num;
    if(t.dataset.relgo){const m=window.P2&&P2.M&&(P2.M.orders||[]).find(o=>o.order_number===num);if(m)location.href=location.pathname+'?mock=1'+(FAST?'&fast=1':'')+'&view=order&id='+m.id;return}
    if(t.dataset.rc){choose(t.dataset.num,+t.dataset.ix,t.dataset.rc);return}
    if(t.dataset.rcan){if(confirm('Cancel this order? Anything you’d pay is refunded straight away.'))customerCancel(t.dataset.rcan);return}
    if(t.dataset.rsim){simulate(t.dataset.rsim,+t.dataset.ms);return}
    if(t.dataset.rprob)problemModal(t.dataset.rprob)},true);
}
function syncP2(o){if(!o||!window.P2||!P2.M||!P2.M.orders)return;const m=P2.M.orders.find(x=>x.order_number===o.num);if(!m)return;
  const map={picking:'accepted'};const s=map[o.status]||o.status;if(m.status!==s&&s){m.status=s;(m.order_events=m.order_events||[]).push({status:s,at:new Date().toISOString(),note:o.reject_reason})}
  if(o.total!=null&&+o.total<=+m.total)m.total=o.total;if(o.reject_reason)m.reject_reason=o.reject_reason}
function custOrderHTML(o){
  const done=['completed','rejected','cancelled'].includes(o.status);const keyOut=(o.items||[]).some(i=>i.key&&i.in_stock===false);
  const late=o.fulfilment==='delivery'&&!done&&Date.now()>o.promised_at+T.late;
  const refunded=(o.refunds||[]).reduce((t,r)=>t+r.amount,0);
  return `<div class="rel" data-num="${esc(o.num)}"><h3>${esc(STAGE_LBL[o.status]||o.status)}</h3>
  ${['rejected','cancelled'].includes(o.status)?'':stepper(o)}
  ${o.fulfilment==='delivery'&&!['rejected','cancelled'].includes(o.status)?`<p class="mut" style="margin:6px 0">${o.status==='completed'?'Delivered':'Promised by '+hm(o.promised_at)}${o.delivery_window?' · window '+esc(o.delivery_window):''}${o.driver==='shop'?' · shop’s own driver':''}${late?' · <b style="color:#b42318">running late</b>':''}</p>`:''}
  ${o.status==='placed'?`<p class="mut">The shop must accept by ${hm(o.deadline)}. If they don’t, we cancel it and you pay nothing.</p>`:''}
  ${noticesHTML(o)}
  <h4 style="margin-top:12px">Items</h4>${itemsHTML(o,true).replace(/data-rc=/g,`data-num="${esc(o.num)}" data-rc=`)}
  <div class="it"><b>Total now</b><b>${gbp(o.total)}</b></div>${+o.total_at_place&&+o.total<+o.total_at_place?`<p class="mut">Was ${gbp(o.total_at_place)} when you ordered. Totals only ever go down.</p>`:''}
  ${refunded?`<p class="mut">Refunded so far: ${gbp(refunded)}</p>`:''}
  ${o.proof?`<h4 style="margin-top:12px">Proof of delivery</h4><p class="mut">${o.proof.name?'Handed to '+esc(o.proof.name):'Left at the door'} · ${hm(o.proof.at)}</p>${o.proof.photo?`<img class="pf" src="${esc(o.proof.photo)}" alt="Doorstep photo">`:''}`:''}
  ${o.case?caseHTML(o):''}
  <div class="row" style="margin-top:10px">${(keyOut||o.awaiting_customer)&&!done&&o.status!=='out_for_delivery'?`<button class="bt d" data-rcan="${esc(o.num)}">Cancel order</button>`:''}
  ${!o.case&&['accepted','picking','ready','out_for_delivery','completed'].includes(o.status)?`<button class="bt g" data-rprob="${esc(o.num)}">Report a problem</button>`:''}</div>
  ${isMock()?`<p class="mut" style="margin-top:10px">Preview tools: <a href="#" data-rsim="${esc(o.num)}" data-ms="${16*MIN}">skip 16 minutes</a>${o.case&&o.case.status==='open'?` · <a href="#" data-rsim="${esc(o.num)}" data-ms="${T.caseReply+1000}">shop doesn’t reply</a>`:''}</p>`:''}</div>`}
function caseHTML(o){const c=o.case;return `<h4 style="margin-top:12px">Problem ${esc(c.id)}</h4><div class="n ${c.status==='resolved'?'good':''}">${c.status==='resolved'?`Sorted: ${c.resolution==='refund'?'refunded':'item being resent'} by ${c.resolved_by==='shopnip'?'ShopNip':'the shop'}.`:c.owner==='shopnip'?'ShopNip is handling this now. You don’t need to contact the shop.':`${esc(o.shop_name||'The shop')} is handling this and will resend or refund. If they haven’t by ${hm(c.respond_by)}, ShopNip takes over.`}<small>“${esc(c.note||'')}”</small></div>${c.photo?`<img class="pf" src="${esc(c.photo)}" alt="Problem photo">`:''}`}
function problemModal(num){const o=get(num);modal(`<h3>Report a problem · ${esc(num)}</h3>
  <label class="mut">What went wrong?</label><select id="rp_t"><option>Missing item</option><option>Wrong item</option><option>Damaged item</option><option>Not delivered</option><option>Something else</option></select>
  <label class="mut">Which item? (optional)</label><select id="rp_i"><option value="">Whole order</option>${(o.items||[]).map((i,ix)=>`<option value="${ix}">${esc(i.name)}</option>`).join('')}</select>
  <label class="mut">A few words</label><textarea id="rp_n" rows="3" maxlength="400"></textarea>
  <label class="mut">Add a photo</label><input type="file" id="rp_p" accept="image/*" capture="environment">
  <div class="row"><button class="bt" id="rp_go">Send</button><button class="bt g" data-x>Close</button></div><p class="mut">One person owns your case from start to finish.</p>`,m=>{
  m.querySelector('#rp_go').onclick=async()=>{const f=m.querySelector('#rp_p').files[0];let ph=null;try{if(f)ph=await photo(f)}catch(_){}
    const it=m.querySelector('#rp_i').value;openCase(num,{type:m.querySelector('#rp_t').value,item:it===''?null:+it,note:m.querySelector('#rp_t').value+': '+m.querySelector('#rp_n').value.trim(),photo:ph});m.remove()}})}

/* ---------- seller side (seller.html) ---------- */
function sellerInit(){
  const S=window.NBSeller;if(!S)return;css();
  const D=S.D,API=S.API;
  const byId=id=>D.O.find(o=>o.id===id);
  const same=(o,r)=>r&&(!r.items||!r.items.length||!o.order_items||!o.order_items.length||r.items[0].name===o.order_items[0].name);
  const sget=o=>{const r=get(o.order_number);return same(o,r)?r:null};
  const refresh=async()=>{try{D.O=await API.orders()}catch(_){}S.rerender()};
  const ensure=o=>{let r=get(o.order_number);if(r&&!same(o,r))return null;if(!r){r=put(o.order_number,{shop_id:o.shop_id,shop_name:D.shop&&D.shop.name,fulfilment:o.fulfilment,status:o.status,placed_at:o.status==='placed'?Date.now():Date.parse(o.created_at),deadline:(o.status==='placed'?Date.now():Date.parse(o.created_at))+T.accept,total:+o.total,total_at_place:+o.total,delivery_fee:+o.delivery_fee||0,delivery_window:o.delivery_window,driver:o.fulfilment==='delivery'?'shop':null,pref:'ask',items:o.order_items.map(i=>({name:i.name,qty:i.qty,unit_price:+i.unit_price,listing_id:i.listing_id})),notices:[],refunds:[],escal:o.status==='placed'?[]:['sound','text','call']});put(r.num,{promised_at:promisedAt(r)})}return get(o.order_number)};
  // pull customer-tab orders into the mock seller inbox
  const importMock=()=>{if(!S.MOCK||!D.shop)return false;let added=false;Object.values(st().orders).forEach(r=>{if(r.status!=='placed'||D.O.some(o=>o.order_number===r.num)||S.M.O.some(o=>o.order_number===r.num))return;
    S.M.O.unshift({id:'r'+r.num,order_number:r.num,shop_id:D.shop.id,customer_name:'Customer',customer_phone:'',fulfilment:r.fulfilment||'collect',delivery_address:r.fulfilment==='delivery'?'Customer address':null,delivery_window:r.delivery_window,status:'placed',subtotal:r.subtotal,delivery_fee:r.delivery_fee,total:r.total,payment_method:r.fulfilment==='delivery'?'pay_on_delivery':'pay_on_collection',created_at:new Date(r.placed_at).toISOString(),order_items:(r.items||[]).map(i=>({name:i.name,qty:i.qty,unit_price:i.unit_price,listing_id:i.listing_id})),order_events:[{status:'placed',at:new Date(r.placed_at).toISOString()}]});added=true});return added};
  // mirror REL status -> seller order (timeouts, customer cancels)
  const sync=async()=>{let ch=importMock();for(const o of D.O){const r=sget(o);if(!r)continue;
    if(['rejected','cancelled'].includes(r.status)&&!['rejected','cancelled'].includes(o.status)){try{await API.status(o.id,r.status,r.reject_reason||'Cancelled by customer',r.status==='cancelled'?{reason:'other',note:'Cancelled by customer'}:undefined)}catch(_){o.status=r.status}ch=true}
    if(+r.total<+o.total){o.total=r.total;ch=true}}
    const sh=D.shop&&shop(D.shop.id);if(sh&&D.shop.delivery_options&&!!D.shop.delivery_options.paused!==!!sh.paused){D.shop.delivery_options.paused=sh.paused;ch=true}
    if(ch)await refresh()};
  // seed REL for existing placed orders so escalation runs
  const seed=()=>D.O.filter(o=>o.status==='placed').forEach(ensure);
  setInterval(async()=>{seed();tick();await sync();decorate()},4000);
  subs.add(()=>{sync();decorate()});
  // intercept Accept / Reject / Delivered / Ready
  document.addEventListener('click',async e=>{const b=e.target.closest('[data-st]');if(!b)return;const o=byId(b.dataset.id);if(!o)return;const s=b.dataset.st;
    if(s==='accepted'){e.preventDefault();e.stopImmediatePropagation();acceptSheet(o);return}
    if(s==='rejected'){e.stopImmediatePropagation();e.preventDefault();const why=prompt('Reason for declining (the customer sees this and is refunded straight away):','Out of stock, sorry');if(why===null)return;
      try{await API.status(o.id,'rejected',why)}catch(er){return toast(er.message||'Could not decline')}if(ensure(o))decline(o.order_number,why);putShop(o.shop_id,{missed:0});toast('Declined. The customer has been told and refunded now.');refresh();return}
    if(s==='completed'&&o.fulfilment==='delivery'){e.preventDefault();e.stopImmediatePropagation();proofSheet(o);return}
    if(s==='out_for_delivery'){setTimeout(()=>{if(ensure(o))stage(o.order_number,'out_for_delivery')},0)}
    if(s==='ready'){setTimeout(()=>{if(ensure(o))stage(o.order_number,'ready')},0)}
    if(s==='completed'){setTimeout(()=>{if(ensure(o))setStatus(o.order_number,'completed')},0)}},true);
  document.addEventListener('click',async e=>{const t=e.target.closest('[data-rel]');if(!t)return;e.preventDefault();e.stopPropagation();const o=byId(t.dataset.id);const a=t.dataset.rel;
    if(a==='pause'){const sh=shop(D.shop.id),p=!sh.paused;putShop(D.shop.id,{paused:p,missed:p?sh.missed:0,reason:p?'Paused by you':''});try{const dop=Object.assign({},D.shop.delivery_options||{},{paused:p});const x=await API.saveShop({id:D.shop.id,delivery_options:dop});D.shop={...D.shop,...x,delivery_options:dop}}catch(_){}
      toast(p?'Shop paused. Customers can’t order until you reopen.':'Shop open for orders again.');S.rerender();return}
    if(!o||!ensure(o))return;
    if(a==='picking'){stage(o.order_number,'picking');toast('Customer told: picking now');decorate(true)}
    if(a==='driver'){const r=get(o.order_number);put(o.order_number,{driver:r.driver==='shop'?'shopnip':'shop'});decorate(true)}
    if(a==='resend'||a==='refund'){resolveCase(o.order_number,a,'shop');toast(a==='refund'?'Refunded to the customer now':'Customer told you’re resending it');decorate(true)}},true);
  new MutationObserver(()=>decorate()).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  function decorate(force){
    // pause / busy switch at the top of overview + orders
    const ph=document.querySelector('#app .ph');if(ph&&D.shop&&!document.getElementById('relpause')){const sh=shop(D.shop.id);ph.insertAdjacentHTML('afterend',`<div id="relpause" class="relpause ${sh.paused?'p':''}"><span><b>${sh.paused?'Paused / busy: not taking orders':'Open: taking orders'}</b><br><small class="mut">${sh.paused?esc(sh.reason||''):`Missed orders in a row: ${sh.missed||0} of ${MISSED_PAUSE}. We pause your shop automatically at ${MISSED_PAUSE} so customers aren’t left waiting.`}</small></span><button class="bt ${sh.paused?'':'d'} rel" style="margin:0;padding:10px 14px;border-radius:10px;font-weight:700" data-rel="pause">${sh.paused?'Reopen shop':'Pause / busy'}</button></div>`)}
    // order drawer: stock, status, proof, case
    const db=document.querySelector('.drw.on .db');if(!db)return;const id=D.ui.drawer,o=byId(id);if(!o)return;let box=db.querySelector('#relsel');
    const r=sget(o)||ensure(o);const html=r?sellerOrderHTML(o,r):'';
    document.querySelectorAll('#relsel').forEach(x=>{if(x!==box)x.remove()});if(!box||!box.isConnected){box=document.createElement('div');box.id='relsel';db.insertBefore(box,db.firstChild)}if(force||box._h!==html){box.innerHTML=html;box._h=html}}
  function sellerOrderHTML(o,r){const left=Math.max(0,r.deadline-Date.now());const del=o.fulfilment==='delivery';
    return `<div class="rel">${o.status==='placed'?`<div class="n warn"><b>Accept by ${hm(r.deadline)}</b> (${Math.ceil(left/60000)} min left). Alerts so far: ${(r.escal||[]).map(x=>({sound:'sound',text:'SMS/WhatsApp',call:'phone call'}[x])).join(' → ')||'none'}. No reply means we decline it and refund the customer.</div>`:''}
     ${r.items&&r.items.some(i=>i.in_stock!==undefined)?`<h4>Stock check</h4>${itemsHTML(r,false)}`:''}
     ${r.pref?`<p class="mut">Customer’s choice if something’s out: <b>${esc(PREFS[r.pref])}</b>${r.cancel_if_key?' · cancel if a key item is missing':''}</p>`:''}
     ${del&&!['rejected','cancelled'].includes(o.status)?`<h4>Delivery status</h4>${stepper(Object.assign({},r,{status:r.status==='picking'?'picking':o.status}))}<p class="mut">Promised by ${hm(r.promised_at)} · ${r.driver==='shop'?'your own driver':'ShopNip driver'} <a href="#" data-rel="driver" data-id="${esc(o.id)}">change</a></p>`:''}
     ${o.status==='accepted'&&r.status!=='picking'?`<button class="bt g" data-rel="picking" data-id="${esc(o.id)}">Start picking</button>`:''}
     ${r.proof?`<h4>Proof of delivery</h4><p class="mut">${r.proof.name?'Handed to '+esc(r.proof.name):'Doorstep photo'} · ${hm(r.proof.at)}</p>${r.proof.photo?`<img class="pf" src="${esc(r.proof.photo)}" alt="">`:''}`:''}
     ${r.case?`<h4>Problem ${esc(r.case.id)}</h4><div class="n ${r.case.status==='resolved'?'good':'warn'}">${esc(r.case.note)}<small>${r.case.status==='resolved'?'Sorted':r.case.owner==='shopnip'?'ShopNip has taken this over':'You own this case. Reply by '+hm(r.case.respond_by)}</small></div>${r.case.photo?`<img class="pf" src="${esc(r.case.photo)}" alt="">`:''}${r.case.status==='open'&&r.case.owner==='shop'?`<div class="row"><button class="bt" data-rel="resend" data-id="${esc(o.id)}">Resend item</button><button class="bt g" data-rel="refund" data-id="${esc(o.id)}">Refund it</button></div>`:''}`:''}
     ${(r.refunds||[]).length?`<p class="mut">Refunded: ${gbp(r.refunds.reduce((t,x)=>t+x.amount,0))}</p>`:''}
     ${S.MOCK&&o.status==='placed'?`<p class="mut">Preview: <a href="#" data-relsim="${esc(r.num)}">skip to the deadline</a></p>`:''}</div>`}
  document.addEventListener('click',e=>{const t=e.target.closest('[data-relsim]');if(!t)return;e.preventDefault();e.stopPropagation();const r=get(t.dataset.relsim);if(r)simulate(r.num,r.deadline-Date.now()+500);setTimeout(()=>sync(),50)},true);
  function acceptSheet(o){const r=ensure(o);if(!r){toast('Could not load this order’s items');return}const L=D.L||[];
    const cheaper=i=>L.filter(l=>l.active&&+l.retail_price>0&&+l.retail_price<=+i.unit_price&&l.name!==i.name&&l.stock>0).slice(0,25);
    modal(`<h3>Accept ${esc(o.order_number)}: check each item</h3><p class="mut">Tick what you have. The customer is told straight away. Their choice: <b>${esc(PREFS[r.pref||'ask'])}</b>${r.cancel_if_key?' (cancel if a key item is missing)':''}.</p>
     ${o.order_items.map((i,ix)=>`<div class="it" style="display:block"><b>${i.qty} × ${esc(i.name)}</b> <span class="mut">${gbp(i.unit_price)} each${r.items&&r.items[ix]&&r.items[ix].key?' · key item':''}</span>
      <div class="row"><label class="o" style="flex:1;margin:0"><input type="radio" name="s${ix}" value="1" checked> In stock</label><label class="o" style="flex:1;margin:0"><input type="radio" name="s${ix}" value="0"> Not in stock</label></div>
      ${r.pref!=='refund'?`<select data-sw="${ix}" style="display:none"><option value="">No swap: refund it</option>${cheaper(i).map(l=>`<option value="${esc(l.name)}|${l.retail_price}">${esc(l.name)} · ${gbp(l.retail_price)}</option>`).join('')}</select>`:''}</div>`).join('')}
     <p class="mut">Swaps are only offered at the same price or less.</p><div class="row"><button class="bt" id="ra_go">Confirm and accept</button><button class="bt g" data-x>Back</button></div>`,m=>{
     m.addEventListener('change',e=>{const n=e.target.name;if(n&&n[0]==='s'){const sel=m.querySelector(`[data-sw="${n.slice(1)}"]`);if(sel)sel.style.display=e.target.value==='0'?'block':'none'}});
     m.querySelector('#ra_go').onclick=async()=>{const stock={},swaps={};o.order_items.forEach((i,ix)=>{stock[ix]=(m.querySelector(`input[name=s${ix}]:checked`)||{}).value!=='0';const sel=m.querySelector(`[data-sw="${ix}"]`);if(sel&&sel.value){const [n,p]=sel.value.split('|');swaps[ix]={name:n,price:+p}}});
       if(!Object.values(stock).some(Boolean)&&!confirm('Nothing is in stock. Decline the order instead? The customer is refunded straight away.'))return;
       if(!Object.values(stock).some(Boolean)){try{await API.status(o.id,'rejected','Nothing in stock')}catch(_){}decline(o.order_number,'nothing in stock');m.remove();return refresh()}
       try{await API.status(o.id,'accepted')}catch(er){return toast(er.message||'Could not accept')}
       const res=accept(o.order_number,stock,swaps);putShop(o.shop_id,{missed:0});m.remove();
       if(res&&res.status==='cancelled'){try{await API.status(o.id,'cancelled','Key item out of stock',{reason:'out_of_stock',note:'Key item out of stock'})}catch(_){}toast('Key item missing: order cancelled and refunded, as the customer asked')}
       else toast('Accepted. Customer told about stock straight away.');
       try{window.P33&&P33.notifyCustomer&&P33.notifyCustomer(o,'accepted')}catch(_){}refresh()}})}
  function proofSheet(o){if(!ensure(o))return toast('Could not load this order');modal(`<h3>Proof of delivery · ${esc(o.order_number)}</h3><p class="mut">Take a doorstep photo or type the name of the person who took it. One is needed to mark it delivered.</p>
     <label class="mut">Doorstep photo</label><input type="file" id="pd_p" accept="image/*" capture="environment"><label class="mut" style="display:block;margin-top:10px">Or name of person</label><input type="text" id="pd_n" autocomplete="off" placeholder="e.g. Sam">
     <div class="row"><button class="bt" id="pd_go">Mark delivered</button><button class="bt g" data-x>Back</button></div>`,m=>{
     m.querySelector('#pd_go').onclick=async()=>{const f=m.querySelector('#pd_p').files[0],n=m.querySelector('#pd_n').value.trim();if(!f&&!n)return toast('Add a photo or a name first');
       let ph=null;try{if(f)ph=await photo(f)}catch(_){}
       try{await API.status(o.id,'completed',n?'Delivered to '+n:'Delivered · photo saved')}catch(er){return toast(er.message||'Could not update')}
       proof(o.order_number,{photo:ph,name:n||null});stage(o.order_number,'completed');m.remove();toast('Delivered. Proof saved on the order.');refresh()}})}
}

/* ---------- support desk (support.html) ---------- */
function supportInit(){css();const el=document.getElementById('desk');const draw=()=>{tick();const s=st();const os=Object.values(s.orders).sort((a,b)=>(b.placed_at||0)-(a.placed_at||0));
  el.innerHTML=`<div class="rel"><h3>Shops</h3>${Object.entries(s.shops).map(([id,x])=>`<div class="it"><span>${esc(id)} · ${x.paused?'Paused':'Open'} · missed ${x.missed||0}</span></div>`).join('')||'<p class="mut">No shop activity yet.</p>'}</div>
  <div class="rel"><h3>Problem cases</h3>${os.filter(o=>o.case).map(o=>`<div class="it" style="display:block"><b>${esc(o.case.id)} · ${esc(o.num)}</b> <span class="mut">${o.case.status==='resolved'?'sorted':o.case.owner==='shopnip'?'ShopNip owns this':'shop owns this until '+hm(o.case.respond_by)}</span><div class="n">${esc(o.case.note)}</div>${o.case.photo?`<img class="pf" src="${esc(o.case.photo)}">`:''}
   ${o.case.status==='open'&&o.case.owner==='shopnip'?`<div class="row"><button class="bt" data-d="resend" data-n="${esc(o.num)}">Resend</button><button class="bt g" data-d="refund" data-n="${esc(o.num)}">Refund</button></div>`:''}</div>`).join('')||'<p class="mut">No cases.</p>'}</div>
  <div class="rel"><h3>Orders</h3>${os.map(o=>`<div class="it" style="display:block"><b>${esc(o.num)}</b> · ${esc(STAGE_LBL[o.status]||o.status)} · ${gbp(o.total)}${o.fulfilment==='delivery'?' · promised '+hm(promisedAt(o)):''}${o.proof?` · proof: ${o.proof.name?esc(o.proof.name):'photo'}`:''}${o.proof&&o.proof.photo?`<br><img class="pf" src="${esc(o.proof.photo)}">`:''}</div>`).join('')}</div>`};
  el.addEventListener('click',e=>{const t=e.target.closest('[data-d]');if(t){resolveCase(t.dataset.n,t.dataset.d,'shopnip');draw()}});subs.add(draw);setInterval(draw,5000);draw()}

window.REL={T,PREFS,MISSED_PAUSE,get,put,shop,putShop,onPlaced,accept,choose,customerCancel,decline,timeoutDecline,stage,proof,openCase,resolveCase,refund,recompute,promisedAt,tick,simulate};
const boot=()=>{if(onSupport)supportInit();else if(onSeller)sellerInit();else custInit()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();
