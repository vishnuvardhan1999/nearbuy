/* ShopNip site footer (shopper pages + seller.html). Four columns; on phones each column is a collapsible section. */
(function(){
var slug=function(s){return String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')};
var DEPTS=['Stationery','Party','Art & craft','Gift wrap','Packaging','Household'];
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')};
function col(t,links){return '<details class="sf-col" open><summary>'+t+'</summary><ul>'+links.map(function(l){var go=window.NB_SPA&&/^\/(?!seller)/.test(l[1])?' data-go="'+l[1]+'"':'';return '<li><a href="'+l[1]+'"'+go+(l[2]?' '+l[2]:'')+'>'+esc(l[0])+'</a></li>'}).join('')+'</ul></details>'}
function html(o){o=o||{};var sel=o.seller;
  return '<footer class="sf" role="contentinfo"><div class="sf-in">'+
   '<div class="sf-brand"><a class="sf-logo" href="/"'+(window.NB_SPA?' data-go="/"':'')+' aria-label="ShopNip home"><span class="sf-mark" aria-hidden="true">S</span><span>Shop<b>Nip</b></span></a>'+
   '<p>Your independent local shops, online. Click &amp; collect or local delivery, pay at the shop.</p>'+
   '<a class="sf-mail" href="mailto:hello@shopnip.co.uk">hello@shopnip.co.uk</a></div>'+
   '<div class="sf-cols">'+
   col('Shop',DEPTS.filter(function(d){if(typeof CATS==='undefined'||typeof catStocked!=='function')return true;var i=CATS.findIndex(function(c){return c[0]===d});return i<0||catStocked(i)}).map(function(d){return [d,'/category/'+slug(d)]}).concat([['All products','/products'],['Deals','/deals']]))+
   col('Sellers',[['Seller account','/seller.html']].concat(/^\/(account|signin|login|signup)/.test(location.pathname)?[]:[['Register shop','/seller.html#register']]).concat([['Fees','/seller.html#fees'],['How it works','/how']]))+
   col('Help',[['Contact us','/contact'],['hello@shopnip.co.uk','mailto:hello@shopnip.co.uk'],['Delivery &amp; collection'.replace('&amp;','&'),'/how'],['Returns &amp; refunds'.replace('&amp;','&'),'/faq'],['FAQ','/faq']])+
   col('Legal',[['Terms of Use','/terms'],['Privacy Policy','/privacy'],['Cookie Notice','/cookies'],['Seller Terms','/seller-terms']])+
   '</div></div><div class="sf-bar"><span>© '+new Date().getFullYear()+' ShopNip, a product of Suman Bros (Wholesale) Limited</span><span class="sf-pay">Pay the shop in store or on delivery</span></div></footer>'}
var css=document.createElement('style');css.textContent=
'.sf{background:#0c4a45;color:#d5e7e4;margin-top:48px;font:inherit;font-size:14px}'+
'.sf a{color:#d5e7e4;text-decoration:none}.sf a:hover{color:#fff;text-decoration:underline}'+
'.sf-in{max-width:1200px;margin:0 auto;padding:44px 20px 28px;display:grid;gap:32px;grid-template-columns:minmax(220px,1.1fr) 3fr}'+
'.sf-logo{display:inline-flex;align-items:center;gap:10px;font-size:22px;font-weight:800;color:#fff!important;letter-spacing:-.3px}.sf-logo b{color:#ff8a6b}'+
'.sf-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#ff6b4a;color:#fff;font-weight:800}'+
'.sf-brand p{margin:12px 0 10px;line-height:1.5;max-width:300px;color:#b9d3cf}.sf-mail{font-weight:700;color:#fff!important}'+
'.sf-cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}'+
'.sf-col summary{list-style:none;font-weight:800;color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;cursor:default}.sf-col summary::-webkit-details-marker{display:none}'+
'.sf-col ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}.sf-col li a{overflow-wrap:anywhere}'+
'.sf-bar{border-top:1px solid rgba(255,255,255,.12);max-width:1200px;margin:0 auto;padding:16px 20px 22px;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between;color:#9fc0bb;font-size:13px}'+
'@media(max-width:760px){.sf-in{grid-template-columns:1fr;gap:18px;padding:32px 18px 8px}.sf-cols{grid-template-columns:1fr;gap:0}'+
'.sf-col{border-top:1px solid rgba(255,255,255,.12)}.sf-col summary{cursor:pointer;margin:0;padding:15px 0;display:flex;justify-content:space-between;align-items:center}'+
'.sf-col summary:after{content:"+";font-size:20px;font-weight:600}.sf-col[open] summary:after{content:"−"}.sf-col ul{padding:0 0 14px}.sf-bar{flex-direction:column;padding-bottom:90px}}';
document.head.appendChild(css);
/* desktop: columns always open; phones: start collapsed */
var mq=window.matchMedia('(max-width:760px)');
function sync(root){(root||document).querySelectorAll('.sf-col').forEach(function(d){if(!d.dataset.sfu){if(mq.matches)d.removeAttribute('open');else d.setAttribute('open','')}})}
document.addEventListener('click',function(e){var s=e.target.closest('.sf-col summary');if(!s)return;if(!mq.matches){e.preventDefault();return}s.parentElement.dataset.sfu='1'},true);
new MutationObserver(function(){sync()}).observe(document.documentElement,{childList:true,subtree:true});
mq.addEventListener&&mq.addEventListener('change',function(){document.querySelectorAll('.sf-col').forEach(function(d){delete d.dataset.sfu});sync()});
window.NBFooter=html;
if(typeof window.foot==='function'||'foot' in window){try{foot=function(){return html()}}catch(e){window.foot=function(){return html()}}}
})();
