// ShopNip (a NuvonHub product) · Phase 2: auth, shop registration, owner dashboard, public shop page.
// Loaded after app.js and reuses its globals (S, V, sb, $, esc, gbp, svg, route, render, miles, lookupPostcode).
// ?mock=1 runs everything against in-memory data (for local screenshots); nothing is sent to Supabase.
(function(){
const Q=new URLSearchParams(location.search),MOCK=Q.get('mock')==='1';
const DUP='This email already has an account: just sign in, and you can shop with it.';
const fromAuth=/access_token=|type=signup/.test(location.hash);   // captured before supabase-js strips the hash
const A={user:null,profile:null,shop:null,listings:[],catalog:null,tab:'login',msg:''};
const toast=m=>{let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}t.textContent=m;t.className='on';clearTimeout(t._h);t._h=setTimeout(()=>t.className='',2600)};
const pct=(r,t)=>t>0?Math.round((r-t)/r*100):0;   // margin % of retail price
async function catalog(){if(!A.catalog)A.catalog=await (await fetch('products.json')).json();return A.catalog}

// ---------- data layer (Supabase or mock) ----------
const M={users:{},shops:[],listings:[]};
const DB=MOCK?{
  async session(){if(M.user)return{user:M.user};if(localStorage.nb_mock_out)return null;const a=Q.get('as');return a&&a!=='none'?{user:{id:'u1',email:'owner@example.com'}}:null},
  async signUp(e,p,role,name){delete localStorage.nb_mock_out;if(Q.get('dup')===e)throw new Error('User already registered');A.user=M.user={id:'u9',email:e};M.name=name;return{}}, async signIn(e){delete localStorage.nb_mock_out;A.user=M.user={id:'u1',email:e};return{}}, async signOut(){M.user=null;localStorage.nb_mock_out='1'},
  async profile(){if(M.user)return{role:M.user.id==='u1'&&!M.name?'owner':'shopper',full_name:M.name||''};return{role:Q.get('as')==='shopper'?'shopper':'owner',full_name:'Priya Shah'}},
  async myShop(){return M.shops.find(s=>s.owner_id===A.user?.id)||null},
  async listings(){return M.listings}, async saveShop(s){s.id=s.id||'s1';s.owner_id='u1';s.status=s.status||'pending';const i=M.shops.findIndex(x=>x.id===s.id);i<0?M.shops.push(s):M.shops[i]={...M.shops[i],...s};return s},
  async upload(f){return URL.createObjectURL(f)},
  async addListing(l){l.id='l'+Math.random().toString(36).slice(2,7);M.listings.unshift(l);return l},
  async updListing(id,ch){Object.assign(M.listings.find(l=>l.id===id),ch)}, async delListing(id){M.listings=M.listings.filter(l=>l.id!==id)},
  async bulk(ids,ch){ids.forEach((id,i)=>Object.assign(M.listings.find(l=>l.id===id),ch[i]))},
  async shop(id){return M.shops.find(s=>s.id===id)}, async shopListings(id){return M.listings.filter(l=>l.active)},
  async backfill(){return 0}
}:{
  async session(){return sb?(await sb.auth.getSession()).data.session:null},
  async signUp(email,password,role,full_name){const {data,error}=await sb.auth.signUp({email,password,options:{data:{role,full_name},emailRedirectTo:location.origin+'/#account'}});if(error){if(/already (registered|exists)/i.test(error.message))throw new Error(DUP);throw error}return data},
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
  async shop(id){const {data}=await sb.from('shops').select('id,name,address,postcode,lat,lng,phone,opening_hours,logo_url,cover_url,delivery_options,active,status,created_at').eq('id',id).maybeSingle();return data},
  async shopListings(id){const {data}=await sb.from('shop_listings').select('*').eq('shop_id',id).eq('active',true).order('name');return data||[]},
  async backfill(id){const {data}=await sb.rpc('backfill_shop_listings',{p_shop:id});return data||0}
};
async function refresh(){
  const s=await DB.session();A.user=s?.user||null;A.profile=null;A.shop=null;A.listings=[];
  if(!A.user)return;
  try{A.profile=await DB.profile();A.shop=await DB.myShop();if(A.shop)A.listings=await DB.listings()}catch(e){console.warn(e);A.msg=e.message}
}
// ---------- mock seed ----------
async function seedMock(){
  const c=await catalog();const pick=k=>c.filter(p=>p.images.length&&p.name.toLowerCase().includes(k));
  if(Q.get('as')&&Q.get('as')!=='none'&&Q.get('shop')!=='none'){
    M.shops.push({id:'s1',owner_id:'u1',name:'Corner News & Stationers',address:'12 High Street, Leicester',postcode:'LE1 5YA',lat:52.634,lng:-1.133,phone:'0116 123 4567',
      opening_hours:'Mon–Sat 7am–7pm, Sun 9am–2pm',status:Q.get('status')||'approved',active:true,bluepark_customer_email:'orders@cornernews.co.uk',
      delivery_options:{collect:true,delivery:true,delivery_radius_miles:3,delivery_fee:2.5},logo_url:null,cover_url:null});
    [...pick('pencil').slice(0,2),...pick('balloon').slice(0,2),...pick('glue').slice(0,1),...pick('notebook').slice(0,2),...pick('gift bag').slice(0,1)].forEach((p,i)=>
      M.listings.push({id:'l'+i,shop_id:'s1',sku:p.sku,name:p.name,image:p.images[0],category:p.category,trade_price:p.trade_price,retail_price:+(p.trade_price*(i%3?1.5:1.8)).toFixed(2),stock:[24,6,0,12,40,3,18,9][i],compare_at_price:i%3===1?+(p.trade_price*2.1).toFixed(2):null,active:i!==2,source:i<5?'wholesale':'manual'}));
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
     <button class="btn full">${su?'Create account':'Log in'}</button>${su?'<p class="agree">By creating an account you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>':''}</form>
    <p class="xlink">Are you a shop? <a href="${window.SELLER_URL?SELLER_URL(su?'signup':'login'):'seller.html#'+(su?'signup':'login')}">Seller ${su?'sign up':'login'}</a></p></section>`}
  const owner=A.profile?.role==='owner'||!!A.shop,nm=A.profile?.full_name||'',ck=window.CK?CK.get():{};
  const OR=window.P3?.orders?.()||{list:[],loaded:true};if(!OR.loaded&&OR.load)setTimeout(OR.load);
  const ol=OR.list||[],last=ol[0],SL={placed:'Placed',accepted:'Accepted',ready:'Ready to collect',out_for_delivery:'Out for delivery',completed:'Completed',rejected:'Declined',cancelled:'Cancelled'};
  const ordSub=!OR.loaded?'Loading…':ol.length?`${ol.length} order${ol.length>1?'s':''} · Latest ${esc(last.order_number||'')}: ${esc(SL[last.status]||last.status||'')}`:'No orders yet';
  const dash=window.SELLER_URL?SELLER_URL('overview'):'seller.html#overview',land=window.SELLER_URL?SELLER_URL(''):'seller.html';
  const det=[ck.name,ck.phone,ck.addr].filter(Boolean).join(' · ')||'Add your name, phone and address for faster checkout';
  return `<section class="sec narrow pa"><style>
.pa .pc2{display:flex;gap:16px;align-items:center;padding:20px;border-radius:18px;background:linear-gradient(135deg,#0f3d3a,#1f6f66);color:#fff;margin-bottom:14px}
.pa .pc2 .av{width:58px;height:58px;border-radius:50%;background:#fff;color:#0f3d3a;display:grid;place-items:center;font-size:24px;font-weight:800;flex:none}
.pa .pc2 b{display:block;font-size:19px}.pa .pc2 small{opacity:.85;font-size:14px;word-break:break-all}
.pa .atg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(max-width:640px){.pa .atg{grid-template-columns:1fr}}
.pa .at{display:flex;gap:12px;align-items:flex-start;text-align:left;width:100%;padding:16px;border:1px solid #e6e9ee;border-radius:14px;background:#fff;font:inherit;color:#0f172a;cursor:pointer;text-decoration:none}
.pa .at:hover{border-color:#1f6f66;box-shadow:0 6px 18px rgba(15,23,42,.08)}.pa .at svg{width:26px;height:26px;flex:none;stroke:#1f6f66;fill:none;stroke-width:1.8}
.pa .at b{display:block;font-size:15px}.pa .at small{display:block;color:#64748b;font-size:13px;margin-top:3px;line-height:1.35}
.pa .shopc{margin-top:14px;padding:16px;border-radius:14px;background:#fff6f2;border:1px solid #ffd9cc;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.pa .shopc b{display:block}.pa .shopc small{color:#64748b}.pa .cdf{margin-top:12px}.pa .foot{text-align:center;margin-top:18px;font-size:13px;color:#64748b}.pa .foot a{color:#64748b}
</style><div class="sh"><h2>Your account</h2></div>${msg()}
   <div class="pc2"><span class="av">${esc((nm||A.user.email)[0].toUpperCase())}</span><div><b>${esc(nm||A.user.email.split('@')[0])}</b><small>${esc(A.user.email)}</small></div></div>
   <div class="atg">
    <button class="at" data-t="orders">${svg('orders')}<span><b>Your orders</b><small>${ordSub}</small></span></button>
    <button class="at" data-act="details">${svg('account')}<span><b>Saved details</b><small>${esc(det)}</small></span></button>
    <button class="at" id="setpc2">${svg('store')}<span><b>Delivery postcode</b><small>${esc(S.pc||'Set your postcode to see shops near you')}</small></span></button>
    <a class="at" href="#contact" data-t="contact">${svg('account')}<span><b>Help &amp; contact</b><small>FAQs, or email the ShopNip team</small></span></a>
   </div>
   ${A.editDet?`<form class="panel form cdf" data-form="contact"><h3 class="ft">Saved details</h3>
    ${field('cd_name','Name','autocomplete="name"',ck.name||nm)}${field('cd_phone','Phone','type="tel" autocomplete="tel"',ck.phone)}${field('cd_addr','Delivery address','autocomplete="street-address"',ck.addr)}
    <div class="two"><button class="btn">Save details</button><button type="button" class="btn ghost" data-act="details">Cancel</button></div></form>`:''}
   ${owner?`<div class="shopc"><div><b>Your shop</b><small>${A.shop?esc(A.shop.name)+' · '+statusLabel(A.shop.status):'Manage your shop on ShopNip'}</small></div><a class="btn" href="${dash}">Go to my shop dashboard</a></div>`:''}
   <button class="btn ghost full" data-act="logout" style="margin-top:16px">Log out</button>
   ${owner?'':`<p class="foot">Own a shop? <a href="${land}">Sell on ShopNip</a></p>`}</section>`};
const statusLabel=s=>({pending:'Pending approval',approved:'Live',rejected:'Not approved',suspended:'Suspended'}[s]||s);
V.register=function(){
  if(!A.user){setTimeout(()=>location.replace(window.SELLER_URL?SELLER_URL('signup'):'seller.html#signup'));return '<div class="empty">Opening seller sign up…</div>'}
  const s=A.shop||{},d=s.delivery_options||{collect:true};
  return `<section class="sec narrow"><div class="sh"><h2>${s.id?'Edit shop details':'Register your shop'}</h2></div>
  <p class="sub">${s.id?'Changes to your trade email send the shop back for review.':'Tell shoppers about your shop. We review every new shop before it goes live, usually within a day.'}</p>
  <form class="form" data-form="shop">${msg()}
   <div class="panel"><h3 class="ft">Your shop</h3>
    ${field('s_name','Shop name','required maxlength="80" placeholder="e.g. Corner News & Stationers"',s.name)}
    ${field('s_addr','Street address','required autocomplete="street-address" placeholder="12 High Street, Town"',s.address)}
    <div class="two">${field('s_pc','Postcode','required autocomplete="postal-code" placeholder="LE1 5YA" style="text-transform:uppercase"',s.postcode)}${field('s_phone','Phone','type="tel" autocomplete="tel" placeholder="0116 123 4567"',s.phone)}</div>
    <div class="fl"><span>Opening hours</span>${HoursPicker.html('s_hours',s.opening_hours)}</div></div>
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
   <p class="hint c">By registering you agree to the ShopNip seller terms.</p></form></section>`};
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
 <img src="${esc(l.image||'icon-192.png')}" alt="" data-fb><div class="lb"><div class="ln">${esc(l.name)}</div>
 <div class="lm"><span>Trade ${l.trade_price!=null?gbp(l.trade_price):'–'}</span>${l.source==='wholesale'?'<span class="src">Auto</span>':''}</div>
 <div class="lc"><label class="pf2">£<input type="number" step="0.01" min="0" value="${(+l.retail_price).toFixed(2)}" data-f="retail_price" aria-label="Retail price"></label>
 <span class="mg ${m<20?'lo':m>=35?'hi':''}">${m}%</span>
 <label class="sk was" title="Optional 'was' price, shown struck through with a discount badge">Was<input type="number" step="0.01" min="0" placeholder="–" value="${l.compare_at_price!=null?(+l.compare_at_price).toFixed(2):''}" data-f="compare_at_price"></label>
 <label class="sk">Stock<input type="number" min="0" step="1" value="${l.stock}" data-f="stock"></label>
 <label class="sw" title="Live"><input type="checkbox" data-f="active" ${l.active?'checked':''}><i></i></label></div></div></div>`};
V.addprod=function(){const q=(A.aq||'').toLowerCase(),have=new Set(A.listings.map(l=>l.sku));
  const res=A.catalog?A.catalog.filter(p=>!q||(p.name+' '+p.sku).toLowerCase().includes(q)).slice(0,40):[];
  return `<section class="sec"><div class="sh"><h2>Add products</h2><a href="#" data-act="go" data-v="myshop">Done</a></div>
  <div class="search in"><svg viewBox="0 0 24 24">${'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'}</svg><input id="aq" placeholder="Search the catalogue by name or SKU" value="${esc(A.aq||'')}"></div>
  <p class="hint">${A.catalog.length.toLocaleString()} products in the catalogue. New listings start at trade × 1.5; change it any time.</p>
  <div class="lst">${res.map(p=>`<div class="li"><img src="${esc(p.images[0]||'icon-192.png')}" alt="" data-fb><div class="lb"><div class="ln">${esc(p.name)}</div>
   <div class="lm"><span>SKU ${esc(p.sku)}</span><span>Trade ${gbp(p.trade_price)}</span></div></div>
   ${have.has(p.sku)?'<span class="added">Listed</span>':`<button class="add" data-act="addsku" data-v="${esc(p.sku)}" aria-label="Add">${svg('plus')}</button>`}</div>`).join('')}</div></section>`};
V.shop=function(id){const s=A.view;if(!s||s.id!==id){loadShop(id);return '<div class="empty">Loading shop…</div>'}
  const d=s.delivery_options||{},dist=S.me&&s.lat!=null?miles(S.me,s).toFixed(1)+' mi away':'';
  const hs=window.ShopHours?ShopHours.status(s.opening_hours):null;
  const hoursTxt=window.ShopHours?ShopHours.display(s.opening_hours):(s.opening_hours||'');
  const note=hs?`<div class="hours-note ${hs.unknown?'unknown':hs.open?'live':hs.openingSoon?'soon':'closed'}" role="status"><b>${esc(hs.label)}</b>${hs.notice?`<span>${esc(hs.notice)}</span>`:''}</div>`:'';
  return `<div class="shero" style="${s.cover_url?`background-image:url('${esc(s.cover_url)}')`:''}"><button class="back" data-t="home" aria-label="Back">‹</button></div>
  <section class="sinfo"><div class="dash-logo big">${s.logo_url?`<img src="${esc(s.logo_url)}">`:esc(s.name[0])}</div><h1>${esc(s.name)}</h1>
   <div class="meta">${dist?`<span>${dist}</span><span class="dot"></span>`:''}<span>${esc(s.postcode||'')}</span></div>
   <div class="tags">${d.collect!==false?'<span class="tg">Click & collect</span>':''}${d.delivery?`<span class="tg">Delivery ${+d.delivery_radius_miles?'within '+(+d.delivery_radius_miles)+' mi':''}${d.delivery_fee!=null?' · '+gbp(d.delivery_fee):''}</span>`:''}</div>
   ${note}
   <div class="panel"><div class="line"><span>Address</span><span>${esc(s.address||'')}</span></div>${hoursTxt?`<div class="line"><span>Hours</span><span>${esc(hoursTxt)}</span></div>`:''}${s.phone?`<div class="line"><span>Phone</span><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></div>`:''}</div></section>
  <section class="sec"><div class="sh"><h2>${A.viewL.length} products</h2></div><div class="grid">${A.viewL.map(l=>pcard({listing_id:l.id,sku:l.sku,name:l.name,images:[l.image||'icon-192.png'],price:l.retail_price,shop_id:s.id})).join('')||'<div class="empty">No products yet</div>'}</div></section>`};
async function loadShop(id){A.view=await DB.shop(id);A.viewL=A.view?await DB.shopListings(id):[];A.viewL.forEach(l=>{if(!S.products.find(p=>p.sku===l.sku&&p.shop_id===l.shop_id))S.products.push({listing_id:l.id,stock:l.stock,sku:l.sku,name:l.name,images:[l.image],price:l.retail_price,shop_id:l.shop_id})});
  if(!A.view){$('#view').innerHTML='<div class="empty">Shop not found</div>';return}if(cur[0]==='shop')render()}

// ---------- actions ----------
async function go(v){A.msg='';if(v==='addprod')await catalog();
  route(v);document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==='account'))}
async function busy(btn,fn){const t=btn?.innerHTML;if(btn){btn.disabled=true;btn.innerHTML='Please wait…'}try{await fn()}catch(e){A.msg=e.message||String(e);render();toast(A.msg)}finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.innerHTML=t}}}
document.addEventListener('submit',async e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();const btn=f.querySelector('button.btn:last-of-type')||f.querySelector('.btn');A.msg='';
  const v=id=>(f.querySelector('#'+id)?.value||'').trim();
  if(f.dataset.form==='contact'){window.CK&&CK.set({name:v('cd_name'),phone:v('cd_phone'),addr:v('cd_addr')});A.editDet=false;toast('Details saved');return route('account')}
  if(f.dataset.form==='login')return busy(btn,async()=>{await DB.signIn(v('f_email'),v('f_pw'));await refresh();A.authPage=false;route('account');toast('Logged in')});
  if(f.dataset.form==='signup')return busy(btn,async()=>{const role='shopper';let r;try{r=await DB.signUp(v('f_email'),v('f_pw'),role,v('f_name'))}catch(err){if(/already (registered|exists)|already has an account/i.test(err.message)){A.tab='login';A.msg=DUP;route('account');setTimeout(()=>{const i=document.querySelector('#f_email');if(i)i.value=v('f_email')||''});return}throw err}
    // If Supabase 'Confirm email' is off, signUp returns a session: log straight in. Otherwise fall back to the email step.
    if(!MOCK&&!r.session){A.tab='login';A.msg='Check your email to confirm your account, then log in.';return route('account')}
    await refresh();if(MOCK)A.profile={role,full_name:v('f_name')};A.authPage=false;route('account');toast('Welcome to ShopNip')});
  if(f.dataset.form==='shop')return busy($('#s_submit'),async()=>{
    const rawPc=v('s_pc');
    if(window.UKGate&&UKGate.checkPlace(rawPc))return;
    const pc=await lookupPostcode(rawPc).catch(()=>{if(window.UKGate&&!UKGate.isUkPostcode(rawPc))UKGate.show(rawPc);throw new Error('We could not find that UK postcode.')});
    const rec={name:v('s_name'),address:v('s_addr'),postcode:pc.pc,lat:pc.lat,lng:pc.lng,phone:v('s_phone'),opening_hours:v('s_hours'),bluepark_customer_email:v('s_trade').toLowerCase(),
      delivery_options:{collect:$('#s_col').checked,delivery:$('#s_del').checked,delivery_radius_miles:+v('s_rad')||0,delivery_fee:+v('s_fee')||0}};
    if(!rec.delivery_options.collect&&!rec.delivery_options.delivery)throw new Error('Choose click & collect, delivery or both.');
    if(A.shop?.id)rec.id=A.shop.id;
    for(const k of ['logo','cover']){const file=$('#s_'+k).files[0];if(file){if(file.size>5e6)throw new Error('Images must be under 5 MB.');rec[k+'_url']=await DB.upload(file,k)}}
    const isNew=!A.shop;A.shop=await DB.saveShop(rec);
    if(isNew){const n=await DB.backfill(A.shop.id);A.listings=await DB.listings();toast(n?`Shop submitted. ${n} products added from your wholesale orders.`:'Shop submitted for approval')}else toast('Saved');
    route('myshop')})});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;e.preventDefault();const a=el.dataset.act,val=el.dataset.v;
  if(a==='details'){A.editDet=!A.editDet;return route('account')}
  if(a==='tab'){A.tab=val;A.msg='';return route('account')}
  if(a==='go')return go(val);
  if(a==='logout'){await DB.signOut();A.user=null;A.shop=null;A.profile=null;A.editDet=false;toast('Logged out');return route('account')}
  if(a==='viewshop'){location.hash='shop='+A.shop.id;return route('shop',A.shop.id)}
  if(a==='margin'){$('#marginbox').classList.toggle('hidden');return mprev()}
  if(a==='applymargin')return busy(el,async()=>{const r=marginRows();await DB.bulk(r.map(x=>x.l.id),r.map(x=>({retail_price:x.p})));r.forEach(x=>x.l.retail_price=x.p);toast(`Updated ${r.length} prices`);render()});
  if(a==='addsku')return busy(null,async()=>{const p=A.catalog.find(x=>x.sku===val);const l=await DB.addListing({shop_id:A.shop.id,sku:p.sku,name:p.name,image:p.images[0]||null,category:p.category,trade_price:p.trade_price,retail_price:+(p.trade_price*1.5).toFixed(2),stock:0,active:true,source:'manual'});
    A.listings.unshift(l);toast('Added. Set stock in My shop');render()});
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
  const val=t.type==='checkbox'?t.checked:t.dataset.f==='compare_at_price'&&(t.value===''||+t.value<=0)?null:t.dataset.f==='stock'?Math.max(0,parseInt(t.value)||0):Math.max(0,+(+t.value).toFixed(2));
  try{await DB.updListing(l.id,{[t.dataset.f]:val});l[t.dataset.f]=val;if(t.type==='checkbox')row.classList.toggle('off',!val);toast('Saved')}catch(err){toast(err.message)}});
/* saved checkout contact details are per user id (never global, so they can't leak between accounts in one browser) */
window.CK={k(){const u=A.user?.id;return u?'nb_contact:'+u:'nb_contact:guest'},
  get(){const k=this.k();if(A.user&&!localStorage[k]){const old=localStorage.nb_contact||localStorage['nb_contact:guest'];if(old)localStorage[k]=old;delete localStorage.nb_contact;delete localStorage['nb_contact:guest']}
    try{return JSON.parse(localStorage[k]||'{}')}catch(e){return{}}},
  set(o){delete localStorage.nb_contact;localStorage[this.k()]=JSON.stringify(o)},
  clear(){delete localStorage[this.k()];delete localStorage.nb_contact;delete localStorage['nb_contact:guest']}};
/* sign-out on seller.html (same Supabase session in localStorage) signs this tab out too */
addEventListener('storage',e=>{if((e.key&&/^sb-.*auth-token$/.test(e.key)&&!e.newValue)||(e.key==='nb_mock_out'&&e.newValue)){A.user=null;A.shop=null;A.profile=null;if(typeof route==='function')route(cur?.[0]||'home')}});
/* delivery location is per user (guest choice carries to the next sign-in). Never set without the user's action: no default, no IP lookup, no auto geolocation.
   The old browser-wide nb_pc/nb_me keys leaked one person's postcode to the next account, so they are dropped, not migrated. */
if(localStorage.nb_pc||localStorage.nb_me){delete localStorage.nb_pc;delete localStorage.nb_me;S.me=null;S.pc=''}
window.LOC={last:undefined,k(){return 'nb_loc:'+(A.user?.id||'guest')},
  get(){const k=this.k();if(A.user&&!localStorage[k]&&localStorage['nb_loc:guest']){localStorage[k]=localStorage['nb_loc:guest'];delete localStorage['nb_loc:guest']}try{return JSON.parse(localStorage[k]||'null')}catch(e){return null}},
  set(me,pc){localStorage[this.k()]=JSON.stringify({me,pc})},clear(){delete localStorage[this.k()]},
  hdr(){const e=document.getElementById('pc');if(e)e.textContent=S.pc||'Set your location'},
  apply(){const u=A.user?.id||'guest';if(u===this.last)return this.hdr();const first=this.last===undefined;this.last=u;const l=this.get();
    if(l){S.me=l.me;S.pc=l.pc}else if(!first){S.me=null;S.pc=''}this.hdr();if(window.P4)P4.regroup()}};
window.setMe=setMe=function(me,pc){S.me=me;S.pc=pc;LOC.set(me,pc);LOC.hdr();closeLoc();if(window.P4)P4.regroup();render()};
function closeLoc(){document.getElementById('locm')?.remove()}
window.askPostcode=askPostcode=function(){closeLoc();const d=document.createElement('div');d.id='locm';d.innerHTML=`<style>
#locm{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(10,20,20,.5);padding:16px}#locm .lcard{display:block;background:#fff;border-radius:18px;max-width:420px;width:100%;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.25);position:relative}
#locm h3{margin:0 0 6px;font-size:20px}#locm p{margin:0 0 14px;color:#64748b;font-size:14px}#locm .lrow{display:flex;gap:8px}#locm input{flex:1;padding:12px 14px;border:1px solid #d5dbd9;border-radius:12px;font:inherit;text-transform:uppercase}
#locm .lor{text-align:center;color:#94a3b8;font-size:13px;margin:14px 0}#locm .x{position:absolute;right:12px;top:10px;border:0;background:none;font-size:20px;cursor:pointer}#locm .err{color:#e11d48;font-size:13px;margin-top:8px}</style>
<div class="lcard" role="dialog" aria-label="Set your location"><button class="x" data-lx aria-label="Close">✕</button><h3>Where should we look?</h3><p>Enter your postcode to see local shops, delivery and distances. We only use it on this account.</p>
<form class="lrow" data-locf><input id="loc_pc" placeholder="e.g. LE1 5YA" autocomplete="postal-code" value="${esc(S.pc||'')}"><button class="btn">Set</button></form><div class="err" id="loc_err"></div>
<div class="lor">or</div><button class="btn ghost full" data-lgeo>Use my current location</button></div>`;document.body.appendChild(d);setTimeout(()=>d.querySelector('#loc_pc')?.focus())};
document.addEventListener('click',e=>{if(e.target.id==='locm'||e.target.closest('[data-lx]')){closeLoc();return}
  if(e.target.closest('[data-lgeo]')){if(!navigator.geolocation){$('#loc_err').textContent='Location is not available in this browser. Please type your postcode.';return}
    navigator.geolocation.getCurrentPosition(async p=>{const me={lat:p.coords.latitude,lng:p.coords.longitude};const pc=await reversePc(me.lat,me.lng);if(!pc||pc==='Current location'){if(window.UKGate)UKGate.show();return}setMe(me,pc)},()=>{$('#loc_err').textContent='We could not get your location. Please type your postcode.'})}},true);
document.addEventListener('submit',async e=>{if(!e.target.closest('[data-locf]'))return;e.preventDefault();e.stopPropagation();const v=$('#loc_pc').value.trim();if(!v)return;
  if(window.UKGate&&UKGate.checkPlace(v))return;
  try{const r=await lookupPostcode(v);setMe({lat:r.lat,lng:r.lng},r.pc)}catch(err){if(window.UKGate&&!UKGate.isUkPostcode(v))UKGate.show(v);else $('#loc_err').textContent='Sorry, we could not find that postcode.'}},true);
window.P2={A,DB,M,MOCK,Q,refresh,toast,go,async init(){if(MOCK)await seedMock();await refresh();
  /* dual role: customer login on index.html always stays on the customer site, even for shop owners */if(sb&&!MOCK)sb.auth.onAuthStateChange(async(ev)=>{if(ev==='SIGNED_IN'||ev==='SIGNED_OUT'){await refresh();if(['account','myshop'].includes(cur[0]))render()}});
  const v=Q.get('view')||(location.hash==='#account'?'account':'');if(v){if(v==='addprod'){await catalog();A.aq=Q.get('q')||'pen'}if(v==='signup')A.tab='signup';if(['signup','login','signin'].includes(v))A.authPage=true;window.P2_START=['signup','login','signin'].includes(v)?'account':v}},
  register(){go('register')}};
})();
