/* p30: homepage polish, category emoji icons, Home link on account, mobile fixes. */
(()=>{
const css=`.cat .ci{background:linear-gradient(145deg,#f1faf8,#fff)}.cat .ci:empty::before{content:attr(data-emo);font-size:34px;line-height:1}
@media(min-width:768px){.cat .ci:empty::before{font-size:44px}}
.h12>section,.h12>.sec5,.h12>.vstrip{margin-top:28px}.h12 .crow .row.prods{scroll-snap-type:x mandatory}.h12 .crow .pc{scroll-snap-align:start}
.p30home{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;margin:14px 0 4px;border-radius:999px;border:1px solid #d7e4e1;background:#fff;color:var(--navy,#0f3d3a);font-weight:700;font-size:14px;cursor:pointer}
@media(max-width:480px){html,body{overflow-x:hidden}#view{overflow-x:clip}.h12 h2{font-size:20px;line-height:1.25}.h12 .pc{flex-basis:44%;min-width:150px}
 .h12 .more,.h12 .cat,.tabs button,.chip{min-height:44px}.h12 .sec5 p,.h12 small{font-size:13px}}`;
const st=document.createElement('style');st.id='p30css';st.textContent=css;document.head.appendChild(st);
const _a=V.account;V.account=function(...a){const h=_a.apply(this,a);return `<button class="p30home" data-t="home" aria-label="Back to homepage">← Home</button>`+h};
if(cur&&cur[0]==='account')render();
})();
