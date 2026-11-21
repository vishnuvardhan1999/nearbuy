// ShopNip card payments (Stripe test mode). The publishable key is public. The secret stays on the server.
(function(){
const CFG=window.APP_CONFIG||{};
const PK=CFG.STRIPE_PUBLISHABLE_KEY||'';
const Q=new URLSearchParams(location.search);
const MOCK=Q.get('mock')==='1';
function sb(){return window.sb||(window.NBSeller&&NBSeller.sb)||null}
function toast(m){if(typeof window.toast==='function')window.toast(m);else if(window.NBSeller&&NBSeller.toast)NBSeller.toast(m)}
const gbp=n=>'£'+(Number(n)||0).toFixed(2);
function isCard(o){return !!(o&&o.payment_method==='card')}
function shopReady(s){return !!(s&&s.stripe_charges_enabled)}
function badge(o){
  if(!isCard(o))return '';
  return {unpaid:'Not paid yet',authorised:'Card authorised',paid:'Paid',refunded:'Refunded',partially_refunded:'Partly refunded',failed:'Card payment failed'}[o.payment_status]||'';
}
function phrase(o){
  if(isCard(o)){const b=badge(o);return b?('card · '+b):'card'}
  if(o&&o.payment_method==='pay_on_delivery')return 'pay on delivery';
  return 'pay at the shop';
}
function extra(o){
  if(!o)return '';
  if(!isCard(o))return '';
  const b=badge(o);
  const paid=+o.amount_paid||0, back=+o.amount_refunded||0;
  let s='<p class="hint" style="margin:8px 0 0"><b>'+b+'</b>';
  if(o.payment_status==='authorised')s+='. The shop takes the money when they accept, and only the final total';
  else if(paid)s+=' '+gbp(paid)+(back?' · '+gbp(back)+' refunded to the card':'');
  if(+o.total_at_place&&+o.total<+o.total_at_place&&paid)s+='. Captured '+gbp(paid)+' after the total went down from '+gbp(o.total_at_place);
  return s+'.</p>';
}
async function call(name,body){
  const c=sb();if(!c||!c.functions)throw new Error('Please sign in to pay by card');
  const {data,error}=await c.functions.invoke(name,{body});
  if(error){let msg=error.message||'Card payment failed';try{const j=await error.context.json();if(j&&j.error)msg=j.error}catch(_){}
    if(/Failed to send|FunctionsFetchError|FunctionsHttpError|non-2xx/i.test(msg))msg='Card payment could not start. Please try again in a moment.';
    throw new Error(msg)}
  if(data&&data.error)throw new Error(data.error);
  return data||{};
}
function loadStripe(){if(window.Stripe)return Promise.resolve(window.Stripe);
  return new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://js.stripe.com/v3/';s.onload=()=>ok(window.Stripe);s.onerror=()=>no(new Error('Could not load card payments'));document.head.appendChild(s)})}
let elements=null,stripe=null;
async function mount(host,clientSecret){
  if(!host)return;
  if(MOCK){host.innerHTML='<label class="fl"><span>Card number</span><input id="pay_num" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" value=""></label><div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="fl"><span>Expiry</span><input id="pay_exp" inputmode="numeric" autocomplete="cc-exp" placeholder="12 / 28"></label><label class="fl"><span>CVC</span><input id="pay_cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123"></label></div><p class="hint">Test mode. Use 4242 4242 4242 4242 to authorise, or 4000 0000 0000 9995 to decline. Apple Pay and Google Pay show here when the shop takes cards live.</p>';return}
  if(!clientSecret){host.innerHTML='<p class="hint">Waiting for the card form…</p>';throw new Error('The card form is not ready yet. Please try Place order again.');}
  const Stripe=await loadStripe();if(!PK)throw new Error('Card payments are not set up');
  stripe=Stripe(PK);elements=stripe.elements({clientSecret,appearance:{theme:'stripe',variables:{colorPrimary:'#0f766e',borderRadius:'12px'}}});
  host.innerHTML='';const pe=elements.create('payment');pe.mount(host);
}
async function confirmMock(order){
  const num=(document.getElementById('pay_num')?.value||'').replace(/\s/g,'');
  if(num==='4000000000009995'){order.payment_status='failed';throw new Error('Your card was declined')}
  if(num!=='4242424242424242')throw new Error('Use the test card 4242 4242 4242 4242, or 4000 0000 0000 9995 to see a decline');
  const due=Math.max(0,(+order.total||0)-(+order.wallet_applied||0));
  order.payment_method='card';order.payment_status='authorised';order.amount_authorised=due;order.stripe_payment_intent_id='pi_test_'+order.id;
  return order;
}
async function confirmLive(){
  if(!stripe||!elements)throw new Error('The card form is not ready');
  const r=await stripe.confirmPayment({elements,redirect:'if_required'});
  if(r.error)throw new Error(r.error.message||'Your card was declined');
  return r.paymentIntent;
}
async function start(order){
  if(MOCK)return {mock:true};
  return call('stripe-create-payment',{order_id:order.id});
}
async function settle(orderId,action){
  if(!orderId)return;
  if(MOCK){const bags=[];if(window.NBSeller&&NBSeller.D)bags.push(NBSeller.D.O);if(window.P2&&P2.M)bags.push(P2.M.orders);
    bags.forEach(list=>(list||[]).forEach(o=>{if(o.id!==orderId||o.payment_method!=='card')return;
      if(action==='cancel'||['rejected','cancelled'].includes(o.status)){if(o.payment_status!=='paid')o.payment_status='unpaid';return}
      if(o.awaiting_customer)return;
      const due=Math.max(0,(+o.total||0)-(+o.wallet_applied||0));
      if(due<=0){o.payment_status='unpaid';o.amount_paid=0;return}
      o.amount_paid=Math.round(due*100)/100;o.payment_status='paid'}));
    return {mock:true}}
  try{return await call('stripe-capture-or-adjust',{order_id:orderId,action})}catch(e){toast(e.message);return {error:e.message}}
}
async function refund(orderId,amount){
  if(MOCK){const o=(window.NBSeller&&NBSeller.D.O||[]).find(x=>x.id===orderId);if(!o||o.payment_method!=='card')throw new Error('This order was not paid by card');
    const left=Math.round(((+o.amount_paid||0)-(+o.amount_refunded||0))*100)/100;let want=amount==null?left:Math.round(+amount*100)/100;
    if(want>left+0.001)throw new Error('That is more than the customer paid on the card');
    o.amount_refunded=Math.round(((+o.amount_refunded||0)+want)*100)/100;o.payment_status=o.amount_refunded+0.001>=+o.amount_paid?'refunded':'partially_refunded';return o}
  return call('stripe-refund',{order_id:orderId,amount});
}
async function connect(){
  if(MOCK){const s=window.NBSeller&&NBSeller.D.shop;if(!s)throw new Error('Open the seller dashboard first');
    if(!s.stripe_account_id){s.stripe_account_id='acct_test';s.stripe_charges_enabled=false;toast('Stripe setup started. Finish it, then refresh status.')}
    else{s.stripe_charges_enabled=true;toast('Card payments are ready in test mode')}
    return {mock:true}}
  const data=await call('stripe-connect-onboard',{});
  if(!data||!data.url)throw new Error('Stripe did not return an onboarding link');
  location.href=data.url;
}
if(!document.getElementById('paycss')){const st=document.createElement('style');st.id='paycss';st.textContent='.pay-badge{display:inline-block;font-size:12px;font-weight:800;padding:2px 8px;border-radius:999px;background:#ecfdf5;color:#047857}.pay-badge.refunded,.pay-badge.failed{background:#fef2f2;color:#b42318}.pay-badge.authorised{background:#eff6ff;color:#1d4ed8}#pay-element{margin-top:8px}';document.head.appendChild(st)}
window.NBPay={PK,isCard,shopReady,badge,phrase,extra,start,mount,confirmMock,confirmLive,settle,refund,connect,call};
})();
