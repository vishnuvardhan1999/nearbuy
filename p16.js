/* p16: Amazon-style customer account entry in the header + premium customer sign-in page. Customer auth stays on index.html. */
(()=>{const P=window.P2;if(!P)return;const A=P.A,Q=P.Q;
const css=`.hx{display:inline-flex;align-items:center;gap:10px}
.acb{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 12px;border-radius:12px;background:transparent;border:1px solid transparent;color:#fff;font:inherit;cursor:pointer;text-align:left;position:relative}
.acb:hover,.acb[aria-expanded=true]{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.08)}
.acb svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;flex:none}
.acb .t{display:flex;flex-direction:column;line-height:1.15}.acb small{font-size:11.5px;opacity:.8;white-space:nowrap}.acb b{font-size:13.5px;font-weight:800;white-space:nowrap}
.acw{position:relative}
.acm{position:absolute;right:0;top:calc(100% + 8px);min-width:210px;background:#fff;color:#0f172a;border-radius:14px;box-shadow:0 18px 50px rgba(15,23,42,.22);padding:8px;z-index:60;display:none}
.acm.open{display:block}.acm:before{content:"";position:absolute;right:22px;top:-6px;width:12px;height:12px;background:#fff;transform:rotate(45deg)}
.acm .hd{padding:8px 12px 10px;border-bottom:1px solid #eef0f3;margin-bottom:6px;font-size:13px;color:#64748b}.acm .hd b{display:block;color:#0f172a;font-size:14px}
.acm button,.acm a.acd{text-decoration:none;box-sizing:border-box;display:block;width:100%;text-align:left;background:none;border:0;padding:10px 12px;border-radius:10px;font:inherit;font-size:14px;font-weight:600;color:#0f172a;cursor:pointer}
.acm button:hover,.acm a.acd:hover{background:#f4f6f8}.acm button.so{color:#e11d48}
@media(max-width:767px){.acb{width:36px;height:36px;padding:0;justify-content:center;border-radius:50%;background:rgba(255,255,255,.1)}.acb .t{display:none}.acb svg{width:20px;height:20px}.hx{gap:6px}.hx .navab{display:none}}
.si{max-width:440px;margin:28px auto 48px}
.si .card{background:#fff;border:1px solid #e8ebf0;border-radius:22px;box-shadow:0 24px 60px rgba(15,23,42,.10);padding:32px 28px}
.si .mk{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#ff6b4a,#f43f5e);color:#fff;display:grid;place-items:center;font-weight:800;font-size:22px;margin-bottom:16px}
.si h2{font-size:26px;margin:0 0 6px;letter-spacing:-.02em}.si .lead{color:#64748b;margin:0 0 22px;font-size:14.5px}
.si .fl{display:block;margin-bottom:14px}.si .fl span{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.si .fl input{width:100%;box-sizing:border-box;height:48px;border:1.5px solid #dfe3ea;border-radius:12px;padding:0 14px;font:inherit;font-size:15px}
.si .fl input:focus{outline:0;border-color:#ff6b4a;box-shadow:0 0 0 4px rgba(255,107,74,.15)}
.si .btn.full{height:50px;border-radius:12px;font-size:15.5px;margin-top:6px}
.si .or{display:flex;align-items:center;gap:12px;color:#94a3b8;font-size:12.5px;margin:22px 0 14px}.si .or:before,.si .or:after{content:"";flex:1;height:1px;background:#e8ebf0}
.si .alt{display:block;width:100%;box-sizing:border-box;text-align:center;padding:13px;border:1.5px solid #dfe3ea;border-radius:12px;background:#fff;font:inherit;font-weight:700;color:#0f172a;cursor:pointer}
.si .alt:hover{background:#f8fafc}
.si .fine{font-size:12px;color:#94a3b8;margin:14px 0 0;text-align:center}
.si .sel{text-align:center;margin-top:18px;font-size:13px;color:#64748b}.si .sel a{color:#0f172a;font-weight:700}
.si .form{padding:0;border:0;box-shadow:none;background:none}`;
document.head.insertAdjacentHTML('beforeend',`<style id="p16css">${css}</style>`);
const ic='<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
const first=()=>{const n=(A.profile?.full_name||'').trim();return n?n.split(/\s+/)[0]:(A.user?.email||'').split('@')[0]};
const hx=document.querySelector('header .hx');const w=document.createElement('span');w.className='acw';hx&&hx.appendChild(w);
function paint(){window.LOC&&LOC.apply();if(!w)return;
  if(!A.user){w.innerHTML=`<button class="acb" data-acc="signin" aria-label="Sign in to your account">${ic}<span class="t"><small>Hello, sign in</small><b>Account &amp; orders</b></span></button>`;return}
  w.innerHTML=`<button class="acb" data-acc="menu" aria-haspopup="true" aria-expanded="false" aria-label="Your account">${ic}<span class="t"><small>Hi, ${esc(first())}</small><b>Account &amp; orders ▾</b></span></button>
  <div class="acm" role="menu"><div class="hd">Signed in as<b>${esc(A.user.email)}</b></div><button data-acc="orders" role="menuitem">Your orders</button><button data-acc="account" role="menuitem">Your account</button>${(A.shop||A.profile?.role==='owner')?`<a class="acd" role="menuitem" href="${window.SELLER_URL?SELLER_URL('overview'):'seller.html'}">Go to my shop dashboard</a>`:''}<button class="so" data-acc="out" role="menuitem">Sign out</button></div>`}
const close=()=>{const m=w.querySelector('.acm');if(m){m.classList.remove('open');w.querySelector('.acb').setAttribute('aria-expanded','false')}};
document.addEventListener('click',async e=>{if(e.target.closest('.acd'))return;const el=e.target.closest('[data-acc]');if(!el){close();return}e.preventDefault();e.stopPropagation();const a=el.dataset.acc;
  if(a==='menu'){const m=w.querySelector('.acm'),o=!m.classList.contains('open');m.classList.toggle('open',o);el.setAttribute('aria-expanded',o);return}
  close();
  if(a==='signin'||a==='new'){A.tab=a==='new'?'signup':'login';A.msg='';A.authPage=true;sessionStorage.removeItem('nb_next');return route('account')}
  if(a==='login'){A.tab='login';A.msg='';A.authPage=true;return route('account')}
  if(a==='orders')return route('orders');
  if(a==='account'){A.authPage=false;return route('account')}
  if(a==='cont'){A.authPage=false;P.toast('Signed in as '+A.user.email);return route('home')}
  if(a==='switch'){await P.DB.signOut();window.CK&&CK.clear();window.LOC&&LOC.clear();if(window.S){S.basket=[];localStorage.nb_basket='[]';document.querySelectorAll('[data-bc]').forEach(e=>{e.textContent=0;e.classList.add('hidden')})}A.user=null;A.shop=null;A.profile=null;A.tab='signup';A.msg='';A.authPage=true;P.toast('Signed out');route('account');setTimeout(()=>document.querySelectorAll('.si input').forEach(i=>i.value=''),0);return}
  if(a==='out'){await P.DB.signOut();A.authPage=false;A.user=null;A.shop=null;A.profile=null;P.toast('Signed out');return route('home')}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
/* customer sign-in page */
const fld=(id,l,at)=>`<label class="fl"><span>${l}</span><input id="${id}" ${at}></label>`;
const _acc=V.account;
V.account=function(...a){if(A.user&&A.authPage&&(LIVE||P.MOCK))return `<section class="si"><div class="card"><div class="mk">S</div><h2>You're signed in as ${esc(A.user.email)}</h2>
  <p class="lead">${A.tab==='signup'?'To create a separate customer account, sign out first.':'You are already signed in.'} The same account works for shopping and for your shop, if you have one.</p>
  <button class="btn full" data-acc="cont">Continue as ${esc(first())}</button>
  <div class="or">Not you?</div><button class="alt" data-acc="switch">Sign out and use a different account</button></div></section>`;
  if(A.user||!(LIVE||P.MOCK))return _acc.apply(this,a);const su=A.tab==='signup';
  const sel=window.SELLER_URL?SELLER_URL('login'):'seller.html#login';
  return `<section class="si"><div class="card"><div class="mk">S</div><h2>${su?'Create your account':'Sign in'}</h2>
  <p class="lead">${su?'Shop local, track orders and check out faster.':'Welcome back. Sign in to check out and track your orders.'}</p>
  <form class="form" data-form="${su?'signup':'login'}">${A.msg?`<div class="alert">${esc(A.msg)}</div>`:''}
  ${su?fld('f_name','Your name','autocomplete="off" value="" required'):''}${fld('f_email','Email','type="email" autocomplete="'+(su?'off':'email')+'" value="" required')}
  ${fld('f_pw','Password','type="password" minlength="8" autocomplete="'+(su?'new':'current')+'-password" required'+(su?' placeholder="At least 8 characters"':''))}
  <button class="btn full">${su?'Create your ShopNip account':'Sign in'}</button></form>
  <div class="or">${su?'Already have an account?':'New to ShopNip?'}</div>
  <button class="alt" data-acc="${su?'login':'new'}">${su?'Sign in instead':'Create your ShopNip account'}</button>
  <p class="fine">By continuing you agree to shop with local independents on ShopNip.</p></div>
  <p class="sel">Are you a shop? <a href="${sel}">Seller login</a></p></section>`};
/* refresh header whenever views re-render (login, logout, signup all route) */
const _r=window.route;window.route=route=function(...a){const r=_r.apply(this,a);paint();return r};
paint();
})();
