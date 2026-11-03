/* ShopNip signup source tracking: captures ?src= and utm_* on landing, keeps them in localStorage (first touch, 90 days) so they ride through the seller signup flow into auth user metadata -> profiles.signup_source (migration 017). */
(function(){
  var K='nb_src',MAX=90*864e5,clean=function(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,80)||null};
  try{
    var Q=new URLSearchParams(location.search),t={src:clean(Q.get('src')),utm_source:clean(Q.get('utm_source')),utm_medium:clean(Q.get('utm_medium')),utm_campaign:clean(Q.get('utm_campaign'))};
    var old=null;try{old=JSON.parse(localStorage.getItem(K)||'null')}catch(_){}
    if(old&&!(Date.now()-old.at<MAX)){localStorage.removeItem(K);old=null}
    if((t.src||t.utm_source||t.utm_campaign)&&!old){t.at=Date.now();t.landing=location.pathname.slice(0,80);localStorage.setItem(K,JSON.stringify(t))}
  }catch(_){}
  /* metadata for sb.auth.signUp({options:{data}}) */
  window.NB_SRC=function(){try{var s=JSON.parse(localStorage.getItem(K)||'null');if(!s)return{};var o={};['utm_source','utm_medium','utm_campaign'].forEach(function(k){if(s[k])o[k]=s[k]});var v=s.src||s.utm_source;if(v)o.signup_source=v;return o}catch(_){return{}}};
  window.NB_SRC_DONE=function(){try{localStorage.removeItem(K)}catch(_){}};
})();
