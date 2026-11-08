/* p33.js: shop new-order alerts (SMS, WhatsApp, phone call).
   Prefs live on shop.delivery_options.order_alerts so saveShop persists them.
   Live sending is supabase/functions/order-alert (Twilio). Mock only toasts on the seller app. */
(()=>{
const CFG=window.APP_CONFIG||{};
const SITE=(CFG.SITE_URL||'https://www.shopnip.co.uk').replace(/\/$/,'');

const digits=p=>String(p||'').replace(/\D/g,'');
function toE164(p){
  const d=digits(p);
  if(d.length===12&&d.startsWith('44'))return '+'+d;
  if(d.length===11&&d.startsWith('07'))return '+44'+d.slice(1);
  if(d.length===10&&d.startsWith('7'))return '+44'+d;
  return null;
}
const isMobile=p=>!!toE164(p);

function prefs(shop){
  const a=(shop&&shop.delivery_options&&shop.delivery_options.order_alerts)||{};
  let mobile=String(a.mobile||'').trim();
  if(!mobile&&isMobile(shop&&shop.phone))mobile=String(shop.phone).trim();
  return {sms:a.sms!==false,whatsapp:a.whatsapp!==false,call:!!a.call,mobile};
}
function channelsOn(p){
  const out=[];
  if(p.sms)out.push('SMS');
  if(p.whatsapp)out.push('WhatsApp');
  if(p.call)out.push('phone call');
  return out;
}
function listAnd(arr){
  if(!arr.length)return '';
  if(arr.length===1)return arr[0];
  if(arr.length===2)return arr[0]+' and '+arr[1];
  return arr.slice(0,-1).join(', ')+' and '+arr[arr.length-1];
}
function itemCount(order){
  const items=order&&(order.order_items||order.items)||[];
  const n=items.reduce((t,i)=>t+(+i.qty||0),0);
  return n||items.length||1;
}
function fulfilmentLabel(order){
  if(order&&order.fulfilment==='delivery'){
    return 'delivery'+(order.delivery_window?' ('+order.delivery_window+')':'');
  }
  return 'click & collect';
}
function message(order,shop){
  const n=itemCount(order);
  const total=(Number(order&&order.total)||0).toFixed(2);
  const num=(order&&order.order_number)||'a new order';
  return `New ShopNip order ${num}: ${n} item${n===1?'':'s'}, £${total}, ${fulfilmentLabel(order)}. Open ShopNip Seller to accept: ${SITE}/seller.html#orders`;
}
function isMock(){
  if(window.NBSeller&&typeof window.NBSeller.MOCK==='boolean')return window.NBSeller.MOCK;
  try{return new URLSearchParams(location.search).get('mock')==='1'}catch{return false}
}
function onSeller(){return /seller\.html/i.test(location.pathname||'')}
function toast(msg){if(typeof window.toast==='function')window.toast(msg)}

async function notifyShop(shop,order,opts){
  try{
    const p=prefs(shop);
    const ch=channelsOn(p);
    if(!ch.length||!toE164(p.mobile))return {skipped:'no alerts'};
    if(isMock()||!(window.sb&&window.sb.functions)){
      if(onSeller()||(opts&&opts.toast)){
        const last3=digits(p.mobile).slice(-3);
        toast('Order alert sent: '+listAnd(ch)+' to a number ending '+last3);
      }
      return {ok:true,mock:true,channels:ch};
    }
    window.sb.functions.invoke('order-alert',{body:{order_id:order&&order.id,event:'placed'}}).catch(()=>{});
    return {ok:true};
  }catch(e){return {error:String(e&&e.message||e)}}
}

/* escalation for an order nobody has accepted yet (rel.js drives the timing):
   step 'reminder' = SMS/WhatsApp again, 'call' = phone call. Never auto-accepts. */
async function escalate(shop,order,step){
  try{
    const p=prefs(shop);
    if(isMock()||!(window.sb&&window.sb.functions)){
      const ch=step==='call'?['phone call']:channelsOn({...p,call:false});
      if(onSeller()&&ch.length)toast((step==='call'?'Calling ':'Reminder sent by ')+listAnd(ch)+' to a number ending '+digits(p.mobile).slice(-3));
      return {ok:true,mock:true};
    }
    window.sb.functions.invoke('order-alert',{body:{order_id:order&&order.id,event:step==='call'?'call':'reminder'}}).catch(()=>{});
    return {ok:true};
  }catch(e){return {error:String(e&&e.message||e)}}
}
/* customer updates (accepted with stock check, declined, late). Mock: on-screen only. */
async function notifyCustomer(order,event){
  try{
    if(isMock()||!(window.sb&&window.sb.functions))return {ok:true,mock:true};
    window.sb.functions.invoke('order-alert',{body:{order_id:order&&order.id,event:'customer_'+event}}).catch(()=>{});
    return {ok:true};
  }catch(e){return {error:String(e&&e.message||e)}}
}

window.P33={prefs,toE164,isMobile,validUKMobile:isMobile,message,notifyShop,channelsOn,escalate,notifyCustomer};
})();
