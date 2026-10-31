/* p22: UI/UX polish layer (CSS + small view wrappers). No data or order-flow logic changes. */
(()=>{const css=`
:focus-visible{outline:3px solid #f97352;outline-offset:2px;border-radius:8px}
button:focus:not(:focus-visible),a:focus:not(:focus-visible){outline:none}
.skip{position:absolute;left:-999px;top:8px;z-index:100;background:#0f3d3a;color:#fff;padding:10px 14px;border-radius:10px;font-weight:700}.skip:focus{left:8px}
/* toasts never sit under the chat button or tab bar */
#toast{bottom:calc(150px + env(safe-area-inset-bottom));font-size:14px;padding:12px 18px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
@media(min-width:768px){#toast{bottom:96px}}
/* tap targets */
.tm{display:inline-flex;align-items:center;min-height:36px;padding:4px 2px}
.foot a{display:inline-block;padding:6px 0}
.tabs button{min-height:52px}
/* mobile header: give the location chip room; seller entry lives in the account page and footer */
@media(max-width:430px){header .sellk,header .hsell,header [data-sell].btn,header a[data-sell]{display:none!important}.loc b{max-width:none}}
/* checkout clarity */
.stp{display:flex;align-items:center;gap:6px;margin:0 0 16px;font-size:13px;font-weight:700;color:#94a3b8;list-style:none;padding:0}
.stp li{display:flex;align-items:center;gap:6px}.stp li+li:before{content:"";width:22px;height:2px;background:#d5dbd9;border-radius:2px;margin-right:2px}
.stp b{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#eef1f4;color:#64748b;font-size:12px}
.stp .on{color:#0f3d3a}.stp .on b{background:#1f6f66;color:#fff}.stp .ok b{background:#d1f0e6;color:#0f766e}
#setpc2.hint{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 12px;border-radius:999px;background:#fff1ec;color:#c2410c;font-weight:700;text-decoration:none;font-size:13px}
.line.tot{font-size:17px;padding-top:10px;border-top:1px solid #e6e9ee;margin-top:6px}
/* skeleton loading */
.skl{display:grid;gap:12px;padding:20px 0;max-width:720px;margin:0 auto}.skl i{display:block;height:72px;border-radius:14px;background:linear-gradient(90deg,#eef1f4 25%,#f7f9fa 50%,#eef1f4 75%);background-size:200% 100%;animation:skl 1.2s infinite}
.skl i:first-child{height:28px;width:40%}@keyframes skl{to{background-position:-200% 0}}
/* empty states */
.empty{padding:48px 20px;line-height:1.6}.empty .btn{margin-top:6px}
@media(prefers-reduced-motion:reduce){.tk,.skl i,*{animation:none!important;transition:none!important}}
.ticker:hover .tk{animation-play-state:paused}
`;const st=document.createElement('style');st.id='p22css';st.textContent=css;document.head.appendChild(st);
/* skip link + main landmark for keyboard users */
const v=document.getElementById('view');if(v){v.setAttribute('tabindex','-1');v.setAttribute('role','main');document.body.insertAdjacentHTML('afterbegin','<a class="skip" href="#view">Skip to content</a>');document.querySelector('a.skip')?.addEventListener('click',e=>{e.preventDefault();document.getElementById('view').focus()})}
/* step indicator: Basket → Details → Confirmed */
const steps=n=>`<ol class="stp" aria-label="Checkout progress">${['Basket','Your details','Confirmed'].map((t,i)=>`<li class="${i===n?'on':i<n?'ok':''}"${i===n?' aria-current="step"':''}><b>${i<n?'✓':i+1}</b>${t}</li>`).join('')}</ol>`;
const wrap=(k,n,test)=>{const f=V[k];if(!f)return;V[k]=function(...a){const h=f.apply(this,a);return typeof h==='string'&&test(h)?h.replace(/(<section class="sec (?:narrow|basket-page)[^"]*">)/,'$1'+steps(n)):h}};
wrap('basket',0,h=>h.includes('data-o="checkout"'));wrap('checkout',1,h=>h.includes('data-form="order"'));wrap('placed',2,()=>true);
const _pl=V.placed;V.placed=function(...a){const h=_pl.apply(this,a);return h.includes('class="ccode')?h.replace(/<p>Your order number is<\/p><div class="ono">[^<]*<\/div>/,''):h};
/* skeletons instead of plain "Loading…" text */
const sk='<div class="skl" aria-busy="true" aria-label="Loading"><i></i><i></i><i></i><i></i></div>';
if(v)new MutationObserver(()=>{const e=v.firstElementChild;if(e&&v.children.length===1&&e.classList.contains('empty')&&/^Loading/.test(e.textContent.trim()))v.innerHTML=sk}).observe(v,{childList:true});
})();
