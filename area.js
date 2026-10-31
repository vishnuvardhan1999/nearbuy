/* area.js: "ShopNip isn't in your area yet" notice when no shop is near the shopper's postcode,
   with browse-all / change-postcode actions and a "Tell me when you arrive" email capture (table area_waitlist,
   migrations/011_area_waitlist.sql; fails gracefully if the table is missing). Loaded last. */
(()=>{
const NEAR_MI=10;let MSG='',EM='';
const hav=(a,b)=>{const R=3958.8,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dn=r(b.lng-a.lng);return 2*R*Math.asin(Math.sqrt(Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2))};
function covered(){
  if(!S.me||S.me.lat==null)return true;
  const real=(S.shops||[]).filter(s=>!s.demo&&s.lat!=null&&s.lng!=null);
  if(!real.length&&(S.shops||[]).some(s=>s.demo))return true;
  return real.some(s=>{const d=hav(S.me,s),o=s.delivery_options||{};return d<=NEAR_MI||(o.delivery&&d<=+(o.delivery_radius_miles||0))});
}
const key=()=>'nb_area_x:'+(S.pc||'');
function box(){
  const pc=esc(S.pc||'your area'),done=localStorage.getItem('nb_area_ok:'+(S.pc||''));
  return `<section class="area-nt" id="areant" role="status"><button class="area-x" aria-label="Close" data-areax>×</button>
  <div class="area-ic" aria-hidden="true">📍</div><div class="area-b"><h2>ShopNip isn’t in your area yet</h2>
  <p>We don’t have shops near <b>${pc}</b> yet. You can still browse every product, and order for click &amp; collect from a shop you can get to.</p>
  <div class="area-a"><a class="btn" href="/products" data-go="/products">Browse all products</a><button class="btn ghost" type="button" data-areapc>Change postcode</button></div>
  ${done?'<p class="area-ok">Thanks, we’ll email you when ShopNip arrives near you.</p>':`<form class="area-f" data-areaf><label for="area_em">Tell me when you arrive</label><div class="area-r"><input id="area_em" type="email" required autocomplete="email" placeholder="you@example.com" value="${esc(EM)}"><button class="btn coral" type="submit">Notify me</button></div><small>We’ll only use this to tell you when shops near ${pc} join. <a href="/privacy">Privacy</a></small><p class="area-m" aria-live="polite">${MSG}</p></form>`}</div></section>`;
}
function want(){return typeof cur!=='undefined'&&['home','products','search'].includes(cur[0])&&!covered()&&!sessionStorage.getItem(key())}
function paint(){
  const ex=document.getElementById('areant'),w=want();
  if(!w){ex?.remove();return}
  if(ex&&ex.dataset.pc===(S.pc||''))return;ex?.remove();
  const v=document.getElementById('view');if(!v)return;
  const hero=cur[0]==='home'?v.querySelector('#h5'):null;
  hero?hero.insertAdjacentHTML('afterend',box()):v.insertAdjacentHTML('afterbegin',box());
  const n=document.getElementById('areant');if(n)n.dataset.pc=S.pc||'';
}
if(typeof render==='function'){const _r=render;render=function(){const x=_r.apply(this,arguments);try{paint()}catch(e){}return x}}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-areax]')){sessionStorage.setItem(key(),'1');paint()}
  if(e.target.closest('[data-areapc]')){const l=document.getElementById('loc');l?l.click():(typeof askPostcode==='function'&&askPostcode())}
});
document.addEventListener('submit',async e=>{
  const f=e.target.closest('[data-areaf]');if(!f)return;e.preventDefault();
  const em=f.querySelector('input').value.trim(),b=f.querySelector('button');EM=em;const m={set textContent(t){MSG=esc(t);const x=document.querySelector('#areant .area-m');if(x)x.innerHTML=MSG},set innerHTML(h){MSG=h;const x=document.querySelector('#areant .area-m');if(x)x.innerHTML=MSG}};
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){m.textContent='Please enter a valid email address.';return}
  b.disabled=true;m.textContent='Saving…';
  let ok=false;
  try{if(typeof sb!=='undefined'&&sb){const {error}=await sb.from('area_waitlist').insert({email:em,postcode:S.pc||null,lat:S.me?.lat??null,lng:S.me?.lng??null,source:'web'});ok=!error;if(error)console.warn('area_waitlist',error.message)}}catch(err){console.warn('area_waitlist',err)}
  if(ok){MSG='';localStorage.setItem('nb_area_ok:'+(S.pc||''),'1');(document.querySelector('#areant [data-areaf]')||f).outerHTML='<p class="area-ok">Thanks, we’ll email you when ShopNip arrives near you.</p>'}
  else{const bb=document.querySelector('#areant [data-areaf] button');if(bb)bb.disabled=false;m.innerHTML=`Sorry, we couldn’t save that right now. Email <a href="mailto:hello@shopnip.co.uk?subject=${encodeURIComponent('Tell me when ShopNip arrives near '+(S.pc||''))}">hello@shopnip.co.uk</a> and we’ll add you.`}
});
const css=document.createElement('style');css.textContent=`
.area-nt{position:relative;display:flex;gap:16px;align-items:flex-start;margin:18px auto;max-width:1200px;padding:22px 24px;border-radius:20px;background:linear-gradient(135deg,#fff7ef,#fff);border:1px solid #ffd9c2;box-shadow:0 6px 24px rgba(15,61,58,.06)}
.area-ic{font-size:28px;line-height:1;flex:none;margin-top:2px}.area-b{flex:1;min-width:0}
.area-nt h2{margin:0 0 6px;font-size:20px;letter-spacing:-.2px}.area-nt p{margin:0 0 12px;color:#475467;line-height:1.5}
.area-a{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.area-f label{display:block;font-weight:700;margin-bottom:6px}.area-r{display:flex;gap:8px;max-width:460px}
.area-r input{flex:1;min-width:0;padding:11px 14px;border:1px solid #d5dbd9;border-radius:12px;font:inherit}
.area-f small{display:block;color:#667085;margin-top:6px}.area-m{margin:6px 0 0!important;font-size:14px}
.area-ok{color:#0f766e!important;font-weight:700}
.area-x{position:absolute;top:8px;right:10px;border:0;background:none;font-size:22px;color:#667085;cursor:pointer;padding:4px 8px}
@media(max-width:640px){.area-nt{margin:12px;padding:18px 16px;flex-direction:column;gap:8px}.area-r{flex-direction:column}}`;
document.head.appendChild(css);
try{paint()}catch(e){}
const vw=document.getElementById('view');if(vw)new MutationObserver(()=>{try{paint()}catch(e){}}).observe(vw,{childList:true});
})();
