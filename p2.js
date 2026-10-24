// Nearbuy (a NuvonHub product) · Phase 2: auth, shop registration, owner dashboard, public shop page, admin.
// Loaded after app.js and reuses its globals (S, V, sb, $, esc, gbp, svg, route, render, miles, lookupPostcode).
// ?mock=1 runs everything against in-memory data (for local screenshots); nothing is sent to Supabase.
(function(){
const Q=new URLSearchParams(location.search),MOCK=Q.get('mock')==='1';
const ADMINS=(CFG.ADMIN_EMAILS||[]).map(e=>e.toLowerCase());
const A={user:null,profile:null,shop:null,listings:[],catalog:null,pending:[],tab:'login',msg:''};
const toast=m=>{let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}t.textContent=m;t.className='on';clearTimeout(t._h);t._h=setTimeout(()=>t.className='',2600)};
const pct=(r,t)=>t>0?Math.round((r-t)/r*100):0;   // margin % of retail price
async function catalog(){if(!A.catalog)A.catalog=await (await fetch('products.json')).json();return A.catalog}

// ---------- data layer (Supabase or mock) ----------
const M={users:{},shops:[],listings:[]};
const DB=MOCK?{
  async session(){return Q.get('as')?{user:{id:'u1',email:Q.get('as')==='admin'?(ADMINS[0]||'admin@example.com'):'owner@example.com'}}:null},
  async signUp(e,p,role,name){A.user={id:'u1',email:e};return{}}, async signIn(e){A.user={id:'u1',email:e};return{}}, async signOut(){},
  async profile(){return{role:Q.get('as')==='shopper'?'shopper':'owner',full_name:'Priya Shah'}},
  async myShop(){return M.shops.find(s=>s.owner_id==='u1')||null},
  async listings(){return M.listings}, async saveShop(s){s.id=s.id||'s1';s.owner_id='u1';s.status=s.status||'pending';const i=M.shops.findIndex(x=>x.id===s.id);i<0?M.shops.push(s):M.shops[i]={...M.shops[i],...s};return s},
  async upload(f){return URL.createObjectURL(f)},
  async addListing(l){l.id='l'+Math.random().toString(36).slice(2,7);M.listings.unshift(l);return l},
  async updListing(id,ch){Object.assign(M.listings.find(l=>l.id===id),ch)}, async delListing(id){M.listings=M.listings.filter(l=>l.id!==id)},
  async bulk(ids,ch){ids.forEach((id,i)=>Object.assign(M.listings.find(l=>l.id===id),ch[i]))},
  async shop(id){return M.shops.find(s=>s.id===id)}, async shopListings(id){return M.listings.filter(l=>l.active)},
  async pending(){return M.shops.filter(s=>s.status==='pending')}, async setStatus(id,st){M.shops.find(s=>s.id===id).status=st},
  async backfill(){return 0}
}:{
  async session(){return sb?(await sb.auth.getSession()).data.session:null},
  async signUp(email,password,role,full_name){const {data,error}=await sb.auth.signUp({email,password,options:{data:{role,full_name},emailRedirectTo:location.origin+'/#account'}});if(error)throw error;return data},
  async signIn(email,password){const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;return data},
  async signOut(){await sb.auth.signOut()},
  async profile(){const {data}=await sb.from('profiles').select('role,full_name').eq('id',A.user.id).maybeSingle();return data||{role:A.user.user_metadata?.role||'shopper'}},
  async myShop(){const {data,error}=await sb.from('shops').select('*').eq('owner_id',A.user.id).maybeSingle();if(error)throw error;return data},
  async listings(){const {data,error}=await sb.from('shop_listings').select('*').eq('shop_id',A.shop.id).order('updated_at',{ascending:false});if(error)throw error;return data},
  async saveShop(s){const q=s.id?sb.from('shops').update(s).eq('id',s.id):sb.from('shops').insert({...s,owner_id:A.user.id});const {data,error}=await q.select().single();if(error)throw error;return data},
  async upload(f,kind){const ext=(f.name.split('.').pop()||'jpg').toLowerCase(),path=`${A.user.id}/${kind}-${Date.now()}.${ext}`;
    const {error}=await sb.storage.from('shop-media').upload(path,f,{upsert:true,contentType:f.type});if(error)throw error;return sb.storage.from('shop-media').getPublicUrl(path).data.publicUrl},
  async addListing(l){const {data,error}=await sb.from('shop_listings').insert(l).select().single();if(error)throw error;return data},
  async updListing(id,ch){const {error}=await sb.from('shop_listings').update({...ch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error},
  async delListing(id){const {error}=await sb.from('shop_listings').delete().eq('id',id);if(error)throw error},
  async bulk(ids,ch){for(let i=0;i<ids.length;i++)await this.updListing(ids[i],ch[i])},
  async shop(id){const {data}=await sb.from('shops').select('*').eq('id',id).maybeSingle();return data},
  async shopListings(id){const {data}=await sb.from('shop_listings').select('*').eq('shop_id',id).eq('active',true).order('name');return data||[]},
  async pending(){const {data,error}=await sb.from('shops').select('*').eq('status','pending').order('created_at');if(error)throw error;return data},
  async setStatus(id,status){const {error}=await sb.from('shops').update({status,active:status==='approved'}).eq('id',id);if(error)throw error},
  async backfill(id){const {data}=await sb.rpc('backfill_shop_listings',{p_shop:id});return data||0}
};
const isAdmin=()=>!!A.user&&ADMINS.includes((A.user.email||'').toLowerCase());
async function refresh(){
  const s=await DB.session();A.user=s?.user||null;A.profile=null;A.shop=null;A.listings=[];
  if(!A.user)return;
  try{A.profile=await DB.profile();A.shop=await DB.myShop();if(A.shop)A.listings=await DB.listings()}catch(e){console.warn(e);A.msg=e.message}
}
// ---------- mock seed ----------
async function seedMock(){
  const c=await catalog();const pick=k=>c.filter(p=>p.images.length&&p.name.toLowerCase().includes(k));
  if(Q.get('as')&&Q.get('shop')!=='none'){
    M.shops.push({id:'s1',owner_id:'u1',name:'Corner News & Stationers',address:'12 High Street, Leicester',postcode:'LE1 5YA',lat:52.634,lng:-1.133,phone:'0116 123 4567',
      opening_hours:'Mon–Sat 7am–7pm, Sun 9am–2pm',status:Q.get('status')||'approved',active:true,bluepark_customer_email:'orders@cornernews.co.uk',
      delivery_options:{collect:true,delivery:true,delivery_radius_miles:3,delivery_fee:2.5},logo_url:null,cover_url:null});
    [...pick('pencil').slice(0,2),...pick('balloon').slice(0,2),...pick('glue').slice(0,1),...pick('notebook').slice(0,2),...pick('gift bag').slice(0,1)].forEach((p,i)=>
      M.listings.push({id:'l'+i,shop_id:'s1',sku:p.sku,name:p.name,image:p.images[0],category:p.category,trade_price:p.trade_price,retail_price:+(p.trade_price*(i%3?1.5:1.8)).toFixed(2),stock:[24,6,0,12,40,3,18,9][i],active:i!==2,source:i<5?'wholesale':'manual'}));
    M.shops.push({id:'s2',owner_id:'u2',name:'Village Post Office Store',address:'1 Church Lane, Oadby',postcode:'LE2 5AA',status:'pending',bluepark_customer_email:'vpo@example.com',created_at:'2026-10-23',delivery_options:{collect:true}});
  }
}
// ---------- views ----------
const field=(id,label,attrs='',val='')=>`<label class="fl"><span>${label}</span><input id="${id}" ${attrs} value="${esc(val)}"></label>`;
const msg=()=>A.msg?`<div class="alert">${esc(A.msg)}</div>`:'';
V.account=function(){
  if(!LIVE&&!MOCK)return `<section class="sec"><div class="sh"><h2>Account</h2></div><div class="panel">Accounts need Supabase configured in config.js.</div></section>`;
  if(!A.user){const su=A.tab==='signup';
    return `<section class="sec narrow"><div class="sh"><h2>${su?'Create your account':'Welcome back'}</h2></div>
    <div class="seg"><button data-act="tab" data-v="login" class="${su?'':'on'}">Log in</button><button data-act="tab" data-v="signup" class="${su?'on':''}">Sign up</button></div>
    <form class="panel form" data-form="${su?'signup':'login'}">${msg()}
     ${su?field('f_name','Your name','autocomplete="name" required'):''}
     ${field('f_email','Email','type="email" autocomplete="email" required')}
     ${field('f_pw','Password','type="password" minlength="8" autocomplete="'+(su?'new':'current')+'-password" required')}
     ${su?`<div class="fl"><span>I want to…</span><div class="roles">
       <label class="role"><input type="radio" name="role" value="shopper" checked><b>Shop locally</b><small>Order from shops near me</small></label>
       <label class="role"><input type="radio" name="role" value="owner"><b>Sell on Nearbuy</b><small>I run a local shop</small></label></div></div>`:''}
     <button class="btn full">${su?'Create account':'Log in'}</button></form></section>`}
  const owner=A.profile?.role==='owner'||A.shop;
  return `<section class="sec narrow"><div class="sh"><h2>Account</h2></div>${msg()}
   <div class="panel"><div class="acct"><span class="avatar">${esc((A.profile?.full_name||A.user.email)[0].toUpperCase())}</span><div><b>${esc(A.profile?.full_name||'')}</b><small>${esc(A.user.email)}</small></div><span class="pill">${owner?'Shop owner':'Shopper'}</span></div></div>
   ${owner?(A.shop?`<button class="tile" data-act="go" data-v="myshop">${svg('store')}<span><b>My shop</b><small>${esc(A.shop.name)} · ${statusLabel(A.shop.status)}</small></span></button>`
     :`<button class="tile hot" data-act="go" data-v="register">${svg('store')}<span><b>Register your shop</b><small>Takes about 3 minutes</small></span></button>`)
     :`<button class="tile" data-act="go" data-v="register">${svg('store')}<span><b>Run a shop? Sell on Nearbuy</b><small>Register your shop</small></span></button>`}
   ${isAdmin()?`<button class="tile" data-act="go" data-v="admin">${svg('check')}<span><b>Admin</b><small>Approve new shops</small></span></button>`:''}
   <div class="panel"><div class="line"><span>Postcode</span><a href="#" id="setpc2">${esc(S.pc||'Set')}</a></div></div>
   <button class="btn ghost full" data-act="logout">Log out</button></section>`};
const statusLabel=s=>({pending:'Pending approval',approved:'Live',rejected:'Not approved',suspended:'Suspended'}[s]||s);
V.register=function(){
  if(!A.user){A.tab='signup';A.msg='Create an account (choose “Sell on Nearbuy”) to register your shop.';return V.account()}
  const s=A.shop||{},d=s.delivery_options||{collect:true};
  return `<section class="sec narrow"><div class="sh"><h2>${s.id?'Edit shop details':'Register your shop'}</h2></div>
  <p class="sub">${s.id?'Changes to your trade email send the shop back for review.':'Tell shoppers about your shop. We review every new shop before it goes live, usually within a day.'}</p>
  <form class="form" data-form="shop">${msg()}
   <div class="panel"><h3 class="ft">Your shop</h3>
    ${field('s_name','Shop name','required maxlength="80" placeholder="e.g. Corner News & Stationers"',s.name)}
    ${field('s_addr','Street address','required autocomplete="street-address" placeholder="12 High Street, Town"',s.address)}
    <div class="two">${field('s_pc','Postcode','required autocomplete="postal-code" placeholder="LE1 5YA" style="text-transform:uppercase"',s.postcode)}${field('s_phone','Phone','type="tel" autocomplete="tel" placeholder="0116 123 4567"',s.phone)}</div>
    <label class="fl"><span>Opening hours</span><textarea id="s_hours" rows="2" placeholder="Mon–Sat 8am–6pm, Sun closed">${esc(s.opening_hours||'')}</textarea></label></div>
   <div class="panel"><h3 class="ft">How customers get their order</h3>
    <label class="tog"><input type="checkbox" id="s_col" ${d.collect!==false?'checked':''}><span><b>Click &amp; collect</b><small>Customers pick up in store</small></span></label>
    <label class="tog"><input type="checkbox" id="s_del" ${d.delivery?'checked':''}><span><b>Local delivery</b><small>You deliver nearby</small></span></label>
    <div class="two" id="delx">${field('s_rad','Delivery radius (miles)','type="number" min="0.5" max="25" step="0.5"',d.delivery_radius_miles??3)}${field('s_fee','Delivery fee (£)','type="number" min="0" step="0.01"',d.delivery_fee??2.5)}</div></div>
   <div class="panel"><h3 class="ft">Wholesale account</h3>
    ${field('s_trade','Trade account email','type="email" required placeholder="The email you order wholesale with"',s.bluepark_customer_email)}
    <p class="hint">Products you buy wholesale with this email are added to your shop automatically after they ship.</p></div>
   <div class="panel"><h3 class="ft">Photos</h3><div class="two">
    <label class="up"><input type="file" id="s_logo" accept="image/*" hidden><span class="upi" id="pv_logo">${s.logo_url?`<img src="${esc(s.logo_url)}">`:svg('plus')}</span><b>Logo</b><small>Square, 400px+</small></label>
    <label class="up"><input type="file" id="s_cover" accept="image/*" hidden><span class="upi wide" id="pv_cover">${s.cover_url?`<img src="${esc(s.cover_url)}">`:svg('plus')}</span><b>Cover photo</b><small>Shop front, 1200×600</small></label></div></div>
   <button class="btn full big" id="s_submit">${s.id?'Save changes':'Submit for approval'}</button>
   <p class="hint c">By registering you agree to the Nearbuy seller terms.</p></form></section>`};
V.myshop=function(){
  if(!A.shop)return V.register();const s=A.shop,L=A.listings;
  const live=L.filter(l=>l.active).length,low=L.filter(l=>l.stock<=3).length;
  const st=s.status==='approved'?'':`<div class="banner ${s.status}">${s.status==='pending'?'⏳ Your shop is awaiting approval. You can set up listings now; shoppers will see them once approved.':'Your shop is '+statusLabel(s.status).toLowerCase()+'. Contact support.'}</div>`;
  return `<section class="sec"><div class="dash-h"><div class="dash-logo">${s.logo_url?`<img src="${esc(s.logo_url)}">`:esc(s.name[0])}</div><div><h2>${esc(s.name)}</h2><small>${esc(s.postcode||'')} · <span class="st ${s.status}">${statusLabel(s.status)}</span></small></div>
   <button class="icon-btn" data-act="go" data-v="register" aria-label="Edit shop">${svg('account')}</button></div>${st}
   <div class="stats"><div><b>${L.length}</b><small>Products</small></div><div><b>${live}</b><small>Live</small></div><div><b>${low}</b><small>Low stock</small></div></div>
   <div class="acts"><button class="btn" data-act="go" data-v="addprod">${svg('plus')} Add products</button><button class="btn ghost" data-act="margin">Set margin</button>${s.status==='approved'?`<button class="btn ghost" data-act="viewshop">View shop</button>`:''}</div>
   <div id="marginbox" class="panel hidden"><h3 class="ft">Bulk set margin</h3><p class="hint">Sets retail price so your margin is this % of the selling price. Prices round to the nearest 5p.</p>
    <div class="two"><label class="fl"><span>Margin %</span><input id="m_pct" type="number" min="0" max="90" value="35"></label>
    <label class="fl"><span>Apply to</span><select id="m_scope"><option value="all">All products</option><option value="active">Live products</option><option value="new">Wholesale imports</option></select></label></div>
    <div id="m_prev" class="hint"></div><button class="btn full" data-act="applymargin">Apply</button></div>
   <div class="sh" style="margin-top:24px"><h2>Listings</h2><input id="lf" class="mini" placeholder="Filter" value="${esc(A.lf||'')}"></div>
   ${L.length?`<div class="lst">${L.filter(l=>!A.lf||l.name.toLowerCase().includes(A.lf.toLowerCase())).map(lrow).join('')}</div>`:
   `<div class="noshops"><div class="ic">${svg('orders')}</div><h4>No products yet</h4><p>Products you buy wholesale appear here automatically after they ship. You can also add them yourself.</p><button class="btn" data-act="go" data-v="addprod">Add products</button></div>`}
  </section>`};
const lrow=l=>{const m=pct(l.retail_price,l.trade_price);return `<div class="li ${l.active?'':'off'}" data-id="${esc(l.id)}">
 <img src="${esc(l.image||'icon-192.png')}" alt="" onerror="this.src='icon-192.png'"><div class="lb"><div class="ln">${esc(l.name)}</div>
 <div class="lm"><span>Trade ${l.trade_price!=null?gbp(l.trade_price):'–'}</span>${l.source==='wholesale'?'<span class="src">Auto</span>':''}</div>
 <div class="lc"><label class="pf2">£<input type="number" step="0.01" min="0" value="${(+l.retail_price).toFixed(2)}" data-f="retail_price" aria-label="Retail price"></label>
 <span class="mg ${m<20?'lo':m>=35?'hi':''}">${m}%</span>
 <label class="sk">Stock<input type="number" min="0" step="1" value="${l.stock}" data-f="stock"></label>
 <label class="sw" title="Live"><input type="checkbox" data-f="active" ${l.active?'checked':''}><i></i></label></div></div></div>`};
V.addprod=function(){const q=(A.aq||'').toLowerCase(),have=new Set(A.listings.map(l=>l.sku));
  const res=A.catalog?A.catalog.filter(p=>!q||(p.name+' '+p.sku).toLowerCase().includes(q)).slice(0,40):[];
  return `<section class="sec"><div class="sh"><h2>Add products</h2><a href="#" data-act="go" data-v="myshop">Done</a></div>
  <div class="search in"><svg viewBox="0 0 24 24">${'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'}</svg><input id="aq" placeholder="Search the catalogue by name or SKU" value="${esc(A.aq||'')}"></div>
  <p class="hint">${A.catalog.length.toLocaleString()} products in the catalogue. New listings start at trade × 1.5; change it any time.</p>
  <div class="lst">${res.map(p=>`<div class="li"><img src="${esc(p.images[0]||'icon-192.png')}" alt="" onerror="this.src='icon-192.png'"><div class="lb"><div class="ln">${esc(p.name)}</div>
   <div class="lm"><span>SKU ${esc(p.sku)}</span><span>Trade ${gbp(p.trade_price)}</span></div></div>
   ${have.has(p.sku)?'<span class="added">Listed</span>':`<button class="add" data-act="addsku" data-v="${esc(p.sku)}" aria-label="Add">${svg('plus')}</button>`}</div>`).join('')}</div></section>`};
V.shop=function(id){const s=A.view;if(!s||s.id!==id){loadShop(id);return '<div class="empty">Loading shop…</div>'}
  const d=s.delivery_options||{},dist=S.me&&s.lat!=null?miles(S.me,s).toFixed(1)+' mi away':'';
  return `<div class="shero" style="${s.cover_url?`background-image:url('${esc(s.cover_url)}')`:''}"><button class="back" data-t="home" aria-label="Back">‹</button></div>
  <section class="sinfo"><div class="dash-logo big">${s.logo_url?`<img src="${esc(s.logo_url)}">`:esc(s.name[0])}</div><h1>${esc(s.name)}</h1>
   <div class="meta">${dist?`<span>${dist}</span><span class="dot"></span>`:''}<span>${esc(s.postcode||'')}</span></div>
   <div class="tags">${d.collect!==false?'<span class="tg">Click & collect</span>':''}${d.delivery?`<span class="tg">Delivery ${d.delivery_radius_miles?'within '+d.delivery_radius_miles+' mi':''}${d.delivery_fee!=null?' · '+gbp(d.delivery_fee):''}</span>`:''}</div>
   <div class="panel"><div class="line"><span>Address</span><span>${esc(s.address||'')}</span></div>${s.opening_hours?`<div class="line"><span>Hours</span><span>${esc(s.opening_hours)}</span></div>`:''}${s.phone?`<div class="line"><span>Phone</span><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></div>`:''}</div></section>
  <section class="sec"><div class="sh"><h2>${A.viewL.length} products</h2></div><div class="grid">${A.viewL.map(l=>pcard({listing_id:l.id,sku:l.sku,name:l.name,images:[l.image||'icon-192.png'],price:l.retail_price,shop_id:s.id})).join('')||'<div class="empty">No products yet</div>'}</div></section>`};
async function loadShop(id){A.view=await DB.shop(id);A.viewL=A.view?await DB.shopListings(id):[];A.viewL.forEach(l=>{if(!S.products.find(p=>p.sku===l.sku&&p.shop_id===l.shop_id))S.products.push({listing_id:l.id,stock:l.stock,sku:l.sku,name:l.name,images:[l.image],price:l.retail_price,shop_id:l.shop_id})});
  if(!A.view){$('#view').innerHTML='<div class="empty">Shop not found</div>';return}if(cur[0]==='shop')render()}
V.admin=function(){if(!isAdmin())return '<div class="empty">Admins only</div>';
  return `<section class="sec"><div class="sh"><h2>Pending shops <span class="sample">${A.pending.length}</span></h2><a href="#" data-act="go" data-v="admin">Refresh</a></div>
  ${A.pending.length?A.pending.map(s=>`<div class="panel"><b>${esc(s.name)}</b><div class="hint">${esc(s.address||'')} · ${esc(s.postcode||'')}<br>Trade email: <b>${esc(s.bluepark_customer_email||'–')}</b>${s.phone?' · '+esc(s.phone):''}</div>
   <div class="acts"><button class="btn" data-act="approve" data-v="${esc(s.id)}">Approve</button><button class="btn ghost" data-act="reject" data-v="${esc(s.id)}">Reject</button></div></div>`).join(''):'<div class="empty">No shops waiting</div>'}</section>`};

// ---------- actions ----------
async function go(v){A.msg='';if(v==='addprod')await catalog();if(v==='admin')try{A.pending=await DB.pending()}catch(e){A.msg=e.message}
  route(['register','myshop','addprod','admin'].includes(v)?v:v);document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==='account'))}
async function busy(btn,fn){const t=btn?.innerHTML;if(btn){btn.disabled=true;btn.innerHTML='Please wait…'}try{await fn()}catch(e){A.msg=e.message||String(e);render();toast(A.msg)}finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.innerHTML=t}}}
document.addEventListener('submit',async e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();const btn=f.querySelector('button.btn:last-of-type')||f.querySelector('.btn');A.msg='';
  const v=id=>(f.querySelector('#'+id)?.value||'').trim();
  if(f.dataset.form==='login')return busy(btn,async()=>{await DB.signIn(v('f_email'),v('f_pw'));await refresh();route('account');toast('Logged in')});
  if(f.dataset.form==='signup')return busy(btn,async()=>{const role=f.querySelector('[name=role]:checked').value;const r=await DB.signUp(v('f_email'),v('f_pw'),role,v('f_name'));
    if(!MOCK&&!r.session){A.tab='login';A.msg='Check your email to confirm your account, then log in.';return route('account')}
    await refresh();if(MOCK)A.profile={role,full_name:v('f_name')};route(role==='owner'?'register':'account')});
  if(f.dataset.form==='shop')return busy($('#s_submit'),async()=>{
    const pc=await lookupPostcode(v('s_pc')).catch(()=>{throw new Error('We could not find that UK postcode.')});
    const rec={name:v('s_name'),address:v('s_addr'),postcode:pc.pc,lat:pc.lat,lng:pc.lng,phone:v('s_phone'),opening_hours:v('s_hours'),bluepark_customer_email:v('s_trade').toLowerCase(),
      delivery_options:{collect:$('#s_col').checked,delivery:$('#s_del').checked,delivery_radius_miles:+v('s_rad')||0,delivery_fee:+v('s_fee')||0}};
    if(!rec.delivery_options.collect&&!rec.delivery_options.delivery)throw new Error('Choose click & collect, delivery or both.');
    if(A.shop?.id)rec.id=A.shop.id;
    for(const k of ['logo','cover']){const file=$('#s_'+k).files[0];if(file){if(file.size>5e6)throw new Error('Images must be under 5 MB.');rec[k+'_url']=await DB.upload(file,k)}}
    const isNew=!A.shop;A.shop=await DB.saveShop(rec);
    if(isNew){const n=await DB.backfill(A.shop.id);A.listings=await DB.listings();toast(n?`Shop submitted. ${n} products added from your wholesale orders.`:'Shop submitted for approval')}else toast('Saved');
    route('myshop')})});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;e.preventDefault();const a=el.dataset.act,val=el.dataset.v;
  if(a==='tab'){A.tab=val;A.msg='';return route('account')}
  if(a==='go')return go(val);
  if(a==='logout'){await DB.signOut();A.user=null;A.shop=null;toast('Logged out');return route('account')}
  if(a==='viewshop'){location.hash='shop='+A.shop.id;return route('shop',A.shop.id)}
  if(a==='margin'){$('#marginbox').classList.toggle('hidden');return mprev()}
  if(a==='applymargin')return busy(el,async()=>{const r=marginRows();await DB.bulk(r.map(x=>x.l.id),r.map(x=>({retail_price:x.p})));r.forEach(x=>x.l.retail_price=x.p);toast(`Updated ${r.length} prices`);render()});
  if(a==='addsku')return busy(null,async()=>{const p=A.catalog.find(x=>x.sku===val);const l=await DB.addListing({shop_id:A.shop.id,sku:p.sku,name:p.name,image:p.images[0]||null,category:p.category,trade_price:p.trade_price,retail_price:+(p.trade_price*1.5).toFixed(2),stock:0,active:true,source:'manual'});
    A.listings.unshift(l);toast('Added. Set stock in My shop');render()});
  if(a==='approve'||a==='reject')return busy(el,async()=>{await DB.setStatus(val,a==='approve'?'approved':'rejected');A.pending=A.pending.filter(s=>s.id!==val);toast(a==='approve'?'Shop approved':'Shop rejected');render()});
});
const r05=n=>Math.max(0.05,Math.round(n*20)/20);
function marginRows(){const m=Math.min(90,Math.max(0,+$('#m_pct').value||0))/100,sc=$('#m_scope').value;
  return A.listings.filter(l=>l.trade_price>0&&(sc==='all'||(sc==='active'&&l.active)||(sc==='new'&&l.source==='wholesale'))).map(l=>({l,p:r05(l.trade_price/(1-m))}))}
function mprev(){const r=marginRows();$('#m_prev').textContent=r.length?`${r.length} products. Example: ${r[0].l.name.slice(0,40)}… ${gbp(r[0].l.retail_price)} → ${gbp(r[0].p)}`:'No products with a trade price.'}
document.addEventListener('input',e=>{const t=e.target;
  if(t.id==='m_pct'||t.id==='m_scope')return mprev();
  if(t.id==='aq'){A.aq=t.value;clearTimeout(A._t);A._t=setTimeout(()=>{const p=t.selectionStart;render();const n=$('#aq');n.focus();n.setSelectionRange(p,p)},200);return}
  if(t.id==='lf'){A.lf=t.value;clearTimeout(A._t);A._t=setTimeout(()=>{render();const n=$('#lf');n.focus()},250);return}
  if(t.dataset.f==='retail_price'){const row=t.closest('.li'),l=A.listings.find(x=>String(x.id)===row.dataset.id);const m=pct(+t.value,l.trade_price);const g=row.querySelector('.mg');g.textContent=m+'%';g.className='mg '+(m<20?'lo':m>=35?'hi':'')}
  if(t.id==='s_logo'||t.id==='s_cover'){const f=t.files[0];if(f)$('#pv_'+t.id.slice(2)).innerHTML=`<img src="${URL.createObjectURL(f)}">`}});
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset.f)return;const row=t.closest('.li'),l=A.listings.find(x=>String(x.id)===row.dataset.id);
  const val=t.type==='checkbox'?t.checked:t.dataset.f==='stock'?Math.max(0,parseInt(t.value)||0):Math.max(0,+(+t.value).toFixed(2));
  try{await DB.updListing(l.id,{[t.dataset.f]:val});l[t.dataset.f]=val;if(t.type==='checkbox')row.classList.toggle('off',!val);toast('Saved')}catch(err){toast(err.message)}});
window.P2={A,DB,M,MOCK,Q,refresh,toast,isAdmin,go,async init(){if(MOCK)await seedMock();await refresh();if(sb&&!MOCK)sb.auth.onAuthStateChange(async(ev)=>{if(ev==='SIGNED_IN'||ev==='SIGNED_OUT'){await refresh();if(['account','myshop'].includes(cur[0]))render()}});
  const v=Q.get('view')||(location.hash==='#account'?'account':'');if(v){if(v==='addprod'){await catalog();A.aq=Q.get('q')||'pen'}if(v==='admin')A.pending=await DB.pending();if(v==='signup')A.tab='signup';window.P2_START=v==='signup'?'account':v}},
  register(){go('register')}};
})();
