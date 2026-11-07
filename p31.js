// ShopNip · p31 (seller.html): marketplace fees (migration 013) + "Add my usual products" (migration 014).
// Fees stay hidden everywhere until an admin switches them on (marketplace_fee_settings.enabled). ?mock=1&fees=1 previews them on.
(()=>{
const NB=window.NBSeller;if(!NB)return;
const {D,API,PAGES,MOCK,sb,svg,esc,gbp,toast,DEAD}=NB,Q=new URLSearchParams(location.search);
const F={set:null,info:null,busy:false};
const MOCKSET={enabled:Q.get('fees')==='1',trade_selling_pct:5,other_selling_pct:10,trade_monthly_fee:5,trade_waiver_spend:300,other_monthly_fee:15,free_listings:50};
async function loadSet(){if(F.set)return F.set;if(MOCK)return F.set=MOCKSET;
  try{const {data,error}=await sb.from('marketplace_fee_settings').select('*').eq('id',1).maybeSingle();F.set=error||!data?{enabled:false}:data}catch(e){F.set={enabled:false}}return F.set}
async function loadInfo(force){if(!D.shop||(F.info&&!force)||F.busy)return;F.busy=true;
  try{if(MOCK){const s=await loadSet(),t=Q.get('tier')!=='other';F.info={enabled:s.enabled,tier:t?'trade':'other',selling_pct:t?s.trade_selling_pct:s.other_selling_pct,monthly_fee:t?s.trade_monthly_fee:s.other_monthly_fee,monthly_fee_due:s.enabled?(t?0:s.other_monthly_fee):0,month_trade_spend:t?342.1:0,waiver_spend:s.trade_waiver_spend,free_listings:s.free_listings}}
   else{const {data,error}=await sb.rpc('shop_fee_info',{p_shop:D.shop.id});F.info=error?{enabled:false}:data}}catch(e){F.info={enabled:false}}
  F.busy=false;NB.rerender()}
const on=()=>!!(F.info&&F.info.enabled);
const feeOf=o=>{if(!o||o.fulfilment!=='delivery')return 0;return Math.round((+(o.subtotal??0))*(+F.info.selling_pct||0))/100};
/* dashboard overview: fee summary card (only when fees are on) */
const ov=PAGES.overview;PAGES.overview=()=>{loadInfo();const h=ov();if(!on())return h;const i=F.info,t=i.tier==='trade';
  const live=D.O.filter(o=>!DEAD.includes(o.status)),m0=new Date();m0.setDate(1);m0.setHours(0,0,0,0);const mo=live.filter(o=>Date.parse(o.created_at)>=m0),est=mo.reduce((a,o)=>a+feeOf(o),0);
  return `<div class="bnr info">${svg('pound')}<div><b>Your fees: ${(+i.selling_pct).toFixed(1).replace(/\.0$/,'')}% of delivery orders (no selling fee on click &amp; collect)${t?' (Suman Bros trade rate)':''} + ${+i.monthly_fee_due?gbp(i.monthly_fee_due)+' this month':'no monthly fee this month'}</b>`+
   `${t?(+i.month_trade_spend>=+i.waiver_spend?`Your Suman Bros spend this month is ${gbp(i.month_trade_spend)}, so the ${gbp(i.monthly_fee)} monthly fee is waived.`:`Spend ${gbp(i.waiver_spend)} with Suman Bros this month (so far ${gbp(i.month_trade_spend)}) and the ${gbp(i.monthly_fee)} monthly fee is waived.`):'Shops that buy wholesale from Suman Bros pay a lower rate.'}`+
   ` Estimated selling fees this month: <b>${gbp(est)}</b>. First ${i.free_listings} products are free to list.</div></div>`+h};
/* orders list + order drawer: estimated fee per order */
function patch(){if(!on()||!document.body.classList.contains('dash'))return;
  document.querySelectorAll('tr[data-o]:not([data-fee])').forEach(tr=>{const o=D.O.find(x=>String(x.id)===tr.dataset.o);if(!o)return;tr.dataset.fee='1';const td=tr.querySelector('td.num');if(td&&!DEAD.includes(o.status))td.insertAdjacentHTML('beforeend',`<div class="mut" style="font-size:12px">Est. fee ${gbp(feeOf(o))}</div>`)});
  document.querySelectorAll('.kv.tot:not([data-fee])').forEach(k=>{const dr=k.closest('[data-oid],.drawer,.dr');const id=dr?.dataset?.oid||D.ui.drawer;const o=D.O.find(x=>String(x.id)===String(id));if(!o)return;k.dataset.fee='1';
    const collect=o.fulfilment!=='delivery';
    k.insertAdjacentHTML('afterend',`<div class="kv"><span>${collect?'ShopNip fee (click &amp; collect)':`Estimated ShopNip fee (${(+F.info.selling_pct).toFixed(1).replace(/\.0$/,'')}% of delivery subtotal)`}</span><span>${collect?'No fee':gbp(feeOf(o))}</span></div><div class="kv"><span>You keep (est.)</span><b>${gbp((+o.total||0)-feeOf(o))}</b></div>`)})}
new MutationObserver(()=>patch()).observe(document.getElementById('app'),{childList:true,subtree:true});
/* products page: "Add my usual products" */
const pp=PAGES.products;PAGES.products=()=>{const h=pp();const pend=D.shop&&D.shop.status!=='approved';
  const b=`<button class="btn ghost sm" data-a="usual" ${pend?'title="Available once your shop is approved"':''}>${svg('sync')}Add my usual products</button>`;
  return h.replace('<div class="acts">','<div class="acts">'+b)};
async function usual(btn){if(!D.shop)return;if(D.shop.status!=='approved'&&!MOCK)return toast('Your usual products are added automatically when your shop is approved.');
  if(btn){btn.disabled=true;btn.textContent='Adding…'}
  try{let n=0;if(MOCK){const have=new Set(D.L.map(l=>l.sku)),c=(await NB.catalog()).filter(p=>p.images?.length&&!have.has(p.sku)).slice(0,6);
      c.forEach((p,i)=>D.L.unshift({id:'u'+Date.now()+i,shop_id:D.shop.id,sku:p.sku,name:p.name,image:p.images[0],category:p.category,trade_price:p.trade_price,retail_price:+(p.trade_price*1.6).toFixed(2),stock:12,active:true,source:'wholesale',updated_at:new Date().toISOString()}));n=c.length}
    else{const {data,error}=await sb.rpc('add_usual_products',{p_shop:D.shop.id});if(error)throw error;n=+data||0;if(n)D.L=await API.listings()}
    toast(n?`Added ${n} product${n>1?'s':''} you usually buy from Suman Bros`:'No new products: everything you buy from Suman Bros is already in your shop')}
  catch(e){toast(/add_usual_products/.test(e.message||'')?'This needs the latest update (migration 014).':(e.message||'Could not add products'))}
  NB.rerender()}
document.addEventListener('click',e=>{const t=e.target.closest('[data-a="usual"]');if(t){e.preventDefault();usual(t)}},true);
window.NBUsual=usual;
/* seller landing: fees section + FAQ answer only once fees are switched on */
function landing(){const s=F.set;if(!s||!s.enabled)return;const sec=document.getElementById('fees');if(!sec||sec.dataset.p31)return;sec.dataset.p31='1';
  const pc=v=>(+v).toFixed(1).replace(/\.0$/,'');
  sec.querySelector('.wrap').innerHTML=`<span class="kick">Fees</span><h2>Simple fees, first ${s.free_listings} products free to list</h2><p class="sub">No selling fee on click &amp; collect. You only pay a selling fee on delivery orders. No setup fee.</p>
   <div class="fees"><div class="plan hot"><span class="badge">Suman Bros trade customers</span><h3>Trade</h3><div class="pr">${pc(s.trade_selling_pct)}% <small>on delivery</small></div><small>+ ${gbp(s.trade_monthly_fee)}/month, free in any month you spend ${gbp(s.trade_waiver_spend)}+ with Suman Bros</small>
     <ul><li>${svg('check')}Products you usually buy added for you</li><li>${svg('check')}First ${s.free_listings} products free to list</li><li>${svg('check')}Click &amp; collect and local delivery</li></ul></div>
    <div class="plan"><h3>Other shops</h3><div class="pr">${pc(s.other_selling_pct)}% <small>on delivery</small></div><small>+ ${gbp(s.other_monthly_fee)}/month</small>
     <ul><li>${svg('check')}Your own shop page</li><li>${svg('check')}First ${s.free_listings} products free to list</li><li>${svg('check')}Seller dashboard with order alerts</li></ul></div></div>
   <p class="fnote">Click &amp; collect has no selling fee. On delivery orders, the selling fee is a percentage of the goods subtotal (excluding the delivery charge). Customers pay you directly.</p>`;
  document.querySelectorAll('#faq details, #faq .qa, .faq details').forEach(d=>{if(/How much does it cost/i.test(d.textContent)){const p=d.querySelector('p');if(p)p.textContent=`First ${s.free_listings} products are free to list. There is no selling fee on click & collect. Suman Bros trade customers pay ${pc(s.trade_selling_pct)}% on delivery orders plus ${gbp(s.trade_monthly_fee)} a month (free in any month they spend ${gbp(s.trade_waiver_spend)}+ with Suman Bros). Other shops pay ${pc(s.other_selling_pct)}% on delivery orders plus ${gbp(s.other_monthly_fee)} a month.`}})}
new MutationObserver(()=>landing()).observe(document.getElementById('app'),{childList:true,subtree:true});
loadSet().then(landing);
})();
