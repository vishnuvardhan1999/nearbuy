/* ShopNip weekly opening-hours picker (shared by index.html registration and seller.html settings).
   shops.opening_hours is text. New saves store JSON v2 (weekly days, overnight ranges, special dates).
   Older rows keep a readable summary ("Mon-Sat 9am-5:30pm, Sun closed"); ShopHours reads both. */
(function(){
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const T=[];for(let m=0;m<24*60;m+=30)T.push(String(m/60|0).padStart(2,'0')+':'+(m%60?'30':'00'));T.push('24:00');
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>{if(t==='24:00')return'midnight';let[h,m]=t.split(':').map(Number);const ap=h>=12?'pm':'am';h=h%12||12;return h+(m?':'+String(m).padStart(2,'0'):'')+ap};
const H=()=>window.ShopHours;
const parse=txt=>H().parse(txt);
const summary=w=>H().summary(w);
const encode=(w,hol)=>H().encode(w,hol);
const nextAnnual=(month,day)=>{const iso=H().london(H().now()).iso,y=+iso.slice(0,4),p=n=>String(n).padStart(2,'0');
  let d=y+'-'+p(month)+'-'+p(day);if(d<iso)d=(y+1)+'-'+p(month)+'-'+p(day);return d};
const PREHOL=[['Christmas Day',12,25],['Boxing Day',12,26],["New Year's Day",1,1]];
const PRE={'Mon-Sat 9-5.30':w=>DAYS.map((_,i)=>({o:i<6,a:'09:00',b:'17:30',all:false})),'Mon-Fri 9-5':w=>DAYS.map((_,i)=>({o:i<5,a:'09:00',b:'17:00',all:false})),
  'Every day 8-8':w=>DAYS.map(()=>({o:true,a:'08:00',b:'20:00',all:false})),'Open 24/7':w=>DAYS.map(()=>({o:true,a:'00:00',b:'24:00',all:true}))};
const opts=(v,end)=>T.filter(t=>end?t!=='00:00':t!=='24:00').map(t=>`<option value="${t}"${t===v?' selected':''}>${fmt(t)}</option>`).join('');
const overnight=d=>d.o&&!d.all&&d.b<=d.a;
function rows(w){return w.map((d,i)=>`<div class="hp-r${d.o?'':' off'}" data-d="${i}"><b>${DAYS[i]}</b>
  <label class="hp-sw"><input type="checkbox" data-k="o"${d.o?' checked':''}><span></span><em>${d.o?'Open':'Closed'}</em></label>
  <div class="hp-t">${d.o?(d.all?'<span class="hp-24">Open 24 hours</span>':`<select data-k="a" aria-label="${DAYS[i]} opens">${opts(d.a)}</select><i>to</i><select data-k="b" aria-label="${DAYS[i]} closes">${opts(d.b,1)}</select>${overnight(d)?'<em class="hp-nx">closes next day</em>':''}`):''}</div>
  ${d.o?`<label class="hp-c"><input type="checkbox" data-k="all"${d.all?' checked':''}>24h</label>`:'<span></span>'}</div>`).join('')}
function hrows(hs){return (hs||[]).map((h,i)=>`<div class="hp-hol" data-hi="${i}"><input type="date" data-hk="date" value="${e(h.date||'')}" aria-label="Special date">
  <label class="hp-c"><input type="checkbox" data-hk="closed"${h.closed?' checked':''}>Closed</label>
  ${h.closed?'':`<select data-hk="a" aria-label="Opens">${opts(h.a||'09:00')}</select><i>to</i><select data-hk="b" aria-label="Closes">${opts(h.b||'17:00',1)}</select>`}
  <input data-hk="note" maxlength="40" placeholder="Note, e.g. Christmas" value="${e(h.note||'')}" aria-label="Note for this date">
  <button type="button" data-hdel aria-label="Remove special date">Remove</button></div>`).join('')}
const ST=new WeakMap();
function html(name,txt){const p=parse(txt),id='hp'+Math.random().toString(36).slice(2,7);
  const st={w:p.w,holidays:p.holidays||[]};
  const seen=summary(p.w)+(st.holidays.length?` · ${st.holidays.length} special date${st.holidays.length>1?'s':''}`:'');
  return `<div class="hp" id="${id}" data-hp='${e(JSON.stringify(st))}'>
   <div class="hp-p">${Object.keys(PRE).map(k=>`<button type="button" data-pre="${e(k)}">${e(k)}</button>`).join('')}<button type="button" data-copy>Copy Monday to all</button></div>
   ${!p.ok&&!p.empty?`<div class="hp-warn">We couldn't read your old hours (“${e(String(txt).slice(0,180))}”). Please check the days below.</div>`:''}
   <div class="hp-rows">${rows(p.w)}</div>
   <div class="hp-hols"><div class="hp-hh"><b>Special dates</b><small>Bank holidays and one-off hours. These override the weekly timetable for that date.</small></div>
    <div class="hp-hp">${PREHOL.map(([n])=>`<button type="button" data-hpre="${e(n)}">${e(n)} closed</button>`).join('')}</div>
    <div class="hp-hlist">${hrows(st.holidays)}</div>
    <button type="button" data-hadd>Add a special date</button></div>
   <div class="hp-s">Shoppers see: <b>${e(seen)}</b></div>
   <input type="hidden" name="${e(name)}" id="${e(name)}" value="${e(encode(st.w,st.holidays))}"></div>`}
const W=el=>{if(!ST.has(el)){const raw=JSON.parse(el.dataset.hp);ST.set(el,Array.isArray(raw)?{w:raw,holidays:[]}:raw)}return ST.get(el)};
function seenText(st){const n=st.holidays.filter(h=>h.date).length;return summary(st.w)+(n?` · ${n} special date${n>1?'s':''}`:'')}
function upd(el){const st=W(el);el.querySelector('.hp-rows').innerHTML=rows(st.w);const list=el.querySelector('.hp-hlist');if(list)list.innerHTML=hrows(st.holidays);
  const s=seenText(st);el.querySelector('.hp-s b').textContent=s;const h=el.querySelector('input[type=hidden]');h.value=encode(st.w,st.holidays);h.dispatchEvent(new Event('input',{bubbles:true}))}
document.addEventListener('click',ev=>{const b=ev.target.closest('.hp [data-pre],.hp [data-copy],.hp [data-hadd],.hp [data-hpre],.hp [data-hdel]');if(!b)return;ev.preventDefault();const el=b.closest('.hp'),st=W(el);
  if(b.dataset.hdel!==undefined){st.holidays.splice(+b.closest('.hp-hol').dataset.hi,1)}
  else if(b.dataset.hadd!==undefined){st.holidays.push({date:'',closed:true,a:'09:00',b:'17:00',all:false,note:''})}
  else if(b.dataset.hpre){const spec=PREHOL.find(x=>x[0]===b.dataset.hpre);if(!spec)return;const date=nextAnnual(spec[1],spec[2]);if(!st.holidays.some(h=>h.date===date))st.holidays.push({date,closed:true,a:'09:00',b:'17:00',all:false,note:spec[0]})}
  else if(b.dataset.copy!==undefined)for(let i=1;i<7;i++)st.w[i]={...st.w[0]};
  else PRE[b.dataset.pre](st.w).forEach((d,i)=>st.w[i]=d);
  el.querySelector('.hp-warn')?.remove();upd(el)});
document.addEventListener('change',ev=>{const t=ev.target;
  if(t.dataset&&t.dataset.hk!=null){const row=t.closest('.hp-hol');if(!row)return;ev.stopPropagation();const el=row.closest('.hp'),h=W(el).holidays[+row.dataset.hi];
    if(t.dataset.hk==='closed')h.closed=t.checked;else h[t.dataset.hk]=t.value;upd(el);return}
  const r=t.closest('.hp-r');if(!r)return;ev.stopPropagation();const el=r.closest('.hp'),d=W(el).w[+r.dataset.d],k=t.dataset.k;
  if(k==='o'||k==='all'){d[k]=t.checked;if(k==='all'&&!t.checked&&(d.a==='00:00'||d.b==='24:00')){d.a='09:00';d.b='17:30'}}else d[k]=t.value;upd(el)},true);
const css=`.hp{display:grid;gap:10px}.hp-p{display:flex;flex-wrap:wrap;gap:6px}.hp-p button{border:1px solid #d6dbe1;background:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:#14202e}.hp-p button:hover{border-color:#0f766e;color:#0f766e}.hp-p [data-copy]{border-style:dashed}
.hp-rows{border:1px solid #e7e9ee;border-radius:14px;background:#fff;overflow:hidden}.hp-r{display:grid;grid-template-columns:44px 100px 1fr auto;align-items:center;gap:8px;padding:9px 12px;border-top:1px solid #eef0f3;min-height:52px}.hp-r:first-child{border-top:0}.hp-r.off{background:#fafafa}.hp-r.off b{color:#98a2b3}
.hp-r b{font-size:14px}.hp-sw{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px}.hp-sw input{position:absolute;opacity:0;width:1px;height:1px}.hp .hp-sw span{display:block;margin:0;font-size:0;width:38px;height:22px;border-radius:99px;background:#d0d5dd;position:relative;transition:.2s;flex:none}.hp .hp-sw span:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.hp .hp-sw input:checked+span{background:#0f766e}.hp .hp-sw input:checked+span:after{left:19px}.hp-sw input:focus-visible+span{outline:2px solid #0f766e;outline-offset:2px}.hp-sw em{font-style:normal;color:#667085}
.hp-t{display:flex;align-items:center;gap:6px;min-width:0}.hp .hp-t select{width:auto;min-width:0;flex:1;max-width:120px;border:1px solid #d6dbe1;border-radius:10px;padding:8px 6px;font:inherit;font-size:14px;background:#fff}.hp-t i{font-style:normal;color:#667085;font-size:13px}.hp-24{font-size:13px;font-weight:600;color:#0f766e}
.hp-c{font-size:12px;color:#667085;display:flex;align-items:center;gap:4px;white-space:nowrap}.hp-s{font-size:13px;color:#667085}.hp-s b{color:#14202e}.hp-warn{font-size:13px;background:#fffaeb;color:#93370d;border-radius:10px;padding:8px 10px}
.hp-nx{font-style:normal;font-size:11px;font-weight:700;color:#9a6700;white-space:nowrap}
.hp-hols{display:grid;gap:8px}.hp-hh b{display:block;font-size:14px}.hp-hh small{display:block;color:#667085;font-size:12px;line-height:1.4}
.hp-hp{display:flex;flex-wrap:wrap;gap:6px}.hp-hp button,.hp-hols [data-hadd]{border:1px solid #d6dbe1;background:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:#14202e}
.hp-hol{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px;border:1px solid #e7e9ee;border-radius:12px;background:#fff}
.hp-hol input[type=date],.hp-hol input[data-hk=note]{border:1px solid #d6dbe1;border-radius:10px;padding:8px;font:inherit;font-size:14px}
.hp-hol input[data-hk=note]{flex:1;min-width:140px}.hp-hol [data-hdel]{border:0;background:none;color:#b33;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.hp .hp-c input{width:auto;padding:0;margin:0;border:0}.hp .hp-sw input{width:1px;padding:0}.hp .hp-t select{padding:8px 6px;font-size:14px;border-width:1px}
@media(max-width:520px){.hp-r{grid-template-columns:40px 1fr auto;row-gap:6px}.hp-t{grid-column:1/-1;grid-row:2}.hp-t:empty{display:none}.hp .hp-t select{width:auto;max-width:none}}`;
const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
window.HoursPicker={html,parse,summary,encode};
})();
