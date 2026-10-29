/* Navigation, account mode, and category fallbacks. Loaded last. */
(function(){
  document.body.classList.add('mode-shop');
  let spa=0;
  const push=history.pushState.bind(history);
  history.pushState=function(){spa++;return push.apply(history,arguments)};
  addEventListener('popstate',function(){spa=Math.max(0,spa-1)});
  function goHome(){
    if(document.getElementById('view')&&typeof route==='function'){route('home');scrollTo(0,0);return}
    location.href='/';
  }
  function goBack(){if(spa>0){history.back();return}goHome()}
  document.addEventListener('click',function(e){
    const back=e.target.closest('[data-back], button.back');
    if(back){e.preventDefault();e.stopPropagation();goBack();return}
    const logo=e.target.closest('a.brand');
    if(!logo)return;
    e.preventDefault();e.stopPropagation();goHome();
  },true);
  function stampBack(){
    if(!window.cur||cur[0]==='home')return;
    const v=document.getElementById('view');if(!v||v.querySelector('[data-back],button.back,.back-link'))return;
    const h=v.querySelector('.sh, .pph, .ih');if(!h)return;
    const b=document.createElement('button');b.type='button';b.className='back-link';b.dataset.back='1';b.textContent='Back';
    h.prepend(b);
  }
  if(typeof route==='function'){const r=route;window.route=route=function(){const o=r.apply(this,arguments);requestAnimationFrame(stampBack);return o}}
  if(typeof V!=='undefined'&&V.cat){const orig=V.cat;
    V.cat=function(i){const row=window.CATS&&CATS[i];if(!row)return orig(i);
      const test=row[1],title=row[0];
      const live=(S.products||[]).filter(p=>p.images&&p.images.length&&test(p)&&!p.demo&&(p.offers||p.listing_id));
      if(live.length||(S.products||[]).some(p=>p.demo&&p.images&&p.images.length&&test(p)))return orig(i);
      const cat=(window.P4&&P4.cat&&P4.cat())||[];
      const soon=cat.filter(p=>p.images&&p.images.length&&test(p)).slice(0,24);
      if(!soon.length){if(window.catWhenNeeded)catWhenNeeded().then(function(){if(cur&&cur[0]==='cat')render()});
        return '<section class="sec"><div class="sh"><h2>'+title+'</h2></div><p class="shop-note">Loading '+title.toLowerCase()+'…</p></section>'}
      const cards=soon.map(function(p){return P4.card(Object.assign({},p,{price:+((+p.trade_price||1)*1.6).toFixed(2),demo:true}))});
      return '<section class="sec"><div class="sh"><h2>'+title+'</h2><span class="note">Not stocked near you yet</span></div><p class="shop-note">These are in the ShopNip catalogue. Choose Notify me and we will flag them when a local shop lists them.</p><div class="grid">'+cards.join('')+'</div></section>'};
  }
})();
