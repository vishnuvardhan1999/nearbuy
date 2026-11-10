// ShopNip Wallet: store credit. Refunds go to the customer's wallet (migration_010_wallet.sql);
// customers spend it at checkout (full or partial). Writes only via RPCs: refund_order_to_wallet, place_order_wallet.
(function(){
const {A,MOCK,toast}=P2;
const KIND={refund:'Refund',order_payment:'Spent on order',order_reversal:'Returned (order cancelled)',adjustment:'Adjustment'};
const W={balance:0,tx:[],loaded:false,err:''};
const day=t=>new Date(t).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const r2=n=>Math.round(n*100)/100;
// ---------- data ----------
const MW=MOCK?(window.MWAL=window.MWAL||{balance:12.5,tx:[
  {id:3,amount:-7.5,balance_after:12.5,kind:'order_payment',note:'Paid towards order NB-1002',created_at:new Date(Date.now()-2*864e5).toISOString()},
  {id:2,amount:15,balance_after:20,kind:'refund',note:'Refund for order NB-1001 · Balloons arrived burst',created_at:new Date(Date.now()-5*864e5).toISOString()},
  {id:1,amount:5,balance_after:5,kind:'refund',note:'Refund for order NB-998 · Item out of stock',created_at:new Date(Date.now()-12*864e5).toISOString()}]}):null;
const D=MOCK?{
  async load(){return {balance:MW.balance,tx:MW.tx.slice()}},
  async refund(o,amt,reason){const max=refundable(o);if(!(amt>0))throw new Error('Refund amount must be more than £0');if(amt>max+1e-9)throw new Error('You can refund at most '+gbp(max)+' on this order');
    o.refunded_to_wallet=r2((+o.refunded_to_wallet||0)+amt);(o.order_events=o.order_events||[]).push({status:'refunded_to_wallet',note:gbp(amt)+' refunded to ShopNip wallet'+(reason?' · '+reason:''),at:new Date().toISOString()});
    if(o.customer_id==='u1'||o.customer_id==='c1'){MW.balance=r2(MW.balance+amt);MW.tx.unshift({id:Date.now(),amount:amt,balance_after:MW.balance,kind:'refund',note:'Refund for order '+o.order_number+(reason?' · '+reason:''),created_at:new Date().toISOString()});W.loaded=false}
    return {refunded:amt}},
  spend(o,use){if(!use)return 0;const u=r2(Math.min(MW.balance,o.total));if(u>0){MW.balance=r2(MW.balance-u);MW.tx.unshift({id:Date.now(),amount:-u,balance_after:MW.balance,kind:'order_payment',note:'Paid towards order '+o.order_number,created_at:new Date().toISOString()});o.wallet_applied=u}W.loaded=false;return u}
}:{
  async load(){if(!A.user||typeof sb==='undefined'||!sb)return {balance:0,tx:[]};
    const [w,t]=await Promise.all([sb.from('wallets').select('balance').eq('user_id',A.user.id).maybeSingle(),
      sb.from('wallet_transactions').select('id,amount,balance_after,kind,note,order_id,created_at').eq('user_id',A.user.id).order('created_at',{ascending:false}).limit(100)]);
    if(w.error&&!/relation|does not exist|schema cache/i.test(w.error.message))throw w.error;
    return {balance:+(w.data?.balance||0),tx:t.data||[]}},
  async refund(o,amt,reason){const {data,error}=await sb.rpc('refund_order_to_wallet',{p_order:o.id,p_amount:amt,p_reason:reason||null});if(error)throw error;
    o.refunded_to_wallet=data?.refunded_total??o.refunded_to_wallet;return data}
};
function refundable(o){return r2(Math.max(0,(o.status==='completed'?(+o.total||0):(+o.wallet_applied||0))-(+o.refunded_to_wallet||0)-(o.wallet_reversed?(+o.wallet_applied||0):0)))}
async function load(force){if(W.loaded&&!force)return W;try{const r=await D.load();W.balance=r.balance;W.tx=r.tx;W.err=''}catch(e){W.err=e.message}W.loaded=true;return W}

// ---------- My Wallet page ----------
V.wallet=function(){
  if(!A.user)return `<div class="empty">${svg('tag')}<br><b>ShopNip Wallet</b><br><small>Log in to see your wallet balance</small><br><br><button class="btn" data-o="login">Log in</button></div>`;
  if(!W.loaded){load().then(()=>{if(cur[0]==='wallet')render()});return '<div class="empty">Loading wallet…</div>'}
  return `<section class="sec narrow wal"><div class="sh"><h2>My Wallet</h2><a href="#" data-t="account">Account</a></div>
  <div class="wcard"><small>ShopNip Wallet balance</small><b>${gbp(W.balance)}</b><span>Spend it on any order at ShopNip. Choose “Use wallet balance” at checkout.</span></div>
  ${W.err?`<div class="alert">${esc(W.err)}</div>`:''}
  <div class="panel"><h3 class="ft">How your wallet works</h3><ul class="wl"><li>Refunds from shops on ShopNip are paid into your wallet as ShopNip credit.</li><li>Use it for all or part of your next order. Any amount left to pay is paid as usual.</li><li>If an order you paid with wallet money is cancelled or declined, that money comes straight back here.</li></ul></div>
  <div class="panel"><h3 class="ft">History</h3>${W.tx.length?W.tx.map(t=>`<div class="wtx"><div><b>${esc(KIND[t.kind]||t.kind)}</b><small>${esc(t.note||'')}</small><small>${day(t.created_at)}</small></div><div class="wamt ${t.amount>0?'in':'out'}">${t.amount>0?'+':'−'}${gbp(Math.abs(t.amount))}<small>Balance ${gbp(t.balance_after)}</small></div></div>`).join(''):'<p class="hint">No wallet activity yet.</p>'}</div></section>`};

// account page: wallet tile
const _acc=V.account;V.account=function(...a){const h=_acc.apply(this,a);if(!A.user||A.authPage||!h.includes('data-t="orders"'))return h;if(!W.loaded)load().then(()=>{if(cur[0]==='account')render()});
  return h.replace(/(<button class="at" data-t="orders">)/,`<button class="at" data-t="wallet">${svg('tag')}<span><b>My Wallet · ${gbp(W.balance)}</b><small>ShopNip credit from refunds, spend it at checkout</small></span></button>$1`)};

// ---------- refund dialog (shop inbox + admin share the RPC) ----------
function ask(o){return new Promise(res=>{const max=refundable(o);if(max<=0){toast('This order is already fully refunded');return res(null)}
  let el=document.getElementById('wref');if(!el){el=document.createElement('div');el.id='wref';document.body.appendChild(el)}
  el.innerHTML=`<div class="wr-bg"></div><form class="wr-card" role="dialog" aria-label="Refund to wallet"><h3>Refund ${esc(o.order_number||'')} to ShopNip wallet</h3>
   <p class="hint">The money goes into ${esc(o.customer_name||'the customer')}’s ShopNip wallet as credit to spend on ShopNip. It is not sent back to a card.</p>
   <label class="fl"><span>Amount (max ${gbp(max)})</span><input id="wr_amt" type="number" step="0.01" min="0.01" max="${max}" value="${max.toFixed(2)}" required></label>
   <label class="fl"><span>Reason (shown to the customer)</span><input id="wr_why" maxlength="200" placeholder="e.g. Item damaged, out of stock"></label>
   <div class="wr-a"><button type="button" class="btn ghost" data-wr="no">Cancel</button><button class="btn">Refund to wallet</button></div></form>`;
  el.className='on';const done=v=>{el.className='';el.innerHTML='';res(v)};
  el.querySelector('[data-wr=no]').onclick=()=>done(null);el.querySelector('.wr-bg').onclick=()=>done(null);
  el.querySelector('form').onsubmit=e=>{e.preventDefault();const amt=r2(+el.querySelector('#wr_amt').value);if(!(amt>0)||amt>max)return toast('Enter an amount up to '+gbp(max));done({amount:amt,reason:el.querySelector('#wr_why').value.trim()})}})}
async function refund(o){const p=await ask(o);if(!p)return false;try{await D.refund(o,p.amount,p.reason);toast(gbp(p.amount)+' refunded to the customer’s ShopNip wallet');return true}catch(e){toast(e.message);return false}}

const st=document.createElement('style');st.textContent=`.wal .wcard{padding:22px;border-radius:18px;background:linear-gradient(135deg,#0f3d3a,#1f6f66);color:#fff;margin-bottom:14px}.wal .wcard small{opacity:.85}.wal .wcard b{display:block;font-size:40px;font-weight:800;margin:4px 0}.wal .wcard span{font-size:13.5px;opacity:.9}
.wl{margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:1.6}.wtx{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #eef1f4}.wtx:first-of-type{border-top:0}.wtx small{display:block;color:#64748b;font-size:12.5px}
.wamt{text-align:right;font-weight:800;white-space:nowrap}.wamt.in{color:#15803d}.wamt.out{color:#b91c1c}.wamt small{font-weight:500}
.wopt{display:flex;gap:12px;align-items:center;padding:12px 14px;border:1.5px solid #1f6f66;border-radius:14px;background:#effaf7;margin-top:10px;cursor:pointer}.wopt input{width:20px;height:20px;accent-color:#1f6f66}.wopt small{display:block;color:#475569}
.line.wline span:last-child{color:#15803d;font-weight:700}
#wref{display:none}#wref.on{display:block}#wref .wr-bg{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:90}#wref .wr-card{position:fixed;z-index:91;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,92vw);background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
#wref h3{margin:0 0 6px}.wr-a{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.wref-tag{display:inline-block;margin-top:6px;font-size:12.5px;color:#15803d;font-weight:700}`;document.head.appendChild(st);
addEventListener('nb:auth',()=>{W.loaded=false});
window.WAL={state:W,load,refundable,refund,spend:(o,u)=>MOCK?D.spend(o,u):0,reset:()=>{W.loaded=false}};
})();
