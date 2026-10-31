/* Audit fixes that sit on top of the current pages: auth/location skeleton, location dialog,
   shop phone links, and keeping the install banner and chat off the checkout summary.
   Loaded last so it can wrap the functions the earlier files already installed. */
(()=>{
if(typeof S==='undefined')return;
S.authKnown=false;
S.locPending='';

function readLoc(raw){try{const v=JSON.parse(raw||'null');return v&&v.pc&&v.me?v:null}catch(e){return null}}
function savedLoc(){
  const last=readLoc(localStorage.getItem('nb_loc:last'));
  if(last)return last;
  const found=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('nb_loc:')||k==='nb_loc:last')continue;
    const v=readLoc(localStorage.getItem(k));
    if(v)found.push({k,v});
  }
  const user=found.filter(x=>x.k!=='nb_loc:guest');
  if(user.length===1)return user[0].v;
  if(found.length===1)return found[0].v;
  return null;
}
(function hydrate(){
  const loc=savedLoc();
  if(!loc)return;
  S.me=loc.me;S.pc=loc.pc;
  const pc=document.getElementById('pc');
  if(pc)pc.textContent=loc.pc;
})();
if(window.LOC&&LOC.set){
  const set=LOC.set.bind(LOC);
  LOC.set=function(me,pc){try{localStorage.setItem('nb_loc:last',JSON.stringify({me,pc}))}catch(e){}return set(me,pc)};
}

function authWait(){
  if(S.authKnown)return;
  const w=document.querySelector('.acw');
  if(!w)return;
  w.innerHTML='<span class="acb ac-wait" aria-busy="true" aria-label="Checking your account"><span class="t"><small>Account</small><b>Loading</b></span></span>';
}
authWait();
if(window.P2&&P2.init){
  const init=P2.init.bind(P2);
  P2.init=async function(){
    try{return await init()}
    finally{S.authKnown=true;if(window.LOC){LOC.last=undefined;try{LOC.apply()}catch(e){}}}
  };
}

if(typeof shopsSection==='function'){
  const orig=shopsSection;
  shopsSection=function(){
    if(S.locPending)return `<section class="sec sec5"><div class="sh"><h2>Shops near ${esc(S.locPending)}</h2></div><div class="skl" aria-busy="true" aria-label="Updating shops"><i></i><i></i><i></i></div></section>`;
    let h=orig();
    if(S.me)h=h.replace(/Showing all shops\. Set your location to see distances and shops near you\./g,'');
    return h;
  };
}

function rememberLoc(me,pc){try{localStorage.setItem('nb_loc:last',JSON.stringify({me,pc}))}catch(e){}}
async function onLocSet(e){
  e.preventDefault();e.stopPropagation();
  const input=document.getElementById('loc_pc');
  const v=(input&&input.value||'').trim();
  if(!v)return;
  const typed=v.toUpperCase();
  document.getElementById('locm')?.remove();
  const pc=document.getElementById('pc');if(pc)pc.textContent=typed;
  S.locPending=typed;
  if(typeof NB_BOOTED!=='undefined'&&NB_BOOTED&&typeof render==='function')render();
  try{
    const r=await lookupPostcode(typed);
    S.locPending='';
    rememberLoc({lat:r.lat,lng:r.lng},r.pc);
    setMe({lat:r.lat,lng:r.lng},r.pc);
  }catch(err){
    S.locPending='';
    if(typeof render==='function')render();
    if(typeof askPostcode==='function')askPostcode();
    const er=document.getElementById('loc_err');if(er)er.textContent='Sorry, we could not find that postcode.';
    const again=document.getElementById('loc_pc');if(again)again.value=typed;
  }
}
function hookLoc(root){
  (root||document).querySelectorAll('#locm form[data-locf]').forEach(f=>{
    if(f.dataset.auditLoc)return;
    f.dataset.auditLoc='1';
    f.removeAttribute('data-locf');
    f.addEventListener('submit',onLocSet);
  });
}
hookLoc(document);
new MutationObserver(()=>hookLoc(document)).observe(document.body,{childList:true,subtree:true});

function formatUKPhone(raw){
  const shown=String(raw||'').trim();
  let n=shown.replace(/[^\d+]/g,'');
  if(n.startsWith('+44'))n='0'+n.slice(3);
  else if(n.startsWith('44')&&n.length>10)n='0'+n.slice(2);
  if(!/^0\d{9,10}$/.test(n))return shown||raw;
  if(/^07\d{9}$/.test(n))return n.replace(/^(07\d{3})(\d{6})$/,'$1 $2');
  if(/^02\d{9}$/.test(n))return n.replace(/^(02\d)(\d{4})(\d{4})$/,'$1 $2 $3');
  if(/^01\d1\d{7}$/.test(n))return n.replace(/^(01\d1)(\d{3})(\d{4})$/,'$1 $2 $3');
  if(/^01\d{9}$/.test(n))return n.replace(/^(01\d{3})(\d{6})$/,'$1 $2');
  if(/^0\d{10}$/.test(n))return n.replace(/^(0\d{3})(\d{4})(\d{4})$/,'$1 $2 $3');
  return shown;
}
function telHref(raw){
  const d=String(raw||'').replace(/[^\d+]/g,'');
  if(d.startsWith('+'))return d;
  if(d.startsWith('0'))return '+44'+d.slice(1);
  return d;
}
function wrapShop(){
  if(!window.V||!V.shop||V.shop._auditPhone)return;
  const orig=V.shop;
  const wrapped=function(){
    const h=orig.apply(this,arguments);
    if(typeof h!=='string')return h;
    return h.replace(/<a href="tel:[^"]*">([\s\S]*?)<\/a>/g,(m,text)=>{
      const label=formatUKPhone(text.replace(/<[^>]+>/g,''));
      return `<a href="tel:${telHref(label)}">${label}</a>`;
    });
  };
  wrapped._auditPhone=1;
  V.shop=wrapped;
}
wrapShop();
if(window.Social&&Social.boot){
  const boot=Social.boot.bind(Social);
  Social.boot=async function(){const r=await boot();wrapShop();return r};
}

function syncChrome(){
  const page=(typeof cur!=='undefined'&&cur&&cur[0])||'';
  document.body.dataset.page=page;
  const checkout=page==='checkout';
  document.body.classList.toggle('nb-hide-chat',checkout);
  if(checkout){document.getElementById('p28inst')?.remove();document.body.classList.remove('nb-inst')}
  document.body.classList.toggle('nb-inst',!!document.getElementById('p28inst'));
}
if(typeof route==='function'){
  const prev=route;
  window.route=route=function(){
    const r=prev.apply(this,arguments);
    if(!S.authKnown)authWait();
    syncChrome();
    return r;
  };
}
new MutationObserver(syncChrome).observe(document.body,{childList:true,subtree:true});
})();
