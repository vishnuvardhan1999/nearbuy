// ShopNip Admin (a NuvonHub product) · standalone operator dashboard. Separate site/domain from the public app.
// All access is enforced by Supabase RLS + is_admin() (migration_002..005). ADMIN_EMAILS is only a UI gate.
// ?mock=1 runs on in-memory data (no network writes). &as=none shows sign-in, &as=other shows the "not an admin" sign-out.
(()=>{
'use strict';
const CFG=window.ADMIN_CONFIG||{},Q=new URLSearchParams(location.search),MOCK=Q.get('mock')==='1';
const ADMINS=(CFG.ADMIN_EMAILS||[]).map(e=>e.toLowerCase().trim());
const sb=!MOCK&&window.supabase&&CFG.SUPABASE_URL?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY,{auth:{persistSession:true,detectSessionInUrl:true,storageKey:'nb-admin-auth'}}):null;
const PUB=CFG.PUBLIC_SITE_URL||'https://www.shopnip.co.uk';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}),gbp0=n=>'£'+Math.round(+n||0).toLocaleString('en-GB');
const fmtD=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'–';
const fmtDT=d=>d?new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'–';
const ago=d=>{const s=(Date.now()-Date.parse(d))/1000;if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';if(s<86400*30)return Math.floor(s/86400)+'d ago';return fmtD(d)};
const isAdminEmail=e=>ADMINS.includes(String(e||'').toLowerCase().trim());
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='on';clearTimeout(t._h);t._h=setTimeout(()=>t.className='',2800)};
const I={grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',store:'<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
 bag:'<path d="M5 8h14l-1.5 12h-11z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',mega:'<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 8a5 5 0 0 1 0 8"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',pound:'<path d="M18 7a4 4 0 0 0-8-1v12M6 13h8M6 18h12"/>',box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
 check:'<path d="m5 12 5 5L20 7"/>',alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',ext:'<path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',truck:'<path d="M1 4h13v12H1zM14 9h4l3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]||''}</svg>`;
const SST={pending:['Pending','p-warn'],approved:['Approved','p-ok'],rejected:['Rejected','p-bad'],suspended:['Suspended','p-off']};
const OST={placed:['New','p-warn'],accepted:['Accepted','p-info'],ready:['Ready','p-info'],out_for_delivery:['Out for delivery','p-info'],completed:['Completed','p-ok'],cancelled:['Cancelled','p-off'],rejected:['Rejected','p-bad']};
const DEAD=['cancelled','rejected'];
const pill=(m,k)=>{const [l,c]=m[k]||[k,'p-off'];return `<span class="pill ${c}">${esc(l)}</span>`};
const PT={banner:'Banner',sponsored:'Sponsored product',featured_shop:'Featured shop',deal:'Deal tile'},THEMES=['teal','coral','lime','night','gold'];
const pState=p=>!p.active?['Paused','p-off']:p.start_at&&Date.parse(p.start_at)>Date.now()?['Scheduled','p-info']:p.end_at&&Date.parse(p.end_at)<=Date.now()?['Ended','p-off']:['Live','p-ok'];

// =================== mock data ===================
const M={shops:[],L:[],O:[],promos:[],subs:[],wo:[],customers:0};
function seed(){const now=Date.now(),H=36e5,D=24*H,iso=t=>new Date(t).toISOString();
  const S=(id,name,addr,pc,email,status,daysAgo,extra={})=>M.shops.push({id,owner_id:'u_'+id,name,address:addr,postcode:pc,bluepark_customer_email:email,status,active:status==='approved',phone:'01923 '+(100000+id.length*7919%899999),opening_hours:'Mon–Sat 9am–6pm',
    delivery_options:{collect:true,delivery:status==='approved',delivery_radius_miles:5,delivery_fee:2.99},created_at:iso(now-daysAgo*D),approved_at:status==='approved'?iso(now-(daysAgo-1)*D):null,status_reason:null,...extra});
  S('s1','Suman Bros','Crown House, Otterspool Way, Watford','WD25 8HL','vishnuvardhan.kesavarapu@outlook.com','approved',30,{opening_hours:'Mon–Fri 9am–5pm',delivery_options:{collect:true,delivery:true,delivery_radius_miles:10,delivery_fee:3.99}});
  S('s4','Corner News & Stationers','12 High Street, Leicester','LE1 5YA','orders@cornernews.example','approved',21);
  S('s5','Oadby Party Shop','3 The Parade, Oadby','LE2 5BB','party@oadby.example','approved',14);
  S('s2','Village Post Office Store','1 Church Lane, Oadby','LE2 5AA','vpo@example.com','pending',1.2);
  S('s3','High Street Cards & Gifts','40 Market Street, Leicester','LE1 6DP','cards@example.com','pending',0.3);
  S('s6','Bushey Mill Newsagent','88 Bushey Mill Lane, Watford','WD24 7QS','bmnews@example.com','pending',3);
  S('s7','Quick Print & Post','5 Queens Road, Watford','WD17 2LA','qpp@example.com','rejected',9,{status_reason:'Wholesale email has no order history with Suman Bros.'});
  S('s8','Kings Langley Crafts','21 High Street, Kings Langley','WD4 8AB','klcrafts@example.com','suspended',40,{status_reason:'Repeated cancelled orders; paused pending a call.'});
  const NM=['A4 Copier Paper 500 Sheets','Gel Pens Pack of 3','Balloon Candle Happy Birthday','Sticky Notes Cube','Parcel Tape 12 Pack','Bubble Wrap Roll','Glue Stick 15g','Highlighters Pack of 10','C5 Manilla Envelopes','Bin Liners 50 Pack','Oil Pastels 12','Notebook A4 Casebound'];
  const IMG='https://www.sumanbros.com/user/products/large/';const imgs=['pale-green-01-sealed.png','tallon-gel-pens-1012-01-sealed.png','CD6127.png','snopake-sticky-notes-01-sealed.png','5000.png','BWP2-15.jpg','0597-15g-01-sealed.png','70-33.png','c5-manilla-envelopes-25-01-sealed-hd.png','tuffy-bin-liners-20l-01-sealed-hd.png','oil-pastels-01-sealed-hd.png','302575.jpg'];
  const per={s1:50,s4:34,s5:22,s2:12,s3:0,s6:8,s7:0,s8:15};
  Object.entries(per).forEach(([sid,n])=>{for(let i=0;i<n;i++){const k=i%NM.length;M.L.push({id:sid+'l'+i,shop_id:sid,sku:'SKU'+(1000+i),name:NM[k],image:IMG+imgs[k],retail_price:+(1.49+(i%9)*1.1).toFixed(2),stock:(i*7)%23,active:i%9!==4})}});
  const cust=['Sam Patel','Priya Shah','Jo King','Tom Reed','Aisha Khan','Ben Carter','Lucy Moore','Raj Mehta','Emma Wilson','Dan Hughes','Zara Ali','Oliver Grant'];
  const live=['s1','s4','s5','s8'];let n=1001;const sts=['completed','completed','completed','completed','accepted','ready','cancelled','out_for_delivery','rejected','completed'];
  for(let d=20;d>=0;d--){const k=2+((d*13)%5)+(d<7?2:0);for(let j=0;j<k;j++){const sid=live[(d+j)%(d%3?3:4)],L=M.L.filter(l=>l.shop_id===sid),f=(d+j)%3?'collect':'delivery';
    const t=now-d*D-(j*97+13)%600*60000,items=[0,1,2].slice(0,1+(d+j)%3).map(z=>{const l=L[(d*3+j*5+z*7)%L.length];return{sku:l.sku,name:l.name,image:l.image,unit_price:l.retail_price,qty:1+(z+j)%3}});
    const sub=items.reduce((a,i)=>a+i.unit_price*i.qty,0),fee=f==='delivery'?2.99:0,st=d===0&&j<3?['placed','placed','accepted'][j]:sts[(d+j)%sts.length],c=(d*5+j)%cust.length;
    M.O.push({id:'o'+n,order_number:'NB-'+n,collection_pin:f==='collect'?String(2000+n*13).slice(-4):null,shop_id:sid,customer_id:'c'+c,customer_name:cust[c],customer_phone:'07700 900'+(100+c),customer_email:cust[c].toLowerCase().replace(' ','.')+'@example.com',fulfilment:f,
      delivery_address:f==='delivery'?(10+c)+' Bushey Mill Lane, Watford':null,delivery_postcode:f==='delivery'?'WD24 7QS':null,status:st,subtotal:sub,delivery_fee:fee,total:+(sub+fee).toFixed(2),
      payment_method:f==='delivery'?'pay_on_delivery':'pay_on_collection',created_at:iso(Math.min(t,now-5*60000)),reject_reason:st==='rejected'?'Out of stock':null,order_items:items,order_events:[{status:'placed',at:iso(t)},...(st!=='placed'?[{status:st,at:iso(t+40*60000)}]:[])]});n++}}
  M.O.sort((a,b)=>a.created_at<b.created_at?1:-1);
  M.promos=[{id:'pm1',type:'banner',placement:'hero',title:'Half-term craft week',subtitle:'Glitter, paints and kits from shops near you.',cta:'Shop craft',link:'sec:2',theme:'coral',priority:10,active:true,start_at:iso(now-4*D),end_at:iso(now+9*D)},
   {id:'pm2',type:'featured_shop',title:'Suman Bros, Watford',subtitle:'Our flagship shop: stationery, office and party supplies from the wholesaler itself.',shop_id:'s1',link:'#shop=s1',cta:'Visit shop',theme:'teal',priority:100,active:true,start_at:iso(now-20*D)},
   {id:'pm3',type:'sponsored',title:'Sponsored gel pens',sku:'SKU1001',shop_id:'s4',priority:3,active:true,start_at:iso(now-2*D)},
   {id:'pm4',type:'banner',placement:'mid',title:'Bonfire night essentials',subtitle:'Gloves, glow sticks and party packs.',cta:'Shop now',link:'q:party',theme:'night',priority:4,active:true,start_at:iso(now-1*D),end_at:iso(now+12*D)},
   {id:'pm5',type:'banner',placement:'hero',title:'Christmas wrap shop',subtitle:'Opens 1 November.',cta:'Preview',link:'q:gift wrap',theme:'gold',priority:2,active:true,start_at:'2026-11-01T00:00:00Z'},
   {id:'pm6',type:'deal',title:'3 for 2 on cards',subtitle:'Mix & match',link:'q:card',theme:'lime',priority:1,active:false,start_at:iso(now-10*D)}];
  const src=['home','footer','home','shop','home'],pcs=['WD25 8HL','LE1 5YA','WD24 7QS','LE2 5AA',null];
  for(let i=0;i<27;i++)M.subs.push({id:'sub'+i,email:['alex','sam','jo','pat','kim','lee','max','ria','tess','nina'][i%10]+(i>9?i:'')+'@'+['gmail.com','outlook.com','yahoo.co.uk'][i%3],postcode:pcs[i%5],source:src[i%5],consent:true,created_at:iso(now-(i*0.9+0.2)*D)});
  M.wo=[{trade_email:'vishnuvardhan.kesavarapu@outlook.com',order_ref:'BP-55120',sku:'000737',qty:10,shipped_at:iso(now-12*D),shop_id:'s1'},{trade_email:'vishnuvardhan.kesavarapu@outlook.com',order_ref:'BP-55188',sku:'1012',qty:24,shipped_at:iso(now-6*D),shop_id:'s1'},
   {trade_email:'orders@cornernews.example',order_ref:'BP-54001',sku:'5000',qty:6,shipped_at:iso(now-18*D),shop_id:'s4'},{trade_email:'party@oadby.example',order_ref:'BP-54210',sku:'CD6127',qty:30,shipped_at:iso(now-15*D),shop_id:'s5'},
   {trade_email:'vpo@example.com',order_ref:'BP-55301',sku:'02201',qty:12,shipped_at:iso(now-3*D),shop_id:null},{trade_email:'VPO@example.com',order_ref:'BP-55302',sku:'00428',qty:8,shipped_at:null,shop_id:null},
   {trade_email:'bmnews@example.com',order_ref:'BP-55010',sku:'70-33',qty:4,shipped_at:iso(now-7*D),shop_id:null},{trade_email:'klcrafts@example.com',order_ref:'BP-50002',sku:'1188',qty:20,shipped_at:iso(now-60*D),shop_id:'s8'}];
  M.customers=148}

// =================== data layer ===================
const likeEsc=s=>String(s).replace(/[\\%_]/g,m=>'\\'+m);
const API=MOCK?{
  async session(){const a=Q.get('as');if(a==='none')return null;return{user:{id:'admin',email:a==='other'?'someone@example.com':(ADMINS[0]||'admin@example.com')}}},
  async serverAdmin(){return Q.get('as')!=='other'},
  async signInPassword(e){if(!isAdminEmail(e))throw new Error('This account is not an admin.');return{user:{email:e}}},async signInOtp(){},async signOut(){},
  async shops(){return M.shops.map(s=>({...s}))},async listingStats(){return M.L.map(l=>({shop_id:l.shop_id,active:l.active,stock:l.stock}))},
  async orders(){return M.O},async promos(){return M.promos.map(p=>({...p}))},async subscribers(){return M.subs},async tradeEmails(){return M.wo.map(w=>({trade_email:w.trade_email}))},
  async wholesaleFor(email){return M.wo.filter(w=>w.trade_email.toLowerCase()===String(email||'').toLowerCase())},async stats(){return{customers:M.customers,owners:M.shops.length}},
  async setShopStatus(id,status,reason){Object.assign(M.shops.find(s=>s.id===id),{status,active:status==='approved',status_reason:reason||null,approved_at:status==='approved'?new Date().toISOString():null});return{reasonSaved:true}},
  async savePromo(p){if(p.id)Object.assign(M.promos.find(x=>x.id===p.id),p);else M.promos.unshift({...p,id:'p'+Date.now(),created_at:new Date().toISOString()})},
  async delPromo(id){M.promos=M.promos.filter(p=>p.id!==id)},async upload(f){return URL.createObjectURL(f)},
  async walletRefund(id,amt,why){const o=M.O.find(x=>x.id===id),left=(+o.total||0)-(+o.refunded_to_wallet||0)-(o.wallet_reversed?(+o.wallet_applied||0):0);if(!(amt>0))throw new Error('Refund amount must be more than £0');if(amt>left+1e-9)throw new Error('You can refund at most '+gbp(left)+' on this order');o.refunded_to_wallet=Math.round(((+o.refunded_to_wallet||0)+amt)*100)/100;o.order_events=[...(o.order_events||[]),{status:'refunded_to_wallet',at:new Date().toISOString(),note:gbp(amt)+' refunded to ShopNip wallet'+(why?' · '+why:''),by_role:'admin'}]},
  async setOrderStatus(id,st,note){const o=M.O.find(x=>x.id===id),from=o.status;if(from===st)throw new Error('Order is already '+st);o.status=st;if(note&&DEAD.includes(st))o.reject_reason=note;
    o.order_events=[...(o.order_events||[]),{status:st,at:new Date().toISOString(),note:note||'Changed by ShopNip admin',from_status:from,by_role:'admin'}];return{audited:true}},
  async listingsFor(shop){return M.L.filter(l=>l.shop_id===shop).map(l=>({sku:l.sku,stock:l.stock,retail_price:l.retail_price}))},
  async importedLines(shop){return(M.wil||[]).filter(w=>w.shop_id===shop)},
  async importWholesale(shop,items,upd){M.wil=M.wil||[];let created=0,topped=0,units=0,dup=0;for(const it of items){let n=0;for(const ln of it.lines){if(M.wil.some(w=>w.shop_id===shop&&w.order_ref===ln.order_ref&&w.sku===it.sku)){dup++;continue}M.wil.push({shop_id:shop,order_ref:ln.order_ref,sku:it.sku});n+=ln.qty}
      if(!n)continue;const l=M.L.find(x=>x.shop_id===shop&&x.sku===it.sku);if(l){l.stock+=n;if(upd&&it.retail_price>0)l.retail_price=it.retail_price;topped++}else{M.L.push({id:shop+'w'+M.L.length,shop_id:shop,sku:it.sku,name:it.name,image:it.image,retail_price:it.retail_price,stock:n,active:it.retail_price>0,source:'wholesale'});created++}units+=n}
    return{created,topped_up:topped,units,duplicate_lines:dup}}
}:{
  async session(){return sb?(await sb.auth.getSession()).data.session:null},
  async serverAdmin(){const {data,error}=await sb.rpc('is_admin');if(error)throw error;return data===true},
  async signInPassword(email,password){const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;return data},
  async signInOtp(email){const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});if(error)throw error},
  async signOut(){await sb.auth.signOut()},
  async shops(){const {data,error}=await sb.from('shops').select('*').order('created_at',{ascending:false}).limit(2000);if(error)throw error;return data},
  async listingStats(){const out=[];for(let f=0;f<50000;f+=1000){const {data,error}=await sb.from('shop_listings').select('shop_id,active,stock').range(f,f+999);if(error)throw error;out.push(...data);if(data.length<1000)break}return out},
  async orders(){const {data,error}=await sb.from('orders').select('*,order_items(sku,name,image,unit_price,qty),order_events(status,note,at)').order('created_at',{ascending:false}).limit(1000);if(error)throw error;
    data.forEach(o=>o.order_events?.sort((a,b)=>a.at<b.at?-1:1));return data},
  async promos(){const {data,error}=await sb.from('promotions').select('*').order('priority',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;return data},
  async subscribers(){const {data,error}=await sb.from('subscribers').select('id,email,postcode,source,created_at').order('created_at',{ascending:false}).limit(5000);if(error)throw error;return data},
  async tradeEmails(){const {data,error}=await sb.from('wholesale_orders').select('trade_email').limit(20000);if(error)throw error;return data},
  async wholesaleFor(email){if(!email)return[];const {data,error}=await sb.from('wholesale_orders').select('order_ref,sku,qty,shipped_at,imported_at,shop_id,trade_email').ilike('trade_email',likeEsc(email)).order('imported_at',{ascending:false}).limit(50);if(error)throw error;return data},
  async stats(){const {data,error}=await sb.rpc('admin_stats');if(error)return null;return data},   // provided by migration_006_admin.sql (optional)
  async setShopStatus(id,status,reason){const base={status,active:status==='approved'};
    let {error}=await sb.from('shops').update({...base,status_reason:reason||null}).eq('id',id);
    if(error&&/status_reason/.test(error.message||'')){({error}=await sb.from('shops').update(base).eq('id',id));if(error)throw error;return{reasonSaved:false}}
    if(error)throw error;return{reasonSaved:true}},
  async savePromo(p){const r={...p};delete r.id;const q=p.id?sb.from('promotions').update(r).eq('id',p.id):sb.from('promotions').insert(r);const {error}=await q;if(error)throw error},
  async delPromo(id){const {error}=await sb.from('promotions').delete().eq('id',id);if(error)throw error},
  async upload(f){const ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,''),path=`promos/${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;
    const {error}=await sb.storage.from('shop-media').upload(path,f,{contentType:f.type});if(error)throw error;return sb.storage.from('shop-media').getPublicUrl(path).data.publicUrl},
  // migration_008_admin_orders.sql: admin_set_order_status() (audited, stock-aware). Fallback: plain UPDATE via "orders admin update" policy.
  async walletRefund(id,amt,why){const {error}=await sb.rpc('refund_order_to_wallet',{p_order:id,p_amount:amt,p_reason:why||null});if(error)throw error},
  async setOrderStatus(id,st,note){const {error}=await sb.rpc('admin_set_order_status',{p_order:id,p_status:st,p_note:note||null});if(!error)return{audited:true};
    if(!/admin_set_order_status|function|schema cache/i.test(error.message||''))throw error;
    const patch={status:st,updated_at:new Date().toISOString()};if(note&&DEAD.includes(st))patch.reject_reason=note;
    const {data,error:e2}=await sb.from('orders').update(patch).eq('id',id).select('id');if(e2)throw e2;if(!data?.length)throw new Error('Not allowed: run migration_008_admin_orders.sql');return{audited:false}},
  async listingsFor(shop){const out=[];for(let f=0;f<20000;f+=1000){const {data,error}=await sb.from('shop_listings').select('sku,stock,retail_price').eq('shop_id',shop).range(f,f+999);if(error)throw error;out.push(...data);if(data.length<1000)break}return out},
  async importedLines(shop){const {data,error}=await sb.from('wholesale_import_lines').select('order_ref,sku').eq('shop_id',shop).limit(20000);if(error)return null;return data},   // null = migration 009 not run
  async importWholesale(shop,items,upd){const {data,error}=await sb.rpc('admin_import_wholesale',{p_shop:shop,p_items:items,p_update_prices:!!upd});if(error)throw error;return data}
};

// =================== state ===================
const ST={user:null,ok:false,authMsg:'',authMode:'password',loaded:false,err:{},shops:[],ls:[],orders:[],promos:[],subs:[],trade:new Set(),stats:null,
  imp:null,ui:{ost:null,af:'pending',aq:'',sq:'',sf:'all',oq:'',os:'all',osh:'all',ofu:'all',orng:'30',pq:'',subq:'',drawer:null,promo:null,decide:null,wo:null}};
const PAGES={overview:['Overview','grid'],approvals:['Seller approvals','shield'],shops:['Shops','store'],orders:['All orders','bag'],import:['Import wholesale orders','dl'],promotions:['Promotions & ads','mega'],subscribers:['Subscribers','mail'],settings:['Settings','cog']};
const page=()=>{const h=location.hash.slice(1);return PAGES[h]?h:'overview'};
const shopById=id=>ST.shops.find(s=>s.id===id);
const tradeOK=s=>!!s.bluepark_customer_email&&ST.trade.has(s.bluepark_customer_email.toLowerCase().trim());
async function loadAll(){const run=async(k,fn)=>{try{ST[k]=await fn();delete ST.err[k]}catch(e){ST.err[k]=e.message||String(e);console.warn('load '+k+':',ST.err[k])}};
  await Promise.all([run('shops',API.shops),run('ls',API.listingStats),run('orders',API.orders),run('promos',API.promos),run('subs',API.subscribers),
    run('trade',async()=>new Set((await API.tradeEmails()).map(w=>String(w.trade_email||'').toLowerCase().trim()))),run('stats',API.stats)]);
  if(!(ST.trade instanceof Set))ST.trade=new Set();ST.loaded=true}

// =================== auth ===================
async function boot(){if(MOCK)seed();
  try{const s=await API.session();await setUser(s?.user||null)}catch(e){ST.authMsg=e.message}
  if(sb)sb.auth.onAuthStateChange(async(ev,s)=>{if(ev==='SIGNED_IN'&&!ST.ok)await setUser(s?.user||null);if(ev==='SIGNED_OUT'){ST.user=null;ST.ok=false;render()}});
  addEventListener('hashchange',()=>{ST.ui.drawer=null;document.body.classList.remove('sbo');render();scrollTo(0,0)});render()}
async function setUser(u){ST.user=u;ST.ok=false;if(!u){render();return}
  if(!isAdminEmail(u.email)){await API.signOut();ST.user=null;ST.authMsg=`${u.email} isn’t authorised to use ShopNip Admin. You’ve been signed out.`;
    if(MOCK)ST.authMsg+=' (mock)';render();return}
  let srv=false;try{srv=await API.serverAdmin()}catch(e){console.warn('is_admin check failed',e.message)}
  if(!srv){await API.signOut();ST.user=null;ST.authMsg=`${u.email} is listed in ADMIN_EMAILS but not in the database admins table (is_admin() is false). You’ve been signed out.`;render();return}
  ST.ok=true;render();await loadAll();render()}
function authView(){const m=ST.authMsg,pw=ST.authMode==='password';
  return `<div class="auth"><div class="art"><div><div class="brand"><span class="mark">S</span><span>Shop<b>Nip</b></span><small>Admin</small></div></div>
   <div><h1>Run the ShopNip marketplace.</h1><p>Approve sellers, watch orders across every shop, and manage homepage promotions from one place.</p>
    <div class="feat"><span>${svg('shield')}Seller approvals with wholesale checks</span><span>${svg('bag')}Orders across all shops</span><span>${svg('mega')}Banners, featured shops and sponsored products</span></div></div>
   <div class="fine2" style="font-size:12px;opacity:.6">A NuvonHub product · Restricted area</div><div class="orb"></div></div>
  <div class="pane"><div class="box"><h2>Sign in</h2><p class="sub">Admins only. Use your ShopNip admin email.</p>
   ${m?`<div class="msg ${/sent|Check/.test(m)?'ok':'err'}">${esc(m)}</div>`:''}
   <form id="authf"><label class="fld"><span>Email</span><input type="email" name="email" required autocomplete="username" placeholder="you@nuvonhub.com"></label>
    ${pw?`<label class="fld"><span>Password</span><input type="password" name="password" required autocomplete="current-password" placeholder="••••••••"></label>`:''}
    <button class="btn full" type="submit">${pw?'Sign in':'Email me a sign-in link'}</button></form>
   <div class="or">or</div><button class="btn ghost full" data-a="authmode">${pw?'Email me a magic link instead':'Use a password instead'}</button>
   <div class="fine">${svg('lock')}Access is checked against the admins list and enforced by the database.</div></div></div></div>`}

// =================== layout ===================
const pending=()=>ST.shops.filter(s=>s.status==='pending').length;
function shell(){const p=page(),[title]=PAGES[p],u=ST.user;
  const nav=(k)=>{const [l,i]=PAGES[k];const n=k==='approvals'?pending():0;return `<a href="#${k}" class="${p===k?'on':''}">${svg(i)}${l}${n?`<em>${n}</em>`:''}</a>`};
  return `<div class="L"><aside class="side" id="side"><a class="brand" href="#overview"><span class="mark">S</span><span>Shop<b>Nip</b></span><small>Admin</small></a>
   <nav aria-label="Admin sections"><div class="grp">Marketplace</div>${['overview','approvals','shops','orders','import','partners'].filter(k=>PAGES[k]).map(nav).join('')}<div class="grp">Growth</div>${['promotions','subscribers'].map(nav).join('')}<div class="grp">System</div>${nav('settings')}</nav>
   <div class="me"><span class="av">${esc((u.email||'?')[0].toUpperCase())}</span><div><b>Administrator</b><small>${esc(u.email)}</small></div><button data-a="logout" title="Sign out" aria-label="Sign out">${svg('out')}</button></div></aside>
   <div class="scrim" data-a="menu"></div>
   <div class="main"><header class="top"><button class="ib menu-b" data-a="menu" aria-label="Open menu">${svg('menu')}</button><h1>${esc(title)}</h1>
    <span class="envtag ${MOCK?'':'live'}">${MOCK?'Mock data':'Live · Supabase'}</span><button class="ib" data-a="reload" title="Refresh data" aria-label="Refresh data">${svg('refresh')}</button>
    <a class="ib" href="${esc(PUB)}" target="_blank" rel="noopener" title="Open public site" aria-label="Open public site">${svg('ext')}</a></header>
   <div class="pg">${ST.loaded?V[p]():skel()}</div><div class="foot">ShopNip Admin · ShopNip, a NuvonHub product</div></div></div>${drawer()}${promoModal()}${decideModal()}${ostModal()}`}
const skel=()=>`<div class="kpis">${'<div class="card kpi"><div class="skel" style="height:70px"></div></div>'.repeat(4)}</div><div class="card"><div class="skel" style="height:260px;margin:18px"></div></div>`;
const errBox=k=>ST.err[k]?`<div class="msg err">Could not load ${esc(k)}: ${esc(ST.err[k])}</div>`:'';
function render(){const app=$('#app');if(!ST.user||!ST.ok){document.title='Sign in · ShopNip Admin';app.innerHTML=ST.user&&!ST.ok?'<div class="boot"><span class="mark">S</span></div>':authView();return}
  document.title=PAGES[page()][0]+' · ShopNip Admin';const y=scrollY,a=document.activeElement,id=a?.id,pos=a?.selectionStart;app.innerHTML=shell();
  if(id){const n=document.getElementById(id);if(n&&n.tagName==='INPUT'){n.focus();try{n.setSelectionRange(pos,pos)}catch{}}}scrollTo(0,y)}

// =================== views ===================
const V={};
const day0=(o=0)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-o);return d};
const wk0=()=>{const d=day0();d.setDate(d.getDate()-((d.getDay()+6)%7));return d};
const alive=o=>!DEAD.includes(o.status);
V.overview=()=>{const S=ST.shops,O=ST.orders,by=k=>S.filter(s=>s.status===k).length,t0=+day0(),w0=+wk0(),lw0=w0-7*864e5;
  const today=O.filter(o=>Date.parse(o.created_at)>=t0),week=O.filter(o=>Date.parse(o.created_at)>=w0),sales=week.filter(alive).reduce((a,o)=>a+ +o.total,0),
   lastSales=O.filter(o=>{const t=Date.parse(o.created_at);return t>=lw0&&t<w0&&alive(o)}).reduce((a,o)=>a+ +o.total,0);
  const apr=new Set(S.filter(s=>s.status==='approved'&&s.active).map(s=>s.id)),live=ST.ls.filter(l=>l.active&&apr.has(l.shop_id)).length;
  const cust=ST.stats?.customers,custLbl=cust!=null?'Registered customers':'Customers (ordered)',custV=cust!=null?cust:new Set(O.map(o=>o.customer_id).filter(Boolean)).size;
  const delta=lastSales?Math.round((sales-lastSales)/lastSales*100):null;
  const k=(ic,l,v,s,c='')=>`<div class="card kpi ${c}"><div class="lb"><i>${svg(ic)}</i>${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const days=[...Array(14)].map((_,i)=>{const a=+day0(13-i),b=a+864e5,os=O.filter(o=>{const t=Date.parse(o.created_at);return t>=a&&t<b});return{d:new Date(a),n:os.length,v:os.filter(alive).reduce((x,o)=>x+ +o.total,0)}});
  const top=Object.entries(O.filter(o=>Date.parse(o.created_at)>=Date.now()-30*864e5&&alive(o)).reduce((m,o)=>(m[o.shop_id]=(m[o.shop_id]||0)+ +o.total,m),{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const tot=S.length||1,stc={approved:'#0f766e',pending:'#f59e0b',rejected:'#ef4444',suspended:'#94a3b8'};
  return `${errBox('shops')}${errBox('orders')}<div class="ph"><div><h2>Marketplace overview</h2><p>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · all shops</p></div>
   <div class="acts">${by('pending')?`<a class="btn coral" href="#approvals">${svg('shield')}Review ${by('pending')} pending</a>`:''}<a class="btn ghost" href="#orders">${svg('bag')}All orders</a></div></div>
  <div class="kpis">${k('store','Shops',S.length,`<b style="color:var(--ok)">${by('approved')} approved</b> · ${by('pending')} pending · ${by('rejected')} rejected · ${by('suspended')} suspended`)}
   ${k('bag','Orders today',today.length,`${week.length} this week · ${today.filter(o=>o.status==='placed').length} awaiting shops`,'c')}
   ${k('pound','Sales this week',gbp0(sales),delta==null?'Excl. cancelled & rejected':`<b style="color:${delta>=0?'var(--ok)':'var(--bad)'}">${delta>=0?'▲':'▼'} ${Math.abs(delta)}%</b> vs last week (${gbp0(lastSales)})`)}
   ${k('box','Live listings',live.toLocaleString('en-GB'),`Across ${apr.size} live shops`,'c')}</div>
  <div class="grid2"><div class="card"><div class="hd"><h3>Sales & orders · last 14 days</h3><div class="legend"><span><i style="background:#0f766e"></i>Sales</span><span><i style="background:#ff6b4a"></i>Orders</span></div></div><div class="bd">${chart(days)}</div></div>
   <div class="card"><div class="hd"><h3>Shops by status</h3><a href="#shops" class="mut">View all</a></div><div class="bd"><div class="bars">${['approved','pending','rejected','suspended'].map(s=>`<div class="bar"><span>${SST[s][0]}</span><span class="t"><i style="width:${by(s)/tot*100}%;background:${stc[s]}"></i></span><span class="num">${by(s)}</span></div>`).join('')}</div>
    <div class="sec-t">Audience</div><div class="mini"><div class="r"><span class="lg">${svg('users')}</span><div><b>${custV.toLocaleString('en-GB')}</b><small>${custLbl}</small></div></div><div class="r"><span class="lg">${svg('mail')}</span><div><b>${ST.err.subs?'–':ST.subs.length.toLocaleString('en-GB')}</b><small>Newsletter subscribers</small></div><a class="x mut" href="#subscribers">View</a></div></div></div></div></div>
  <div class="grid2" style="margin-top:16px"><div class="card"><div class="hd"><h3>Latest orders</h3><a href="#orders" class="mut">View all</a></div>${orderTable(O.slice(0,6),true)}</div>
   <div class="card"><div class="hd"><h3>Top shops · 30 days</h3></div><div class="bd mini">${top.map(([id,v])=>{const s=shopById(id);return `<a href="#" data-shop="${esc(id)}"><span class="lg">${esc((s?.name||'?')[0])}</span><div><b>${esc(s?.name||'Unknown shop')}</b><small>${esc(s?.postcode||'')}</small></div><span class="x"><b>${gbp0(v)}</b></span></a>`}).join('')||'<div class="empty">No sales yet</div>'}</div></div></div>`};
function chart(days){const W=640,H=240,P={l:44,r:30,t:12,b:26},iw=W-P.l-P.r,ih=H-P.t-P.b,mx=Math.max(10,...days.map(d=>d.v)),nx=Math.max(4,...days.map(d=>d.n)),bw=iw/days.length;
  const nice=Math.ceil(mx/(mx>500?100:10))*(mx>500?100:10),y=v=>P.t+ih-(v/nice)*ih,yn=n=>P.t+ih-(n/nx)*ih;
  const grid=[0,.25,.5,.75,1].map(f=>`<line x1="${P.l}" x2="${W-P.r}" y1="${y(nice*f)}" y2="${y(nice*f)}" stroke="#efede8"/><text x="${P.l-8}" y="${y(nice*f)+4}" text-anchor="end">£${Math.round(nice*f)}</text>`).join('');
  const bars=days.map((d,i)=>`<rect x="${P.l+i*bw+bw*.18}" y="${y(d.v)}" width="${bw*.64}" height="${Math.max(0,ih-(y(d.v)-P.t))}" rx="5" fill="${i===days.length-1?'#0f766e':'#99d5cd'}"><title>${d.d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}: ${gbp(d.v)}, ${d.n} orders</title></rect>`).join('');
  const pts=days.map((d,i)=>`${P.l+i*bw+bw/2},${yn(d.n)}`).join(' ');
  const lbl=days.map((d,i)=>i%2?'':`<text x="${P.l+i*bw+bw/2}" y="${H-8}" text-anchor="middle">${d.d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Sales and orders for the last 14 days">${grid}${bars}<polyline points="${pts}" fill="none" stroke="#ff6b4a" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${days.map((d,i)=>`<circle cx="${P.l+i*bw+bw/2}" cy="${yn(d.n)}" r="3" fill="#fff" stroke="#ff6b4a" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')}${lbl}</svg>`}

// ---------- approvals ----------
V.approvals=()=>{const f=ST.ui.af,q=ST.ui.aq.toLowerCase(),A=ST.shops.filter(s=>s.status===f&&(!q||[s.name,s.postcode,s.address,s.bluepark_customer_email].join(' ').toLowerCase().includes(q)));
  return `${errBox('shops')}${errBox('trade')}<div class="ph"><div><h2>Seller approvals</h2><p>Check each shop’s wholesale account before it goes live to customers.</p></div></div>
  <div class="tools"><div class="seg" role="tablist">${['pending','approved','rejected','suspended'].map(k=>`<button role="tab" data-af="${k}" class="${f===k?'on':''}">${SST[k][0]}<em>${ST.shops.filter(s=>s.status===k).length}</em></button>`).join('')}</div>
   <label class="srch">${svg('search')}<input id="aq" placeholder="Search name, postcode or email" value="${esc(ST.ui.aq)}"></label></div>
  <div class="card">${A.length?`<div class="tw"><table class="t resp"><thead><tr><th>Shop</th><th>Wholesale email</th><th>Wholesale orders</th><th>Registered</th><th>Status</th><th></th></tr></thead><tbody>${A.map(s=>`<tr class="click" data-shop="${esc(s.id)}">
   <td class="first"><div class="sh"><span class="lg">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span><div><b>${esc(s.name)}</b><div class="mut">${esc([s.address,s.postcode].filter(Boolean).join(', '))}</div></div></div></td>
   <td data-l="Wholesale email" class="mut">${esc(s.bluepark_customer_email||'–')}</td>
   <td data-l="Wholesale orders">${ST.err.trade?'<span class="chip">Unknown</span>':tradeOK(s)?`<span class="chip ok">${svg('check')}Found</span>`:`<span class="chip no">${svg('alert')}Not found</span>`}</td>
   <td data-l="Registered" class="mut nowrap">${s.created_at?ago(s.created_at):'–'}</td><td data-l="Status">${pill(SST,s.status)}</td>
   <td class="full"><div class="racts">${actBtns(s,true)}</div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${svg('shield')}<b>No ${SST[f][0].toLowerCase()} shops</b>${q?'Try a different search.':f==='pending'?'You’re all caught up.':''}</div>`}</div>`};
function actBtns(s,sm){const c=sm?'btn sm':'btn',id=esc(s.id);
  return [s.status!=='approved'?`<button class="${c}" data-dec="approved" data-id="${id}">${svg('check')}Approve</button>`:'',
   s.status==='pending'?`<button class="${c} ghost danger" data-dec="rejected" data-id="${id}">Reject</button>`:'',
   s.status==='approved'?`<button class="${c} ghost danger" data-dec="suspended" data-id="${id}">Suspend</button>`:''].join('')}

// ---------- shops ----------
V.shops=()=>{const q=ST.ui.sq.toLowerCase(),f=ST.ui.sf,cnt={},oc={},sl={},m30=Date.now()-30*864e5;
  ST.ls.forEach(l=>{if(l.active)cnt[l.shop_id]=(cnt[l.shop_id]||0)+1});ST.orders.forEach(o=>{oc[o.shop_id]=(oc[o.shop_id]||0)+1;if(alive(o)&&Date.parse(o.created_at)>=m30)sl[o.shop_id]=(sl[o.shop_id]||0)+ +o.total});
  const A=ST.shops.filter(s=>(f==='all'||s.status===f)&&(!q||[s.name,s.postcode,s.address,s.bluepark_customer_email].join(' ').toLowerCase().includes(q)));
  return `${errBox('shops')}<div class="ph"><div><h2>Shops</h2><p>${ST.shops.length} shops on ShopNip.</p></div><div class="acts"><button class="btn ghost" data-a="csv-shops">${svg('dl')}Export CSV</button></div></div>
  <div class="tools"><select class="sel" id="sf" aria-label="Status">${['all','approved','pending','rejected','suspended'].map(k=>`<option value="${k}" ${f===k?'selected':''}>${k==='all'?'All statuses':SST[k][0]}</option>`).join('')}</select>
   <label class="srch">${svg('search')}<input id="sq" placeholder="Search shops" value="${esc(ST.ui.sq)}"></label></div>
  <div class="card">${A.length?`<div class="tw"><table class="t resp"><thead><tr><th>Shop</th><th>Status</th><th class="num">Live listings</th><th class="num">Orders</th><th class="num">Sales 30d</th><th>Delivery</th><th>Joined</th></tr></thead><tbody>${A.map(s=>{const d=s.delivery_options||{};return `<tr class="click" data-shop="${esc(s.id)}">
   <td class="first"><div class="sh"><span class="lg">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span><div><b>${esc(s.name)}</b><div class="mut">${esc(s.postcode||'')} · ${esc(s.bluepark_customer_email||'no wholesale email')}</div></div></div></td>
   <td data-l="Status">${pill(SST,s.status)}</td><td data-l="Live listings" class="num">${cnt[s.id]||0}</td><td data-l="Orders" class="num">${oc[s.id]||0}</td><td data-l="Sales 30d" class="num">${gbp0(sl[s.id]||0)}</td>
   <td data-l="Delivery" class="mut">${d.collect!==false?'Collect':''}${d.delivery?(d.collect!==false?' + ':'')+'Delivery '+(d.delivery_radius_miles||0)+' mi':''}</td><td data-l="Joined" class="mut nowrap">${fmtD(s.created_at)}</td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">${svg('store')}<b>No shops found</b></div>`}</div>`};

// ---------- orders ----------
function filteredOrders(){const u=ST.ui,q=u.oq.toLowerCase(),from=u.orng==='all'?0:u.orng==='today'?+day0():Date.now()-(+u.orng)*864e5;
  return ST.orders.filter(o=>(u.os==='all'||(u.os==='open'?['placed','accepted','ready','out_for_delivery'].includes(o.status):o.status===u.os))&&(u.osh==='all'||o.shop_id===u.osh)&&(u.ofu==='all'||o.fulfilment===u.ofu)&&Date.parse(o.created_at)>=from
   &&(!q||[o.order_number,o.customer_name,o.customer_email,o.customer_phone,o.delivery_postcode,shopById(o.shop_id)?.name].join(' ').toLowerCase().includes(q)))}
function orderTable(O,compact){if(!O.length)return `<div class="empty">${svg('bag')}<b>No orders</b>${compact?'':'Try different filters.'}</div>`;
  return `<div class="tw"><table class="t resp"><thead><tr><th>Order</th>${compact?'':'<th>Shop</th>'}<th>Customer</th>${compact?'':'<th>Fulfilment</th>'}<th>Status</th><th class="num">Total</th><th>Placed</th></tr></thead><tbody>${O.map(o=>`<tr class="click" data-order="${esc(o.id)}">
   <td class="first"><b>${esc(o.order_number||'#'+String(o.id).slice(0,6))}</b>${compact?`<div class="mut">${esc(shopById(o.shop_id)?.name||'')}</div>`:''}</td>${compact?'':`<td data-l="Shop">${esc(shopById(o.shop_id)?.name||'–')}</td>`}
   <td data-l="Customer">${esc(o.customer_name||'–')}</td>${compact?'':`<td data-l="Fulfilment" class="mut">${o.fulfilment==='delivery'?'Delivery':'Collect'}</td>`}<td data-l="Status">${pill(OST,o.status)}</td>
   <td data-l="Total" class="num"><b>${gbp(o.total)}</b></td><td data-l="Placed" class="mut nowrap">${fmtDT(o.created_at)}</td></tr>`).join('')}</tbody></table></div>`}
V.orders=()=>{const u=ST.ui,O=filteredOrders(),tot=O.filter(alive).reduce((a,o)=>a+ +o.total,0),opt=(id,v,list)=>`<select class="sel" id="${id}">${list.map(([k,l])=>`<option value="${esc(k)}" ${v===k?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  return `${errBox('orders')}<div class="ph"><div><h2>All orders</h2><p>${O.length} orders · ${gbp(tot)} excluding cancelled and rejected.</p></div><div class="acts"><button class="btn ghost" data-a="csv-orders">${svg('dl')}Export CSV</button></div></div>
  <div class="tools">${opt('orng',u.orng,[['today','Today'],['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['all','All time']])}
   ${opt('os',u.os,[['all','All statuses'],['open','Open'],...Object.entries(OST).map(([k,[l]])=>[k,l])])}
   ${opt('osh',u.osh,[['all','All shops'],...ST.shops.map(s=>[s.id,s.name])])}${opt('ofu',u.ofu,[['all','Collect & delivery'],['collect','Collect'],['delivery','Delivery']])}
   <label class="srch">${svg('search')}<input id="oq" placeholder="Order no., customer, postcode" value="${esc(u.oq)}"></label></div>
  <div class="card">${orderTable(O.slice(0,300))}${O.length>300?'<div class="mut" style="padding:12px 16px">Showing the first 300. Narrow the filters or export CSV.</div>':''}</div>`};

// ---------- promotions ----------
V.promotions=()=>{const q=ST.ui.pq.toLowerCase(),P=ST.promos.filter(p=>!q||[p.title,p.subtitle,p.type,p.sku].join(' ').toLowerCase().includes(q)),live=ST.promos.filter(p=>pState(p)[0]==='Live').length;
  return `${ST.err.promos?`<div class="msg err">${/relation|promotions/.test(ST.err.promos)?'Run migration_004_promos.sql to enable promotions.':esc(ST.err.promos)}</div>`:''}
  <div class="ph"><div><h2>Promotions & ads</h2><p>Hero and mid-page banners, featured shops, sponsored products and deal tiles on the public homepage. ${live} live now.</p></div>
   <div class="acts"><button class="btn coral" data-a="newpromo">${svg('plus')}New promotion</button></div></div>
  <div class="tools"><label class="srch">${svg('search')}<input id="pq" placeholder="Search promotions" value="${esc(ST.ui.pq)}"></label></div>
  <div class="card">${P.length?`<div class="tw"><table class="t resp"><thead><tr><th>Promotion</th><th>Type</th><th>Schedule</th><th class="num">Priority</th><th>Status</th><th></th></tr></thead><tbody>${P.map(p=>{const s=pState(p);return `<tr class="click" data-pe="${esc(p.id)}">
   <td class="first"><div class="sh"><span class="pthumb th-${esc(p.theme||'teal')}" ${p.image?`style="background-image:url('${esc(p.image)}')"`:''}></span><div><b>${esc(p.title)}</b><div class="mut">${esc(p.subtitle||(p.sku?'SKU '+p.sku:''))}</div></div></div></td>
   <td data-l="Type" class="mut">${PT[p.type]||esc(p.type)}${p.type==='banner'?' · '+(p.placement==='mid'?'mid-page':'hero'):''}${p.shop_id?' · '+esc(shopById(p.shop_id)?.name||''):''}</td>
   <td data-l="Schedule" class="mut nowrap">${p.start_at?fmtD(p.start_at):'Now'} → ${p.end_at?fmtD(p.end_at):'no end'}</td><td data-l="Priority" class="num">${+p.priority||0}</td>
   <td data-l="Status"><span class="pill ${s[1]}">${s[0]}</span></td><td class="full"><div class="racts"><button class="btn ghost sm" data-pe="${esc(p.id)}">Edit</button><button class="btn ghost sm danger" data-pd="${esc(p.id)}">Delete</button></div></td></tr>`}).join('')}</tbody></table></div>`
   :`<div class="empty">${svg('mega')}<b>No promotions</b>House promos are showing on the homepage. Create a banner to replace them.</div>`}</div>`};
const dtl=v=>{if(!v)return '';const d=new Date(v);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)};
function promoModal(){const p=ST.ui.promo;if(!p)return '';const v=k=>esc(p[k]??''),appr=ST.shops.filter(s=>s.status==='approved');
  return `<div class="mod" role="dialog" aria-modal="true" aria-label="Promotion"><div class="ov" data-a="close"></div><div class="box" style="z-index:71"><div class="dh"><h3>${p.id?'Edit promotion':'New promotion'}</h3><button class="ib" data-a="close" aria-label="Close">${svg('x')}</button></div>
  <form id="promof" style="display:contents"><div class="db">
   <div class="row2"><label class="fld"><span>Type</span><select name="type">${Object.entries(PT).map(([k,l])=>`<option value="${k}" ${p.type===k?'selected':''}>${l}</option>`).join('')}</select></label>
    <label class="fld"><span>Placement (banners)</span><select name="placement"><option value="hero" ${p.placement!=='mid'?'selected':''}>Hero carousel</option><option value="mid" ${p.placement==='mid'?'selected':''}>Mid-page banner</option></select></label></div>
   <label class="fld"><span>Title</span><input name="title" required maxlength="120" value="${v('title')}"></label>
   <label class="fld"><span>Subtitle</span><input name="subtitle" maxlength="200" value="${v('subtitle')}"></label>
   <div class="row2"><label class="fld"><span>Button label</span><input name="cta" maxlength="40" value="${v('cta')}" placeholder="Shop now"></label><label class="fld"><span>Link (#sell, #shop=&lt;id&gt;, sec:N, q:term or https://…)</span><input name="link" value="${v('link')}"></label></div>
   <div class="row2"><label class="fld"><span>Shop (featured shop / sponsored)</span><select name="shop_id"><option value="">None</option>${appr.map(s=>`<option value="${esc(s.id)}" ${p.shop_id===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>
    <label class="fld"><span>SKU (sponsored / deal)</span><input name="sku" value="${v('sku')}"></label></div>
   <div class="row2"><label class="fld"><span>Theme</span><select name="theme">${THEMES.map(k=>`<option ${(p.theme||'teal')===k?'selected':''}>${k}</option>`).join('')}</select></label><label class="fld"><span>Priority (higher first)</span><input type="number" name="priority" value="${+p.priority||0}"></label></div>
   <div class="row2"><label class="fld"><span>Starts</span><input type="datetime-local" name="start_at" value="${dtl(p.start_at)}"></label><label class="fld"><span>Ends (optional)</span><input type="datetime-local" name="end_at" value="${dtl(p.end_at)}"></label></div>
   <label class="fld"><span>Image URL</span><input name="image" value="${v('image')}" placeholder="https://…"></label>
   <label class="fld"><span>…or upload (to shop-media/promos, max 5 MB)</span><div class="imgpv"><span class="pthumb th-${esc(p.theme||'teal')}" ${p.image?`style="background-image:url('${esc(p.image)}')"`:''}></span><input type="file" name="file" accept="image/*"></div></label>
   <label class="sw"><input type="checkbox" name="active" ${p.active!==false?'checked':''}>Active</label></div>
   <div class="df">${p.id?`<button class="btn ghost danger" type="button" data-pd="${esc(p.id)}" style="margin-right:auto">Delete</button>`:''}<button class="btn ghost" type="button" data-a="close">Cancel</button><button class="btn" type="submit" ${ST.ui.busy?'disabled':''}>${ST.ui.busy?'Saving…':'Save promotion'}</button></div></form></div></div>`}

// ---------- subscribers ----------
V.subscribers=()=>{if(ST.err.subs)return `<div class="ph"><div><h2>Subscribers</h2></div></div><div class="msg err">${esc(ST.err.subs)}</div><div class="card ph-card"><p class="mut">Subscribers are readable only by admins (policy “subscribers admin read” in migration_004_promos.sql). Check that migration ran and that your email is in the admins table.</p></div>`;
  const q=ST.ui.subq.toLowerCase(),A=ST.subs.filter(s=>!q||[s.email,s.postcode,s.source].join(' ').toLowerCase().includes(q)),w=ST.subs.filter(s=>Date.parse(s.created_at)>=Date.now()-7*864e5).length;
  const src=Object.entries(ST.subs.reduce((m,s)=>(m[s.source||'unknown']=(m[s.source||'unknown']||0)+1,m),{})).sort((a,b)=>b[1]-a[1]);
  return `<div class="ph"><div><h2>Subscribers</h2><p>Newsletter sign-ups from the public site. Consent is required to subscribe.</p></div><div class="acts"><button class="btn ghost" data-a="csv-subs">${svg('dl')}Export CSV</button></div></div>
  <div class="kpis"><div class="card kpi"><div class="lb"><i>${svg('mail')}</i>Total</div><div class="v">${ST.subs.length}</div><div class="s">All time</div></div><div class="card kpi c"><div class="lb"><i>${svg('plus')}</i>Last 7 days</div><div class="v">${w}</div><div class="s">New sign-ups</div></div>
   <div class="card kpi" style="grid-column:span 2"><div class="lb"><i>${svg('grid')}</i>By source</div><div class="s" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">${src.map(([k,n])=>`<span class="chip">${esc(k)} · ${n}</span>`).join('')||'–'}</div></div></div>
  <div class="tools"><label class="srch">${svg('search')}<input id="subq" placeholder="Search email or postcode" value="${esc(ST.ui.subq)}"></label></div>
  <div class="card">${A.length?`<div class="tw"><table class="t resp"><thead><tr><th>Email</th><th>Postcode</th><th>Source</th><th>Subscribed</th></tr></thead><tbody>${A.slice(0,500).map(s=>`<tr><td class="first"><b>${esc(s.email)}</b></td><td data-l="Postcode" class="mut">${esc(s.postcode||'–')}</td><td data-l="Source"><span class="chip">${esc(s.source||'–')}</span></td><td data-l="Subscribed" class="mut nowrap">${fmtDT(s.created_at)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${svg('mail')}<b>No subscribers yet</b></div>`}</div>`};

// ---------- settings (placeholder) ----------
V.settings=()=>`<div class="ph"><div><h2>Settings</h2><p>Marketplace configuration. More controls are coming.</p></div></div>
  <div class="setg"><div class="card ph-card"><h3>Admin access</h3><p class="mut">Admins are the emails in this site’s <code>config.js</code> (ADMIN_EMAILS) <b>and</b> the <code>admins</code> table in Supabase. The database check is what protects data.</p><div class="mini">${ADMINS.map(e=>`<div class="r"><span class="lg">${esc(e[0].toUpperCase())}</span><div><b>${esc(e)}</b><small>Administrator</small></div></div>`).join('')}</div></div>
   <div class="card ph-card"><h3>Environment</h3><dl class="kv"><dt>Mode</dt><dd>${MOCK?'Mock data (in memory)':'Live'}</dd><dt>Supabase project</dt><dd>${esc((CFG.SUPABASE_URL||'').replace(/^https:\/\/|\.supabase\.co$/g,''))}</dd><dt>Public site</dt><dd><a href="${esc(PUB)}" target="_blank" rel="noopener">${esc(PUB.replace(/^https:\/\//,''))}</a></dd><dt>Customer count</dt><dd>${ST.stats?'admin_stats() available':'Needs migration_006_admin.sql'}</dd></dl></div>
   <div class="card ph-card"><h3>Commission & fees</h3><p class="mut">Selling and monthly fees are set on <a href="#partners">Partners &amp; fees</a>.</p></div>
   <div class="card ph-card"><h3>Notifications</h3><p class="mut">Email alerts for new seller registrations and daily order digests.</p><span class="chip">Coming soon</span></div></div>`;

// ---------- shop drawer / order drawer ----------
function drawer(){const d=ST.ui.drawer;if(!d)return '';
  if(d.type==='order'){const o=ST.orders.find(x=>x.id===d.id);if(!o)return '';const s=shopById(o.shop_id);
    return `<div class="ov" data-a="close"></div><aside class="dr" role="dialog" aria-modal="true" aria-label="Order"><div class="dh"><h3>Order ${esc(o.order_number||'')}</h3>${pill(OST,o.status)}<button class="ib" data-a="close" aria-label="Close">${svg('x')}</button></div><div class="db">
     <dl class="kv"><dt>Shop</dt><dd><a href="#" data-shop="${esc(o.shop_id)}">${esc(s?.name||'–')}</a></dd><dt>Placed</dt><dd>${fmtDT(o.created_at)}</dd><dt>Customer</dt><dd>${esc(o.customer_name||'–')}<br><span class="mut">${esc(o.customer_email||'')} ${esc(o.customer_phone||'')}</span></dd>
      <dt>Fulfilment</dt><dd>${o.fulfilment==='delivery'?'Delivery to '+esc([o.delivery_address,o.delivery_postcode].filter(Boolean).join(', ')):'Click & collect'}</dd>${o.fulfilment==='collect'?`<dt>Collection PIN</dt><dd><b style="letter-spacing:.06em">${esc(o.collection_pin||'–')}</b></dd>`:''}<dt>Payment</dt><dd>${o.payment_method==='pay_on_delivery'?'Pay on delivery':'Pay on collection'}</dd>
      ${o.note?`<dt>Note</dt><dd>${esc(o.note)}</dd>`:''}${o.reject_reason?`<dt>Reason</dt><dd>${esc(o.reject_reason)}</dd>`:''}</dl>
     <div class="sec-t">Items</div><div class="items">${(o.order_items||[]).map(i=>`<div>${i.image?`<img src="${esc(i.image)}" alt="" loading="lazy">`:'<img alt="">'}<span>${esc(i.name)}<br><small class="mut">${i.qty} × ${gbp(i.unit_price)}</small></span><b>${gbp(i.qty*i.unit_price)}</b></div>`).join('')}</div>
     <dl class="kv" style="margin-top:16px"><dt>Subtotal</dt><dd>${gbp(o.subtotal)}</dd><dt>Delivery</dt><dd>${gbp(o.delivery_fee)}</dd><dt>Total</dt><dd><b>${gbp(o.total)}</b></dd></dl>
     <div class="sec-t">Refund to ShopNip wallet (admin)</div>${`<div class="wrefc"><div class="cb">${(()=>{const left=Math.max(0,Math.round(((+o.total||0)-(+o.refunded_to_wallet||0)-(o.wallet_reversed?(+o.wallet_applied||0):0))*100)/100);
     return `${+o.wallet_applied?`<div class="kv"><span>Paid from customer wallet${o.wallet_reversed?' (returned)':''}</span><span>${gbp(o.wallet_applied)}</span></div>`:''}${+o.refunded_to_wallet?`<div class="kv"><span>Already refunded to wallet</span><b style="color:#15803d">${gbp(o.refunded_to_wallet)}</b></div>`:''}
     ${o.status==='placed'?'<p class="mut" style="margin:0;font-size:13px">Accept or reject the order first. Refunds are for accepted, completed or cancelled orders.</p>':left>0?`<p class="mut" style="margin:0 0 8px;font-size:13px">Refunds are paid as ShopNip wallet credit the customer spends on ShopNip, never back to a card.</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="mi"><i>£</i><input id="wr_amt" type="number" step="0.01" min="0.01" max="${left}" value="${left.toFixed(2)}" aria-label="Refund amount"></span><input id="wr_why" class="inp" maxlength="200" placeholder="Reason (shown to customer)" style="flex:1;min-width:160px;padding:9px 10px;border:1px solid #d7dde4;border-radius:10px;font:inherit">
     <button class="btn sm" data-a="wref" data-id="${esc(o.id)}">Refund to wallet</button></div><small class="mut">Up to ${gbp(left)}</small>`:'<p class="mut" style="margin:0;font-size:13px">Fully refunded.</p>'}`})()}</div></div>`}
     <div class="sec-t">Timeline</div><div class="tl">${(o.order_events||[]).map(e=>`<div><i></i><b>${esc((OST[e.status]||[e.status])[0])}${e.by_role==='admin'?' <span class="chip">Admin</span>':''}</b><span class="mut">${fmtDT(e.at)}${e.note?' · '+esc(e.note):''}</span></div>`).join('')||'<span class="mut">No events</span>'}</div>
     <div class="sec-t">Change status (admin)</div><div class="ostbox"><select class="sel" id="ostsel" aria-label="New status">${Object.entries(OST).map(([k,[l]])=>`<option value="${k}" ${k===o.status?'disabled':''} ${k===(ST.ui.ostPick||'')?'selected':''}>${esc(l)}${k===o.status?' (current)':''}</option>`).join('')}</select>
      <button class="btn sm" data-a="ostgo" data-id="${esc(o.id)}">Change status…</button></div>
     <p class="mut" style="margin-top:8px;font-size:12.5px">Shops normally move orders along themselves. Use this to fix a stuck or disputed order; the change and reason are logged on the timeline${DEAD.includes(o.status)?'. Re-opening a cancelled/rejected order takes its items out of stock again':'. Cancelling or rejecting returns the items to stock'}.</p></div></aside>`}
  const s=shopById(d.id);if(!s)return '';const del=s.delivery_options||{},wo=ST.ui.wo,ls=ST.ls.filter(l=>l.shop_id===s.id),os=ST.orders.filter(o=>o.shop_id===s.id);
  const chk=wo==null?`<div class="check na">${svg('clock')}<div><b>Checking wholesale orders…</b></div></div>`:wo.error?`<div class="check na">${svg('info')}<div><b>Could not check wholesale orders</b><small>${esc(wo.error)}</small></div></div>`
   :!s.bluepark_customer_email?`<div class="check no">${svg('alert')}<div><b>No wholesale email on this shop</b><small>The shop can’t be matched to wholesale orders.</small></div></div>`
   :wo.rows.length?`<div class="check ok">${svg('check')}<div><b>Wholesale email found in wholesale_orders</b><small>${wo.rows.length} order line${wo.rows.length>1?'s':''} · ${new Set(wo.rows.map(r=>r.order_ref)).size} orders · last ${fmtD(wo.rows.map(r=>r.shipped_at||r.imported_at).filter(Boolean).sort().pop())}${wo.rows.some(r=>!r.shop_id)?' · some lines not yet linked to a shop':''}</small></div></div>`
   :`<div class="check no">${svg('alert')}<div><b>Wholesale email not found in wholesale_orders</b><small>${esc(s.bluepark_customer_email)} has no imported wholesale orders. Confirm the account before approving.</small></div></div>`;
  return `<div class="ov" data-a="close"></div><aside class="dr" role="dialog" aria-modal="true" aria-label="Shop details"><div class="dh"><div class="sh" style="flex:1;min-width:0"><span class="lg">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span><div style="min-width:0"><h3>${esc(s.name)}</h3><span class="mut">${esc(s.postcode||'')}</span></div></div>${pill(SST,s.status)}<button class="ib" data-a="close" aria-label="Close">${svg('x')}</button></div>
   <div class="db"><div class="sec-t" style="margin-top:0">Wholesale check</div>${chk}
    <div class="sec-t">Details</div><dl class="kv"><dt>Wholesale email</dt><dd>${esc(s.bluepark_customer_email||'–')}</dd><dt>Address</dt><dd>${esc([s.address,s.postcode].filter(Boolean).join(', ')||'–')}</dd><dt>Phone</dt><dd>${esc(s.phone||'–')}</dd>
     <dt>Opening hours</dt><dd style="white-space:pre-line">${esc(s.opening_hours||'–')}</dd><dt>Fulfilment</dt><dd>${del.collect!==false?'Click & collect':''}${del.delivery?`${del.collect!==false?' · ':''}Delivery within ${del.delivery_radius_miles||0} mi, ${gbp(del.delivery_fee||0)}`:''}</dd>
     <dt>Registered</dt><dd>${fmtDT(s.created_at)}</dd>${s.approved_at?`<dt>Approved</dt><dd>${fmtDT(s.approved_at)}</dd>`:''}${s.status_reason?`<dt>Status reason</dt><dd>${esc(s.status_reason)}</dd>`:''}
     <dt>Listings</dt><dd>${ls.filter(l=>l.active).length} live of ${ls.length}</dd><dt>Orders</dt><dd>${os.length} · ${gbp(os.filter(alive).reduce((a,o)=>a+ +o.total,0))}</dd><dt>Shop ID</dt><dd class="mut">${esc(s.id)}</dd></dl>
    ${wo&&wo.rows&&wo.rows.length?`<div class="sec-t">Recent wholesale lines</div><div class="tw"><table class="t"><thead><tr><th>Ref</th><th>SKU</th><th class="num">Qty</th><th>Shipped</th></tr></thead><tbody>${wo.rows.slice(0,6).map(r=>`<tr><td>${esc(r.order_ref||'–')}</td><td class="mut">${esc(r.sku)}</td><td class="num">${r.qty}</td><td class="mut">${r.shipped_at?fmtD(r.shipped_at):'Not shipped'}</td></tr>`).join('')}</tbody></table></div>`:''}</div>
   <div class="df">${s.status==='approved'?`<a class="btn ghost" style="margin-right:auto" href="${esc(PUB)}/#shop=${esc(s.id)}" target="_blank" rel="noopener">${svg('ext')}View public page</a>`:''}${actBtns(s,false)}</div></aside>`}
async function openShop(id){ST.ui.drawer={type:'shop',id};ST.ui.wo=null;render();const s=shopById(id);
  try{const rows=await API.wholesaleFor(s?.bluepark_customer_email);ST.ui.wo={rows}}catch(e){ST.ui.wo={error:e.message}}if(ST.ui.drawer?.id===id)render()}

// ---------- approve / reject / suspend with reason ----------
function decideModal(){const d=ST.ui.decide;if(!d)return '';const s=shopById(d.id);if(!s)return '';const L={approved:['Approve','btn'],rejected:['Reject','btn danger'],suspended:['Suspend','btn warn']}[d.status];
  const tip={approved:'The shop becomes visible to customers and can take orders.',rejected:'The shop stays hidden. The owner sees that it wasn’t approved.',suspended:'The shop and its listings are hidden from customers immediately.'}[d.status];
  return `<div class="mod" role="dialog" aria-modal="true" aria-label="${L[0]} shop"><div class="ov" data-a="nodecide"></div><div class="box" style="z-index:71;width:min(480px,100%)"><div class="dh"><h3>${L[0]} ${esc(s.name)}?</h3><button class="ib" data-a="nodecide" aria-label="Close">${svg('x')}</button></div>
   <form id="decf" style="display:contents"><div class="db"><p class="mut" style="margin-top:0">${tip}</p>${d.status==='approved'&&!tradeOK(s)&&!ST.err.trade?`<div class="msg info">This shop’s wholesale email was not found in wholesale_orders.</div>`:''}
    <label class="fld"><span>Reason ${d.status==='approved'?'(optional)':'(required)'}</span><textarea name="reason" maxlength="300" ${d.status==='approved'?'':'required'} placeholder="${d.status==='approved'?'e.g. Verified trade account':'e.g. Wholesale account could not be verified'}"></textarea></label></div>
   <div class="df"><button class="btn ghost" type="button" data-a="nodecide">Cancel</button><button class="${L[1]}" type="submit">${L[0]} shop</button></div></form></div></div>`}

// ---------- admin order status change (confirm + optional reason) ----------
function ostModal(){const d=ST.ui.ost;if(!d)return '';const o=ST.orders.find(x=>x.id===d.id);if(!o)return '';const dead=DEAD.includes(d.status),back=DEAD.includes(o.status)&&!dead;
  return `<div class="mod" role="dialog" aria-modal="true" aria-label="Change order status"><div class="ov" data-a="noost"></div><div class="box" style="z-index:71;width:min(480px,100%)"><div class="dh"><h3>Change ${esc(o.order_number||'order')} status?</h3><button class="ib" data-a="noost" aria-label="Close">${svg('x')}</button></div>
   <form id="ostf" style="display:contents"><div class="db"><div class="ostflow">${pill(OST,o.status)}<span class="mut">→</span>${pill(OST,d.status)}</div>
    <p class="mut">${esc(shopById(o.shop_id)?.name||'')} · ${esc(o.customer_name||'')} · ${gbp(o.total)}</p>
    ${dead?`<div class="msg info">The items go back into the shop’s stock. The customer sees the order as ${esc(OST[d.status][0].toLowerCase())}.</div>`:''}${back?`<div class="msg info">This re-opens the order and takes its items out of stock again.</div>`:''}
    <label class="fld"><span>Reason (optional, shown on the order timeline)</span><textarea name="reason" maxlength="300" placeholder="e.g. Customer called to cancel; shop confirmed by phone"></textarea></label></div>
   <div class="df"><button class="btn ghost" type="button" data-a="noost">Cancel</button><button class="btn ${dead?'danger':''}" type="submit" ${ST.ui.busy?'disabled':''}>${ST.ui.busy?'Saving…':'Confirm change'}</button></div></form></div></div>`}

// ---------- import wholesale orders (CSV → listings) ----------
const NBI=window.NBImport;
let CAT=null;async function catalog(){if(CAT)return CAT;CAT=new Map();try{const u=CFG.CATALOG_URL||(MOCK?'../app/products.json':PUB+'/products.json');const r=await fetch(u);if(r.ok)(await r.json()).forEach(p=>{let im=p.images;if(typeof im==='string')try{im=JSON.parse(im.replace(/'/g,'"'))}catch{im=[]}CAT.set(String(p.sku),{name:p.name,image:(im||[])[0]||'',category:p.category})})}catch(e){console.warn('catalog',e.message)}return CAT}
const impShops=()=>ST.shops.filter(s=>s.status!=='rejected');
async function impLoad(text,fname){const rows=NBI.parseCSV(text),inc=ST.imp?.inc||['completed'],plan=NBI.buildPlan(rows,{statuses:inc});
  ST.imp={step:plan.error?'upload':'preview',fname,rows,plan,inc,markup:ST.imp?.markup||1.5,upd:false,err:plan.error||'',open:null,ctx:{},done:{}};
  if(plan.error){render();return}const cat=await catalog();
  plan.customers.forEach(c=>{const m=NBI.matchShop(c,impShops());c.shop_id=m.shop_id;c.by=m.by;c.cands=m.candidates||[];
    c.items.forEach(it=>{const k=cat.get(it.sku);if(k){if(!it.image)it.image=k.image;if(!it.category)it.category=k.category}it.include=true;it.retail=NBI.suggestRetail(it.wholesale,ST.imp.markup)})});
  plan.customers.sort((a,b)=>(!!b.shop_id-!!a.shop_id)||b.items.length-a.items.length);ST.imp.open=plan.customers[0]?.key||null;
  render();await Promise.all([...new Set(plan.customers.map(c=>c.shop_id).filter(Boolean))].map(impCtx));render()}
async function impCtx(shop){if(!shop||ST.imp.ctx[shop])return;try{const [ls,wl]=await Promise.all([API.listingsFor(shop),API.importedLines(shop)]);
  ST.imp.ctx[shop]={ls:new Map(ls.map(l=>[l.sku,l])),done:wl?new Set(wl.map(w=>w.order_ref+'|'+w.sku)):null}}catch(e){ST.imp.ctx[shop]={err:e.message,ls:new Map(),done:null}}}
const itState=(c,it)=>{const x=c.shop_id&&ST.imp.ctx[c.shop_id];if(!x)return{k:'?',q:it.qty};const nl=x.done?it.lines.filter(l=>!x.done.has(l.order_ref+'|'+it.sku)):it.lines,q=nl.reduce((a,l)=>a+l.qty,0),ex=x.ls.get(it.sku);
  return q===0?{k:'dup',q:0,ex}:ex?{k:'top',q,ex}:{k:'new',q}};
V.import=()=>{const I=ST.imp;
  const intro=`<div class="ph"><div><h2>Import wholesale orders</h2><p>Upload a Bluepark orders CSV. Each customer is matched to a ShopNip shop and their ordered products become (or top up) that shop’s listings.</p></div>
   ${I&&I.step!=='upload'?`<div class="acts"><button class="btn ghost" data-a="impreset">Start again</button></div>`:''}</div>`;
  if(!I||I.step==='upload')return `${intro}${I?.err?`<div class="msg err">${esc(I.err)}</div>`:''}<div class="card ph-card imp-drop"><span class="lg">${svg('dl')}</span><h3>Choose a CSV export</h3>
    <p class="mut">Bluepark → Orders → Export (one row per product line). The file is read in this browser only; customer names and addresses are never uploaded. Only SKU, title, price and quantity reach ShopNip, for the shops you confirm.</p>
    <label class="btn">${svg('plus')}Choose CSV file<input type="file" id="impfile" accept=".csv,text/csv" hidden></label>${MOCK?` <button class="btn ghost" data-a="impsample">Load sample CSV (mock)</button>`:''}
    <div class="sec-t">Columns used</div><p class="mut" style="font-size:12.5px">${NBI.REQUIRED.map(k=>`<code>${esc(NBI.COLS[k][0])}</code>`).join(' ')} (required) · ${['status','postcode','dpostcode','title','variant','image','category','company'].map(k=>`<code>${esc(NBI.COLS[k][0])}</code>`).join(' ')} (optional)</p></div>`;
  const P=I.plan,C=P.customers,matched=C.filter(c=>c.shop_id),cur=C.find(c=>c.key===I.open);
  const sum=c=>c.items.filter(i=>i.include).reduce((a,i)=>{const s=itState(c,i);a.n+=s.q>0?1:0;a.q+=s.q;return a},{n:0,q:0});
  const opts=c=>`<select class="sel impsel" data-cust="${esc(c.key)}" aria-label="Shop for ${esc(c.email)}"><option value="">${c.by==='ambiguous'?'Several shops share this postcode, choose…':'Not matched: choose a shop…'}</option>${impShops().map(s=>`<option value="${esc(s.id)}" ${c.shop_id===s.id?'selected':''}>${esc(s.name)} · ${esc(s.postcode||'')}${c.cands.includes(s.id)?' ★':''}</option>`).join('')}</select>`;
  const badge=c=>I.done[c.key]?`<span class="chip ok">${svg('check')}Imported</span>`:c.by==='email'?`<span class="chip ok">Email match</span>`:c.by==='postcode'?`<span class="chip">Postcode match</span>`:c.by==='manual'?`<span class="chip">Manual</span>`:`<span class="chip no">${svg('alert')}Unmatched</span>`;
  const list=`<div class="card"><div class="hd"><h3>Customers · ${C.length}</h3><span class="mut">${matched.length} matched</span></div><div class="tw"><table class="t resp imp-c"><thead><tr><th>Wholesale customer</th><th>Orders</th><th class="num">SKUs</th><th class="num">Units</th><th>Match</th><th>ShopNip shop</th></tr></thead><tbody>${C.map(c=>{const s=sum(c);return `<tr class="click ${I.open===c.key?'on':''}" data-impopen="${esc(c.key)}">
    <td class="first"><b>${esc(c.company||c.email)}</b><div class="mut">${esc(c.email)} · ${esc(c.postcode||'no postcode')}</div></td><td data-l="Orders" class="mut">${c.orders.length}</td><td data-l="SKUs" class="num">${c.items.length}</td><td data-l="Units" class="num">${c.items.reduce((a,i)=>a+i.qty,0)}</td>
    <td data-l="Match">${badge(c)}</td><td data-l="Shop" class="full" data-stop="1">${opts(c)}</td></tr>`}).join('')}</tbody></table></div></div>`;
  let det='';if(cur){const x=cur.shop_id&&I.ctx[cur.shop_id],s=sum(cur),shop=shopById(cur.shop_id);
    det=`<div class="card" style="margin-top:16px"><div class="hd"><h3>Preview · ${esc(cur.company||cur.email)}${shop?` → ${esc(shop.name)}`:''}</h3><span class="mut">${s.n} listings · ${s.q} units to add</span></div>
    ${!cur.shop_id?`<div class="msg info" style="margin:14px 16px">Choose a ShopNip shop for this customer above to see what will be created.</div>`:x&&x.err?`<div class="msg err" style="margin:14px 16px">${esc(x.err)}</div>`:x&&!x.done?`<div class="msg info" style="margin:14px 16px">Run migration_009_wholesale_import.sql: without it, duplicate detection and the import are unavailable.</div>`:''}
    <div class="tw"><table class="t imp-i"><thead><tr><th><input type="checkbox" data-impall="${esc(cur.key)}" ${cur.items.every(i=>i.include)?'checked':''} aria-label="Include all"></th><th>Product</th><th class="num">Qty</th><th class="num">Wholesale</th><th class="num">Retail</th><th>Result</th></tr></thead><tbody>${cur.items.map((it,j)=>{const st=itState(cur,it);
      return `<tr class="${it.include?'':'off'}"><td><input type="checkbox" data-impinc="${j}" ${it.include?'checked':''} aria-label="Include ${esc(it.sku)}"></td><td><div class="sh">${it.image?`<img class="pimg" src="${esc(it.image)}" alt="" loading="lazy">`:`<span class="pimg"></span>`}<div><b>${esc(it.name)}</b><div class="mut">SKU ${esc(it.sku)}${it.category?' · '+esc(it.category):''}</div></div></div></td>
       <td class="num">${it.qty}</td><td class="num">${gbp(it.wholesale)}</td><td class="num"><input class="inp rp" type="number" min="0" step="0.01" data-impret="${j}" value="${(+it.retail).toFixed(2)}" aria-label="Retail price ${esc(it.sku)}"></td>
       <td>${st.k==='new'?`<span class="chip ok">New · stock ${st.q}</span>`:st.k==='top'?`<span class="chip">Top up ${st.ex.stock} → ${st.ex.stock+st.q}</span>`:st.k==='dup'?`<span class="chip no">Already imported</span>`:'<span class="mut">–</span>'}</td></tr>`}).join('')}</tbody></table></div>
    <div class="df"><span class="mut" style="margin-right:auto;font-size:12.5px">Prices of existing listings are kept unless ticked. Listings with retail £0 are created hidden.</span>
     <label class="sw"><input type="checkbox" id="impupd" ${I.upd?'checked':''}>Also update prices of existing listings</label>
     <button class="btn" data-a="impgo" ${!cur.shop_id||!x||!x.done||!s.n||I.done[cur.key]||ST.ui.busy?'disabled':''}>${ST.ui.busy?'Importing…':I.done[cur.key]?'Imported':`Import ${s.n} listings to ${esc(shop?.name||'shop')}`}</button></div></div>`}
  return `${intro}<div class="kpis imp-k"><div class="card kpi"><div class="lb"><i>${svg('dl')}</i>File</div><div class="v" style="font-size:16px;word-break:break-all">${esc(I.fname)}</div><div class="s">${P.rows} rows · ${P.lines} product lines used</div></div>
   <div class="card kpi c"><div class="lb"><i>${svg('info')}</i>Skipped</div><div class="v">${P.skipped.status+P.skipped.bad}</div><div class="s">${P.skipped.status} by order status · ${P.skipped.bad} with qty 0 / no SKU</div></div>
   <div class="card kpi"><div class="lb"><i>${svg('pound')}</i>Markup</div><div class="v"><input class="inp" id="impmk" type="number" min="1" max="5" step="0.05" value="${I.markup}" style="width:110px;font-size:20px;font-weight:800"></div><div class="s">Retail = wholesale × markup, rounded to .x9</div></div>
   <div class="card kpi c"><div class="lb"><i>${svg('grid')}</i>Order statuses</div><div class="s" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${Object.entries(P.statuses).map(([k,n])=>`<label class="sw"><input type="checkbox" data-impst="${esc(k)}" ${I.inc.includes(k.toLowerCase())?'checked':''}>${esc(k)} · ${n}</label>`).join('')}</div></div></div>
   ${list}${det}`};
function impSample(){const H=['Order #','Status','Order date','Email address','Company name','Postcode','Postcode (delivery)','Product SKU','Product title','Product variant','Product category','Product quantity','Product price'];
  const sh=[['orders@cornernews.example','Corner News (sample)','LE1 5YA'],['someone@sample.example','Sample Trader Ltd','LE2 5BB'],['new@sample.example','Unknown Sample Shop','ZZ9 9ZZ'],['vpo@example.com','Village PO (sample)','LE2 5AA']];
  const pr=[['000737','Copier Paper A4 Pale Green 500 Sheets',3.93],['1012','Tallon Gel Pens Pack of 3',0.92],['CD6127','Balloon Candle Happy Birthday',1.10],['5000','Parcel Tape 12 Pack',4.80],['70-33','Highlighters Pack of 10',1.66],['SKU1003','Sticky Notes Cube',1.25],['BWP2-15','Bubble Wrap Roll',2.40]];
  const L=[H];let n=9001;sh.forEach(([e,co,pc],i)=>{for(let o=0;o<2;o++){n++;pr.forEach((p,j)=>{if((i+j+o)%3===0)return;L.push([n,i===3&&o?'Pending':'Completed','01/10/2026 10:00',e,co,pc,pc,p[0],p[1],'',j<3?'Stationery':'Packaging',(j%2?0:1)+1+((i+o)%4)*2,p[2].toFixed(2)])})}});
  return L.map(r=>r.map(v=>/[",]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\r\n')}

// =================== CSV ===================
function csv(name,rows){const c=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};const blob=new Blob([rows.map(r=>r.map(c).join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}

// =================== events ===================
document.addEventListener('click',async e=>{if(e.target.closest('[data-stop],input,select,label'))if(e.target.closest('.imp-c,.imp-i,.imp-k,.ostbox'))return;
  const t=e.target.closest('[data-a],[data-af],[data-shop],[data-order],[data-dec],[data-pe],[data-pd],[data-impopen]');if(!t)return;const d=t.dataset;
  if(d.impopen){ST.imp.open=d.impopen;render();return}
  if(d.pd){e.preventDefault();e.stopPropagation();if(!confirm('Delete this promotion? This cannot be undone.'))return;try{await API.delPromo(d.pd);ST.promos=await API.promos();ST.ui.promo=null;toast('Promotion deleted');render()}catch(er){toast(er.message)}return}
  if(d.dec){e.preventDefault();e.stopPropagation();ST.ui.decide={id:d.id,status:d.dec};render();setTimeout(()=>$('#decf textarea')?.focus(),30);return}
  if(d.pe){e.preventDefault();ST.ui.promo={...ST.promos.find(p=>String(p.id)===d.pe)};render();return}
  if(d.af){ST.ui.af=d.af;render();return}
  if(d.order){e.preventDefault();ST.ui.drawer={type:'order',id:d.order};render();return}
  if(d.shop){e.preventDefault();openShop(d.shop);return}
  const a=d.a;if(!a)return;
  if(a==='authmode'){ST.authMode=ST.authMode==='password'?'otp':'password';ST.authMsg='';render();return}
  if(a==='menu'){document.body.classList.toggle('sbo');return}
  if(a==='close'){ST.ui.drawer=null;ST.ui.promo=null;render();return}
  if(a==='nodecide'){ST.ui.decide=null;render();return}
  if(a==='noost'){ST.ui.ost=null;render();return}
  if(a==='wref'){const amt=Math.round(+($('#wr_amt')?.value||0)*100)/100,why=($('#wr_why')?.value||'').trim(),o=ST.orders.find(x=>x.id===d.id);if(!o)return;
    if(!confirm(`Refund ${gbp(amt)} to ${o.customer_name||'the customer'}’s ShopNip wallet? This is store credit, not a card refund.`))return;t.disabled=true;try{await API.walletRefund(d.id,amt,why);ST.orders=await API.orders();toast(gbp(amt)+' refunded to the customer’s ShopNip wallet');render()}catch(er){toast(er.message||'Refund failed');t.disabled=false}return}
  if(a==='ostgo'){const v=$('#ostsel')?.value,o=ST.orders.find(x=>x.id===d.id);if(!v||v===o?.status){toast('Choose a different status');return}ST.ui.ostPick=v;ST.ui.ost={id:d.id,status:v};render();setTimeout(()=>$('#ostf textarea')?.focus(),30);return}
  if(a==='impreset'){ST.imp=null;render();return}
  if(a==='impsample'){await impLoad(impSample(),'sample-orders.csv');return}
  if(a==='impgo'){const I=ST.imp,c=I.plan.customers.find(x=>x.key===I.open);if(!c?.shop_id)return;const x=I.ctx[c.shop_id],shop=shopById(c.shop_id);
    const items=c.items.filter(i=>i.include&&itState(c,i).q>0),pl=NBI.payload(items);if(!pl.length){toast('Nothing new to import');return}
    if(!confirm(`Import ${pl.length} products (${items.reduce((a,i)=>a+itState(c,i).q,0)} units) into ${shop?.name}?`))return;
    ST.ui.busy=true;render();try{const r=await API.importWholesale(c.shop_id,pl,I.upd);I.done[c.key]=r;delete I.ctx[c.shop_id];await impCtx(c.shop_id);ST.ls=await API.listingStats().catch(()=>ST.ls);
      toast(`${shop?.name}: ${r.created} new, ${r.topped_up} topped up, ${r.units} units${r.duplicate_lines?`, ${r.duplicate_lines} lines already imported`:''}`)}catch(er){toast(er.message||'Import failed')}ST.ui.busy=false;render();return}
  if(a==='logout'){await API.signOut();ST.user=null;ST.ok=false;ST.authMsg='You’ve been signed out.';if(MOCK)ST.authMsg+=' (mock)';render();return}
  if(a==='reload'){ST.loaded=false;render();await loadAll();render();toast('Data refreshed');return}
  if(a==='newpromo'){ST.ui.promo={type:'banner',placement:'hero',theme:'teal',active:true,priority:0,start_at:new Date().toISOString()};render();return}
  if(a==='csv-orders')return csv('shopnip-orders',[['order','shop','customer','email','phone','fulfilment','postcode','status','subtotal','delivery_fee','total','created_at'],...filteredOrders().map(o=>[o.order_number,shopById(o.shop_id)?.name,o.customer_name,o.customer_email,o.customer_phone,o.fulfilment,o.delivery_postcode,o.status,o.subtotal,o.delivery_fee,o.total,o.created_at])]);
  if(a==='csv-shops')return csv('shopnip-shops',[['id','name','status','wholesale_email','address','postcode','phone','created_at','approved_at'],...ST.shops.map(s=>[s.id,s.name,s.status,s.bluepark_customer_email,s.address,s.postcode,s.phone,s.created_at,s.approved_at])]);
  if(a==='csv-subs')return csv('shopnip-subscribers',[['email','postcode','source','created_at'],...ST.subs.map(s=>[s.email,s.postcode,s.source,s.created_at])])});
document.addEventListener('input',e=>{const t=e.target,m={aq:'aq',sq:'sq',oq:'oq',pq:'pq',subq:'subq'};if(m[t.id]){ST.ui[m[t.id]]=t.value;clearTimeout(render._t);render._t=setTimeout(render,120)}});
document.addEventListener('change',async e=>{const t=e.target;if(['sf','orng','os','osh','ofu'].includes(t.id)){ST.ui[t.id]=t.value;render()}
  if(t.id==='impfile'&&t.files[0]){const f=t.files[0];if(f.size>50e6){toast('File too large (50 MB max)');return}impLoad(NBI.decode(await f.arrayBuffer()),f.name);return}
  if(t.id==='ostsel'){ST.ui.ostPick=t.value;return}
  if(t.classList.contains('impsel')){const c=ST.imp.plan.customers.find(x=>x.key===t.dataset.cust);c.shop_id=t.value||null;c.by=t.value?'manual':null;delete ST.imp.done[c.key];ST.imp.open=c.key;render();if(c.shop_id){await impCtx(c.shop_id);render()}return}
  if(t.dataset.impst!=null){const I=ST.imp,k=t.dataset.impst.toLowerCase();I.inc=t.checked?[...new Set([...I.inc,k])]:I.inc.filter(x=>x!==k);const keep={mk:I.markup,ctx:I.ctx,sel:Object.fromEntries(I.plan.customers.filter(c=>c.by==='manual').map(c=>[c.key,c.shop_id]))};
    const rows=I.rows;ST.imp.inc=I.inc;await impLoad(rows.map(r=>r.map(v=>/[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v).join(',')).join('\n'),I.fname);ST.imp.ctx={...keep.ctx,...ST.imp.ctx};ST.imp.plan.customers.forEach(c=>{if(keep.sel[c.key]){c.shop_id=keep.sel[c.key];c.by='manual'}});render();return}
  if(t.id==='impupd'){ST.imp.upd=t.checked;return}
  if(t.dataset.impinc!=null||t.dataset.impall!=null){const I=ST.imp,c=I.plan.customers.find(x=>x.key===I.open);if(t.dataset.impall!=null)c.items.forEach(i=>i.include=t.checked);else c.items[+t.dataset.impinc].include=t.checked;setTimeout(render);return}
  if(t.dataset.impret!=null){const c=ST.imp.plan.customers.find(x=>x.key===ST.imp.open),it=c.items[+t.dataset.impret];it.retail=Math.max(0,+t.value||0);it.edited=true;t.value=it.retail.toFixed(2);return}
  if(t.id==='impmk'){const m=Math.min(5,Math.max(1,+t.value||1.5));ST.imp.markup=m;ST.imp.plan.customers.forEach(c=>c.items.forEach(i=>{if(!i.edited)i.retail=NBI.suggestRetail(i.wholesale,m)}));setTimeout(render);return}
  if(t.name==='file'&&t.files[0]){const pv=t.parentElement.querySelector('.pthumb');if(pv)pv.style.backgroundImage=`url('${URL.createObjectURL(t.files[0])}')`}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(ST.ui.drawer||ST.ui.promo||ST.ui.decide||ST.ui.ost)){if(ST.ui.ost)ST.ui.ost=null;else{ST.ui.drawer=null;ST.ui.promo=null;ST.ui.decide=null}render()}});
document.addEventListener('submit',async e=>{const f=e.target;e.preventDefault();const F=new FormData(f);
  if(f.id==='authf'){const email=String(F.get('email')||'').trim();const btn=f.querySelector('button');btn.disabled=true;
    try{if(!isAdminEmail(email))throw new Error('This email isn’t authorised to use ShopNip Admin.');
      if(ST.authMode==='otp'){await API.signInOtp(email);ST.authMsg='Check your inbox: we sent a sign-in link to '+email+'.';render();return}
      const r=await API.signInPassword(email,String(F.get('password')||''));ST.authMsg='';await setUser(r.user||(await API.session())?.user)}catch(er){ST.authMsg=er.message||'Sign-in failed';render()}return}
  if(f.id==='decf'){const d=ST.ui.decide,reason=String(F.get('reason')||'').trim();if(d.status!=='approved'&&!reason){toast('Please give a reason');return}
    try{const r=await API.setShopStatus(d.id,d.status,reason);ST.shops=await API.shops();ST.ui.decide=null;
      toast(`${shopById(d.id)?.name||'Shop'} ${SST[d.status][0].toLowerCase()}${r.reasonSaved?'':' (reason not stored: run migration_006_admin.sql)'}`);render()}catch(er){toast(er.message||'Could not update shop')}return}
  if(f.id==='ostf'){const d=ST.ui.ost,reason=String(F.get('reason')||'').trim();ST.ui.busy=true;render();
    try{const r=await API.setOrderStatus(d.id,d.status,reason);ST.orders=await API.orders();ST.ui.ost=null;ST.ui.ostPick=null;
      toast(`Order ${OST[d.status][0].toLowerCase()}${r.audited?'':' (not logged on timeline: run migration_008_admin_orders.sql)'}`)}catch(er){toast(er.message||'Could not change status')}ST.ui.busy=false;render();return}
  if(f.id==='promof'){const g=k=>String(F.get(k)||'').trim();ST.ui.busy=true;
    try{const p={id:ST.ui.promo.id,type:g('type'),placement:g('placement')||'hero',title:g('title'),subtitle:g('subtitle')||null,cta:g('cta')||null,link:g('link')||null,sku:g('sku')||null,shop_id:g('shop_id')||null,theme:g('theme')||'teal',
        priority:parseInt(g('priority'))||0,active:!!F.get('active'),image:g('image')||null,start_at:g('start_at')?new Date(g('start_at')).toISOString():new Date().toISOString(),end_at:g('end_at')?new Date(g('end_at')).toISOString():null};
      const file=F.get('file');if(file&&file.size){if(file.size>5e6)throw new Error('Image must be under 5 MB');p.image=await API.upload(file)}
      if(!p.title)throw new Error('Title is required');if(p.end_at&&Date.parse(p.end_at)<=Date.parse(p.start_at))throw new Error('End must be after start');
      if(p.type==='featured_shop'&&!p.shop_id)throw new Error('Choose a shop to feature');if(p.type==='sponsored'&&!p.sku)throw new Error('Enter the SKU to sponsor');
      await API.savePromo(p);ST.promos=await API.promos();ST.ui.promo=null;toast('Promotion saved')}catch(er){toast(er.message||String(er))}ST.ui.busy=false;render()}});
window.NBAdmin={ST,PAGES,V,API,sb,MOCK,render,esc,svg,toast,gbp,fmtD,fmtDT,I,shopById};
boot();
})();
