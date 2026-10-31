/* p29: clear shopper vs seller sign-in. One account works as both; shoppers use "Sign in", shops use "For shops · Seller sign in".
   Post-processes the header, account menu, customer sign-in/account pages and footer, and normalises wording to Sign in / Sign out. */
(()=>{const P=window.P2;if(!P)return;const A=P.A;
const SU=h=>window.SELLER_URL?SELLER_URL(h):'seller.html'+(h?'#'+h:'');
document.head.insertAdjacentHTML('beforeend',`<style id="p29css">
header .sellk.p29{background:transparent;border:1.5px solid rgba(255,255,255,.45);flex-direction:column;align-items:flex-start;justify-content:center;line-height:1.1;gap:1px;padding:0 14px}
header .sellk.p29 small{font-size:11px;font-weight:600;opacity:.85}header .sellk.p29 span{font-size:13.5px}
header .sellk.p29:hover{background:rgba(255,255,255,.1);filter:none}
@media(max-width:767px){header .sellk.p29 small{display:none}header .sellk.p29{height:32px;padding:0 10px}header .sellk.p29 span{font-size:11.5px}
 .acw .acb.p29out{width:auto;border-radius:999px;padding:0 12px;height:34px;gap:6px}.acw .acb.p29out .t{display:flex}.acw .acb.p29out .t small{display:none}.acw .acb.p29out b{font-size:12.5px}.acw .acb.p29out svg{width:18px;height:18px}}
@media(max-width:430px){header a.sellk.p29{display:none!important}}
.si .sel{background:#f8fafc;border:1px solid #e8ebf0;border-radius:14px;padding:12px 14px}
.acm .acd.p29sw,.shopc .btn.p29sw{font-weight:800}.acm .acd.p29sw{color:#0f766e}
</style>`);
const W=[[/\bLog in or sign up\b/g,'Sign in or create an account'],[/\bLog in\b/g,'Sign in'],[/\blog in\b/g,'sign in'],[/\bLog out\b/g,'Sign out'],[/\bLogged in\b/g,'Signed in'],[/\bLogin\b/g,'Sign in'],[/\bNearbuy\b|\bNearBuy\b/g,'ShopNip']];
function words(root){if(!root)return;const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){let t=n.nodeValue,o=t;W.forEach(([r,s])=>t=t.replace(r,s));if(t!==o)n.nodeValue=t}
  root.querySelectorAll&&root.querySelectorAll('[aria-label],[placeholder]').forEach(e=>['aria-label','placeholder'].forEach(k=>{const v=e.getAttribute(k);if(!v)return;let t=v;W.forEach(([r,s])=>t=t.replace(r,s));if(t!==v)e.setAttribute(k,t)}))}
function set(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}
function fix(){
  /* header: secondary "For shops" link (seller sign in), primary "Sign in" for shoppers */
  const sk=document.querySelector('header .sellk');if(sk){sk.classList.add('p29');sk.href=SU('');sk.removeAttribute('data-sell');sk.setAttribute('aria-label','Become a seller');set(sk,'<span>Become a seller</span>')}
  const b=document.querySelector('.acw .acb');
  if(b&&b.dataset.acc==='signin'){b.classList.add('p29out');b.setAttribute('aria-label','Sign in to shop');set(b.querySelector('.t'),'<b>Sign in</b>')}
  if(b&&b.dataset.acc==='menu'){b.classList.remove('p29out');const d=document.querySelector('.acm a.acd');if(d){d.classList.add('p29sw');if(d.textContent!=='Switch to seller dashboard')d.textContent='Switch to seller dashboard'}}
  /* customer account page */
  const v=document.getElementById('view');
  if(v){v.querySelectorAll('.shopc a.btn').forEach(a=>{a.classList.add('p29sw');if(a.textContent!=='Switch to seller dashboard')a.textContent='Switch to seller dashboard'});
    if(A.user&&!(A.shop||A.profile?.role==='owner'))v.querySelectorAll('p.foot').forEach(p=>{if(/Own a shop/.test(p.textContent))p.remove()})}
  /* footer: separate seller entry points */
  document.querySelectorAll('#register4').forEach(r=>{const c=r.parentElement;c.innerHTML=`<h5>For shops</h5><a href="${SU('login')}">Seller sign in</a><a href="${SU('')}">Become a seller</a><a href="#how">How it works</a>`});
  words(document.body)}
let q=0;const go=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;mo.disconnect();try{fix()}finally{mo.observe(document.body,{childList:true,subtree:true,characterData:true})}})};
const mo=new MutationObserver(go);fix();mo.observe(document.body,{childList:true,subtree:true,characterData:true});
})();
