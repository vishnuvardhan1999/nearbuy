// ShopNip Admin · Marketplace fees (migration 013): selling fee % + monthly fee, trade vs other shops.
// Shown at the top of Partners & fees. Values are edited here; nothing is charged. Switched off until "Fees on" is saved.
(()=>{'use strict';
const NA=window.NBAdmin;if(!NA)return;const {V,MOCK,sb,render,esc,toast,gbp}=NA;
const F={loaded:false,busy:false,err:'',s:null,rows:[]};
const MS={enabled:false,trade_selling_pct:5,other_selling_pct:10,trade_monthly_fee:5,trade_waiver_spend:300,other_monthly_fee:15,free_listings:50};
const API=MOCK?{
  async load(){return{s:{...MS},rows:(NA.ST.shops||[]).map((x,i)=>({shop_id:x.id,name:x.name,status:x.status,tier:i===0?'trade':'other',selling_pct:i===0?MS.trade_selling_pct:MS.other_selling_pct,month_trade_spend:i===0?412.5:0,monthly_fee_due:i===0?0:MS.other_monthly_fee,month_sales:120,month_selling_fee:i===0?6:12}))}},
  async save(v){Object.assign(MS,v)}
}:{
  async load(){const [a,b]=await Promise.all([sb.from('marketplace_fee_settings').select('*').eq('id',1).maybeSingle(),sb.rpc('admin_shop_fees')]);
    if(a.error)throw a.error;if(b.error)throw b.error;return{s:a.data,rows:b.data||[]}},
  async save(v){const {error}=await sb.from('marketplace_fee_settings').update({...v,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error}
};
async function load(){if(F.busy)return;F.busy=true;try{Object.assign(F,await API.load());F.err=''}catch(e){F.err=e.message||String(e)}F.busy=false;F.loaded=true;render()}
const n=(k,lab,step,min=0)=>`<label class="fld"><span>${lab}</span><input name="${k}" type="number" min="${min}" step="${step}" value="${esc(F.s[k])}" required></label>`;
function card(){if(!F.loaded){load();return '<div class="card"><div class="bd">Loading marketplace fees…</div></div>'}
  if(F.err)return `<div class="card"><div class="hd"><h3>Marketplace fees</h3></div><div class="bd"><div class="msg err">${esc(F.err)}</div><p class="mut">Needs migration 013 (marketplace_fee_settings, admin_shop_fees). Run it in Supabase, then refresh.</p></div></div>`;
  const s=F.s,R=F.rows,due=R.reduce((t,r)=>t+(+r.monthly_fee_due||0),0),sell=R.reduce((t,r)=>t+(+r.month_selling_fee||0),0);
  return `<div class="card" style="margin-bottom:16px"><div class="hd"><h3>Marketplace fees</h3><span class="pill ${s.enabled?'p-ok':'p-off'}">${s.enabled?'Fees on':'Fees off'}</span></div>
   <form class="bd" id="mfees"><p class="mut" style="margin-top:0">Selling fee is a % of each completed order’s subtotal. Trade shops are shops whose trade email buys wholesale from Suman Bros. While fees are off, sellers see nothing about them and nothing is charged.</p>
    <div class="prow">${n('trade_selling_pct','Trade selling fee (%)','0.5')}${n('other_selling_pct','Other shops selling fee (%)','0.5')}</div>
    <div class="prow">${n('trade_monthly_fee','Trade monthly fee (£)','0.5')}${n('trade_waiver_spend','Trade fee free above monthly Suman Bros spend (£)','10')}${n('other_monthly_fee','Other shops monthly fee (£)','0.5')}</div>
    <div class="prow">${n('free_listings','Products free to list','1')}<label class="fld" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="enabled" ${s.enabled?'checked':''} style="width:auto"> <span>Fees on (shown to sellers)</span></label><button class="btn" type="submit">Save fees</button></div></form>
   ${R.length?`<table class="pt"><thead><tr><th>Shop</th><th>Tier</th><th class="num">Selling fee</th><th class="num">Suman Bros spend (month)</th><th class="num">Monthly fee due</th><th class="num">Selling fees (month)</th></tr></thead><tbody>
    ${R.map(r=>`<tr><td><b>${esc(r.name)}</b><div class="mut" style="font-size:12px">${esc(r.status||'')}</div></td><td>${r.tier==='trade'?'<span class="pill p-ok">Trade</span>':'<span class="pill p-off">Other</span>'}</td><td class="num">${(+r.selling_pct).toFixed(1)}%</td><td class="num">${gbp(r.month_trade_spend)}</td><td class="num">${gbp(r.monthly_fee_due)}</td><td class="num">${gbp(r.month_selling_fee)}</td></tr>`).join('')}
    <tr><td colspan="4"><b>Total this month${s.enabled?'':' (if fees were on)'}</b></td><td class="num"><b>${gbp(due)}</b></td><td class="num"><b>${gbp(sell)}</b></td></tr></tbody></table>`:''}</div>`}
const base=V.partners;V.partners=()=>{const h=base();const i=h.indexOf('</div></div>');/* after the page header */return i<0?card()+h:h.slice(0,i+12)+card()+h.slice(i+12)};
document.addEventListener('submit',async e=>{if(e.target.id!=='mfees')return;e.preventDefault();const f=new FormData(e.target),v={enabled:!!f.get('enabled')};
  for(const k of ['trade_selling_pct','other_selling_pct','trade_monthly_fee','trade_waiver_spend','other_monthly_fee'])v[k]=Math.max(0,+f.get(k)||0);v.free_listings=Math.max(0,parseInt(f.get('free_listings'))||0);
  if(v.trade_selling_pct>100||v.other_selling_pct>100)return toast('Selling fee must be 100% or less');
  if(v.enabled&&!F.s.enabled&&!confirm('Turn fees on? Sellers will see the fees on the seller page and in their dashboard.'))return;
  try{await API.save(v);toast('Fees saved');F.loaded=false;load()}catch(er){toast(er.message||String(er))}});
addEventListener('hashchange',()=>{if(location.hash==='#partners')F.loaded=false});
})();
