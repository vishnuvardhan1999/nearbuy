/* ShopNip boot (loaded in <head>, before the app). Replaces former inline script + inline onerror handlers so the CSP needs no 'unsafe-inline' for scripts. */
(function(){
  /* seller auth lives in seller.html: ?seller=1 links go to the seller portal (shop registration still uses view=register here) */
  var Q=new URLSearchParams(location.search);
  if(Q.get('seller')==='1'&&Q.get('view')!=='register'){var v=Q.get('view'),k=['mock','as','shop','status'].filter(function(x){return Q.has(x)}).map(function(x){return x+'='+encodeURIComponent(Q.get(x))}).join('&');
    location.replace('/seller.html'+(k?'?'+k:'')+(v==='account'||v==='login'?'#login':'#signup'));return}
  /* image fallbacks: <img data-fb> -> app icon, <img data-fbhide> -> hidden */
  addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='IMG')return;
    if(t.hasAttribute('data-fbhide')){t.style.visibility='hidden';return}
    if(t.hasAttribute('data-fb')&&!t.dataset.fbd){t.dataset.fbd='1';t.src='/icon-192.png'}},true);
})();
