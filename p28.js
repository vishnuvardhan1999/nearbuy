// ShopNip (a NuvonHub product) · p28: customer app additions (index.html, loaded after p26.js).
// Wholesaler Partner Hub (/partner) · local rewards in Account · shop brand colour · install prompt · order-ready alerts.
// Partner data comes only from the partner_dashboard() RPC (migration 018): aggregates, no customer details.
(()=>{const {A,M,MOCK,toast}=P2;
const CFG=window.APP_CONFIG||{},SITE=(CFG.SITE_URL||'https://www.shopnip.co.uk').replace(/\/$/,'');
const gbp=n=>'£'+(+n||0).toFixed(2);
const css=document.createElement('style');css.textContent=`
.p28card{background:#fff;border:1px solid var(--line,#e7e9ee);border-radius:18px;padding:18px;margin-top:16px}.p28card h3{margin:0 0 6px;font-size:17px}
.p28pts{display:flex;align-items:center;gap:14px}.p28pts .big{font-size:34px;font-weight:800;letter-spacing:-1px;color:#0f766e;line-height:1}.p28pts .ic{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#ff8a6b,#e8553a);display:grid;place-items:center;color:#fff;font-size:24px;font-weight:800}
.p28 small,.p28card small{color:#667085}.p28list{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:6px;font-size:14px}.p28list li{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #f0f2f5;padding-top:6px}
.p28bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#ecfdf9;border:1px solid #99f6e4;color:#134e4a;border-radius:14px;padding:12px 14px;margin:12px 0;font-size:14px}.p28bar b{flex:1;min-width:180px}
.p28btn{border:0;border-radius:12px;padding:10px 16px;font:inherit;font-weight:700;background:#0f766e;color:#fff;cursor:pointer}.p28btn.ghost{background:#fff;color:#14202e;border:1px solid #e7e9ee}
#p28inst{position:fixed;left:12px;right:auto;bottom:24px;z-index:45;max-width:340px;margin:0;background:#0b3b38;color:#fff;border-radius:18px;padding:14px;display:flex;gap:12px;align-items:center;box-shadow:0 14px 40px rgba(0,0,0,.25)}
#p28inst img{width:44px;height:44px;border-radius:12px}#p28inst div{flex:1;font-size:13.5px;line-height:1.35}#p28inst b{display:block;font-size:15px}#p28inst .p28btn{background:#ff6b4a}#p28inst .x{background:none;border:0;color:#fff;opacity:.7;font-size:22px;cursor:pointer;padding:4px}
@media(max-width:767px){#p28inst{left:10px;right:78px;bottom:calc(86px + env(safe-area-inset-bottom));max-width:none}}
@media(min-width:900px){#p28inst{bottom:24px;left:24px;right:auto}}
#p28al{position:fixed;top:10px;left:10px;right:10px;z-index:80;max-width:480px;margin:0 auto;background:#fff;border:2px solid #0f766e;border-radius:16px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.2);display:flex;gap:12px;align-items:center}
#p28al div{flex:1}#p28al b{display:block}
.p28 .kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:14px 0}.p28 .kp div{background:#fff;border:1px solid #e7e9ee;border-radius:16px;padding:14px}.p28 .kp b{display:block;font-size:24px;letter-spacing:-.5px}
.p28 table{width:100%;border-collapse:collapse;font-size:14px}.p28 th{text-align:left;font-size:12px;color:#667085;text-transform:uppercase;letter-spacing:.04em;padding:8px}.p28 td{padding:10px 8px;border-top:1px solid #f0f2f5}
.p28 .code{font:800 26px/1 ui-monospace,Menlo,monospace;letter-spacing:.15em;background:#f7f6f2;border:1px dashed #b9c4cf;border-radius:12px;padding:12px 16px;display:inline-block}
.p28 .inv{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.p28 .inv input{flex:1;min-width:220px;border:1px solid #e7e9ee;border-radius:10px;padding:10px;font:inherit;font-size:13px}
.p28 .wk{display:flex;align-items:flex-end;gap:6px;height:120px}.p28 .wk div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%}.p28 .wk i{display:block;width:100%;max-width:34px;background:linear-gradient(180deg,#14b8a6,#0f766e);border-radius:6px 6px 2px 2px;min-height:3px}.p28 .wk small{font-size:10.5px;color:#667085}
.p28 .pill{font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:999px;background:#fff6d6;color:#92400e}.p28 .pill.ok{background:#ecfdf9;color:#0f766e}
`;document.head.appendChild(css);

// ---------- 8. local rewards ----------
const R={pts:null,rows:[],uid:null};
async function loadPts(){if(!A.user||R.uid===A.user.id||R.busy)return;R.busy=true;await new Promise(r=>setTimeout(r));
  try{if(MOCK){R.rows=(M.orders||[]).filter(o=>o.customer_id==='u1'&&o.status==='completed').map(o=>({points:Math.floor(+o.subtotal||0),shop:o.shops?.name||(M.shops.find(s=>s.id===o.shop_id)||{}).name,at:o.created_at}))}
   else{const {data,error}=await sb.from('reward_points').select('points,created_at,shops(name)').eq('customer_id',A.user.id).order('created_at',{ascending:false}).limit(50);if(error)throw error;R.rows=data.map(r=>({points:r.points,shop:r.shops?.name,at:r.created_at}))}
   R.pts=R.rows.reduce((a,r)=>a+(+r.points||0),0)}catch(e){R.pts=null;R.err=true}
  R.uid=A.user.id;R.busy=false;if(cur[0]==='account')render()}
function rewardsCard(){if(!A.user)return '';loadPts();if(R.err)return '';
  const shops=new Set(R.rows.map(r=>r.shop).filter(Boolean)).size;
  return `<div class="p28card" id="p28rw"><div class="p28pts"><span class="ic">★</span><div><small>ShopNip local rewards</small><div class="big">${R.pts==null?'…':R.pts.toLocaleString('en-GB')}</div><small>points${shops?` from ${shops} local shop${shops>1?'s':''}`:''}</small></div></div>
   <p style="margin:10px 0 0;font-size:14px">Earn 1 point for every £1 you spend at any shop on ShopNip, added when your order is completed.</p>
   ${R.rows.length?`<ul class="p28list">${R.rows.slice(0,5).map(r=>`<li><span>${esc(r.shop||'Local shop')}<small> · ${new Date(r.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></span><b>+${r.points}</b></li>`).join('')}</ul>`:''}</div>`}
const _acc=V.account;
V.account=function(...a){const h=_acc.apply(this,a);if(!A.user||A.authPage||!/<\/section>\s*$/.test(h))return h;return h.replace(/<\/section>\s*$/,rewardsCard()+alertBar()+'</section>')};

// ---------- 6. shop brand colour on the shop page ----------
const BC={};
async function brandOf(id){if(id in BC)return;BC[id]=null;
  try{if(MOCK){BC[id]=localStorage.nb_mock_brand||null}else{const {data}=await sb.from('shops').select('brand_color').eq('id',id).maybeSingle();BC[id]=data?.brand_color||null}}catch{}
  if(BC[id]&&cur[0]==='shop'&&String(cur[1])===String(id))render()}
const _shop=V.shop;
V.shop=function(id){const h=_shop(id);brandOf(id);const c=BC[id];if(!c||!/^#[0-9a-f]{6}$/i.test(c))return h;
  return `<style>.shero{background-color:${c}!important}.sinfo .dash-logo{background:${c}!important;color:#fff}.sinfo h1{color:${c}}</style>`+h};

// ---------- 10a. install prompt ----------
let bip=null;const dismissed=()=>+(localStorage.nb_inst_x||0)>Date.now();
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const iOS=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!/crios|fxios/i.test(navigator.userAgent);
function instBar(ios){if(dismissed()||standalone()||document.getElementById('p28inst'))return;const d=document.createElement('div');d.id='p28inst';d.setAttribute('role','dialog');d.setAttribute('aria-label','Install ShopNip');
  d.innerHTML=`<img src="/icon-192.png" alt=""><div><b>Get the ShopNip app</b>${ios?'Tap Share, then “Add to Home Screen”.':'Install for faster ordering and order-ready alerts.'}</div>${ios?'':'<button class="p28btn" data-p28="inst">Install</button>'}<button class="x" data-p28="instx" aria-label="Not now">×</button>`;document.body.appendChild(d)}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();bip=e;setTimeout(()=>instBar(false),12000)});
if(iOS&&!standalone())setTimeout(()=>{if(+(localStorage.nb_visits||0)>=2)instBar(true)},5000);
localStorage.nb_visits=(+(localStorage.nb_visits||0))+1;
if(new URLSearchParams(location.search).get('install')==='1')setTimeout(()=>instBar(false),300);   // preview/screenshot

// ---------- 10b. order-ready alerts ----------
const NOTIF='Notification' in window;
const READY={ready:'is ready to collect',out_for_delivery:'is out for delivery'};
function alertBar(){if(!A.user)return '';if(NOTIF&&Notification.permission==='granted')return '';
  return NOTIF&&Notification.permission!=='denied'?`<div class="p28bar"><b>Get an alert when your order is ready</b><button class="p28btn" data-p28="notif">Turn on alerts</button></div>`
   :`<div class="p28bar"><b>Keep ShopNip open and we’ll show an alert here when your order is ready.</b></div>`}
const _ord=V.orders;if(_ord)V.orders=function(...a){const h=_ord.apply(this,a);return alertBar()+h};
async function notify(o){const t=`${o.order_number||'Your order'} ${READY[o.status]}`,body=o.status==='ready'?'Show your collection PIN at the shop.':'It’s on its way to you.';
  let shown=false;if(NOTIF&&Notification.permission==='granted'){try{const r=await navigator.serviceWorker?.getRegistration();if(r){await r.showNotification(t,{body,icon:'/icon-192.png',tag:'order-'+o.id,data:{url:'/orders/'+o.id}});shown=true}else{new Notification(t,{body,icon:'/icon-192.png'});shown=true}}catch{}}
  if(!shown||!document.hidden){document.getElementById('p28al')?.remove();const d=document.createElement('div');d.id='p28al';d.setAttribute('role','alert');
    d.innerHTML=`<div><b>${esc(t)}</b><small>${esc(body)}</small></div><a class="p28btn" href="/orders/${encodeURIComponent(o.id)}" data-p28="alx">View</a>`;document.body.appendChild(d);setTimeout(()=>d.remove(),15000)}}
let ch=null,seen={};
function watch(){if(MOCK||!sb||!A.user||ch)return;ch=sb.channel('p28-ready-'+A.user.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:'customer_id=eq.'+A.user.id},ev=>{const o=ev.new;if(READY[o.status]&&seen[o.id]!==o.status){seen[o.id]=o.status;notify(o)}}).subscribe()}
setInterval(watch,5000);setTimeout(watch,1500);
if(MOCK&&new URLSearchParams(location.search).get('ready')==='1')setTimeout(()=>notify({id:'o1',order_number:'NB-1001',status:'ready'}),1200);

// ---------- 4. Wholesaler Partner Hub (/partner) ----------
const PH={d:undefined,busy:false,err:''};
const MOCKP={partner:{name:'Suman Bros Wholesale',invite_code:'SUMAN24',partner_fee:4},standard_fee:12,
  shops:[{name:'Suman Bros',area:'WD25',status:'verified',verified_at:'2026-10-21T10:00:00Z'},{name:'Corner News & Stationers',area:'LE1',status:'verified',verified_at:'2026-10-23T10:00:00Z'},{name:'Village Post Office Store',area:'LE2',status:'requested',requested_at:'2026-10-25T10:00:00Z'}],
  totals:{orders_30d:46,sales_30d:612.4,orders_90d:118,sales_90d:1588.15},
  weekly:[3,5,4,8,7,9,6,11,10,12,14,13].map((n,i)=>({week:new Date(Date.now()-(11-i)*7*864e5).toISOString().slice(0,10),orders:n,sales:n*13.2})),
  top_categories:[{category:'Party',units:180},{category:'Stationery',units:142},{category:'Gift wrap',units:77},{category:'Cards',units:54},{category:'Craft',units:31}]};
async function loadPartner(){if(PH.busy)return;PH.busy=true;await new Promise(r=>setTimeout(r));try{if(MOCK)PH.d=MOCKP;else{const {data,error}=await sb.rpc('partner_dashboard');if(error)throw error;PH.d=data||null}}catch(e){PH.err=e.message||'Could not load';PH.d=null}PH.busy=false;if(cur[0]==='partner')render()}
V.partner=function(){
  const wrap=b=>`<section class="sec p28"><div class="sh"><h2>Wholesaler Partner Hub</h2></div>${b}</section>`;
  if(!LIVE&&!MOCK)return wrap('<div class="p28card">Partner Hub needs the ShopNip service connected.</div>');
  if(!A.user&&!MOCK)return wrap(`<div class="p28card"><h3>Sign in to your partner account</h3><p>Use the email address your ShopNip contact registered for your wholesale business.</p><a class="p28btn" href="/account" data-t="account" style="display:inline-block;text-decoration:none">Sign in</a></div>`);
  if(PH.d===undefined){loadPartner();return wrap('<div class="p28card">Loading your partner dashboard…</div>')}
  const d=PH.d;if(!d)return wrap(`<div class="p28card"><h3>This account isn’t linked to a partner wholesaler</h3><p>Want your retail customers on ShopNip with a lower listing fee? Email <a href="mailto:${esc(CFG.CONTACT_EMAIL||'hello@nuvonhub.com')}">${esc(CFG.CONTACT_EMAIL||'hello@nuvonhub.com')}</a> and we’ll set up your partner account.</p>${PH.err?`<small>${esc(PH.err)}</small>`:''}</div>`);
  const p=d.partner,link=SITE+'/seller.html?partner='+encodeURIComponent(p.invite_code)+'#signup',T=d.totals||{},W=(d.weekly||[]).slice(-12),mw=Math.max(1,...W.map(w=>+w.orders)),ver=(d.shops||[]).filter(s=>s.status==='verified').length,save=Math.max(0,+d.standard_fee-+p.partner_fee);
  const wa='https://wa.me/?text='+encodeURIComponent(`Get your shop on ShopNip, the local shops app. As our customer you pay the lower partner listing fee. Sign up here: ${link}`);
  return wrap(`<p style="margin:-4px 0 6px;color:#667085">${esc(p.name)} · invite your retail customers and see how ShopNip is selling for them.</p>
  <div class="kp"><div><small>Linked shops</small><b>${ver}</b><small>${(d.shops||[]).length-ver} waiting for checks</small></div><div><small>Orders, 30 days</small><b>${(+T.orders_30d||0).toLocaleString('en-GB')}</b><small>across verified shops</small></div>
   <div><small>Sales, 30 days</small><b>£${Math.round(+T.sales_30d||0).toLocaleString('en-GB')}</b><small>goods value</small></div><div><small>Your customers save</small><b>${gbp(save)}</b><small>a month each on listing fees</small></div></div>
  <div class="p28card"><h3>Invite your retail customers</h3><p style="margin:0 0 10px;font-size:14px">Share your code or link. Shops that join with it are linked to you once our team verifies they buy from you, and they get the partner listing fee.</p>
   <div class="code">${esc(p.invite_code)}</div><div class="inv"><input readonly value="${esc(link)}" aria-label="Invite link"><button class="p28btn" data-p28="copy" data-v="${esc(link)}">Copy link</button><button class="p28btn ghost" data-p28="copy" data-v="${esc(p.invite_code)}">Copy code</button><a class="p28btn" style="background:#25d366;text-decoration:none" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a></div></div>
  <div class="p28card"><h3>Weekly orders at your shops</h3><small>Anonymised totals from verified shops, last 90 days. No customer details are shared.</small>
   ${W.length?`<div class="wk" style="margin-top:12px">${W.map(w=>`<div title="${w.orders} orders · ${gbp(w.sales)}"><i style="height:${w.orders/mw*100}%"></i><small>${new Date(w.week).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></div>`).join('')}</div>`:'<p>No orders yet.</p>'}
   ${(d.top_categories||[]).length?`<h3 style="margin-top:16px">Top categories</h3><ul class="p28list">${d.top_categories.map(c=>`<li><span>${esc(c.category)}</span><b>${(+c.units).toLocaleString('en-GB')} units</b></li>`).join('')}</ul>`:''}</div>
  <div class="p28card"><h3>Linked shops</h3>${(d.shops||[]).length?`<table><thead><tr><th>Shop</th><th>Area</th><th>Status</th></tr></thead><tbody>${d.shops.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.area||'')}</td><td><span class="pill ${s.status==='verified'?'ok':''}">${s.status==='verified'?'Verified':s.status==='rejected'?'Not verified':'Checking'}</span></td></tr>`).join('')}</tbody></table>`:'<p>No shops yet. Share your invite link to get started.</p>'}</div>`)};

// ---------- events ----------
document.addEventListener('click',async e=>{const t=e.target.closest('[data-p28]');if(!t)return;const k=t.dataset.p28;
  if(k==='inst'){e.preventDefault();document.getElementById('p28inst')?.remove();if(bip){bip.prompt();try{await bip.userChoice}catch{}bip=null}return}
  if(k==='instx'){document.getElementById('p28inst')?.remove();localStorage.nb_inst_x=Date.now()+14*864e5;return}
  if(k==='notif'){e.preventDefault();try{const p=await Notification.requestPermission();toast(p==='granted'?'Alerts on. We’ll tell you when your order is ready':'Alerts are off. We’ll show them here while ShopNip is open')}catch{}render();return}
  if(k==='copy'){e.preventDefault();try{await navigator.clipboard.writeText(t.dataset.v);toast('Copied')}catch{toast('Could not copy')}return}
  if(k==='alx'){document.getElementById('p28al')?.remove()}});
if(cur&&cur[0]==='partner')render();
})();
