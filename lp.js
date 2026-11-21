// ShopNip · lp.js: launch pack. Loaded last on seller.html (after seller.js, p27, p31) and on index.html (after p3).
// Seller: seller terms gate · Add your own product from a photo · add or change any listing photo · 18+ flag ·
//         premises licence · Challenge 25 ID check before handover · Your plan (£10 a month, no commission).
// Customer: 18+ badge on products, Challenge 25 notice and "I am 18 or over" tick at checkout.
// The database enforces the same rules (migration 20261121200000_launch_pack.sql); this file gives the friendly UI.
(()=>{
const CFG=window.APP_CONFIG||{},TV=CFG.SELLER_TERMS_VERSION||'2026-11',PRICE=+(CFG.SUBSCRIPTION_PRICE||10);
const KIND={alcohol:'Alcohol',tobacco:'Tobacco',vape:'Vapes and nicotine',knife:'Blades and lighter refills',energy:'Energy drink',other:'Other 18+'};
const LAW=['alcohol','tobacco','vape'];
const CATS=['Soft drinks','Energy drinks','Water','Beer & cider','Wine','Spirits','Crisps & snacks','Confectionery','Biscuits & cakes','Bakery','Dairy & eggs','Chilled','Frozen','Tins & jars','Rice, pasta & noodles','Cooking & baking','Breakfast','World foods','Fruit & veg','Meat & fish','Tea & coffee','Household','Toiletries & health','Baby','Pet','Tobacco & vapes','Stationery','Cards & gifts','Party & balloons','Other'];
/* Same rules as age_kind_guess() in the database, so the checkout knows when the 18+ tick is needed. */
function guess(name,cat){const t=(' '+(name||'')+' '+(cat||'')+' ').toLowerCase();
  const alc=/(^|[^a-z])(wine|beer|lager|cider|ale|stout|vodka|whisky|whiskey|gin|rum|brandy|tequila|liqueur|prosecco|champagne|spirits?|alcohol|alcopop|baileys|smirnoff|jack daniel|budweiser|stella artois|carlsberg|heineken|corona|guinness|kopparberg|strongbow|jagermeister|bacardi)([^a-z]|$)/;
  const notAlc=/(wine gum|non[- ]?alcoholic|alcohol[- ]free|0\.0%|ginger|gingerbread|root beer|rum ?(and|&) ?raisin|wine vinegar|rum baba|cider vinegar|beer[- ]battered)/;
  if(alc.test(t)&&!notAlc.test(t))return 'alcohol';
  if(/(^|[^a-z])(cigarettes?|cigars?|tobacco|rolling papers?|rizla|cigarillos?|hand ?rolling)([^a-z]|$)/.test(t))return 'tobacco';
  if(/(^|[^a-z])(vapes?|e-?liquids?|e-?cig(arette)?s?|nicotine|elf ?bar|lost mary|disposable pod)([^a-z]|$)/.test(t))return 'vape';
  if(/(^|[^a-z])(energy drinks?|red bull|monster energy|relentless|rockstar energy|prime energy|boost energy|lucozade energy)([^a-z]|$)/.test(t))return 'energy';
  if(/(^|[^a-z])(lighter refill|butane|lighter gas|knife|knives|razor blades?|craft blades?|stanley blades?)([^a-z]|$)/.test(t))return 'knife';
  return null}
const forced=k=>['alcohol','tobacco','vape','knife'].includes(k);
const C25='Age-restricted: ID may be checked (Challenge 25)';
const css=`.lp-agree{display:flex;gap:10px;align-items:flex-start;margin:6px 0 12px;font-size:14px;text-align:left}.lp-agree input{width:20px;height:20px;margin-top:1px;flex:none}
.lp-terms{align-items:center;flex-wrap:wrap}.lp-terms .lp-agree{margin:8px 0}
.lp-pic{position:relative;display:inline-block;cursor:pointer;flex:none}.lp-pic em{position:absolute;left:0;right:0;bottom:0;font-style:normal;font-size:10px;font-weight:700;text-align:center;color:#fff;background:rgba(15,23,42,.65);border-radius:0 0 10px 10px;padding:1px 0}
.lp-age{margin-left:6px;border:1px solid #cbd5e1;background:#fff;color:#64748b;border-radius:999px;font:700 11px/1 inherit;padding:3px 7px;cursor:pointer;min-height:22px}.lp-age.on{background:#7f1d1d;border-color:#7f1d1d;color:#fff}
.lp-mod .box{max-width:520px}.lp-own{display:grid;gap:12px}.lp-own .fld{display:grid;gap:4px}.lp-own input,.lp-own select{font:inherit;padding:11px 12px;border:1px solid #d7dde4;border-radius:12px;min-height:44px;width:100%;box-sizing:border-box}
.lp-own .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lp-shot{display:grid;gap:8px;justify-items:center;text-align:center;background:#f4fbf9;border-radius:14px;padding:14px}.lp-shot img{max-width:100%;max-height:220px;border-radius:12px;object-fit:contain}
.lp-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.lp-btns .btn{min-height:44px}
.lp-c25{background:#fef2f2;border:1px solid #fecaca;color:#7f1d1d;border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:14px}.lp-c25.ok{background:#f0fdf4;border-color:#bbf7d0;color:#14532d}
.lp-chip{display:inline-block;margin-left:6px;background:#7f1d1d;color:#fff;border-radius:999px;font-size:10px;font-weight:800;padding:2px 6px;vertical-align:middle}
.lp-plan .pr{font-size:34px;font-weight:800}.lp-plan .pr small{font-size:14px;font-weight:600;color:#64748b}.lp-plan ul{list-style:none;padding:0;margin:12px 0;display:grid;gap:6px}.lp-plan li:before{content:"✓ ";color:#0f766e;font-weight:800}
.lp-18{position:absolute;top:6px;left:6px;z-index:2;background:#7f1d1d;color:#fff;border-radius:999px;font:800 11px/1 inherit;padding:4px 7px}.pim{position:relative}
.lp-18t{display:block;margin:8px 0;padding:8px 10px;border-radius:10px;background:#fef2f2;color:#7f1d1d;font-size:13px;font-weight:600}
.lp-age-co{border:1px solid #fecaca;background:#fef2f2;border-radius:14px;padding:12px 14px;margin:12px 0;color:#7f1d1d}.lp-age-co p{margin:4px 0 8px;font-size:14px}.lp-age-co label{display:flex;gap:10px;align-items:center;font-weight:700;color:#0f172a;min-height:44px}.lp-age-co input{width:22px;height:22px}`;
function addCss(){if(document.getElementById('lpcss'))return;const s=document.createElement('style');s.id='lpcss';s.textContent=css;document.head.appendChild(s)}
/* Downscale a photo to a JPEG blob (and data URL) so uploads stay small on phone data. */
function shrink(file,max){return new Promise((ok,no)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{const r=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);const dataUrl=c.toDataURL('image/jpeg',.82);c.toBlob(b=>b?ok({blob:b,dataUrl,canvas:c}):no(new Error('Could not read that photo')),'image/jpeg',.82)};img.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Could not read that photo'))};img.src=u})}
async function scanBarcode(canvas){try{if(!('BarcodeDetector' in window))return '';const d=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});const r=await d.detect(canvas);return (r&&r[0]&&r[0].rawValue||'').replace(/\D/g,'')}catch(_){return ''}}
const shortId=()=>Math.random().toString(36).slice(2,6).toUpperCase()+Date.now().toString(36).slice(-4).toUpperCase();
addCss();
if(window.NBSeller)seller();else customer();

/* =============================== SELLER =============================== */
function seller(){
const NB=window.NBSeller,{D,API,PAGES,TITLE,MOCK,sb,svg,esc,toast}=NB,rr=()=>NB.rerender();
const termsOk=()=>!!(D.shop&&D.shop.terms_accepted_at),licOk=()=>!!(D.shop&&D.shop.alcohol_licence_confirmed_at);
const day=t=>t?new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
const listing=id=>D.L.find(l=>String(l.id)===String(id)),order=id=>D.O.find(o=>String(o.id)===String(id));
async function saveShop(ch){const s=await API.saveShop({id:D.shop.id,...ch});D.shop={...D.shop,...(s||{}),...(MOCK?ch:{})};return D.shop}
const missingCol=e=>/age_restricted|age_kind|barcode|terms_|alcohol_licence|sub_status|column/i.test((e&&e.message)||'');

/* --- 2. seller terms banner on every dashboard page --- */
function termsBanner(){if(!D.shop||termsOk())return '';
  return `<div class="bnr lp-terms" id="lpterms">${svg('alert')}<div style="flex:1"><b>Accept the seller terms to switch products live</b>Please read the <a href="/seller-terms" target="_blank" rel="noopener">ShopNip seller terms</a>. You can set prices and stock now, but products can't go live until you agree.
   <label class="lp-agree"><input type="checkbox" id="lp_tick"> <span>I agree to the <a href="/seller-terms#agree" target="_blank" rel="noopener">ShopNip seller terms</a></span></label><button class="btn sm" data-a="lp-terms">Agree and continue</button></div></div>`}
/* --- 11. Your plan: £10 a month, first month free, no commission --- */
TITLE.plan='Your plan';
PAGES.plan=()=>{const s=D.shop||{},on=CFG.SHOP_SUBSCRIPTION===true,st=s.sub_status||'none';
  const list=`<ul><li>No commission on any order</li><li>Unlimited products, your usual wholesale products listed for you</li><li>Add your own products from a photo</li><li>Click &amp; collect and local delivery</li><li>Order alerts by sound, text and phone call</li><li>Cancel any time</li></ul>`;
  let state;
  if(!on)state=`<p class="mut" style="margin:0">You're not being charged. We'll email you before billing starts for your shop, and you'll add a card here. Your first month will be free.</p>`;
  else if(st==='trialing')state=`<p style="margin:0 0 10px"><b>Free month</b> until ${day(s.sub_trial_ends_at)}. Then £${PRICE} a month.</p><button class="btn ghost" data-a="lp-portal">Manage billing</button>`;
  else if(st==='active')state=`<p style="margin:0 0 10px"><b>Active.</b> Next payment ${day(s.sub_current_period_end)}.</p><button class="btn ghost" data-a="lp-portal">Manage billing</button>`;
  else if(st==='past_due'||st==='unpaid')state=`<div class="alert" role="alert" style="margin:0 0 10px">Your last payment didn't go through. Update your card to keep your shop live.</div><button class="btn" data-a="lp-portal">Update card</button>`;
  else state=`<p style="margin:0 0 10px">${s.sub_trial_ends_at?'Restart your plan to keep your shop live.':'Add a card to start. Nothing is charged for your first month.'}</p><button class="btn coral" data-a="lp-sub">${s.sub_trial_ends_at?'Restart my plan':'Start my free month'}</button>`;
  return `<div class="ph"><div><h2>Your plan</h2><p>One simple price. Every order is yours to keep in full.</p></div></div>
  <div class="card"><div class="cb lp-plan"><div class="pr">£${PRICE} <small>/ month</small></div><p class="mut" style="margin:4px 0 0">First month free · No commission · No setup fee</p>${list}${state}</div></div>`};
async function subCall(body){if(MOCK)return toast('Billing opens in Stripe on the live site');
  const {data,error}=await sb.functions.invoke('shop-subscription',{body});if(error)throw error;if(data&&data.error)throw new Error(data.error);
  if(data&&data.url){location.href=data.url;return}if(data&&data.enabled===false)return toast('Billing isn’t switched on for your shop yet');toast('Your plan is already active')}
/* --- 4. Settings: premises licence and terms record --- */
const _set=PAGES.settings;PAGES.settings=(...a)=>{const h=_set(...a),s=D.shop;if(!s)return h;
  const lic=licOk()?`<p style="margin:0 0 10px">${svg('check')} Premises licence confirmed on ${day(s.alcohol_licence_confirmed_at)}${s.alcohol_licence_number?` · licence ${esc(s.alcohol_licence_number)}`:''}.</p><button class="btn ghost sm danger" data-a="lp-unlic">I no longer hold a licence</button>`
   :`<p class="mut" style="margin:0 0 10px">You need this before you can list alcohol. Tobacco, vapes and other 18+ products don't need it, but you must still check ID.</p>
     <label class="fld"><span>Premises licence number</span><input id="lp_licno" maxlength="60" placeholder="e.g. WAT/PL/0123"></label>
     <label class="lp-agree"><input type="checkbox" id="lp_lictick"> <span>I confirm this shop holds a premises licence that allows the sale of alcohol, and our staff and drivers follow Challenge 25.</span></label><button class="btn sm" data-a="lp-lic">Confirm licence</button>`;
  const terms=termsOk()?`<p class="mut" style="margin:0">${svg('check')} You accepted the <a href="/seller-terms" target="_blank" rel="noopener">seller terms</a> on ${day(s.terms_accepted_at)}${s.terms_version?` (version ${esc(s.terms_version)})`:''}.</p>`:termsBanner().replace('id="lpterms"','');
  return h+`<div class="cards" style="margin-top:16px"><div class="card fs lp-lic"><div class="chd"><h3>Alcohol licence</h3></div><div class="cb">${lic}</div></div><div class="card fs"><div class="chd"><h3>Seller terms</h3></div><div class="cb">${terms}</div></div></div>`};
/* wrap every dashboard page with the terms banner (settings shows its own) */
Object.keys(PAGES).forEach(k=>{if(k==='settings')return;const f=PAGES[k];PAGES[k]=(...a)=>termsBanner()+f(...a)});
/* products page filter labels for the new filters */

/* --- 3. Add your own product --- */
let OWN=null;
function closeMod(){const m=document.getElementById('lpmod');if(m)m.remove();OWN=null}
function openOwn(){closeMod();OWN={blob:null,dataUrl:null,auto:''};
  const m=document.createElement('div');m.id='lpmod';m.className='mod on lp-mod';
  m.innerHTML=`<div class="bg" data-lp-close></div><div class="box" role="dialog" aria-label="Add your own product"><div class="dh"><h3 style="flex:1">Add your own product</h3><button class="ib" data-lp-close aria-label="Close">${svg('x')}</button></div>
  <div class="db"><form id="lpownf" class="lp-own" novalidate>
   <div class="lp-shot"><img id="lp_prev" alt="" hidden><div class="lp-btns"><label class="btn">Take a photo<input type="file" accept="image/*" capture="environment" id="lp_cam" hidden></label><label class="btn ghost">Upload a photo<input type="file" accept="image/*" id="lp_file" hidden></label></div><p class="mut" id="lp_msg" style="margin:0">Take a clear photo of the front of the pack. We'll fill in the title for you.</p></div>
   <label class="fld"><span>Barcode <small class="mut">(optional)</small></span><input name="barcode" id="lp_bc" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="Numbers under the barcode"></label>
   <label class="fld"><span>Title</span><input name="name" id="lp_name" required maxlength="120" placeholder="e.g. Coca-Cola Original Taste 500ml"></label>
   <label class="fld"><span>Category</span><select name="category" id="lp_cat">${CATS.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label>
   <div class="row2"><label class="fld"><span>Price (£)</span><input name="price" type="number" step="0.01" min="0.01" inputmode="decimal" required></label><label class="fld"><span>Stock</span><input name="stock" type="number" step="1" min="0" value="10" inputmode="numeric" required></label></div>
   <label class="tg"><span><b>Age-restricted (18+)</b><small id="lp_agehint">Alcohol, tobacco, vapes, lighter refills and blades. Customers confirm they're 18+ and you check ID.</small></span><span class="sw"><input type="checkbox" name="age" id="lp_age"><i></i></span></label>
   <label class="fld" id="lp_kindw" hidden><span>Type</span><select name="age_kind" id="lp_kind">${Object.entries(KIND).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
   <label class="tg"><span><b>Show in my shop now</b><small>${termsOk()?'Customers can order it straight away.':'Accept the seller terms first. Until then it is saved as hidden.'}</small></span><span class="sw"><input type="checkbox" name="live" ${termsOk()?'checked':''}><i></i></span></label>
   <div class="alert" id="lp_err" role="alert" hidden></div>
   <button class="btn coral lg" type="submit" style="width:100%">Add product</button></form></div></div>`;
  document.body.appendChild(m)}
function setAge(kind){const a=document.getElementById('lp_age'),k=document.getElementById('lp_kind'),w=document.getElementById('lp_kindw');if(!a)return;
  if(kind){a.checked=true;k.value=kind;w.hidden=false;document.getElementById('lp_agehint').textContent=kind==='energy'?'Looks like an energy drink. Many shops sell these to 16+ only; untick if you do not age-check them.':'Looks age-restricted ('+KIND[kind].toLowerCase()+'). Customers confirm 18+ and you check ID.'}
  else{w.hidden=!a.checked}}
function fill(r){if(!r)return;const n=document.getElementById('lp_name');if(!n)return;
  if(r.title&&(!n.value||n.value===OWN.auto)){n.value=r.title;OWN.auto=r.title}
  if(r.category&&CATS.includes(r.category))document.getElementById('lp_cat').value=r.category;
  if(r.barcode&&!document.getElementById('lp_bc').value)document.getElementById('lp_bc').value=r.barcode;
  setAge(r.age_kind||guess(n.value,document.getElementById('lp_cat').value))}
async function lookup(body){if(MOCK)return null;try{const {data,error}=await sb.functions.invoke('product-from-photo',{body});if(error||!data||data.error)return null;return data}catch(_){return null}}
async function onPhoto(file){const msg=document.getElementById('lp_msg');if(!file||!OWN)return;if(file.size>15e6)return msg.textContent='That photo is too large. Try another.';
  msg.textContent='Reading the photo…';
  try{const big=await shrink(file,1280);OWN.blob=big.blob;OWN.dataUrl=big.dataUrl;const p=document.getElementById('lp_prev');p.src=big.dataUrl;p.hidden=false;
    const bc=await scanBarcode(big.canvas);if(bc&&!document.getElementById('lp_bc').value)document.getElementById('lp_bc').value=bc;
    const small=await shrink(file,768);const r=await lookup({image:small.dataUrl,barcode:document.getElementById('lp_bc').value||''});
    if(r&&r.title){fill(r);msg.textContent='Title filled in. Check it, then add your price and stock.'}
    else{msg.textContent='We couldn’t read the title. Type it below, or enter the barcode numbers.';document.getElementById('lp_name').focus()}}
  catch(e){msg.textContent=e.message||'Could not read that photo'}}
async function saveOwn(f){const F=new FormData(f),err=document.getElementById('lp_err'),b=f.querySelector('button[type=submit]');const fail=m=>{err.textContent=m;err.hidden=false};
  err.hidden=true;const name=String(F.get('name')||'').trim().replace(/\s+/g,' '),price=Math.round(+F.get('price')*100)/100,stock=Math.max(0,Math.round(+F.get('stock')||0));
  let bc=String(F.get('barcode')||'').replace(/\D/g,'');if(bc&&(bc.length<6||bc.length>14))return fail('Barcodes are 8 to 14 numbers. Check it, or leave it blank.');
  if(name.length<2)return fail('Add a title for this product.');if(!(price>0))return fail('Enter a price above £0.');
  if(bc&&D.L.some(l=>l.barcode===bc||l.sku===bc))return fail('This barcode is already in your shop. Find it under Products to change its price or stock.');
  const age=!!F.get('age'),kind=age?String(F.get('age_kind')||'other'):null;let live=!!F.get('live');const notes=[];
  if(live&&!termsOk()){live=false;notes.push('Saved as hidden. Accept the seller terms to switch it live.')}
  if(live&&kind==='alcohol'&&!licOk()){live=false;notes.push('Saved as hidden. Confirm your premises licence in Settings to sell alcohol.')}
  b.disabled=true;b.textContent='Adding…';
  try{let image=null;if(OWN&&OWN.blob)image=await API.upload(new File([OWN.blob],'product.jpg',{type:'image/jpeg'}),'product');
    const row={shop_id:D.shop.id,sku:'OWN-'+shortId(),name,image,category:String(F.get('category')||'Other'),trade_price:null,retail_price:price,stock,active:live,source:'own',age_restricted:age,age_kind:kind,barcode:bc||null};
    let l;try{l=await API.addListing({...row})}catch(e){if(!missingCol(e))throw e;const r2={...row};delete r2.age_restricted;delete r2.age_kind;delete r2.barcode;l=await API.addListing(r2)}
    D.L.unshift({...row,...l});closeMod();toast(notes[0]||(live?'Added and live in your shop':'Added as hidden'));rr()}
  catch(e){b.disabled=false;b.textContent='Add product';fail(e.message||'Could not add the product')}}

/* --- 6. add or change a photo on any listing --- */
async function onListingPhoto(inp){const l=listing(inp.dataset.lpPhoto),file=inp.files&&inp.files[0];if(!l||!file)return;
  try{toast('Uploading photo…');const s=await shrink(file,1280);const url=await API.upload(new File([s.blob],'product.jpg',{type:'image/jpeg'}),'product');await API.updListing(l.id,{image:url});l.image=url;toast('Photo saved');rr()}
  catch(e){toast(e.message||'Could not save the photo')}}
/* --- 4. 18+ toggle on a listing --- */
async function toggleAge(id){const l=listing(id);if(!l)return;let ch;
  if(l.age_restricted){if(LAW.includes(l.age_kind)&&!confirm(`This is marked as ${KIND[l.age_kind].toLowerCase()}, which is 18+ by law. Remove the 18+ flag only if that's wrong. Continue?`))return;ch={age_restricted:false,age_kind:null}}
  else{const k=guess(l.name,l.category);ch={age_restricted:true,age_kind:k&&k!=='energy'?k:(k||'other')}}
  try{await API.updListing(l.id,ch);Object.assign(l,ch);toast(ch.age_restricted?'Marked 18+. Customers confirm their age and you check ID':'18+ flag removed');rr()}
  catch(e){toast(missingCol(e)?'This needs the latest database update.':(e.message||'Could not save'))}}

/* --- 4. Challenge 25 before handover --- */
const needsId=o=>!!(o&&o.age_check_required&&!o.id_checked_at);
function idSheet(o){closeMod();const items=(o.order_items||[]).filter(i=>i.age_restricted).map(i=>esc(i.name)).join(', ');
  const m=document.createElement('div');m.id='lpmod';m.className='mod on lp-mod';
  m.innerHTML=`<div class="bg" data-lp-close></div><div class="box" role="dialog" aria-label="Challenge 25 check"><div class="dh"><h3 style="flex:1">Challenge 25 check</h3><button class="ib" data-lp-close aria-label="Close">${svg('x')}</button></div>
   <div class="db"><p>Order <b>${esc(o.order_number||'')}</b> has age-restricted items${items?`: <b>${items}</b>`:''}.</p>
   <p>If the customer looks under 25, ask for photo ID: a passport, photocard driving licence or a card with the PASS hologram. They must be 18 or over.</p>
   <div style="display:grid;gap:10px;margin-top:14px"><button class="btn lg" data-lp-idok="${esc(o.id)}">ID checked: 18 or over</button><button class="btn ghost lg danger" data-lp-idno="${esc(o.id)}">No valid ID: don’t hand over</button></div></div></div>`;
  document.body.appendChild(m)}
async function idOk(id){const o=order(id);if(!o)return;
  try{if(!MOCK){const {error}=await sb.rpc('confirm_id_check',{p_order:o.id});if(error)throw error}o.id_checked_at=new Date().toISOString();closeMod();toast('ID check saved');
    rr();setTimeout(()=>{const b=document.querySelector(`[data-st="completed"][data-id="${CSS.escape(String(o.id))}"]`);if(b)b.click()},50)}
  catch(e){toast(e.message||'Could not save the ID check')}}
async function idNo(id){const o=order(id);if(!o)return;if(!confirm('Cancel this order and refund the customer? Don’t hand over any of it.'))return;
  try{await API.status(o.id,'cancelled','Challenge 25: no valid ID was shown, so the order could not be handed over.',{reason:'other'});D.O=await API.orders();D.L=await API.listings();closeMod();toast('Order cancelled. Anything the customer paid is refunded.');rr()}
  catch(e){toast(e.message||'Could not cancel the order')}}
function paintC25(){if(!document.body.classList.contains('dash'))return;
  const dr=document.querySelector('.drw.on .db');if(dr&&!dr.querySelector('.lp-c25')){const o=order(D.ui.drawer);if(o&&o.age_check_required)dr.insertAdjacentHTML('afterbegin',o.id_checked_at?`<div class="lp-c25 ok"><b>Challenge 25: ID checked</b> at ${new Date(o.id_checked_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}.</div>`:`<div class="lp-c25"><b>Challenge 25 check required.</b> This order has 18+ items. Check photo ID before handing it over.</div>`)}
  document.querySelectorAll('article.run:not([data-lp])').forEach(a=>{a.dataset.lp='1';const b=a.querySelector('[data-id]');const o=b&&order(b.dataset.id);if(o&&o.age_check_required)a.querySelector('.runh')?.insertAdjacentHTML('afterend',`<div class="lp-c25${o.id_checked_at?' ok':''}">${o.id_checked_at?'<b>ID checked</b>':'<b>Challenge 25 check required.</b> Check photo ID at the door. Never leave 18+ items on a doorstep.'}</div>`)});
  document.querySelectorAll('tr[data-o]:not([data-lp])').forEach(tr=>{tr.dataset.lp='1';const o=order(tr.dataset.o);if(o&&o.age_check_required)tr.querySelector('td b')?.insertAdjacentHTML('afterend','<span class="lp-chip" title="Challenge 25 check required">18+</span>')})}
let q=0;new MutationObserver(()=>{if(!q)q=requestAnimationFrame(()=>{q=0;paintC25()})}).observe(document.getElementById('app'),{childList:true,subtree:true});

/* --- events (window capture runs before seller.js and rel.js handlers) --- */
addEventListener('click',async e=>{const t=e.target.closest('[data-a],[data-lp-age],[data-lp-close],[data-lp-idok],[data-lp-idno],[data-st="completed"]');if(!t)return;
  if(t.matches('[data-lp-close]')){e.preventDefault();closeMod();return}
  if(t.dataset.lpIdok){e.preventDefault();e.stopImmediatePropagation();return idOk(t.dataset.lpIdok)}
  if(t.dataset.lpIdno){e.preventDefault();e.stopImmediatePropagation();return idNo(t.dataset.lpIdno)}
  if(t.dataset.lpAge){e.preventDefault();e.stopImmediatePropagation();return toggleAge(t.dataset.lpAge)}
  if(t.dataset.st==='completed'){const o=order(t.dataset.id);if(needsId(o)){e.preventDefault();e.stopImmediatePropagation();idSheet(o)}return}
  const a=t.dataset.a;if(!a||!a.startsWith('lp-'))return;e.preventDefault();e.stopImmediatePropagation();
  try{
    if(a==='lp-own'){openOwn();return}
    if(a==='lp-terms'){const tick=t.closest('.bnr,.cb')?.querySelector('input[type=checkbox]');if(!tick||!tick.checked)return toast('Tick I agree to the ShopNip seller terms first');
      t.disabled=true;await saveShop({terms_accepted_at:new Date().toISOString(),terms_version:TV});toast('Thanks. You can now switch products live.');rr();return}
    if(a==='lp-lic'){const no=(document.getElementById('lp_licno')?.value||'').trim(),tk=document.getElementById('lp_lictick');if(!tk||!tk.checked)return toast('Tick the box to confirm your premises licence');if(no.length<3)return toast('Enter your premises licence number');
      await saveShop({alcohol_licence_number:no,alcohol_licence_confirmed_at:new Date().toISOString()});toast('Premises licence confirmed');rr();return}
    if(a==='lp-unlic'){if(!confirm('Your alcohol products will be switched off. Continue?'))return;await saveShop({alcohol_licence_confirmed_at:null});D.L=await API.listings();toast('Licence removed. Alcohol products are switched off.');rr();return}
    if(a==='lp-sub'){t.disabled=true;await subCall({});t.disabled=false;return}
    if(a==='lp-portal'){t.disabled=true;await subCall({portal:true});t.disabled=false;return}
  }catch(er){t.disabled=false;toast(missingCol(er)?'This needs the latest database update.':(er.message||'Something went wrong'))}},true);
addEventListener('change',e=>{const t=e.target;
  if(t.dataset&&t.dataset.f==='active'&&t.checked){const tr=t.closest('[data-l-id]'),l=tr&&listing(tr.dataset.lId);
    const stop=m=>{e.stopImmediatePropagation();t.checked=false;toast(m)};
    if(!termsOk()){stop('Accept the seller terms first. It’s at the top of this page.');document.getElementById('lpterms')?.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(l&&!(+l.retail_price>0))return stop('Set a price above £0 before switching this live');
    if(l&&l.age_kind==='alcohol'&&!licOk())return stop('Confirm your premises licence in Settings before selling alcohol');return}
  if(t.dataset&&t.dataset.lpPhoto){e.stopImmediatePropagation();onListingPhoto(t);return}
  if(t.id==='lp_cam'||t.id==='lp_file'){onPhoto(t.files&&t.files[0]);return}
  if(t.id==='lp_age'){setAge(t.checked?(document.getElementById('lp_kind').value||'other'):null);return}
  if(t.id==='lp_cat'){const n=document.getElementById('lp_name');const k=guess(n&&n.value,t.value);if(k)setAge(k);return}
  if(t.id==='lp_bc'){const v=t.value.replace(/\D/g,'');t.value=v;const n=document.getElementById('lp_name');if(v.length>=8&&n&&!n.value){document.getElementById('lp_msg').textContent='Looking up the barcode…';lookup({barcode:v}).then(r=>{if(r&&r.title){fill(r);document.getElementById('lp_msg').textContent='Title filled in from the barcode. Check it, then add your price.'}else document.getElementById('lp_msg').textContent='Barcode not found. Type the title below.'})}}},true);
addEventListener('input',e=>{if(e.target.id==='lp_name'&&!document.getElementById('lp_age').checked){const k=guess(e.target.value,document.getElementById('lp_cat').value);if(k)setAge(k)}},true);
addEventListener('submit',e=>{if(e.target.id==='lpownf'){e.preventDefault();e.stopImmediatePropagation();saveOwn(e.target)}},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('lpmod'))closeMod()});
}

/* =============================== CUSTOMER =============================== */
function customer(){
if(typeof S==='undefined'||typeof V==='undefined')return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ticked=false;
let force=false;
function lineRestricted(b){const l=(S.L||[]).find(x=>b.listing_id&&String(x.id)===String(b.listing_id));
  if(l&&'age_restricted' in l)return !!l.age_restricted;const p=(S.products||[]).find(x=>x.sku===b.sku);return force||forced(guess(b.name,b.category||(p&&p.category)))}
function productRestricted(p){if(!p)return false;const l=p.listing_id&&(S.L||[]).find(x=>String(x.id)===String(p.listing_id));
  if(l&&'age_restricted' in l)return !!l.age_restricted;return forced(guess(p.name,p.category))}
const restrictedInBasket=()=>(S.basket||[]).filter(lineRestricted);
window.LPAge={need:()=>restrictedInBasket().length>0,ok:()=>ticked||!!document.getElementById('c_age18')?.checked};
const _co=V.checkout;if(_co)V.checkout=function(...a){let h=_co.apply(this,a);if(/18 or over at checkout/.test(h))force=true;const R=restrictedInBasket();if(!R.length)return h;
  const box=`<div class="lp-age-co" id="lpage"><b>${C25}</b><p>Your basket has items only sold to people aged 18 or over: ${R.map(b=>esc(b.name)).join(', ')}. Bring photo ID if you look under 25. If valid ID isn't shown, those items won't be handed over and you'll be refunded.</p><label><input type="checkbox" id="c_age18" ${ticked?'checked':''}> I confirm I am 18 or over</label></div>`;
  const i=h.indexOf('<button type="submit"');return i>-1?h.slice(0,i)+box+h.slice(i):h+box};
addEventListener('change',e=>{if(e.target.id==='c_age18')ticked=e.target.checked},true);
addEventListener('submit',e=>{const f=e.target&&e.target.closest&&e.target.closest('[data-form="order"]');if(!f||!window.LPAge.need()||window.LPAge.ok())return;
  e.preventDefault();e.stopImmediatePropagation();const box=document.getElementById('lpage');if(box){box.scrollIntoView({behavior:'smooth',block:'center'});box.style.outline='3px solid #dc2626'}
  if(typeof toast==='function')toast('Please confirm you are 18 or over to buy age-restricted items')},true);
/* 18+ badges on product cards and the product sheet */
function paint(){document.querySelectorAll('.pc[data-psku]:not([data-lp18])').forEach(c=>{c.dataset.lp18='1';const lid=c.dataset.lid,sku=c.dataset.psku;
    const p=(S.products||[]).find(x=>(lid&&String(x.listing_id)===lid)||x.sku===sku)||{listing_id:lid,name:c.querySelector('img')?.alt||''};
    if(productRestricted(p))c.querySelector('.pim')?.insertAdjacentHTML('afterbegin',`<span class="lp-18" title="${C25}">18+</span>`)});
  const sh=document.getElementById('sheet');if(sh&&sh.classList.contains('on')&&sh._p&&!sh.querySelector('.lp-18t')&&productRestricted(sh._p)){const at=sh.querySelector('h2,h3');if(at)at.insertAdjacentHTML('afterend',`<span class="lp-18t">${C25}</span>`)}}
let q=0;new MutationObserver(()=>{if(!q)q=requestAnimationFrame(()=>{q=0;paint()})}).observe(document.body,{childList:true,subtree:true});
}
})();
