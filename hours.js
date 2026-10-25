/* Nearbuy weekly opening-hours picker (shared by index.html registration and seller.html settings).
   shops.opening_hours is a text column, so we store a readable summary ("Mon-Sat 9am-5:30pm, Sun closed") and parse it back. */
(function(){
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const T=[];for(let m=0;m<24*60;m+=30)T.push(String(m/60|0).padStart(2,'0')+':'+(m%60?'30':'00'));T.push('24:00');
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>{if(t==='24:00')return'midnight';let[h,m]=t.split(':').map(Number);const ap=h>=12?'pm':'am';h=h%12||12;return h+(m?':'+String(m).padStart(2,'0'):'')+ap};
const span=d=>!d.o?'closed':d.all?'open 24 hours':fmt(d.a)+'-'+fmt(d.b);
function summary(w){const out=[];let i=0;while(i<7){let j=i;while(j<6&&span(w[j+1])===span(w[i]))j++;
  out.push((i===j?DAYS[i]:DAYS[i]+'-'+DAYS[j])+' '+span(w[i]));i=j+1}
  return out.length===1&&w[0].o?'Every day '+span(w[0]):out.join(', ')}
const pt=s=>{const m=String(s).trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/);if(!m)return null;let h=+m[1],mi=+(m[2]||0);
  if(m[3]==='pm'&&h<12)h+=12;if(m[3]==='am'&&h===12)h=0;if(h>24||mi>59)return null;mi=mi<15?0:mi<45?30:0;if(+(m[2]||0)>=45)h++;return String(Math.min(h,24)).padStart(2,'0')+':'+(mi?'30':'00')};
const blank=()=>DAYS.map(()=>({o:false,a:'09:00',b:'17:30',all:false}));
function parse(txt){const w=blank();if(!txt||!String(txt).trim())return{w:DAYS.map((_,i)=>({o:i<6,a:'09:00',b:'17:30',all:false})),ok:true,empty:true};
  let hit=0,bad=0;
  String(txt).replace(/[–—]/g,'-').replace(/\bto\b/gi,'-').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean).forEach(seg=>{
    let m=seg.match(/^(every ?day|daily|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)(?:\s*-\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*)?\s*:?\s*(.*)$/i);
    if(!m){bad++;return}let a,b;const k=x=>DAYS.findIndex(d=>x.toLowerCase().startsWith(d.toLowerCase()));
    if(/^(every|daily)/i.test(m[1])){a=0;b=6}else{a=k(m[1]);b=m[2]?k(m[2]):a}
    const r=m[3].trim().toLowerCase();let d;
    if(/closed/.test(r))d={o:false,a:'09:00',b:'17:30',all:false};
    else if(/24/.test(r)&&/hour|24\/7|24h/.test(r))d={o:true,a:'00:00',b:'24:00',all:true};
    else{const t=r.replace(/^open\s*/,'').split(/\s*-\s*/);const x=pt(t[0]||''),y=pt(t[1]||'');if(!x||!y){bad++;return}d={o:true,a:x,b:y,all:false}}
    for(let i=a;;i=(i+1)%7){w[i]={...d};hit++;if(i===b)break}});
  if(!hit)return{w:DAYS.map((_,i)=>({o:i<6,a:'09:00',b:'17:30',all:false})),ok:false};
  return{w,ok:!bad}}
const PRE={'Mon-Sat 9-5.30':w=>DAYS.map((_,i)=>({o:i<6,a:'09:00',b:'17:30',all:false})),'Mon-Fri 9-5':w=>DAYS.map((_,i)=>({o:i<5,a:'09:00',b:'17:00',all:false})),
  'Every day 8-8':w=>DAYS.map(()=>({o:true,a:'08:00',b:'20:00',all:false})),'Open 24/7':w=>DAYS.map(()=>({o:true,a:'00:00',b:'24:00',all:true}))};
const opts=(v,end)=>T.filter(t=>end?t!=='00:00':t!=='24:00').map(t=>`<option value="${t}"${t===v?' selected':''}>${fmt(t)}</option>`).join('');
function rows(w){return w.map((d,i)=>`<div class="hp-r${d.o?'':' off'}" data-d="${i}"><b>${DAYS[i]}</b>
  <label class="hp-sw"><input type="checkbox" data-k="o"${d.o?' checked':''}><span></span><em>${d.o?'Open':'Closed'}</em></label>
  <div class="hp-t">${d.o?(d.all?'<span class="hp-24">Open 24 hours</span>':`<select data-k="a" aria-label="${DAYS[i]} opens">${opts(d.a)}</select><i>to</i><select data-k="b" aria-label="${DAYS[i]} closes">${opts(d.b,1)}</select>`):''}</div>
  ${d.o?`<label class="hp-c"><input type="checkbox" data-k="all"${d.all?' checked':''}>24h</label>`:'<span></span>'}</div>`).join('')}
const ST=new WeakMap();
function html(name,txt){const p=parse(txt),id='hp'+Math.random().toString(36).slice(2,7);
  return `<div class="hp" id="${id}" data-hp='${e(JSON.stringify(p.w))}'>
   <div class="hp-p">${Object.keys(PRE).map(k=>`<button type="button" data-pre="${e(k)}">${e(k)}</button>`).join('')}<button type="button" data-copy>Copy Monday to all</button></div>
   ${!p.ok&&!p.empty?`<div class="hp-warn">We couldn't read your old hours (“${e(txt)}”). Please check the days below.</div>`:''}
   <div class="hp-rows">${rows(p.w)}</div>
   <div class="hp-s">Shoppers see: <b>${e(summary(p.w))}</b></div>
   <input type="hidden" name="${e(name)}" id="${e(name)}" value="${e(summary(p.w))}"></div>`}
const W=el=>{if(!ST.has(el))ST.set(el,JSON.parse(el.dataset.hp));return ST.get(el)};
function upd(el){const w=W(el);el.querySelector('.hp-rows').innerHTML=rows(w);const s=summary(w);el.querySelector('.hp-s b').textContent=s;const h=el.querySelector('input[type=hidden]');h.value=s;h.dispatchEvent(new Event('input',{bubbles:true}))}
document.addEventListener('click',ev=>{const b=ev.target.closest('.hp [data-pre],.hp [data-copy]');if(!b)return;ev.preventDefault();const el=b.closest('.hp'),w=W(el);
  if(b.dataset.copy!==undefined)for(let i=1;i<7;i++)w[i]={...w[0]};else PRE[b.dataset.pre](w).forEach((d,i)=>w[i]=d);el.querySelector('.hp-warn')?.remove();upd(el)});
document.addEventListener('change',ev=>{const t=ev.target,r=t.closest('.hp-r');if(!r)return;ev.stopPropagation();const el=r.closest('.hp'),d=W(el)[+r.dataset.d],k=t.dataset.k;
  if(k==='o'||k==='all'){d[k]=t.checked;if(k==='all'&&!t.checked){d.a='09:00';d.b='17:30'}}else d[k]=t.value;
  if(k==='a'&&d.b<=d.a)d.b=T[Math.min(T.indexOf(d.a)+2,T.length-1)];upd(el)},true);
const css=`.hp{display:grid;gap:10px}.hp-p{display:flex;flex-wrap:wrap;gap:6px}.hp-p button{border:1px solid #d6dbe1;background:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:#14202e}.hp-p button:hover{border-color:#0f766e;color:#0f766e}.hp-p [data-copy]{border-style:dashed}
.hp-rows{border:1px solid #e7e9ee;border-radius:14px;background:#fff;overflow:hidden}.hp-r{display:grid;grid-template-columns:44px 100px 1fr auto;align-items:center;gap:8px;padding:9px 12px;border-top:1px solid #eef0f3;min-height:52px}.hp-r:first-child{border-top:0}.hp-r.off{background:#fafafa}.hp-r.off b{color:#98a2b3}
.hp-r b{font-size:14px}.hp-sw{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px}.hp-sw input{position:absolute;opacity:0;width:1px;height:1px}.hp .hp-sw span{display:block;margin:0;font-size:0;width:38px;height:22px;border-radius:99px;background:#d0d5dd;position:relative;transition:.2s;flex:none}.hp .hp-sw span:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.hp .hp-sw input:checked+span{background:#0f766e}.hp .hp-sw input:checked+span:after{left:19px}.hp-sw input:focus-visible+span{outline:2px solid #0f766e;outline-offset:2px}.hp-sw em{font-style:normal;color:#667085}
.hp-t{display:flex;align-items:center;gap:6px;min-width:0}.hp .hp-t select{width:auto;min-width:0;flex:1;max-width:120px;border:1px solid #d6dbe1;border-radius:10px;padding:8px 6px;font:inherit;font-size:14px;background:#fff}.hp-t i{font-style:normal;color:#667085;font-size:13px}.hp-24{font-size:13px;font-weight:600;color:#0f766e}
.hp-c{font-size:12px;color:#667085;display:flex;align-items:center;gap:4px;white-space:nowrap}.hp-s{font-size:13px;color:#667085}.hp-s b{color:#14202e}.hp-warn{font-size:13px;background:#fffaeb;color:#93370d;border-radius:10px;padding:8px 10px}
.hp .hp-c input{width:auto;padding:0;margin:0;border:0}.hp .hp-sw input{width:1px;padding:0}.hp .hp-t select{padding:8px 6px;font-size:14px;border-width:1px}
@media(max-width:520px){.hp-r{grid-template-columns:40px 1fr auto;row-gap:6px}.hp-t{grid-column:1/-1;grid-row:2}.hp-t:empty{display:none}.hp .hp-t select{width:auto;max-width:none}}`;
const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
window.HoursPicker={html,parse,summary};
})();
