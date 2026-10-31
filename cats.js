/* Display names for imported category strings. Does not change stored data. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.canonCat=api.canonCat;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const ALIAS={
    'stationery':'Stationery',
    'stationery essentials':'Stationery',
    'stationery & essentials':'Stationery',
    'stationery and essentials':'Stationery',
    'books notepads':'Books & notepads',
    'mailing and packaging':'Mailing and packaging',
    'mailing packaging':'Mailing and packaging',
    'candles':'Candles',
    'international':'International',
    '2027 diaries':'2027 Diaries'
  };
  function canonCat(raw){
    let s=String(raw==null?'':raw).replace(/\s+/g,' ').trim();
    if(!s||/^other$/i.test(s))return s? 'Other':'';
    s=s.replace(/^\*+\s*/,'');
    s=s.replace(/\s+image$/i,'').replace(/-image$/i,'');
    s=s.replace(/^(?:sil|u)[\s\-]+/i,'');
    s=s.replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
    if(!s)return '';
    const key=s.toLowerCase().replace(/\s*&\s*/g,' & ').replace(/\s+/g,' ').trim();
    if(ALIAS[key])return ALIAS[key];
    const bare=key.replace(/ & /g,' and ');
    if(ALIAS[bare])return ALIAS[bare];
    return s.split(' ').map(w=>{
      if(!w||w==='&')return w;
      if(/^[A-Z0-9]{2,}$/.test(w))return w;
      if(/[A-Z]/.test(w.slice(1)))return w;
      return w.charAt(0).toUpperCase()+w.slice(1);
    }).join(' ');
  }
  return {canonCat};
});
