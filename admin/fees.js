/* Marketplace selling + monthly fees. Shown on Partners. Preview: ?mock=1 */
(()=>{
  const NA=window.NBAdmin,Q=new URLSearchParams(location.search);
  if(!NA)return;
  const{ST,V,esc,svg,gbp,MOCK}=NA;
  const DEAD=['cancelled','rejected'];
  const F={s:null,rows:null,err:null,ready:false,loading:false};
  const month0=()=>{const d=new Date();d.setDate(1);d.setHours(0,0,0,0);return +d};
  const sub=o=>+(o.subtotal??0)||0;
  const feeRowFromOrders=(s,set)=>{
    const email=(s.bluepark_customer_email||'').toLowerCase().trim();
    const trade=!!email&&ST.trade instanceof Set&&ST.trade.has(email);
    const pct=trade?+set.trade_selling_pct:+set.other_selling_pct;
    const ords=(ST.orders||[]).filter(o=>o.shop_id===s.id&&o.status==='completed'&&Date.parse(o.created_at)>=month0());
    const col=ords.filter(o=>o.fulfilment!=='delivery').reduce((a,o)=>a+sub(o),0);
    const del=ords.filter(o=>o.fulfilment==='delivery').reduce((a,o)=>a+sub(o),0);
    return {shop_id:s.id,name:s.name,status:s.status,tier:trade?'trade':'other',selling_pct:pct,
      month_trade_spend:0,monthly_fee_due:set.enabled?(trade?+set.trade_monthly_fee:+set.other_monthly_fee):0,
      month_sales:+(col+del).toFixed(2),month_collect_sales:+col.toFixed(2),month_delivery_sales:+del.toFixed(2),
      month_selling_fee:set.enabled?Math.round(del*pct)/100:0};
  };
  async function load(){
    if(MOCK){
      F.s={enabled:Q.get('fees')==='1',trade_selling_pct:5,other_selling_pct:10,trade_monthly_fee:5,other_monthly_fee:15,trade_waiver_spend:300,free_listings:50};
      F.rows=ST.shops.map(x=>feeRowFromOrders(x,F.s));
      return;
    }
    const sb=NA.sb||window.sb;if(!sb)return;
    try{
      const[s,r]=await Promise.all([sb.from('marketplace_fee_settings').select('*').eq('id',1).single(),sb.rpc('admin_shop_fees')]);
      if(s.error)throw s.error;if(r.error)throw r.error;F.s=s.data;F.rows=r.data||[];
    }catch(e){F.err=e.message}
  }
  NA.sellingFeeOf=o=>{
    if(F.s&&!F.s.enabled)return 0;
    if(!o||o.fulfilment!=='delivery'||DEAD.includes(o.status))return 0;
    const row=(F.rows||[]).find(r=>r.shop_id===o.shop_id);
    let pct=row?+row.selling_pct:NaN;
    if(!Number.isFinite(pct)){
      const s=NA.shopById(o.shop_id);
      const email=(s?.bluepark_customer_email||'').toLowerCase().trim();
      pct=email&&ST.trade instanceof Set&&ST.trade.has(email)?5:10;
    }
    return Math.round(sub(o)*pct)/100;
  };
  const prev=V.partners;
  V.partners=function(){
    const inner=prev?prev():'';
    if(F.err)return `<div class="msg err">${/admin_shop_fees|marketplace_fee/.test(F.err)?'Run migrations/013_marketplace_fees.sql and migrations/018_collect_no_selling_fee.sql to enable marketplace fees.':esc(F.err)}</div>`+inner;
    if(!F.s)return inner;
    const on=F.s.enabled,R=F.rows||[];
    const due=R.reduce((a,r)=>a+(+r.monthly_fee_due||0)+(+r.month_selling_fee||0),0);
    const card=`<div class="card" style="padding:20px 22px;margin:0 0 22px"><div class="ph" style="padding:0 0 14px"><div>
      <h2 style="margin:0 0 6px">Marketplace fees &amp; payouts</h2>
      <p class="sub">Selling fee is a percentage of each completed delivery order’s subtotal. Click &amp; collect has no selling fee. Monthly fee is waived for trade shops that spend £${(+F.s.trade_waiver_spend).toFixed(0)}+ with Suman Bros that month.</p></div>
      <span class="chip ${on?'ok':'warn'}">${on?'Fees on':'Fees off'}</span></div>
      <div class="stats" style="margin:0 0 16px"><div class="stat"><b>${gbp(due)}</b><span>Estimated fees due this month</span></div>
        <div class="stat"><b>${(+F.s.trade_selling_pct).toFixed(1).replace(/\.0$/,'')}% / ${(+F.s.other_selling_pct).toFixed(1).replace(/\.0$/,'')}%</b><span>Trade / other selling fee on delivery</span></div>
        <div class="stat"><b>${gbp(F.s.trade_monthly_fee)} / ${gbp(F.s.other_monthly_fee)}</b><span>Trade / other monthly</span></div></div>
      ${R.length?`<div class="tw"><table class="t resp"><thead><tr><th>Shop</th><th>Tier</th><th>Selling fee</th><th class="num">Click &amp; collect</th><th class="num">Delivery sales</th><th class="num">Selling fees</th><th class="num">Monthly fee due</th></tr></thead>
        <tbody>${R.map(r=>`<tr><td class="first"><b>${esc(r.name)}</b></td><td data-l="Tier">${r.tier==='trade'?'Trade':'Other'}</td>
          <td data-l="Selling fee">${(+r.selling_pct).toFixed(1).replace(/\.0$/,'')}% on delivery</td>
          <td data-l="Click & collect" class="num">${gbp(r.month_collect_sales||0)} <span class="mut">no fee</span></td>
          <td data-l="Delivery sales" class="num">${gbp(r.month_delivery_sales!=null?r.month_delivery_sales:r.month_sales)}</td>
          <td data-l="Selling fees" class="num">${gbp(r.month_selling_fee)}</td>
          <td data-l="Monthly" class="num">${gbp(r.monthly_fee_due)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="mut">No shops yet.</p>'}</div>`;
    return card+inner;
  };
  async function ensure(){
    if(F.ready||F.loading)return;
    if(!((MOCK||ST.ok)&&ST.loaded))return;
    F.loading=true;
    try{await load()}catch(e){F.err=e.message||String(e)}
    F.ready=true;F.loading=false;
    NA.render();
  }
  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>ensure()).observe(app,{childList:true});
  addEventListener('hashchange',ensure);
  ensure();
})();
