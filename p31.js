// ShopNip · p31 (seller.html): "Add my usual products" (migration 014).
// ShopNip has no commission: shops pay a monthly subscription instead (see lp.js · Your plan), so the old
// per-order fee estimates and the fee settings read have been removed.
(()=>{
const NB=window.NBSeller;if(!NB)return;
const {D,API,PAGES,MOCK,sb,svg,toast}=NB;
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
})();
