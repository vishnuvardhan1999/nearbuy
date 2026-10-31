/* p6: seller routing for the customer app. Shop-owner tools now live in seller.html (landing + dashboard). */
(()=>{const Q=new URLSearchParams(location.search),KEEP=['mock','as','shop','status'].filter(k=>Q.has(k)).map(k=>k+'='+encodeURIComponent(Q.get(k))).join('&');
const SURL=h=>'/seller.html'+(KEEP?'?'+KEEP:'')+(h?'#'+h:'');window.SELLER_URL=SURL;
document.querySelectorAll('[data-sell]').forEach(a=>a.href=SURL(''));
if(Q.get('seller')==='1')sessionStorage.setItem('nb_next','seller');else sessionStorage.removeItem('nb_next'); /* only a live ?seller=1 visit sends account to seller flows; customers keep index.html login */
const MAP={myshop:'overview',inbox:'orders',addprod:'products',sell:''};
const go=h=>{location.href=SURL(h)};
const _route=route;
window.route=route=function(t,...a){
  if(t in MAP)return go(MAP[t]);
  const A=window.P2?.A;
  if(t==='account'&&A?.user&&sessionStorage.getItem('nb_next')==='seller'){if(A.shop){sessionStorage.removeItem('nb_next');return go('overview')}if(A.profile?.role==='owner'||Q.get('seller')==='1')t='register'}
  const r=_route(t,...a);
  return r};
const _acc=V.account;
V.account=function(...a){let h=_acc.apply(this,a);
  h=h.replace(/<b>My shop<\/b>/,'<b>Seller dashboard</b>');
  return h};
const _home=V.home;
V.home=function(...a){const h=_home.apply(this,a);let done=false;
  return h.replace(/(<button class="h5c"[^>]*>[\s\S]*?<\/button>)/,m=>{if(done)return m;done=true;return m+`<button type="button" class="h5c h5sell" data-sellgo>Seller account</button>`})};
document.addEventListener('click',e=>{if(e.target.closest('[data-sellgo]')){e.preventDefault();e.stopPropagation();go('')}},true);
if(cur&&cur[0]==='home')render();else if(cur&&cur[0]in MAP)go(MAP[cur[0]]);
})();
