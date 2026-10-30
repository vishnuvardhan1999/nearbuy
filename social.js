/* Reviews, follows, end-of-day offers, and the cancellation-reason dialog.
   Pure helpers are exported for tests. The browser half wires the shopper site and seller dashboard. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)install(root,api);
})(typeof window!=='undefined'?window:null,function(){
const REASONS=[['changed','Changed my mind'],['mistake','Ordered by mistake'],['elsewhere','Found it elsewhere'],['slow','Taking too long'],['cant','Can’t collect or receive it'],['stock','Item unavailable'],['closing','Shop is closing'],['other','Other']];
const reasonLabel=c=>(REASONS.find(r=>r[0]===c)||[])[1]||c||'';
function validateCancel(reason,note){
  const r=String(reason||'').trim();
  if(!REASONS.some(x=>x[0]===r))return {ok:false,error:'Choose a cancellation reason'};
  const n=String(note||'').trim();
  if(r==='other'&&n.length<2)return {ok:false,error:'Tell us a bit more when you choose Other'};
  if(n.length>300)return {ok:false,error:'Keep the note under 300 characters'};
  return {ok:true,reason:r,note:n};
}
function londonParts(date){
  const d=date instanceof Date?date:new Date(date);
  const dtf=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const p={};for(const x of dtf.formatToParts(d))if(x.type!=='literal')p[x.type]=x.value;
  let h=+p.hour;if(h===24)h=0;
  return {iso:p.year+'-'+p.month+'-'+p.day,hour:h,minute:+p.minute};
}
/* datetime-local value is a UK wall-clock time, not the browser zone. */
function londonLocalToDate(value){
  const m=String(value||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if(!m)return null;
  const want=m[1]+' '+m[2]+':'+m[3];
  let utc=new Date(m[1]+'T'+m[2]+':'+m[3]+':00Z');
  for(let i=0;i<4;i++){
    const g=londonParts(utc);
    const got=g.iso+' '+String(g.hour).padStart(2,'0')+':'+String(g.minute).padStart(2,'0');
    const diff=(Date.parse(want.replace(' ','T')+':00Z')-Date.parse(got.replace(' ','T')+':00Z'))/60000;
    if(!diff)break;
    utc=new Date(utc.getTime()+diff*60000);
  }
  return utc;
}
function offerActive(until,now){const t=until instanceof Date?until:new Date(until);return t.getTime()>(now instanceof Date?now:new Date(now||Date.now())).getTime()}
return {REASONS,reasonLabel,validateCancel,londonParts,londonLocalToDate,offerActive};
});

function install(root,api){
const {REASONS,reasonLabel,validateCancel,londonLocalToDate,offerActive}=api;
const Q=new URLSearchParams(root.location.search),MOCK=Q.get('mock')==='1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='nb_social_v1';
function loadStore(){try{return JSON.parse(root.localStorage[KEY]||'null')}catch(e){return null}}
function blank(){return {reviews:[],follows:[],offers:[],notices:[]}}
let store=loadStore()||blank();
function save(){try{root.localStorage[KEY]=JSON.stringify(store)}catch(e){}}
if(MOCK&&!store.reviews.length){
  const t=new Date().toISOString();
  store.reviews.push(
    {shop_id:'s1',customer_id:'u-priya',author:'Priya Shah',rating:5,body:'Friendly counter and the order was ready the same afternoon.',hidden:false,reports:0,created_at:t,updated_at:t},
    {shop_id:'s1',customer_id:'u-sam',author:'Sam Patel',rating:4,body:'Good range of stationery. A bit busy at lunch.',hidden:false,reports:0,created_at:t,updated_at:t});
  save();
}
function db(){try{return (typeof sb!=='undefined'&&sb&&sb.from)?sb:null}catch(e){return null}}
const uid=()=>{const A=root.P2&&root.P2.A;if(A&&A.user)return A.user.id;const D=root.NBSeller&&root.NBSeller.D;return D&&D.user?D.user.id:(MOCK?'u1':null)};
const live=()=>!MOCK&&!!db();
function avg(shopId){const rs=store.reviews.filter(r=>r.shop_id===shopId&&!r.hidden);if(!rs.length)return {avg:null,n:0};return {avg:Math.round(rs.reduce((s,r)=>s+r.rating,0)/rs.length*10)/10,n:rs.length}}
function activeOffers(now){return store.offers.filter(o=>o.active!==false&&offerActive(o.valid_until,now||new Date()))}
function decorate(shops){(shops||[]).forEach(s=>{const a=avg(s.id);s.rating_avg=a.avg;s.rating_n=a.n;s.active_offer=activeOffers().find(o=>o.shop_id===s.id)||null})}
async function pull(){
  const c=db();if(!live()||!c)return;
  try{
    const [rv,fl,of,nt]=await Promise.all([
      c.from('shop_reviews').select('shop_id,customer_id,rating,body,hidden,reports,created_at,updated_at').eq('hidden',false).limit(500),
      uid()?c.from('shop_follows').select('shop_id,customer_id,created_at').eq('customer_id',uid()):Promise.resolve({data:[]}),
      c.from('shop_offers').select('id,shop_id,title,detail,price,discount_pct,valid_until,active,created_at').eq('active',true).limit(100),
      uid()?c.from('offer_notices').select('id,offer_id,shop_id,shop_name,title,read,created_at').eq('user_id',uid()).order('created_at',{ascending:false}).limit(20):Promise.resolve({data:[]})
    ]);
    if(!rv.error&&rv.data)store.reviews=rv.data.map(r=>({...r,author:'Shopper'}));
    if(fl&&!fl.error&&fl.data)store.follows=fl.data;
    if(!of.error&&of.data)store.offers=of.data;
    if(nt&&!nt.error&&nt.data)store.notices=nt.data;
  }catch(e){}
}
function paint(){if(root.S&&root.S.shops)decorate(root.S.shops);if(typeof root.render==='function'&&root.cur&&root.cur[0]==='home')root.render()}
async function boot(){await pull();paint();notifyNew()}
function notifyNew(){
  const unread=store.notices.filter(n=>!n.read);
  if(!unread.length||!('Notification' in root)||root.Notification.permission!=='granted')return;
  const n=unread[0];
  try{new root.Notification('End-of-day offer',{body:(n.shop_name?n.shop_name+': ':'')+n.title,icon:'icon-192.png',tag:'offer-'+n.offer_id})}catch(e){}
}
function stars(n){const v=Math.round(n);return '★★★★★'.slice(0,v)+'☆☆☆☆☆'.slice(0,5-v)}
function dealsHTML(){
  const now=new Date(),list=activeOffers(now);
  if(!list.length||!root.S)return '';
  const shops=root.S.shops||[];
  const rows=list.map(o=>{const s=shops.find(x=>x.id===o.shop_id);if(!s)return '';
    const followed=store.follows.some(f=>f.shop_id===o.shop_id&&f.customer_id===uid());
    const price=o.price!=null?'£'+(+o.price).toFixed(2):(o.discount_pct?o.discount_pct+'% off':'');
    const until=new Date(o.valid_until).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
    return `<button class="eod" data-shop="${esc(s.id)}"><b>${esc(o.title)}</b><span>${esc(s.name)} · ${esc(price)}${followed?' · From a shop you follow':''}</span><small>Until ${esc(until)} UK</small></button>`}).filter(Boolean);
  if(!rows.length)return '';
  return `<section class="sec" id="eod"><div class="sh"><h2>Deals near you</h2></div><p class="shop-note">End-of-day offers from shops near you, and from shops you follow.</p><div class="eods">${rows.join('')}</div></section>`;
}
function shopExtra(s){
  if(!s)return '';
  const a=avg(s.id),mine=store.reviews.find(r=>r.shop_id===s.id&&r.customer_id===uid());
  const own=(s.owner_id&&uid()&&s.owner_id===uid())||(root.P2&&root.P2.A&&root.P2.A.shop&&root.P2.A.shop.id===s.id);
  const followed=store.follows.some(f=>f.shop_id===s.id&&f.customer_id===uid());
  const offers=activeOffers().filter(o=>o.shop_id===s.id);
  const list=store.reviews.filter(r=>r.shop_id===s.id&&!r.hidden);
  const offerHtml=offers.map(o=>{const price=o.price!=null?'£'+(+o.price).toFixed(2):(o.discount_pct+'% off');
    return `<div class="eodcard"><b>${esc(o.title)}</b><span>${esc(price)}</span>${o.detail?`<p>${esc(o.detail)}</p>`:''}<small>Until ${esc(new Date(o.valid_until).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}))} UK time</small></div>`}).join('');
  const revs=list.map(r=>`<article class="rev"><header><b>${esc(stars(r.rating))} ${r.rating}</b><span>${esc(r.author||'Shopper')}</span></header><p>${esc(r.body)}</p>${r.customer_id!==uid()?`<button type="button" class="revrep" data-revrep="${esc(r.shop_id)}" data-revwho="${esc(r.customer_id)}">Report</button>`:''}</article>`).join('')||'<p class="hint">No reviews yet.</p>';
  const form=own?'<p class="hint">You can’t review your own shop.</p>':!uid()?'<p class="hint"><a href="#" data-t="account">Sign in</a> to rate this shop.</p>':
    `<form class="revform" data-revform="${esc(s.id)}"><div class="revstars" role="radiogroup" aria-label="Rating">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" ${(mine?mine.rating:5)===n?'checked':''}>${n}</label>`).join('')}</div>
     <textarea name="body" maxlength="400" required minlength="2" placeholder="How was this shop?">${esc(mine?mine.body:'')}</textarea>
     <button class="btn" type="submit">${mine?'Update your review':'Publish review'}</button></form>`;
  return `<section class="sec social" id="shop-social"><div class="sh"><h2>${a.n?esc(a.avg.toFixed(1))+' · '+a.n+' review'+(a.n>1?'s':''):'Reviews'}</h2>
    <button type="button" class="btn ${followed?'ghost':''}" data-follow="${esc(s.id)}" ${own?'disabled':''}>${own?'Your shop':followed?'Following':'Follow shop'}</button></div>
    ${offers.length?`<div class="eodlist"><h3>End-of-day offers</h3>${offerHtml}</div>`:''}
    ${form}<div class="revlist">${revs}</div></section>`;
}
function accountExtra(){
  const id=uid();if(!id)return '';
  const shops=(root.S&&root.S.shops)||[];
  const fol=store.follows.filter(f=>f.customer_id===id);
  const notes=store.notices.filter(n=>!n.read);
  const fhtml=fol.length?fol.map(f=>{const s=shops.find(x=>x.id===f.shop_id);return `<div class="line"><span>${esc(s?s.name:f.shop_id)}</span><button type="button" data-follow="${esc(f.shop_id)}">Unfollow</button></div>`}).join(''):'<p class="hint">You are not following any shops yet. Open a shop and tap Follow.</p>';
  const nhtml=notes.length?notes.map(n=>`<div class="line"><span><b>${esc(n.shop_name||'Shop')}</b> · ${esc(n.title)}</span></div>`).join(''):'';
  return `<div class="panel"><h3 class="ft">Shops you follow</h3>${fhtml}</div>${nhtml?`<div class="panel"><h3 class="ft">New offers</h3>${nhtml}</div>`:''}`;
}
function cancelHtml(o){
  if(!o||o.status!=='cancelled'||!o.cancel_reason)return '';
  const who=o.cancelled_role==='seller'?'the shop':'the customer';
  const when=o.cancelled_at?new Date(o.cancelled_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  return `<div class="cancel-box" role="status"><b>Cancelled by ${who}</b><span>${esc(reasonLabel(o.cancel_reason))}${o.cancel_note?' — '+esc(o.cancel_note):''}</span>${when?`<small>${esc(when)}</small>`:''}</div>`;
}
function askCancel(role){
  return new Promise(resolve=>{
    const d=root.document.createElement('div');d.id='cancelbox';
    d.innerHTML=`<div class="ccard" role="dialog" aria-modal="true" aria-labelledby="cx-title"><h2 id="cx-title">Cancel this order</h2>
      <p>${role==='seller'?'Tell the customer why you are cancelling.':'Tell the shop why you are cancelling. Stock goes back to the shop.'}</p>
      <label>Reason<select id="cx-reason" required><option value="">Choose a reason</option>${REASONS.map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('')}</select></label>
      <label>Details <small>(required for Other)</small><textarea id="cx-note" maxlength="300" placeholder="Optional note"></textarea></label>
      <p class="cxerr" id="cx-err" role="alert"></p>
      <div class="cxacts"><button type="button" class="btn ghost" data-cx="no">Keep order</button><button type="button" class="btn" data-cx="yes">Cancel order</button></div></div>`;
    root.document.body.appendChild(d);
    const done=v=>{d.remove();resolve(v)};
    d.addEventListener('click',e=>{
      if(e.target.id==='cancelbox'||e.target.closest('[data-cx="no"]'))return done(null);
      if(!e.target.closest('[data-cx="yes"]'))return;
      const pack=validateCancel(d.querySelector('#cx-reason').value,d.querySelector('#cx-note').value);
      if(!pack.ok){d.querySelector('#cx-err').textContent=pack.error;return}
      done(pack);
    });
  });
}
function applyCancel(o,pack,role){if(!o||!pack)return;o.status='cancelled';o.cancel_reason=pack.reason;o.cancel_note=pack.note||'';o.cancelled_role=role;o.cancelled_at=new Date().toISOString();o.cancelled_by=uid()||role;o.reject_reason=pack.note||reasonLabel(pack.reason)}
async function toggleFollow(shopId){
  const id=uid();if(!id){root.toast&&root.toast('Sign in to follow a shop');return}
  const i=store.follows.findIndex(f=>f.shop_id===shopId&&f.customer_id===id);
    if(live()&&db()){
    if(i>=0){const {error}=await db().from('shop_follows').delete().eq('shop_id',shopId).eq('customer_id',id);if(error)throw error;store.follows.splice(i,1)}
    else{const {error}=await db().from('shop_follows').insert({shop_id:shopId,customer_id:id});if(error)throw error;store.follows.push({shop_id:shopId,customer_id:id})}
  }else{if(i>=0)store.follows.splice(i,1);else store.follows.push({shop_id:shopId,customer_id:id,created_at:new Date().toISOString()});save()}
}
async function saveReview(shopId,rating,body){
  const id=uid();if(!id)throw new Error('Sign in to leave a review');
  if(live()&&db()){const {error}=await db().rpc('save_shop_review',{p_shop:shopId,p_rating:rating,p_body:body});if(error)throw error}
  const row={shop_id:shopId,customer_id:id,author:'You',rating,body:body.trim(),hidden:false,reports:0,updated_at:new Date().toISOString(),created_at:new Date().toISOString()};
  const i=store.reviews.findIndex(r=>r.shop_id===shopId&&r.customer_id===id);
  if(i>=0)store.reviews[i]={...store.reviews[i],...row};else store.reviews.push(row);
  save();
}
async function reportReview(shopId,customerId){
  if(live()&&db()){const {error}=await db().rpc('report_shop_review',{p_shop:shopId,p_customer:customerId});if(error)throw error}
  const r=store.reviews.find(x=>x.shop_id===shopId&&x.customer_id===customerId);if(!r)return;
  r.reports=(r.reports||0)+1;if(r.reports>=3)r.hidden=true;save();
}
async function postOffer(fields){
  const until=londonLocalToDate(fields.until);if(!until||!offerActive(until))throw new Error('Pick a later time in UK hours');
  const price=fields.price===''||fields.price==null?null:+fields.price;
  const discount=fields.discount?+fields.discount:null;
  let id='off'+Math.random().toString(36).slice(2,8);
  if(live()&&db()){const {data,error}=await db().rpc('post_shop_offer',{p_title:fields.title,p_detail:fields.detail||null,p_price:price,p_discount:discount,p_until:until.toISOString()});if(error)throw error;id=data||id}
  const shop=root.NBSeller&&root.NBSeller.D&&root.NBSeller.D.shop;
  const shopId=shop?shop.id:(fields.shop_id||'s1');
  const offer={id,shop_id:shopId,title:fields.title.trim(),detail:(fields.detail||'').trim(),price,discount_pct:discount,valid_until:until.toISOString(),active:true,created_at:new Date().toISOString()};
  store.offers.unshift(offer);
  store.follows.filter(f=>f.shop_id===shopId).forEach(f=>store.notices.unshift({id:'n'+offer.id+f.customer_id,user_id:f.customer_id,offer_id:id,shop_id:shopId,shop_name:shop&&shop.name,title:offer.title,read:false,created_at:offer.created_at}));
  save();
  if('Notification' in root&&root.Notification.permission==='granted'){try{new root.Notification('End-of-day offer posted',{body:offer.title,icon:'icon-192.png'})}catch(e){}}
  return offer;
}
function offerForm(){
  const mine=store.offers.filter(o=>root.NBSeller&&root.NBSeller.D.shop&&o.shop_id===root.NBSeller.D.shop.id);
  const rows=mine.map(o=>`<div class="line"><span><b>${esc(o.title)}</b>${o.price!=null?' · £'+(+o.price).toFixed(2):o.discount_pct?' · '+o.discount_pct+'% off':''}</span><small class="mut">Until ${esc(new Date(o.valid_until).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</small></div>`).join('');
  return `<div class="card" id="eod-seller"><div class="chd"><h3>End-of-day offer</h3></div><div class="cb"><p class="mut">A short offer followers and nearby shoppers see until the UK time you set. One price or a percent off.</p>
    <form id="eodf" class="fgrid"><label class="fld"><span>What is it?</span><input name="title" required maxlength="80" placeholder="e.g. Half-price notebooks"></label>
    <label class="fld"><span>Details</span><input name="detail" maxlength="240" placeholder="Optional"></label>
    <div class="row2"><label class="fld"><span>Price (£)</span><input name="price" type="number" min="0" step="0.01" placeholder="0.00"></label>
    <label class="fld"><span>or % off</span><input name="discount" type="number" min="1" max="90" step="1" placeholder="20"></label></div>
    <label class="fld"><span>Valid until (UK time)</span><input name="until" type="datetime-local" required></label>
    <button class="btn" type="submit">Post offer</button></form>${rows?`<div style="margin-top:12px">${rows}</div>`:''}</div></div>`;
}
function views(){try{return typeof V!=='undefined'?V:null}catch(e){return null}}
function hook(){
  const VV=views();
  if(VV&&VV.shop&&!VV.shop._soc){const orig=VV.shop;const wrapped=function(id){const h=orig.apply(this,arguments);if(!h||h.indexOf('sinfo')<0)return h;const s=root.P2&&root.P2.A&&root.P2.A.view;return h.replace('<section class="sec',shopExtra(s)+'<section class="sec')};wrapped._soc=1;VV.shop=wrapped}
  if(VV&&VV.account&&!VV.account._soc){const orig=VV.account;const wrapped=function(){let h=orig.apply(this,arguments);const extra=accountExtra();if(!extra||h.indexOf('data-act="logout"')<0)return h;return h.replace('<button class="btn ghost full" data-act="logout"','<div id="followed">'+extra+'</div><button class="btn ghost full" data-act="logout"')};wrapped._soc=1;VV.account=wrapped}
  const NB=root.NBSeller;if(NB&&NB.PAGES&&!NB.PAGES.deals._soc){const orig=NB.PAGES.deals;NB.PAGES.deals=function(){return offerForm()+orig()};NB.PAGES.deals._soc=1}
}
root.document.addEventListener('click',async e=>{
  const f=e.target.closest('[data-follow]');if(f){e.preventDefault();try{await toggleFollow(f.dataset.follow);root.toast&&root.toast(store.follows.some(x=>x.shop_id===f.dataset.follow&&x.customer_id===uid())?'Following':'Unfollowed');paint();if(typeof root.render==='function')root.render();if(NBRerender())NBRerender()}catch(err){root.toast&&root.toast(err.message||'Could not update follow')}}
  const rp=e.target.closest('[data-revrep]');if(rp){e.preventDefault();await reportReview(rp.dataset.revrep,rp.dataset.revwho);root.toast&&root.toast('Reported. Repeated reports hide a review.');if(typeof root.render==='function')root.render()}
});
function NBRerender(){return root.NBSeller&&root.NBSeller.rerender}
root.document.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-revform]');if(f){e.preventDefault();e.stopPropagation();const rating=+(f.querySelector('input[name=rating]:checked')||{}).value||0;const body=f.querySelector('textarea').value;try{await saveReview(f.dataset.revform,rating,body);root.toast&&root.toast('Review saved');paint();root.render&&root.render()}catch(err){root.toast&&root.toast(err.message||'Could not save review')}return}
  if(e.target.id==='eodf'){e.preventDefault();const F=new FormData(e.target);try{await postOffer({title:F.get('title'),detail:F.get('detail'),price:F.get('price'),discount:F.get('discount'),until:F.get('until')});root.NBSeller&&root.NBSeller.toast('Offer posted. Followers are notified.');NBRerender()&&root.NBSeller.rerender()}catch(err){root.NBSeller&&root.NBSeller.toast(err.message||'Could not post offer')}}
});
const css=root.document.createElement('style');css.textContent=`
.eods{display:flex;gap:10px;overflow:auto;padding-bottom:8px}.eod{flex:0 0 240px;text-align:left;background:#fff;border:1px solid #f3e2c2;border-radius:14px;padding:12px;display:grid;gap:4px;box-shadow:0 1px 2px rgba(16,32,56,.06)}
.eod b{font-size:14px}.eod span,.eod small{color:#6b7785;font-size:12px}.eodcard{background:#fff8eb;border:1px solid #f3e2c2;border-radius:12px;padding:10px 12px;margin:8px 0}.eodcard b{display:block}
.revlist{display:grid;gap:10px;margin-top:12px}.rev{background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 2px rgba(16,32,56,.06)}.rev header{display:flex;justify-content:space-between;font-size:13px}.rev p{margin:6px 0 0;font-size:14px}
.revrep{border:0;background:none;color:#8f2d2d;font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:0}
.revform{display:grid;gap:8px;margin:8px 0}.revstars{display:flex;gap:8px}.revstars label{font-weight:700}.revform textarea{width:100%;border:1px solid #e6eaf0;border-radius:12px;padding:10px;font:inherit;min-height:72px}
.tg.eodtag{background:#fff4e5;color:#9a6700}
.cancel-box{margin:12px 0;padding:12px 14px;border-radius:12px;background:#fff4f2;border:1px solid #ffd0c8;color:#7a2e0e}.cancel-box b{display:block}.cancel-box small{display:block;color:#6b7785}
#cancelbox{position:fixed;inset:0;z-index:220;display:grid;place-items:center;background:rgba(10,20,20,.55);padding:16px}
#cancelbox .ccard{background:#fff;border-radius:18px;max-width:440px;width:100%;padding:22px;display:grid;gap:10px}
#cancelbox h2{margin:0;font-size:22px}#cancelbox p{margin:0;color:#3d4a57;font-size:14px}
#cancelbox label{display:grid;gap:4px;font-size:13px;font-weight:700}#cancelbox select,#cancelbox textarea{font:inherit;font-weight:500;border:1px solid #d6dbe1;border-radius:10px;padding:10px}
#cancelbox .cxerr{color:#b42318;min-height:1.2em}#cancelbox .cxacts{display:flex;gap:8px;justify-content:flex-end}
.social .sh{align-items:center}`;
root.document.head.appendChild(css);
root.Social={api,store,avg,decorate,dealsHTML,shopExtra,accountExtra,cancelHtml,askCancel,applyCancel,validateCancel,reasonLabel,boot,paint,activeOffers,postOffer,saveReview,toggleFollow};
root.CancelBox={ask:askCancel,apply:applyCancel,html:cancelHtml,label:reasonLabel,validate:validateCancel};
hook();
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,400));
else setTimeout(boot,400);
}
