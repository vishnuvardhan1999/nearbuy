// ShopNip (a NuvonHub product) · Phase 6: "Become a seller" landing + seller dashboard (seller.html).
// Uses the same Supabase tables, RPCs and RLS as p2/p3/p5 (shops, shop_listings, orders, order_items, order_events,
// update_order_status). Seller login/sign-up live here (#login, #signup); shop registration stays in index.html (p2.js).
// ?mock=1 runs everything on in-memory data (mock shop "Suman Bros");&as=none shows the signed-out gate.
(()=>{
const CFG=window.APP_CONFIG||{},Q=new URLSearchParams(location.search),MOCK=Q.get('mock')==='1';
const LIVE=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_KEY&&!/YOUR_/.test(CFG.SUPABASE_KEY));
const sb=!MOCK&&LIVE&&window.supabase?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY):null;
const MAIL=CFG.CONTACT_EMAIL||'hello@nuvonhub.com';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp=n=>'£'+(+n||0).toFixed(2),gbp0=n=>'£'+Math.round(+n||0).toLocaleString('en-GB');
const I={grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 orders:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',box:'<path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4M9 11h6"/>',tag:'<path d="M20 12 12 20l-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
 card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',mega:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',ext:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
 out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 5 5 9-10"/>',
 store:'<path d="M3 9 5 4h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6"/>',bag:'<path d="M6 7h12l1 14H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',pin:'<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
 camoff:'<path d="M2 2l20 20M9 4h6l2 3h3a2 2 0 0 1 2 2v9M19 21H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3"/><circle cx="12" cy="13" r="3"/>',sync:'<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
 pound:'<path d="M18 7a4 4 0 0 0-7.5-2C10 6 10 8 10 10v4c0 2-1 4-3 5h11M6 12h8"/>',alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
 dots:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'};
const svg=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${I[n]||''}</svg>`;
const toast=m=>{let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.className='on';clearTimeout(t._h);t._h=setTimeout(()=>t.className='',2600)};
const keep=()=>MOCK?'mock=1'+(Q.get('as')?'&as='+encodeURIComponent(Q.get('as')):''):'';
const idx=q=>'index.html?'+[keep(),q].filter(Boolean).join('&');
const home=()=>'index.html'+(MOCK?'?'+keep():'');
const when=t=>new Date(t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const ago=t=>{const m=Math.round((Date.now()-Date.parse(t))/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const pct=(r,t)=>r>0&&t!=null?Math.round((r-t)/r*100):null;
const LOW=3;
// order status machine (same as p3.js)
const LBL={placed:'New',accepted:'Accepted',ready:'Waiting for collection',out_for_delivery:'Out for delivery',completed:'Completed',cancelled:'Cancelled',rejected:'Rejected'};
const STEPS={collect:['placed','accepted','ready','completed'],delivery:['placed','accepted','out_for_delivery','completed']};
const NEXT={placed:[['accepted','Accept'],['rejected','Reject']],accepted:{collect:[['ready','Mark ready']],delivery:[['out_for_delivery','Out for delivery']]},ready:[['completed','Collected']],out_for_delivery:[['completed','Delivered']]};
const nexts=o=>{const n=NEXT[o.status];return !n?[]:Array.isArray(n)?n:(n[o.fulfilment]||[])};
const OPEN=['placed','accepted','ready','out_for_delivery'],DEAD=['cancelled','rejected'];
const chip=s=>`<span class="st ${esc(s)}">${esc(LBL[s]||s)}</span>`;
const D={user:null,shop:null,L:[],O:[],cat:null,ui:{oq:'',of:'open',pq:'',pf:'all',pn:60,drawer:null,cat:false,newIds:new Set()}};
const statusLabel=s=>({pending:'Pending approval',approved:'Live',rejected:'Not approved',suspended:'Suspended'}[s]||s||'');
// ---------- data layer: Supabase (same calls/RLS as p2/p3/p5) or in-memory mock ----------
const M={shops:[],L:[],O:[],user:null};
const API=MOCK?{
  async session(){if(M.user)return{user:M.user};if(localStorage.nb_mock_out)return null;const a=Q.get('as');if(a==='none')return null;return{user:{id:'u1',email:'owner@sumanbros.example'}}},
  async signUp(email,pw,name){delete localStorage.nb_mock_out;M.user={id:'u1',email,user_metadata:{role:'owner',full_name:name}};if(Q.get('shop')!=='none')M.shops=[];return{session:{user:M.user}}},
  async signIn(email){delete localStorage.nb_mock_out;M.user={id:'u1',email};return{session:{user:M.user}}},
  async signOut(){M.user=null;localStorage.nb_mock_out='1'},async myShop(){return Q.get('shop')==='none'?null:M.shops.find(s=>s.owner_id==='u1')||null},
  async listings(){return M.L.filter(l=>l.shop_id===D.shop.id)},async orders(){return M.O.filter(o=>o.shop_id===D.shop.id)},
  async updListing(id,ch){Object.assign(M.L.find(l=>l.id===id)||{},ch)},async addListing(l){l.id='l'+Math.random().toString(36).slice(2,8);l.updated_at=new Date().toISOString();M.L.unshift(l);return l},
  async saveShop(s){const x=M.shops.find(z=>z.id===s.id);Object.assign(x,s);if(s.bluepark_customer_email&&s._tradeChanged)x.status='pending';return x},async upload(f){return URL.createObjectURL(f)},
  async status(id,st,note){const o=M.O.find(x=>x.id===id);if(DEAD.includes(st))o.order_items.forEach(i=>{const l=M.L.find(x=>x.id===i.listing_id);if(l)l.stock+=i.qty});o.status=st;if(note)o.reject_reason=note;o.order_events.push({status:st,at:new Date().toISOString(),note})},
  live(){}
}:{
  async session(){return sb?(await sb.auth.getSession()).data.session:null},
  async signOut(){await sb.auth.signOut()},
  // Seller accounts are always role 'owner' (same metadata p2.js used for “Sell on ShopNip”). The confirmation link returns to seller.html.
  async signUp(email,password,full_name){if(!sb)throw new Error('Accounts need Supabase configured in config.js.');const {data,error}=await sb.auth.signUp({email,password,options:{data:{role:'owner',full_name},emailRedirectTo:location.origin+'/seller.html'}});if(error)throw error;return data},
  async signIn(email,password){if(!sb)throw new Error('Accounts need Supabase configured in config.js.');const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;return data},
  async myShop(){const {data,error}=await sb.from('shops').select('*').eq('owner_id',D.user.id).maybeSingle();if(error)throw error;return data},
  async listings(){const out=[];for(let f=0;;f+=1000){const {data,error}=await sb.from('shop_listings').select('*').eq('shop_id',D.shop.id).order('updated_at',{ascending:false}).range(f,f+999);if(error)throw error;out.push(...data);if(data.length<1000)break}return out},
  async orders(){const {data,error}=await sb.from('orders').select('*,order_items(*),order_events(status,note,at)').eq('shop_id',D.shop.id).order('created_at',{ascending:false}).limit(200);if(error)throw error;data.forEach(o=>o.order_events?.sort((a,b)=>a.at<b.at?-1:1));return data},
  async updListing(id,ch){const {error}=await sb.from('shop_listings').update({...ch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error},
  async addListing(l){const {data,error}=await sb.from('shop_listings').insert(l).select().single();if(error)throw error;return data},
  async saveShop(s){const id=s.id,r={...s};delete r.id;delete r._tradeChanged;const {data,error}=await sb.from('shops').update(r).eq('id',id).select().single();if(error)throw error;return data},
  async upload(f,kind){const ext=(f.name.split('.').pop()||'jpg').toLowerCase(),path=`${D.user.id}/${kind}-${Date.now()}.${ext}`;
    const {error}=await sb.storage.from('shop-media').upload(path,f,{upsert:true,contentType:f.type});if(error)throw error;return sb.storage.from('shop-media').getPublicUrl(path).data.publicUrl},
  async status(id,st,note){const {error}=await sb.rpc('update_order_status',{p_order:id,p_status:st,p_note:note||null});if(error)throw error},
  live(shopId,cb){if(D.ch)sb.removeChannel(D.ch);D.ch=sb.channel('seller-orders-'+shopId).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:'shop_id=eq.'+shopId},cb).subscribe()}
};
async function catalog(){if(!D.cat)D.cat=await fetch('products.json').then(r=>r.json()).catch(()=>[]);return D.cat}
// ---------- mock seed: Suman Bros ----------
async function seed(){const c=(await catalog()).filter(p=>p.images?.length),step=Math.max(1,Math.floor(c.length/42)),st0=Q.get('status')||'approved';
  M.shops.push({id:'s1',owner_id:'u1',name:'Suman Bros',address:'Crown House, Otterspool Way, Watford',postcode:'WD25 8HL',lat:51.666787,lng:-0.366431,phone:'01923 000000',
    opening_hours:'Mon–Fri 9am–5pm\nSat 10am–2pm\nSun closed',bluepark_customer_email:'orders@sumanbros.example',status:st0,active:st0==='approved',
    delivery_options:{collect:true,delivery:true,delivery_radius_miles:10,delivery_fee:3.99},logo_url:null,cover_url:null,created_at:'2026-10-20T09:00:00Z'},
   {id:'s2',owner_id:'u2',name:'Village Post Office Store',address:'1 Church Lane, Oadby',postcode:'LE2 5AA',status:'pending',active:false,bluepark_customer_email:'vpo@example.com',phone:'0116 271 0000',created_at:'2026-10-23T10:12:00Z'},
   {id:'s3',owner_id:'u3',name:'High Street Cards & Gifts',address:'40 Market Street, Leicester',postcode:'LE1 6DP',status:'pending',active:false,bluepark_customer_email:'cards@example.com',created_at:'2026-10-24T08:40:00Z'},
   {id:'s4',owner_id:'u4',name:'Corner News & Stationers',address:'12 High Street, Leicester',postcode:'LE1 5YA',status:'approved',active:true,bluepark_customer_email:'orders@cornernews.example',created_at:'2026-10-18T08:40:00Z'});
  const stock=[25,18,2,40,0,12,6,30,1,22,15,9,3,50,8,0,14,20,5,11];
  for(let i=0,n=0;i<c.length&&n<42;i+=step,n++){const p=c[i],tp=+p.trade_price||1,rp=Math.max(.49,Math.round(tp*(n%3?1.6:1.85)*20)/20);
    M.L.push({id:'l'+n,shop_id:'s1',sku:p.sku,name:p.name,image:p.images[0],category:p.category,trade_price:tp,retail_price:rp,compare_at_price:n%7===1?Math.round(rp*130)/100:null,
      stock:stock[n%stock.length],active:n%11!==5,source:n%4?'wholesale':'manual',updated_at:new Date(Date.now()-n*36e5*5).toISOString()})}
  const L=M.L,cust=['Sam Patel','Priya Shah','Jo King','Tom Reed','Aisha Khan','Ben Carter','Lucy Moore','Raj Mehta','Emma Wilson','Dan Hughes'];
  const mk=(n,st,f,items,mins,ci,note)=>{const sub=items.reduce((t,[l,q])=>t+L[l].retail_price*q,0),fee=f==='delivery'?3.99:0,t0=Date.now()-mins*60000,steps=STEPS[f],path=DEAD.includes(st)?['placed',st]:steps.slice(0,steps.indexOf(st)+1);
    M.O.push({id:'o'+n,order_number:'NB-'+(1000+n),collection_pin:f==='collect'?String(3100+n*37).slice(-4):null,shop_id:'s1',customer_name:cust[ci],customer_phone:'07700 900'+(100+n),fulfilment:f,delivery_address:f==='delivery'?(20+n)+' Bushey Mill Lane, Watford':null,delivery_postcode:f==='delivery'?'WD24 7QS':null,
      note:note||null,status:st,subtotal:sub,delivery_fee:fee,total:sub+fee,payment_method:f==='delivery'?'pay_on_delivery':'pay_on_collection',created_at:new Date(t0).toISOString(),reject_reason:st==='rejected'?'Out of stock, sorry':null,
      order_items:items.map(([l,q])=>({listing_id:L[l].id,sku:L[l].sku,name:L[l].name,image:L[l].image,unit_price:L[l].retail_price,qty:q})),order_events:path.map((s,i)=>({status:s,at:new Date(t0+i*11*60000).toISOString()}))})};
  const hr=new Date().getHours()*60+new Date().getMinutes(),td=m=>Math.min(m,Math.max(1,hr-5));  // keep "today" orders on today
  mk(12,'placed','collect',[[3,1],[1,2]],td(6),0,'Please gift wrap if possible');mk(11,'placed','delivery',[[7,2],[9,1],[13,1]],td(22),4);mk(10,'accepted','delivery',[[0,3]],td(55),1);
  mk(9,'ready','collect',[[6,1],[10,4]],td(140),2);mk(8,'out_for_delivery','delivery',[[12,2]],60*20,3);mk(7,'completed','collect',[[14,1],[16,2]],60*26,5);
  mk(6,'completed','delivery',[[17,5]],60*30,6);mk(5,'cancelled','collect',[[18,1]],60*50,7);mk(4,'completed','collect',[[19,2],[20,1]],60*72,8);
  mk(3,'completed','delivery',[[21,3],[22,1]],60*98,9);mk(2,'rejected','collect',[[4,2]],60*120,0);mk(1,'completed','collect',[[23,6]],60*140,1);
  M.O.sort((a,b)=>a.created_at<b.created_at?1:-1)}
// ---------- boot ----------
async function load(){const s=await API.session();D.user=s?.user||null;D.shop=null;D.L=[];D.O=[];
  if(!D.user)return;D.shop=await API.myShop();
  if(D.shop){[D.L,D.O]=await Promise.all([API.listings(),API.orders()]);if(!MOCK)API.live(D.shop.id,onLive)}}
async function boot(){try{if(MOCK)await seed();await load()}catch(e){console.warn(e);toast(e.message||'Could not load your shop')}
  if(sb)sb.auth.onAuthStateChange(async ev=>{if(ev==='SIGNED_OUT'||ev==='SIGNED_IN'){await load().catch(()=>{});render()}});
  addEventListener('hashchange',()=>{D.ui.drawer=null;if(!AUTH()&&!fromAuth())D.ui.amsg='';render();scrollTo(0,0)});render()}
const DASH=['overview','orders','products','deals','settings'];
function page(){const h=location.hash.slice(1);if(h==='dash')return 'overview';return DASH.includes(h)?h:''}
const AUTH=()=>{const h=location.hash.slice(1);return h==='login'||h==='signup'?h:''};
const fromAuth=()=>/access_token=|type=signup|type=magiclink/.test(location.hash);
// after login / email confirmation: dashboard if there is a shop, otherwise shop registration
// p29: new seller sign-ups (Become a seller) go to shop registration; signing in without a shop shows a friendly choice, not a redirect
function landSeller(su){if(D.shop){location.hash='overview';return true}if(D.user){if(su){location.href=idx('view=register&seller=1');return true}location.hash='dash';return true}return false}
function authView(mode){const su=mode==='signup',brand=`<a class="brand" href="seller.html${MOCK?'?'+keep():''}"><span class="mark">S</span><span>Shop<b>Nip</b></span><small class="fs">for sellers</small></a>`;
  return `<div class="gate sauth"><div class="card">${brand}<h2>${su?'Create your seller account':'Seller sign in'}</h2>
   <p>${su?'Put your shop on ShopNip. Free during the pilot. Every shop is reviewed before it goes live.':'For shop owners: manage your shop, orders and products. Same email and password as your shopping account.'}</p>
   ${D.ui.amsg?`<div class="amsg ${D.ui.aok?'ok':''}" role="status">${esc(D.ui.amsg)}</div>`:''}
   <form id="authf" data-mode="${mode}" class="af">
    ${su?`<label><span>Your name</span><input name="name" autocomplete="name" required></label>`:''}
    <label><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
    <label><span>Password</span><input name="pw" type="password" minlength="8" autocomplete="${su?'new':'current'}-password" required></label>
    <button class="btn ${su?'coral':''} lg" type="submit">${su?'Create seller account':'Sign in'}</button>${su?'<p class="agree">By creating an account you agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a>, <a href="/seller-terms" target="_blank" rel="noopener">Seller Terms</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</p>':''}</form>
   <div class="alt">${su?'Already selling on ShopNip? <a href="#login">Seller sign in</a>':'New to ShopNip? <a href="#signup">Create a seller account</a>'}</div>
   <div class="xl">Shopping? <a href="${idx('view=account')}">Go to customer sign in</a></div></div></div>`}
function render(){if(fromAuth()&&D.user){const su=/type=signup/.test(location.hash);history.replaceState(null,'',location.pathname+location.search);if(landSeller(su))return}
  const am=AUTH();if(am){if(D.user&&!D.ui.busy){if(landSeller(am==='signup'))return}document.body.className='auth';document.title=(am==='signup'?'Seller sign up':'Seller sign in')+' · ShopNip for sellers';$('#app').innerHTML=authView(am);return}
  const p=page();if(!p){document.body.className='land';document.title='Sell on ShopNip · Put your shop online';$('#app').innerHTML=landing();return}
  document.body.className='dash';$('#app').innerHTML=dash(p);document.title=(TITLE[p]||'Dashboard')+' · ShopNip Seller'}
// =================== LANDING ===================
const BEN=[['sync','Listed from your wholesale orders','Products you buy wholesale appear in your shop automatically after they ship, with name, category and trade price filled in.'],
 ['camoff','No photo uploads','Every product comes with professional photos and descriptions from the catalogue. Nothing to shoot, nothing to type.'],
 ['pin','Found by local customers','Shoppers nearby see your shop first, sorted by distance from their postcode. Your high street, online.'],
 ['bag','Click & collect or delivery','Offer collection, local delivery within the radius you choose, or both. You set the delivery fee.'],
 ['bell','Instant order alerts','New orders ping your dashboard with a sound. Accept, mark ready and complete in one tap.'],
 ['pound','Paid in store','Customers pay you on collection or delivery, so the money goes straight to you. Online payments come later.']];
const HOW=[['Create your account','Sign up in under a minute with your email on the seller sign-up page.'],['Register your shop','Add your address, opening hours, delivery options and the email you order wholesale with.'],
 ['We approve and list you','We check every shop, usually within a working day. Your wholesale products appear automatically.'],['Set prices, take orders','Fine-tune prices and stock in your seller dashboard, then start receiving local orders.']];
const FAQ=[['How much does it cost?','Nothing during the pilot: no setup fee, no monthly fee and no commission. After the pilot we plan to introduce optional paid plans. We will give you plenty of notice and you can leave at any time.'],
 ['How do my products get on ShopNip?','When you register, you tell us the email you use for your wholesale account. Products you order with that account are added to your shop automatically after they ship, with photos and descriptions. You can also add any catalogue product by hand.'],
 ['Do I need to take photos?','No. Every catalogue product already has professional photos and a description. You just set your retail price, an optional “was” price and your stock.'],
 ['How do customers pay?','For now customers pay you directly on collection or on delivery, by card or cash. ShopNip does not take online payments yet, so there are no payment processing fees.'],
 ['Do I have to offer delivery?','No. Offer click & collect only, local delivery only, or both. If you deliver, you choose the radius in miles and the fee.'],
 ['How quickly should I respond to orders?','Your dashboard alerts you as soon as an order arrives. We recommend accepting or rejecting within 30 minutes during opening hours.'],
 ['Can I leave at any time?','Yes. There is no contract during the pilot. Switch products off, or ask us to close your shop, whenever you like.'],
 ['Who runs ShopNip?','ShopNip is a NuvonHub product, built to help independent shops sell online without the cost of their own website.']];
function landing(){const signed=!!D.user,has=!!D.shop,cat=(D.cat||[]).filter(p=>p.images?.length),sample=[cat[120],cat[640],cat[1180],cat[1730]].filter(Boolean);
  const SU='#signup',LI='#login',RG=idx('view=register&seller=1');
  const primary=has?`<a class="btn coral lg" href="#dash">Open seller dashboard ${svg('arrow')}</a>`:signed?`<a class="btn coral lg" href="${RG}">Register your shop ${svg('arrow')}</a>`:`<a class="btn coral lg" href="${SU}">Start selling free ${svg('arrow')}</a>`;
  const second=signed?`<a class="btn line lg" href="${home()}">Back to shopping</a>`:`<a class="btn line lg" href="${LI}">Sign in</a>`;
  return `<header class="lnav"><div class="wrap"><a class="brand" href="${home()}" aria-label="ShopNip home"><span class="mark">S</span><span>Shop<b>Nip</b></span><small>Sellers</small></a>
   <nav aria-label="Seller page"><a href="#benefits" data-jump="benefits">Benefits</a><a href="#how" data-jump="how">How it works</a><a href="#fees" data-jump="fees">Fees</a><a href="#faq" data-jump="faq">FAQ</a></nav><span class="sp"></span>
   <a class="shopl" href="${home()}">Shop on ShopNip</a>${has?`<a class="btn white sm" href="#dash">Seller dashboard</a>`:signed?`<a class="btn white sm" href="${RG}">Register shop</a>`:`<a class="btn white sm" href="${LI}">Sign in</a>`}</div></header>
  <section class="lhero"><div class="wrap"><div><span class="eyebrow"><i></i>For local shop owners · Free pilot</span>
    <h1>Your shop, online in minutes. <em>Your products, already listed.</em></h1>
    <p class="lead">ShopNip puts independent shops in front of local customers. Products you buy wholesale are listed for you with photos, so you just set your prices and start taking click &amp; collect and delivery orders.</p>
    <div class="ctas">${primary}${second}</div>
    <div class="proof"><span>${svg('check')}No setup fee</span><span>${svg('check')}No photo uploads</span><span>${svg('check')}Paid in store</span></div></div>
   <div class="mock" aria-hidden="true"><div class="float">${svg('bell')}New order · NB-1012</div><div class="mh"><span class="dots"><i></i><i></i><i></i></span><b>Seller dashboard</b><small>Today</small></div>
    <div class="mk"><div><small>Orders today</small><b>8</b></div><div><small>This week</small><b>£412</b></div><div><small>Live products</small><b>236</b></div></div>
    ${(sample.length?sample:[{},{},{},{}]).map((p,i)=>`<div class="mrow"><img src="${esc(p.images?.[0]||'icon-192.png')}" alt=""><span>${esc(p.name||'Product')}</span>${i<2?'<span class="auto">Auto-listed</span>':''}<b>${gbp((+p.trade_price||1)*1.6)}</b></div>`).join('')}</div></div></section>
  <section class="lsec alt" id="benefits"><div class="wrap"><span class="kick">Why sell on ShopNip</span><h2>Everything a local shop needs to sell online</h2><p class="sub">No website to build, no catalogue to type up, no photos to take. ShopNip does the heavy lifting so you can serve customers.</p>
   <div class="ben">${BEN.map(([i,t,p])=>`<div><span class="ic">${svg(i)}</span><h3>${t}</h3><p>${p}</p></div>`).join('')}</div></div></section>
  <section class="lsec" id="how"><div class="wrap"><span class="kick">How it works</span><h2>Live in four simple steps</h2><p class="sub">Most shops are set up in about ten minutes, then approved within a working day.</p>
   <div class="steps">${HOW.map(([t,p])=>`<div><h3>${t}</h3><p>${p}</p></div>`).join('')}</div></div></section>
  <section class="lsec alt" id="fees"><div class="wrap"><span class="kick">Fees</span><h2>Free while we grow together</h2><p class="sub">Join during the pilot and pay nothing.</p>
   <div class="fees"><div class="plan hot"><span class="badge">Available now</span><h3>Pilot</h3><div class="pr">£0 <small>/ month</small></div><small>No commission during the pilot</small>
     <ul><li>${svg('check')}Your own shop page</li><li>${svg('check')}Products auto-listed from wholesale orders</li><li>${svg('check')}Click &amp; collect and local delivery</li><li>${svg('check')}Seller dashboard with order alerts</li></ul></div></div>
   <p class="fnote">Pilot shops will get at least 30 days’ notice before any fees apply.</p></div></section>
  <section class="lsec" id="faq"><div class="wrap"><span class="kick">FAQs</span><h2>Questions from shop owners</h2><p class="sub">Can’t find your answer? Email <a href="mailto:${esc(MAIL)}">${esc(MAIL)}</a>.</p>
   <div class="faq">${FAQ.map(([q,a],i)=>`<details ${i?'':'open'}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></div></section>
  <section class="lsec" style="padding-top:0"><div class="wrap"><div class="lcta"><div><h2>Ready to bring your shop online?</h2><p>Join the free pilot today. It takes about ten minutes.</p></div>
   <div class="ctas">${has?`<a class="btn white lg" href="#dash">Open seller dashboard</a>`:signed?`<a class="btn white lg" href="${RG}">Register your shop</a>`:`<a class="btn coral lg" href="${SU}">Sign up free</a><a class="btn line lg" href="${LI}">Sign in</a>`}</div></div></div></section>
  <footer class="lfoot"><div class="wrap"><div><a href="/about">About</a><a href="/faq">Customer FAQ</a><a href="/seller-terms">Seller Terms</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/contact">Contact</a></div><span>© ${new Date().getFullYear()} ShopNip · ShopNip is a product of NuvonHub Private Limited (India)</span></div></footer>
  <div class="stick">${has?`<a class="btn coral" href="#dash">Seller dashboard</a>`:signed?`<a class="btn coral" href="${RG}">Register your shop</a>`:`<a class="btn ghost" href="${LI}">Sign in</a><a class="btn coral" href="${SU}">Start selling</a>`}</div>`}
// =================== DASHBOARD ===================
const TITLE={overview:'Overview',orders:'Orders',products:'Products & stock',deals:'Deals',settings:'Shop settings'};
const NAV=[['overview','grid'],['orders','orders'],['products','box'],['deals','tag'],['settings','cog']];
const newCount=()=>D.O.filter(o=>o.status==='placed').length;
function gate(){const brand=`<a class="brand" href="seller.html${MOCK?'?'+keep():''}"><span class="mark">S</span><span>Shop<b>Nip</b></span></a>`;
  if(!D.user)return `<div class="gate"><div class="card">${brand}<h2>Seller sign in</h2><p>Sign in with your shop owner account to manage orders, products and your shop.</p>
   <div class="btns"><a class="btn lg" href="#login">Sign in</a><a class="btn ghost lg" href="#signup">Create a seller account</a><a href="seller.html${MOCK?'?'+keep():''}" style="font-size:13px;color:var(--mut);margin-top:6px">Learn about selling on ShopNip</a></div></div></div>`;
  return `<div class="gate"><div class="card">${brand}<h2>You don’t have a shop yet</h2><p>You’re signed in as ${esc(D.user.email)}. This account works for shopping on ShopNip. Want to sell too? Registering your shop takes about three minutes.</p>
   <div class="btns"><a class="btn coral lg" href="${idx('view=register&seller=1')}">Register your shop</a><a class="btn ghost lg" href="${home()}">Go shopping</a><a class="btn ghost" href="#" data-a="logout">Sign out</a></div></div></div>`}
function dash(p){
  if(!D.user||!D.shop)return gate();
  const s=D.shop,n=newCount(),link=(k,ic)=>`<a href="#${k}" class="${p===k?'on':''}">${svg(ic)}${TITLE[k]}${k==='orders'&&n?`<span class="cnt">${n}</span>`:''}</a>`;
  const side=`<aside class="side" id="side"><div class="sb-h"><a class="brand" href="seller.html${MOCK?'?'+keep():''}" style="color:#fff"><span class="mark">S</span><span>Shop<b>Nip</b></span><small>Seller</small></a></div>
   ${s?`<div class="shopcard"><span class="lg">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span><div><b>${esc(s.name)}</b><small><i class="${esc(s.status)}"></i>${statusLabel(s.status)}</small></div></div>`:''}
   <nav aria-label="Dashboard">${s?`<div class="grp">Shop</div>${NAV.map(([k,i])=>link(k,i)).join('')}`:''}</nav>
   <div class="sb-f">${s&&s.status==='approved'?`<a href="index.html${MOCK?'?'+keep():''}#shop=${esc(s.id)}" target="_blank" rel="noopener">${svg('ext')}View my shop</a>`:''}<a href="${home()}">${svg('bag')}Switch to shopping</a><a href="#" data-a="logout">${svg('out')}Sign out</a><small>ShopNip, a NuvonHub product</small></div></aside>`;
  const tb=`<header class="tb"><div class="in"><button class="ib menu-b" data-a="menu" aria-label="Menu">${svg('menu')}</button><h1>${TITLE[p]}</h1>
   ${s?`<a class="ib" href="#orders" aria-label="${n} new orders">${svg('bell')}${n?'<span class="dot"></span>':''}</a>`:''}<a class="btn ghost sm p29sw" href="${home()}" style="margin-left:auto;white-space:nowrap">Switch to shopping</a><span class="av">${esc((D.user.email||'?')[0].toUpperCase())}</span><div class="who"><b>${esc(s?.name||'')}</b><small>${esc(D.user.email)}</small></div></div></header>`;
  const bn=s?`<nav class="bnav" aria-label="Dashboard sections">${[['overview','grid','Overview'],['orders','orders','Orders'],['products','box','Products'],['settings','cog','Settings']].map(([k,i,l])=>`<a href="#${k}" class="${p===k?'on':''}">${svg(i)}${l}${k==='orders'&&n?`<span class="cnt">${n}</span>`:''}</a>`).join('')}<a href="#" data-a="menu" class="${['deals','payouts'].includes(p)?'on':''}">${svg('dots')}More</a></nav>`:'';
  return `<div class="dl">${side}<div class="main">${tb}<div class="pg">${statusBanner(p)}${(PAGES[p]||PAGES.overview)()}</div><footer class="dfoot">ShopNip, a NuvonHub product</footer></div>${bn}${drawer()}${catModal()}</div>`}
function statusBanner(p){const s=D.shop;if(!s)return '';
  if(s.status==='pending')return `<div class="bnr">${svg('clock')}<div><b>Your shop is awaiting approval</b>We review new shops within a working day. You can set prices and stock now; customers will see your shop once it’s approved.</div></div>`;
  if(s.status==='rejected'||s.status==='suspended')return `<div class="bnr bad">${svg('alert')}<div><b>Your shop is ${statusLabel(s.status).toLowerCase()}</b>Customers can’t see your shop. Contact <a href="mailto:${esc(MAIL)}">${esc(MAIL)}</a>.</div></div>`;return ''}
const PAGES={};
PAGES.overview=()=>{const O=D.O,L=D.L,t0=new Date();t0.setHours(0,0,0,0);const wk=new Date(t0);wk.setDate(wk.getDate()-((wk.getDay()+6)%7));
  const ok=o=>!DEAD.includes(o.status),today=O.filter(o=>Date.parse(o.created_at)>=+t0),rev=O.filter(o=>ok(o)&&Date.parse(o.created_at)>=+wk).reduce((a,o)=>a+ +o.total,0);
  const live=L.filter(l=>l.active&&+l.retail_price>0).length,low=L.filter(l=>l.active&&l.stock<=LOW),pend=O.filter(o=>o.status==='placed').length,prog=O.filter(o=>['accepted','ready','out_for_delivery'].includes(o.status)).length;
  const days=[...Array(7)].map((_,i)=>{const d=new Date(t0);d.setDate(d.getDate()-6+i);const e=+d+864e5;return{d,v:O.filter(o=>ok(o)&&Date.parse(o.created_at)>=+d&&Date.parse(o.created_at)<e).reduce((a,o)=>a+ +o.total,0)}}),mx=Math.max(1,...days.map(x=>x.v));
  const kpi=(c,ic,l,v,s,h,pf)=>`<a class="kpi ${c}" href="#${h}" ${pf?`data-pf="${pf}"`:''}><div class="kh">${l}<span class="ic">${svg(ic)}</span></div><b>${v}</b><small>${s}</small></a>`;
  const hi=new Date().getHours();
  return `<div class="ph"><div><h2>Good ${hi<12?'morning':hi<18?'afternoon':'evening'}</h2><p>Here’s what’s happening at ${esc(D.shop.name)} today.</p></div><div class="acts"><a class="btn ghost sm" href="#products">${svg('box')}Manage stock</a><a class="btn sm" href="#orders">${svg('orders')}View orders</a></div></div>
  <div class="kpis">${kpi('','orders','Orders today',today.length,today.length?gbp(today.reduce((a,o)=>a+ +o.total,0))+' order value':'No orders yet today','orders')}
   ${kpi('c','bell','Pending orders',pend,pend?'Waiting for you to accept':'All caught up','orders')}
   ${kpi('p','pound','Revenue this week',gbp0(rev),'Since Monday, excl. cancelled','orders')}
   ${kpi('','box','Live products',live.toLocaleString(),`${L.length.toLocaleString()} in your catalogue`,'products')}
   ${kpi('w big','alert','Low stock',low.length,`Live items with ${LOW} or fewer`,'products','low')}</div>
  <div class="cards two"><div class="card"><div class="chd"><h3>Recent orders</h3><a href="#orders">View all</a></div>${O.length?`<table class="tbl resp"><thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>
    ${O.slice(0,6).map(o=>`<tr class="click" data-o="${esc(o.id)}"><td><b>${esc(o.order_number)}</b><div class="mut">${ago(o.created_at)}</div></td><td data-l="Customer">${esc(o.customer_name)}</td><td class="mut" data-l="Type">${o.fulfilment==='delivery'?'Delivery':'Collect'}</td><td>${chip(o.status)}</td><td class="num"><b>${gbp(o.total)}</b></td></tr>`).join('')}</tbody></table>`:`<div class="empty">${svg('orders')}<b>No orders yet</b>When customers order, they’ll appear here with an alert.</div>`}</div>
   <div class="cards"><div class="card"><div class="chd"><h3>Sales, last 7 days</h3><span class="mut" style="font-size:13px;font-weight:700">${gbp(days.reduce((a,x)=>a+x.v,0))}</span></div><div class="cb"><div class="chart">${days.map((x,i)=>`<div class="${i===6?'today':''}" title="${gbp(x.v)}"><em>${x.v?gbp0(x.v):''}</em><i style="height:${Math.max(3,x.v/mx*100)}%"></i><small>${x.d.toLocaleDateString('en-GB',{weekday:'short'})}</small></div>`).join('')}</div></div></div>
    <div class="card"><div class="chd"><h3>Needs attention</h3></div><div class="cb" style="display:grid;gap:10px">
     ${pend?`<a class="tg" href="#orders" style="text-decoration:none"><span><b>${pend} new order${pend>1?'s':''}</b><small>Accept or reject so customers aren’t kept waiting</small></span>${svg('arrow')}</a>`:''}
     ${prog?`<a class="tg" href="#orders" style="text-decoration:none"><span><b>${prog} in progress</b><small>Mark ready, out for delivery or complete</small></span>${svg('arrow')}</a>`:''}
     ${low.length?`<a class="tg" href="#products" data-pf="low" style="text-decoration:none"><span><b>${low.length} product${low.length>1?'s':''} low on stock</b><small>${esc(low.slice(0,2).map(l=>l.name.split(/[–,]/)[0].trim()).join(', '))}${low.length>2?'…':''}</small></span>${svg('arrow')}</a>`:''}
     ${!pend&&!prog&&!low.length?`<div class="empty" style="padding:16px">${svg('check')}<b>All clear</b>Nothing needs your attention.</div>`:''}</div></div></div></div>`};
const FIL={open:['Open',o=>OPEN.includes(o.status)],new:['New',o=>o.status==='placed'],done:['Completed',o=>o.status==='completed'],cancelled:['Cancelled',o=>DEAD.includes(o.status)],all:['All',()=>true]};
const nItems=o=>o.order_items.reduce((a,i)=>a+i.qty,0);
const actBtns=(o,cls='sm')=>nexts(o).map(([s,l])=>`<button class="btn ${cls} ${s==='rejected'?'ghost danger':''}" data-st="${s}" data-id="${esc(o.id)}">${l}</button>`).join('')+(['accepted','ready','out_for_delivery'].includes(o.status)?`<button class="btn ghost ${cls} danger" data-st="cancelled" data-id="${esc(o.id)}">Cancel</button>`:'');
PAGES.orders=()=>{const u=D.ui,q=u.oq.toLowerCase(),L=D.O.filter(FIL[u.of][1]).filter(o=>!q||(o.order_number+' '+o.customer_name+' '+(o.customer_phone||'')).toLowerCase().includes(q));
  return `<div class="ph"><div><h2>Orders</h2><p>${D.O.length} orders · customers pay you on collection or delivery</p></div><div class="acts"><span class="live"><i></i>${MOCK?'Live updates (preview)':'Live: new orders appear automatically'}</span>
   ${'Notification' in window&&Notification.permission==='default'?`<button class="btn ghost sm" data-a="notif">${svg('bell')}Enable alerts</button>`:''}${MOCK?`<button class="btn ghost sm" data-a="sim">${svg('plus')}Simulate order</button>`:''}</div></div>
  ${verifyBox()}
  <div class="tools"><div class="seg">${Object.entries(FIL).map(([k,[l,f]])=>`<button data-of="${k}" class="${u.of===k?'on':''}">${l}<em>${D.O.filter(f).length}</em></button>`).join('')}</div>
   <label class="srch">${svg('search')}<input id="oq" placeholder="Search order number, customer or phone" value="${esc(u.oq)}"></label></div>
  <div class="card">${L.length?`<table class="tbl resp ordtbl"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Fulfilment</th><th>Status</th><th class="num">Total</th><th>Actions</th></tr></thead><tbody>
   ${L.map(o=>`<tr class="click ${o.status==='placed'?'isnew':''} ${D.ui.newIds.has(o.id)?'flash':''}" data-o="${esc(o.id)}"><td><b>${esc(o.order_number)}</b><div class="mut">${when(o.created_at)}</div></td>
    <td data-l="Customer"><b style="font-weight:600">${esc(o.customer_name)}</b><div class="mut">${esc(o.customer_phone||'')}</div></td>
    <td data-l="Items" class="mut">${nItems(o)} item${nItems(o)===1?'':'s'}</td><td data-l="Fulfilment" class="mut">${o.fulfilment==='delivery'?'Delivery':'Click & collect'}</td>
    <td data-l="Status">${chip(o.status)}</td><td class="num" data-l="Total"><b>${gbp(o.total)}</b></td><td class="full"><div class="racts">${actBtns(o)||'<span class="mut">–</span>'}</div></td></tr>`).join('')}</tbody></table>`
   :`<div class="empty">${svg('orders')}<b>No ${FIL[u.of][0].toLowerCase()} orders</b>${u.oq?'Try a different search.':'New orders appear here instantly.'}</div>`}</div>`};
/* click & collect verification: customer quotes "NB-1004 · PIN 4821" */
const normQ=s=>(s||'').toUpperCase().replace(/\s+/g,'');
function vMatch(q){q=normQ(q);if(!q)return [];const num=q.replace(/^NB-?/,'').replace(/PIN.*$/,'');const pin=(q.match(/PIN(\d{4})/)||[])[1];
  return D.O.filter(o=>o.fulfilment==='collect'&&!DEAD.includes(o.status)&&o.status!=='completed'&&(pin?o.collection_pin===pin&&(!/^\d+$/.test(num)||o.order_number==='NB-'+num):(o.collection_pin&&o.collection_pin===q)||o.order_number==='NB-'+num))}
function verifyBox(){const u=D.ui,m=u.vq?vMatch(u.vq):null;
  return `<div class="card vbox" style="margin-bottom:14px"><div class="cb"><h3 style="margin:0 0 4px">${svg('check')} Verify collection</h3><p class="mut" style="margin:0 0 10px">Ask the customer for their order number or 4-digit PIN.</p>
   <form data-a="vform" style="display:flex;gap:8px;flex-wrap:wrap"><input id="vq" placeholder="e.g. NB-1004 or 4821" value="${esc(u.vq||'')}" autocomplete="off" inputmode="text" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid #d5dbd9;border-radius:10px;font:inherit;font-size:16px;letter-spacing:.04em"><button class="btn">Find order</button>${u.vq?'<button type="button" class="btn ghost" data-a="vclear">Clear</button>':''}</form>
   ${m?(m.length?m.map(o=>`<div class="vres" style="margin-top:12px;padding:12px;border:2px solid #1f6f66;border-radius:12px;background:#effaf7">
     <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b style="font-size:18px">${esc(o.order_number)} · PIN ${esc(o.collection_pin||'—')}</b>${chip(o.status)}</div>
     <div class="mut">${esc(o.customer_name)} · ${esc(o.customer_phone||'')} · ${gbp(o.total)} to pay on collection</div>
     <ul style="margin:8px 0;padding-left:18px">${o.order_items.map(i=>`<li>${i.qty} × ${esc(i.name)}</li>`).join('')}</ul>
     ${o.status==='placed'?'<p class="mut">Accept this order first, then hand it over.</p>':`<button class="btn" data-collect="${esc(o.id)}">${svg('check')}Mark collected · complete</button>`}</div>`).join('')
     :`<p style="margin:12px 0 0;color:#e11d48">No open click &amp; collect order matches “${esc(u.vq)}”. Check the number or PIN with the customer.</p>`):''}</div></div>`}
async function collect(id){const o=D.O.find(x=>x.id===id);if(!o)return;try{if(o.status==='accepted')await API.status(id,'ready');await API.status(id,'completed','Collected (verified)');D.O=await API.orders();D.ui.vq='';toast(o.order_number+' collected · completed');rerender()}catch(e){toast(e.message||'Could not complete order')}}
document.addEventListener('submit',e=>{if(e.target.dataset.a!=='vform')return;e.preventDefault();D.ui.vq=(document.getElementById('vq')?.value||'').trim();rerender()});
function timeline(o){const steps=STEPS[o.fulfilment]||STEPS.collect,ev={};(o.order_events||[]).forEach(e=>ev[e.status]=e);const end=DEAD.includes(o.status),ix=steps.indexOf(o.status);
  let list=steps.map((s,i)=>({s,done:end?!!ev[s]:i<=ix,cur:!end&&i===ix,at:ev[s]?.at}));if(end){list=list.filter(x=>x.done);list.push({s:o.status,done:true,cur:true,bad:true,at:ev[o.status]?.at,note:ev[o.status]?.note||o.reject_reason})}
  return `<ol class="tl">${list.map(x=>`<li class="${x.done?'d':''} ${x.cur?'c':''} ${x.bad?'bad':''}"><i></i><b>${x.s==='placed'?'Placed':LBL[x.s]}</b>${x.at?`<small>${when(x.at)}</small>`:''}${x.note?`<small>“${esc(x.note)}”</small>`:''}</li>`).join('')}</ol>`}
function drawer(){const o=D.ui.drawer&&D.O.find(x=>x.id===D.ui.drawer);if(!o)return '';const a=actBtns(o,'');
  return `<div class="drw on"><div class="bg" data-a="close"></div><div class="pn2" role="dialog" aria-label="Order ${esc(o.order_number)}"><div class="dh"><div style="flex:1"><h3>${esc(o.order_number)}</h3><small class="mut">${when(o.created_at)}</small></div>${chip(o.status)}<button class="ib" data-a="close" aria-label="Close">${svg('x')}</button></div>
   <div class="db"><div class="card"><div class="cb">${timeline(o)}</div></div>
    <div class="card"><div class="chd"><h3>Customer</h3><a href="tel:${esc(o.customer_phone)}">Call</a></div><div class="cb"><div class="kv"><span>Name</span><b>${esc(o.customer_name)}</b></div><div class="kv"><span>Phone</span><a href="tel:${esc(o.customer_phone)}">${esc(o.customer_phone)}</a></div>
     <div class="kv"><span>${o.fulfilment==='delivery'?'Deliver to':'Fulfilment'}</span><span style="color:var(--txt);text-align:right">${o.fulfilment==='delivery'?esc((o.delivery_address||'')+', '+(o.delivery_postcode||'')):'Click & collect in store'}</span></div>${o.fulfilment==='collect'&&o.collection_pin?`<div class="kv"><span>Collection PIN</span><b style="font-size:16px;letter-spacing:.06em">${esc(o.collection_pin)}</b></div>`:''}${o.note?`<div class="kv"><span>Note</span><span style="color:var(--txt);text-align:right">“${esc(o.note)}”</span></div>`:''}</div></div>
    <div class="card"><div class="chd"><h3>Items · ${nItems(o)}</h3></div><div class="cb">${o.order_items.map(i=>`<div class="oi"><img class="pimg" src="${esc(i.image||'icon-192.png')}" alt="" data-fb><span>${i.qty} × ${esc(i.name)}</span><b>${gbp(i.unit_price*i.qty)}</b></div>`).join('')}
     <div class="kv"><span>Subtotal</span><span>${gbp(o.subtotal??o.total)}</span></div>${+o.delivery_fee?`<div class="kv"><span>Delivery</span><span>${gbp(o.delivery_fee)}</span></div>`:''}<div class="kv tot"><span style="color:var(--txt)">Total · ${o.payment_method==='pay_on_delivery'?'pay on delivery':'pay on collection'}</span><span>${gbp(o.total)}</span></div></div></div></div>
   ${a?`<div class="df">${a}</div>`:''}</div></div>`}
const PF={all:['All',()=>true],live:['Live',l=>l.active],hidden:['Hidden',l=>!l.active],low:['Low stock',l=>l.stock>0&&l.stock<=LOW],out:['Out of stock',l=>l.stock<=0],auto:['Auto-listed',l=>l.source!=='manual']};
PAGES.products=()=>{const u=D.ui,q=u.pq.toLowerCase(),all=D.L.filter(PF[u.pf][1]).filter(l=>!q||(l.name+' '+l.sku).toLowerCase().includes(q)),L=all.slice(0,u.pn);
  return `<div class="ph"><div><h2>Products &amp; stock</h2><p>Edit prices and stock inline. Changes save automatically.</p></div><div class="acts"><button class="btn sm" data-a="addcat">${svg('plus')}Add from catalogue</button></div></div>
  <div class="tools"><div class="seg">${Object.entries(PF).map(([k,[l,f]])=>`<button data-pf="${k}" class="${u.pf===k?'on':''}">${l}<em>${D.L.filter(f).length}</em></button>`).join('')}</div>
   <label class="srch">${svg('search')}<input id="pq" placeholder="Search name or SKU" value="${esc(u.pq)}"></label></div>
  <div class="card">${L.length?`<table class="tbl resp prod"><thead><tr><th>Product</th><th class="num">Trade</th><th>Retail price</th><th>Was price</th><th>Stock</th><th>Margin</th><th>Live</th></tr></thead><tbody>
   ${L.map(l=>{const m=+l.retail_price>0?pct(+l.retail_price,+l.trade_price)+'%':'–';return `<tr data-l-id="${esc(l.id)}"><td class="full"><div class="pc"><img class="pimg" src="${esc(l.image||'icon-192.png')}" alt="" loading="lazy" data-fb><div><b>${esc(l.name)}</b><small class="mut">${esc(l.sku)}${l.source!=='manual'?' · <span class="auto">Auto-listed</span>':''}${l.stock<=0?' · <span class="oos">Out of stock</span>':l.stock<=LOW?' · <span class="lowt">Low</span>':''}</small></div></div></td>
    <td class="num mut" data-l="Trade">${gbp(l.trade_price)}</td>
    <td data-l="Retail"><span class="mi"><i>£</i><input type="number" step="0.01" min="0" inputmode="decimal" data-f="retail_price" value="${(+l.retail_price||0).toFixed(2)}" aria-label="Retail price"></span></td>
    <td data-l="Was"><span class="mi"><i>£</i><input type="number" step="0.01" min="0" inputmode="decimal" data-f="compare_at_price" value="${l.compare_at_price?(+l.compare_at_price).toFixed(2):''}" placeholder="–" aria-label="Was price"></span></td>
    <td data-l="Stock"><span class="mi st"><input type="number" step="1" min="0" inputmode="numeric" data-f="stock" value="${+l.stock||0}" aria-label="Stock"></span></td>
    <td class="mut" data-l="Margin">${m}</td>
    <td data-l="Live"><label class="sw"><input type="checkbox" data-f="active" ${l.active?'checked':''} aria-label="Live"><i></i></label></td></tr>`}).join('')}</tbody></table>
   ${all.length>L.length?`<div class="more"><button class="btn ghost" data-a="pmore">Show more (${all.length-L.length} left)</button></div>`:''}`
   :`<div class="empty">${svg('box')}<b>No products here</b>${D.L.length?'Try a different filter or search.':'Products from your wholesale orders appear here automatically after they ship.'}</div>`}</div>`};
function catModal(){if(!D.ui.cat)return '';const have=new Set(D.L.map(l=>l.sku)),q=(D.ui.cq||'').toLowerCase(),R=q.length<2?[]:(D.cat||[]).filter(p=>(p.name+' '+p.sku+' '+(p.brand||'')).toLowerCase().includes(q)).slice(0,30);
  return `<div class="mod on"><div class="bg" data-a="close"></div><div class="box"><div class="dh"><h3 style="flex:1">Add from catalogue</h3><button class="ib" data-a="close" aria-label="Close">${svg('x')}</button></div>
   <div class="db"><label class="srch" style="max-width:none">${svg('search')}<input id="cq" placeholder="Search 2,000+ products by name, brand or SKU" value="${esc(D.ui.cq||'')}" autofocus></label>
   <div class="clist">${q.length<2?'<p class="mut" style="text-align:center;padding:20px">Type at least 2 letters to search.</p>':R.length?R.map(p=>`<div class="oi"><img class="pimg" src="${esc(p.images?.[0]||'icon-192.png')}" alt=""><span>${esc(p.name)}<small class="mut" style="display:block">${esc(p.sku)} · trade ${gbp(p.trade_price)}</small></span>${have.has(p.sku)?'<span class="mut" style="font-size:12px">In shop</span>':`<button class="btn sm" data-add="${esc(p.sku)}">Add</button>`}</div>`).join(''):'<p class="mut" style="text-align:center;padding:20px">No matches.</p>'}</div></div></div></div>`}
PAGES.deals=()=>{const on=D.L.filter(l=>+l.compare_at_price>+l.retail_price),cand=D.L.filter(l=>l.active&&!(+l.compare_at_price>+l.retail_price)).slice(0,8);
  return `<div class="ph"><div><h2>Deals</h2><p>Show a “was” price and customers see a saving badge on your product. Deals appear in “Deals near you”.</p></div></div>
  <div class="card"><div class="chd"><h3>Live deals · ${on.length}</h3></div>${on.length?`<div class="dealg">${on.map(l=>`<div class="dealc"><img src="${esc(l.image||'icon-192.png')}" alt=""><div><b>${esc(l.name)}</b><div><s class="mut">${gbp(l.compare_at_price)}</s> <b class="cor">${gbp(l.retail_price)}</b> <span class="save">Save ${pct(+l.compare_at_price,+l.retail_price)}%</span></div></div><button class="btn ghost sm" data-end="${esc(l.id)}">End deal</button></div>`).join('')}</div>`:`<div class="empty">${svg('tag')}<b>No deals running</b>Start one below, or set a “was” price on the Products page.</div>`}</div>
  <div class="card"><div class="chd"><h3>Start a deal</h3><span class="mut" style="font-size:13px">10% off, showing your current price as the “was” price</span></div><div class="dealg">${cand.map(l=>`<div class="dealc"><img src="${esc(l.image||'icon-192.png')}" alt=""><div><b>${esc(l.name)}</b><div class="mut">${gbp(l.retail_price)} → <b class="cor">${gbp(Math.round(l.retail_price*90)/100)}</b></div></div><button class="btn sm" data-deal="${esc(l.id)}">Start</button></div>`).join('')||'<p class="mut cb">No live products to discount.</p>'}</div></div>
  <div class="card prm"><div class="cb"><span class="ic">${svg('mega')}</span><div><b>Want a featured spot or homepage banner?</b><p class="mut">Sponsored placements are managed by the ShopNip team during the pilot.</p></div><a class="btn ghost sm" href="mailto:${esc(MAIL)}?subject=${encodeURIComponent('Featured spot for '+(D.shop?.name||'my shop'))}">Ask the team</a></div></div>`};
PAGES.settings=()=>{const s=D.shop,d=s.delivery_options||{};
  return `<div class="ph"><div><h2>Shop settings</h2><p>How customers find and contact your shop.</p></div></div>
  <form id="setf" class="fgrid"><div class="card fs"><div class="chd"><h3>Shop details</h3></div><div class="cb">
    <label class="fld"><span>Shop name</span><input name="name" required value="${esc(s.name||'')}"></label>
    <label class="fld"><span>Phone</span><input name="phone" type="tel" value="${esc(s.phone||'')}"></label>
    <label class="fld"><span>Address</span><input name="address" required value="${esc(s.address||'')}"></label>
    <label class="fld"><span>Postcode</span><input name="postcode" required value="${esc(s.postcode||'')}"><small class="mut" id="pcok">${s.lat?'Location set ✓':''}</small></label>
    <div class="fld"><span>Opening hours</span>${HoursPicker.html('opening_hours',s.opening_hours)}</div>
    <label class="fld"><span>Wholesale account email</span><input name="bluepark_customer_email" type="email" value="${esc(s.bluepark_customer_email||'')}"><small class="mut">Products ordered with this account are listed automatically. Changing it sends your shop for re-approval.</small></label></div></div>
   <div class="cards"><div class="card fs"><div class="chd"><h3>Collection &amp; delivery</h3></div><div class="cb">
     <label class="tg"><span><b>Click &amp; collect</b><small>Customers collect and pay in store</small></span><span class="sw"><input type="checkbox" name="collect" ${d.collect!==false?'checked':''}><i></i></span></label>
     <label class="tg"><span><b>Local delivery</b><small>You deliver; customers pay on delivery</small></span><span class="sw"><input type="checkbox" name="delivery" ${d.delivery?'checked':''}><i></i></span></label>
     <div class="row2"><label class="fld"><span>Radius (miles)</span><input name="delivery_radius_miles" type="number" min="0" step="0.5" value="${+(d.delivery_radius_miles??5)||0}"></label><label class="fld"><span>Delivery fee (£)</span><input name="delivery_fee" type="number" min="0" step="0.01" value="${(+(d.delivery_fee??0)).toFixed(2)}"></label></div></div></div>
    <div class="card fs"><div class="chd"><h3>Branding</h3></div><div class="cb">
     <div class="upl"><span class="lgp">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span><div><b>Logo</b><small class="mut">Square, at least 256px</small></div><label class="btn ghost sm">Upload<input type="file" accept="image/*" data-up="logo" hidden></label></div>
     <div class="upl"><span class="cvp">${s.cover_url?`<img src="${esc(s.cover_url)}" alt="">`:''}</span><div><b>Cover image</b><small class="mut">Wide, shown on your shop page</small></div><label class="btn ghost sm">Upload<input type="file" accept="image/*" data-up="cover" hidden></label></div></div></div></div>
   <div class="savebar wide"><span class="mut">Status: <b>${statusLabel(s.status)}</b></span><button class="btn" type="submit">Save changes</button></div></form>`};
// =================== events / realtime ===================
function rerender(){const y=scrollY,a=document.activeElement,id=a?.id,pos=a?.selectionStart;render();if(id){const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch{}}}scrollTo(0,y)}
function ding(){try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.2,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.6);o.start();o.stop(c.currentTime+.6)}catch{}}
function alertNew(o){ding();D.ui.newIds.add(o.id);toast('New order '+(o.order_number||'')+' · '+gbp(o.total));
  try{if(Notification.permission==='granted'&&document.hidden)new Notification('New ShopNip order',{body:(o.order_number||'')+' · '+gbp(o.total),icon:'icon-192.png'})}catch{}}
async function onLive(ev){const isNew=ev.eventType==='INSERT';try{D.O=await API.orders()}catch{}if(isNew)alertNew(ev.new);rerender()}
async function setStatus(id,st){let note=null;if(st==='rejected'){note=prompt('Reason for rejecting (shown to the customer)','Sorry, we can’t fulfil this order right now');if(note===null)return}
  else if(st==='cancelled'&&!confirm('Cancel this order? Stock will be returned.'))return;
  try{await API.status(id,st,note);D.O=await API.orders();if(DEAD.includes(st))D.L=await API.listings();toast('Order '+LBL[st].toLowerCase());rerender()}catch(e){toast(e.message||'Could not update order')}}
const saveT={};
function saveField(inp){const tr=inp.closest('[data-l-id]'),id=tr.dataset.lId,f=inp.dataset.f,l=D.L.find(x=>x.id===id);if(!l)return;
  let v=f==='active'?inp.checked:inp.value===''?null:+inp.value;if(f==='stock')v=Math.max(0,Math.round(v||0));if(f==='retail_price'&&!(v>0))return toast('Enter a retail price');
  if(f==='compare_at_price'&&v!==null&&v<=+l.retail_price){toast('“Was” price must be higher than the retail price');inp.value=l.compare_at_price?(+l.compare_at_price).toFixed(2):'';return}
  clearTimeout(saveT[id+f]);saveT[id+f]=setTimeout(async()=>{try{await API.updListing(id,{[f]:v});l[f]=v;toast('Saved');if(f==='active'||f==='stock')rerender()}catch(e){toast(e.message||'Could not save')}},f==='active'?0:400)}
document.addEventListener('click',async e=>{const t=e.target.closest('a,button,[data-o],.bg');if(!t)return;const d=t.dataset;
  if(d.jump){e.preventDefault();document.getElementById(d.jump)?.scrollIntoView({behavior:'smooth'});return}
  if(d.pf&&t.tagName==='A'){D.ui.pf=d.pf;return}
  if(d.a==='menu'){e.preventDefault();$('#side')?.classList.toggle('on');document.body.classList.toggle('sbo');return}
  if(t.closest('.side a'))document.body.classList.remove('sbo');
  if(d.a==='close'){D.ui.drawer=null;D.ui.cat=false;rerender();return}
  if(d.a==='logout'){e.preventDefault();await API.signOut();if(MOCK)location.href='seller.html'+location.search;else{D.user=null;location.hash='';render()}return}
  if(d.a==='notif'){Notification.requestPermission().then(rerender);return}
  if(d.a==='sim'){const L=D.L.filter(l=>l.active),n=1000+D.O.length+1,it=[L[n%L.length],L[(n*3)%L.length]],sub=it[0].retail_price*2+it[1].retail_price,ts=new Date().toISOString();
    const o={id:'o'+n,order_number:'NB-'+n,shop_id:D.shop.id,customer_name:'New Customer',customer_phone:'07700 900999',fulfilment:'collect',status:'placed',subtotal:sub,delivery_fee:0,total:sub,payment_method:'pay_on_collection',created_at:ts,
      order_items:[{listing_id:it[0].id,sku:it[0].sku,name:it[0].name,image:it[0].image,unit_price:it[0].retail_price,qty:2},{listing_id:it[1].id,sku:it[1].sku,name:it[1].name,image:it[1].image,unit_price:it[1].retail_price,qty:1}],order_events:[{status:'placed',at:ts}]};
    M.O.unshift(o);onLive({eventType:'INSERT',new:o});return}
  if(d.st){e.stopPropagation();setStatus(d.id,d.st);return}
  if(d.collect){e.preventDefault();e.stopPropagation();collect(d.collect);return}
  if(d.a==='vclear'){e.preventDefault();D.ui.vq='';rerender();return}
  if(d.of){D.ui.of=d.of;rerender();return}if(d.pf){D.ui.pf=d.pf;D.ui.pn=60;rerender();return}
  if(d.a==='pmore'){D.ui.pn+=60;rerender();return}
  if(d.a==='addcat'){D.ui.cat=true;D.ui.cq='';rerender();catalog().then(rerender);return}
  if(d.add){const p=(D.cat||[]).find(x=>x.sku===d.add);if(!p)return;try{const l=await API.addListing({shop_id:D.shop.id,sku:p.sku,name:p.name,image:p.images?.[0]||null,category:p.category,trade_price:+p.trade_price||0,retail_price:Math.round((+p.trade_price||1)*1.6*20)/20,stock:0,active:false,source:'manual'});D.L.unshift(l);toast('Added. Set price and stock, then switch it live');rerender()}catch(er){toast(er.message)}return}
  if(d.deal||d.end){const id=d.deal||d.end,l=D.L.find(x=>x.id===id),ch=d.deal?{compare_at_price:l.retail_price,retail_price:Math.round(l.retail_price*90)/100}:{retail_price:+l.compare_at_price>0?+l.compare_at_price:l.retail_price,compare_at_price:null};
    try{await API.updListing(id,ch);Object.assign(l,ch);toast(d.deal?'Deal started':'Deal ended');rerender()}catch(er){toast(er.message)}return}
  if(d.o&&!e.target.closest('button,a')){D.ui.drawer=d.o;rerender()}});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='oq'){D.ui.oq=t.value;rerender()}else if(t.id==='pq'){D.ui.pq=t.value;D.ui.pn=60;rerender()}else if(t.id==='cq'){D.ui.cq=t.value;rerender()}});
document.addEventListener('change',async e=>{const t=e.target;if(t.dataset.f){saveField(t);return}
  if(t.name==='postcode'&&t.form?.id==='setf'){const pc=t.value.trim();if(window.UKGate&&UKGate.checkPlace(pc)){$('#pcok').textContent='Outside the UK';return}try{const r=await fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(pc)).then(r=>r.json());if(r.result){t.dataset.lat=r.result.latitude;t.dataset.lng=r.result.longitude;t.value=r.result.postcode;$('#pcok').textContent='Location found ✓'}else if(window.UKGate&&!UKGate.isUkPostcode(pc)){UKGate.show(pc);$('#pcok').textContent='Outside the UK'}else $('#pcok').textContent='Postcode not found'}catch{}}
  if(t.dataset.up&&t.files[0]){const f=t.files[0];if(f.size>5e6)return toast('Image must be under 5MB');try{toast('Uploading…');const url=await API.upload(f,t.dataset.up),k=t.dataset.up+'_url';const s=await API.saveShop({id:D.shop.id,[k]:url});D.shop={...D.shop,...s,[k]:url};toast('Image updated');rerender()}catch(er){toast(er.message||'Upload failed')}}});
document.addEventListener('submit',async e=>{const f=e.target;if(f.id==='authf'){e.preventDefault();const F=new FormData(f),su=f.dataset.mode==='signup',b=f.querySelector('button');b.disabled=true;b.textContent='Please wait…';D.ui.busy=true;D.ui.amsg='';
   try{const email=F.get('email').trim(),pw=F.get('pw');const r=su?await API.signUp(email,pw,(F.get('name')||'').trim()):await API.signIn(email,pw);
    if(su&&!r.session){D.ui.busy=false;D.ui.aok=true;D.ui.amsg='Check your email and tap the link to confirm. It brings you back here to register your shop.';location.hash='login';render();return}
    await load();D.ui.busy=false;toast(su?'Seller account created':'Signed in');landSeller(su)}
   catch(er){D.ui.busy=false;D.ui.aok=false;D.ui.amsg=er.message||'Something went wrong';render()}return}
  if(f.id==='setf'){e.preventDefault();const F=new FormData(f),s=D.shop,pcI=f.postcode;
   const r={id:s.id,name:F.get('name').trim(),phone:F.get('phone').trim(),address:F.get('address').trim(),postcode:F.get('postcode').trim().toUpperCase(),opening_hours:F.get('opening_hours').trim(),bluepark_customer_email:F.get('bluepark_customer_email').trim().toLowerCase(),
    delivery_options:{...(s.delivery_options||{}),collect:!!F.get('collect'),delivery:!!F.get('delivery'),delivery_radius_miles:+F.get('delivery_radius_miles')||0,delivery_fee:+F.get('delivery_fee')||0}};
   if(pcI.dataset.lat){r.lat=+pcI.dataset.lat;r.lng=+pcI.dataset.lng}
   if(r.bluepark_customer_email!==(s.bluepark_customer_email||'')){if(!confirm('Changing your wholesale email sends your shop for re-approval. Continue?'))return;r._tradeChanged=true}
   try{const x=await API.saveShop(r);D.shop={...s,...x};toast('Shop settings saved');rerender()}catch(er){toast(er.message||'Could not save')}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(D.ui.drawer||D.ui.cat)){D.ui.drawer=null;D.ui.cat=false;rerender()}});
if('serviceWorker' in navigator&&!MOCK)navigator.serviceWorker.register('sw.js').catch(()=>{});
window.NBSeller={D,API,render,rerender,PAGES,NAV,TITLE,DASH,I,M,MOCK,sb,catalog,svg,esc,gbp,gbp0,toast,keep,LOW,DEAD,OPEN,LBL,chip,nexts,actBtns,when,ago};
if(!MOCK)catalog().then(()=>{if(!page())rerender()});else catalog();
boot();
})();
/* sign-out on index.html (shared Supabase session) signs this tab out too */
addEventListener('storage',e=>{if((e.key&&/^sb-.*auth-token$/.test(e.key)&&!e.newValue)||(e.key==='nb_mock_out'&&e.newValue))location.reload()});

