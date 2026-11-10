/* desk.js: ShopNip support desk for customers (order page) and sellers (Support tab), plus wallet refunds by order line.
   Live: support_cases / support_replies / refund_order_lines (supabase/migrations/20261110120000_support_desk_wallet_refunds.sql),
   photos in the private support-photos bucket, admin email via supabase/functions/support-alert.
   ?mock=1 keeps cases in localStorage (nb_desk) so admin/?mock=1 sees the same cases.
   Renders only through V.order / NBSeller.PAGES: no MutationObserver, so the report screen can't loop. */
(()=>{
const REPLY="We'll reply within 2 hours.";
const DUP="You already have an open case for this order. "+REPLY;
const onSeller=/seller\.html/i.test(location.pathname);
const NS=()=>window.NBSeller;
const isMock=()=>onSeller?!!(NS()&&NS().MOCK):!!(window.P2&&P2.MOCK);
const client=()=>{try{if(typeof sb!=='undefined'&&sb)return sb}catch(_){}return (NS()&&NS().sb)||null};
const me=()=>onSeller?(NS()&&NS().D.user):(window.P2&&P2.A.user);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp=n=>'£'+(Math.round((+n||0)*100)/100).toFixed(2);
const when=t=>new Date(t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const toast=m=>{try{(NS()&&NS().toast||window.P2&&P2.toast||console.log)(m)}catch(_){}};
const rerender=()=>{try{if(onSeller)NS().rerender();else if(typeof render==='function')render()}catch(_){}};
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)});
const byNew=(a,b)=>a.created_at<b.created_at?1:-1;

/* ---------- mock store (shared with admin/?mock=1) ---------- */
const KEY='nb_desk';
function mload(){try{const s=JSON.parse(localStorage[KEY]||'{}');s.cases=s.cases||[];s.credits=s.credits||[];return s}catch(_){return {cases:[],credits:[]}}}
function msave(s){try{localStorage[KEY]=JSON.stringify(s)}catch(_){s.cases.forEach(c=>{c.photo=null});try{localStorage[KEY]=JSON.stringify(s)}catch(__){}}}
const applied=new Set();
function applyMockCredits(){
  if(onSeller||!isMock()||!window.MWAL)return;const u=me(),s=mload();let ch=false;
  s.credits.forEach(c=>{if(applied.has(c.id)||(u&&c.user_id&&c.user_id!==u.id))return;applied.add(c.id);
    MWAL.balance=Math.round((MWAL.balance+c.amount)*100)/100;MWAL.tx.unshift({id:c.id,amount:c.amount,balance_after:MWAL.balance,kind:'refund',note:c.note,created_at:c.at});
    const m=window.P2&&P2.M&&(P2.M.orders||[]).find(o=>o.id===c.order_id);if(m)m.refunded_to_wallet=Math.round(((+m.refunded_to_wallet||0)+c.amount)*100)/100;ch=true});
  if(ch&&window.WAL)WAL.reset()}

/* ---------- photos ---------- */
function shrink(file,max){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error('Could not read that photo')),'image/jpeg',.8)};
  img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Please choose a JPG or PNG photo'))};img.src=u})}
const toData=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=()=>r(null);f.readAsDataURL(b)});

/* ---------- data ---------- */
const DK={cases:[],loaded:false,loading:null,err:'',urls:{},uid:null};
const ready=()=>{const u=me();return DK.loaded&&DK.uid===(u?u.id:null)};
function load(force){
  if(DK.loading)return DK.loading;
  if(ready()&&!force)return Promise.resolve(DK);
  DK.loading=(async()=>{const u=me();DK.err='';DK.uid=u?u.id:null;
    if(!u){DK.cases=[];return}
    const role=onSeller?'seller':'customer';
    if(isMock()){applyMockCredits();DK.cases=mload().cases.filter(c=>c.user_id===u.id&&c.raised_by===role).sort(byNew);return}
    const c=client();if(!c){DK.cases=[];return}
    const {data,error}=await c.from('support_cases').select('*,support_replies(id,author_role,body,created_at)').eq('user_id',u.id).eq('raised_by',role).order('created_at',{ascending:false}).limit(50);
    if(error){if(/relation|does not exist|schema cache/i.test(error.message)){DK.cases=[];return}throw error}
    DK.cases=data||[]})().catch(e=>{DK.err=e.message||String(e)}).finally(()=>{DK.loaded=true;DK.loading=null});
  return DK.loading}
const snap=o=>({id:o.id,order_number:o.order_number,status:o.status,total:+o.total||0,wallet_applied:+o.wallet_applied||0,customer_id:o.customer_id||null,
  shop_name:(o.shops&&o.shops.name)||'',items:(o.order_items||[]).map((i,ix)=>({id:i.id||'ix'+ix,name:i.name,qty:i.qty,unit_price:+i.unit_price}))});
async function create({order,shop_id,raised_by,message,file}){
  const u=me();if(!u)throw new Error('Please log in first');
  message=String(message||'').trim().slice(0,2000);if(!message)throw new Error('Please tell us what went wrong');
  const id=uuid();
  if(isMock()){const s=mload();if(order&&s.cases.some(c=>c.order_id===order.id&&c.user_id===u.id&&c.status!=='resolved'))throw new Error(DUP);
    let photo=null;if(file){try{photo=await toData(await shrink(file,640))}catch(_){}}
    const now=Date.now(),shop=onSeller&&NS().D.shop;
    s.cases.unshift({id,order_id:order?order.id:null,raised_by,user_id:u.id,user_email:u.email||'',shop_id:shop_id||(order&&order.shop_id)||null,
      shop_name:(shop&&shop.name)||(order&&order.shops&&order.shops.name)||'',message,photo_path:photo?'mock/'+id+'.jpg':null,photo,status:'open',owner:null,owner_email:null,
      needs_admin:true,refund_amount:0,created_at:new Date(now).toISOString(),reply_due_at:new Date(now+2*36e5).toISOString(),support_replies:[],order:order?snap(order):null});
    msave(s);await load(true);return {id}}
  const c=client();if(!c)throw new Error('You seem to be offline. Please try again.');
  let photo_path=null;
  if(file){const blob=await shrink(file,1600);photo_path=u.id+'/'+id+'.jpg';
    const up=await c.storage.from('support-photos').upload(photo_path,blob,{contentType:'image/jpeg',upsert:false});if(up.error)throw new Error('Photo upload failed: '+up.error.message)}
  const {error}=await c.from('support_cases').insert({id,order_id:order?order.id:null,raised_by,shop_id:shop_id||null,message,photo_path});
  if(error)throw new Error(/duplicate|one_open/i.test(error.message)?DUP:error.message);
  c.functions.invoke('support-alert',{body:{case_id:id}}).catch(()=>{});
  await load(true);return {id}}
async function reply(caseId,body){body=String(body||'').trim();if(!body)throw new Error('Write a message first');
  if(isMock()){const s=mload(),c=s.cases.find(x=>x.id===caseId);if(!c)throw new Error('Case not found');if(c.status==='resolved')throw new Error('This case is closed. Please report a new problem.');
    c.support_replies=(c.support_replies||[]).concat([{id:Date.now(),author_role:c.raised_by,body,created_at:new Date().toISOString()}]);c.needs_admin=true;msave(s);return load(true)}
  const {error}=await client().rpc('reply_support_case',{p_case:caseId,p_body:body});if(error)throw error;return load(true)}
async function photoURL(c){if(c.photo)return c.photo;if(!c.photo_path||isMock())return null;if(DK.urls[c.photo_path])return DK.urls[c.photo_path];
  const {data,error}=await client().storage.from('support-photos').createSignedUrl(c.photo_path,3600);if(error)throw error;return DK.urls[c.photo_path]=data&&data.signedUrl||null}
/* wallet refund for order lines (itemIds null = whole order). Server caps it at what the customer paid and never refunds a line twice.
   TODO(card refunds): no card provider yet, so everything goes to the ShopNip wallet. */
async function refundLines(orderId,itemIds,reason,source){
  if(!orderId||isMock())return {mock:true,credited:0};
  if(itemIds&&!itemIds.length)return null;
  const c=client();if(!c)return null;
  const {data,error}=await c.rpc('refund_order_lines',{p_order:orderId,p_items:itemIds||null,p_reason:reason||null,p_source:source});
  if(error){if(/could not find the function|does not exist|schema cache/i.test(error.message))return null;throw error}
  return data}

/* ---------- shared UI ---------- */
const ST_LBL={open:'Waiting for ShopNip',owned:'A ShopNip support person is on it',resolved:'Resolved'};
function caseHTML(c,seller){
  const rs=(c.support_replies||[]).slice().sort((a,b)=>a.created_at<b.created_at?-1:1),answered=rs.some(r=>r.author_role==='admin');
  const ord=seller&&c.order_id&&(NS().D.O||[]).find(o=>o.id===c.order_id);
  return `<div class="dk-case"><div class="dk-h"><b>${esc(ST_LBL[c.status]||c.status)}</b><small>${ord?esc(ord.order_number)+' · ':''}${when(c.created_at)}</small></div>
   ${c.status!=='resolved'&&!answered?`<p class="dk-due">${REPLY}</p>`:''}
   <div class="dk-msg">${esc(c.message)}</div>${c.photo_path?`<button type="button" class="dk-link" data-dk="photo" data-id="${esc(c.id)}">View photo</button>`:''}
   ${rs.map(r=>`<div class="dk-r ${r.author_role==='admin'?'a':''}"><b>${r.author_role==='admin'?'ShopNip':'You'}</b>${esc(r.body)}<small>${when(r.created_at)}</small></div>`).join('')}
   ${c.status==='resolved'?`<div class="dk-ok">Resolved${+c.refund_amount&&!seller?` · ${gbp(c.refund_amount)} refunded to your ShopNip wallet`:''}</div>`
     :`<form class="dk-rf" data-dkf="reply" data-id="${esc(c.id)}"><input name="dk_b" maxlength="2000" placeholder="Add a message" aria-label="Add a message" autocomplete="off"><button class="btn sm" type="submit">Send</button></form>`}</div>`}
function showPhoto(url){const m=document.createElement('div');m.className='dkm';m.innerHTML=`<div class="dkc"><img src="${esc(url)}" alt="Problem photo" style="max-width:100%;border-radius:12px"><div class="dk-a"><button type="button" class="btn ghost" data-dkx>Close</button></div></div>`;
  m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-dkx]'))m.remove()});document.body.appendChild(m)}

/* ---------- customer: order page ---------- */
const TYPES=['Missing item','Wrong item','Damaged item','Not delivered','Something else'];
function custPanel(o){
  if(!o||!me())return '';
  if(!ready()){load().then(()=>{if(typeof cur!=='undefined'&&cur[0]==='order')rerender()});return ''}
  const cs=DK.cases.filter(c=>c.order_id===o.id),open=cs.some(c=>c.status!=='resolved'),can=o.status!=='placed';
  if(!cs.length&&!can)return '';
  return `<div class="panel dk"><h3 class="ft">Help with this order</h3>${cs.map(c=>caseHTML(c,false)).join('')}
   ${!open&&can?`<button type="button" class="btn ghost full" data-dk="report">Report a problem</button><p class="hint" style="margin:8px 0 0">Send us a photo and a few words. ${REPLY}</p>`:''}</div>`}
function reportModal(o){
  if(!me())return toast('Please log in first');
  const items=o.order_items||[];
  const m=document.createElement('div');m.className='dkm';
  m.innerHTML=`<form class="dkc" role="dialog" aria-modal="true" aria-label="Report a problem"><h3>Report a problem · ${esc(o.order_number||'')}</h3>
   <label>What went wrong?<select name="dk_t">${TYPES.map(t=>`<option>${t}</option>`).join('')}</select></label>
   ${items.length?`<label>Which item? (optional)<select name="dk_i"><option value="">Whole order</option>${items.map((i,ix)=>`<option value="${ix}">${esc(i.qty+' × '+i.name)}</option>`).join('')}</select></label>`:''}
   <label>Tell us more<textarea name="dk_m" rows="3" maxlength="1800" required placeholder="e.g. The box was crushed when it arrived"></textarea></label>
   <label>Add a photo (optional)<input type="file" name="dk_p" accept="image/*"></label>
   <p class="dk-due">${REPLY}</p><p class="dk-err" hidden></p>
   <div class="dk-a"><button type="button" class="btn ghost" data-dkx>Cancel</button><button class="btn" type="submit">Send</button></div></form>`;
  document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-dkx]'))m.remove()});
  const f=m.querySelector('form'),F=f.elements;setTimeout(()=>F.dk_m.focus(),0);
  f.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const b=f.querySelector('[type=submit]'),er=f.querySelector('.dk-err');if(b.disabled)return;
    b.disabled=true;b.textContent='Sending…';er.hidden=true;
    const it=F.dk_i&&F.dk_i.value!==''?items[+F.dk_i.value]:null;
    try{await create({order:o,raised_by:'customer',message:`${F.dk_t.value}${it?' · '+it.name:''}: ${F.dk_m.value.trim()}`,file:F.dk_p.files[0]||null});
      m.remove();toast('Problem sent. '+REPLY);rerender()}
    catch(x){er.textContent=x.message||'Could not send. Please try again.';er.hidden=false;b.disabled=false;b.textContent='Send'}})}
function custSetup(){
  if(typeof V==='undefined'||!V.order||V.order._desk)return;
  const _o=V.order;V.order=function(id){const h=_o.apply(this,arguments);const o=window.P3&&P3.cur&&P3.cur();if(!o||o.id!==id)return h;
    const p=custPanel(o);return p?h.replace(/<\/section>\s*$/,p+'</section>'):h};V.order._desk=1;
  addEventListener('nb:auth',()=>{DK.loaded=false;DK.cases=[]})}

/* ---------- seller: Support tab ---------- */
const SD={o:'',m:'',f:null,busy:false};
function sellerSetup(){const N=NS();if(!N||N.PAGES.support)return;
  if(!N.DASH.includes('support'))N.DASH.push('support');N.TITLE.support='Support';if(!N.NAV.find(n=>n[0]==='support'))N.NAV.push(['support','alert']);
  N.PAGES.support=()=>{if(!ready()){load().then(()=>{if(location.hash==='#support')N.rerender()});return '<div class="card"><div class="cb mut">Loading…</div></div>'}
    const os=(N.D.O||[]).slice(0,60);
    return `<div class="card dk"><div class="chd"><h3>Ask ShopNip for help</h3></div><div class="cb">
     <p class="mut" style="margin-top:0">A problem with an order, a customer, stock or your account? Tell us here. ${REPLY}</p>
     <form data-dkf="seller" class="dk-sf">
      <label class="fld"><span>Order (optional)</span><select id="dk_o"><option value="">Not about an order</option>${os.map(o=>`<option value="${esc(o.id)}" ${SD.o===o.id?'selected':''}>${esc(o.order_number)} · ${esc(o.customer_name||'')} · ${gbp(o.total)}</option>`).join('')}</select></label>
      <label class="fld"><span>What’s wrong?</span><textarea id="dk_m" rows="4" maxlength="2000" required>${esc(SD.m)}</textarea></label>
      <label class="fld"><span>Photo (optional)</span><input id="dk_p" type="file" accept="image/*">${SD.f?`<small class="mut">Attached: ${esc(SD.f.name)}</small>`:''}</label>
      <button class="btn" type="submit" ${SD.busy?'disabled':''}>${SD.busy?'Sending…':'Send to ShopNip'}</button></form>${DK.err?`<p class="dk-err">${esc(DK.err)}</p>`:''}</div></div>
     <div class="card dk"><div class="chd"><h3>Your cases</h3></div><div class="cb">${DK.cases.length?DK.cases.map(c=>caseHTML(c,true)).join(''):'<p class="mut">No cases yet.</p>'}</div></div>`};
  document.addEventListener('input',e=>{if(e.target.id==='dk_m')SD.m=e.target.value});
  document.addEventListener('change',e=>{if(e.target.id==='dk_o')SD.o=e.target.value;if(e.target.id==='dk_p')SD.f=e.target.files[0]||null});
  if(location.hash==='#support')N.render()}
async function sellerSubmit(){const N=NS();if(SD.busy)return;if(!SD.m.trim())return toast('Tell us what’s wrong first');
  SD.busy=true;N.rerender();
  try{await create({order:SD.o?(N.D.O||[]).find(o=>o.id===SD.o):null,shop_id:N.D.shop&&N.D.shop.id,raised_by:'seller',message:SD.m,file:SD.f});
    Object.assign(SD,{o:'',m:'',f:null});toast('Sent to ShopNip. '+REPLY)}
  catch(e){toast(e.message||'Could not send')}
  SD.busy=false;N.rerender()}

/* ---------- events (delegated, both pages) ---------- */
document.addEventListener('click',async e=>{const t=e.target.closest('[data-dk]');if(!t)return;e.preventDefault();
  if(t.dataset.dk==='report'){const o=window.P3&&P3.cur&&P3.cur();if(o)reportModal(o);return}
  if(t.dataset.dk==='photo'){const c=DK.cases.find(x=>x.id===t.dataset.id);if(!c)return;try{const u=await photoURL(c);u?showPhoto(u):toast('Photo not available')}catch(er){toast(er.message||'Photo not available')}}});
document.addEventListener('submit',async e=>{const f=e.target.closest&&e.target.closest('[data-dkf]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();
  if(f.dataset.dkf==='seller')return sellerSubmit();
  if(f.dataset.dkf==='reply'){const i=f.elements.dk_b,b=f.querySelector('button');if(b.disabled)return;b.disabled=true;
    try{await reply(f.dataset.id,i.value);toast('Message sent');rerender()}catch(er){toast(er.message||'Could not send');b.disabled=false}}},true);

const css=document.createElement('style');css.textContent=`.dk-case{border:1px solid #e7e9ee;border-radius:14px;padding:12px 14px;margin:0 0 10px;background:#fff}.dk-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.dk-h small{color:#667085;font-size:12.5px}
.dk-due{margin:6px 0;padding:8px 10px;border-radius:10px;background:#eef6f5;color:#134e4a;font-size:13.5px;font-weight:600}.dk-msg{margin:6px 0;white-space:pre-wrap;font-size:14px}
.dk-r{margin:6px 0;padding:8px 10px;border-radius:10px;background:#f6f7f9;font-size:14px}.dk-r.a{background:#effaf7}.dk-r b{margin-right:6px}.dk-r small{display:block;color:#667085;font-size:12px}
.dk-ok{margin-top:6px;color:#15803d;font-weight:700;font-size:14px}.dk-link{border:0;background:none;color:#0f766e;font:inherit;font-weight:700;padding:4px 0;cursor:pointer;text-decoration:underline}
.dk-rf{display:flex;gap:8px;margin-top:8px}.dk-rf input{flex:1;min-width:0;padding:10px;border:1px solid #d5dbd9;border-radius:10px;font:inherit;font-size:16px}
.dkm{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center}.dkc{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#fff;border-radius:18px 18px 0 0;padding:18px;box-sizing:border-box}
@media(min-width:700px){.dkm{align-items:center}.dkc{border-radius:18px}}.dkc h3{margin:0 0 10px}.dkc label{display:block;margin:10px 0 0;font-size:13.5px;color:#475569;font-weight:600}
.dkc select,.dkc textarea,.dkc input[type=file]{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1px solid #d5dbd9;border-radius:10px;font:inherit;font-size:16px;background:#fff}
.dk-a{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.dk-err{color:#b42318;font-size:13.5px;margin:6px 0 0}`;document.head.appendChild(css);

window.DESK={REPLY,state:DK,load,create,reply,photoURL,refundLines};
const boot=()=>{if(onSeller)sellerSetup();else custSetup()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
