/* ShopNip boot (loaded in <head>, before the app). Replaces former inline script + inline onerror handlers so the CSP needs no 'unsafe-inline' for scripts. */
(function(){
  /* seller auth lives in seller.html: ?seller=1 links go to the seller portal (shop registration still uses view=register here) */
  var Q=new URLSearchParams(location.search);
  if(Q.get('seller')==='1'&&Q.get('view')!=='register'){var v=Q.get('view'),k=['mock','as','shop','status'].filter(function(x){return Q.has(x)}).map(function(x){return x+'='+encodeURIComponent(Q.get(x))}).join('&');
    location.replace('/seller.html'+(k?'?'+k:'')+(v==='account'||v==='login'?'#login':'#signup'));return}
  /* image fallbacks: <img data-fb> -> app icon, <img data-fbhide> -> hidden */
  addEventListener('error',function(e){var t=e.target;if(!t||t.tagName!=='IMG')return;
    if(t.hasAttribute('data-fbhide')){t.style.visibility='hidden';return}
    if(t.dataset.fbd)return;t.dataset.fbd='1';
    var n=((t.getAttribute('alt')||'')+' '+((t.closest('[data-psku]')||{}).textContent||'')).toLowerCase(),
     m=[['ballo|party|banner','🎈','#fde7ef'],['candle|birthday','🕯️','#fff4d6'],['wrap|gift|ribbon|bow','🎁','#fdeee3'],['card|envelope','💌','#fde7ef'],['parcel|mail|box|bubble|packag','📦','#efe7dc'],['paint|craft|glitter|brush','🎨','#e9f1ff'],['tape|glue','🧴','#eef7e6'],['toy|game|ball','🧸','#fff1e0'],['pen|pencil|note|ruler|station','✏️','#e3f4f1']],
     g=['🛍️','#eef2f1'];for(var i=0;i<m.length;i++)if(new RegExp(m[i][0]).test(n)){g=[m[i][1],m[i][2]];break}
    t.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="'+g[1]+'"/><text x="100" y="125" font-size="80" text-anchor="middle">'+g[0]+'</text></svg>')},true);
})();
