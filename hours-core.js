/* Shop hours: parse legacy text or JSON v2, and decide open/closed in Europe/London.
   No DOM. Used by the hours picker, the shopper site, and node tests. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShopHours=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FULL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const WD={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
const SOON=60;

function pad(n){return String(n).padStart(2,'0')}
function defaults(){return DAYS.map((_,i)=>({o:i<6,a:'09:00',b:'17:30',all:false}))}
function validT(t){
  if(t==='24:00')return '24:00';
  const m=String(t||'').match(/^(\d{2}):(\d{2})$/);
  if(!m)return null;
  const h=+m[1],mi=+m[2];
  if(h>23||mi>59)return null;
  return pad(h)+':'+pad(mi);
}
function normalizeDay(d){
  d=d||{};
  return {o:!!d.o,a:validT(d.a)||'09:00',b:validT(d.b)||'17:30',all:!!d.all&&!!d.o};
}
function normalizeHol(h){
  if(!h||!/^\d{4}-\d{2}-\d{2}$/.test(String(h.date||'')))return null;
  const note=String(h.note||'').replace(/\s+/g,' ').trim().slice(0,40);
  if(h.closed||h.o===false)return {date:h.date,closed:true,a:'09:00',b:'17:00',all:false,note};
  return {date:h.date,closed:false,a:validT(h.a)||'09:00',b:validT(h.b)||'17:00',all:!!h.all,note};
}
function toMins(t){
  if(t==='24:00')return 1440;
  const [h,m]=String(t||'0:0').split(':').map(Number);
  return h*60+(m||0);
}
function fmtM(mins){
  if(mins==null)return '';
  if(mins===1440||mins===0)return mins===1440?'midnight':'midnight';
  let h=Math.floor(mins/60)%24,mi=mins%60;
  const ap=h>=12?'pm':'am';
  h=h%12||12;
  return h+(mi?':'+pad(mi):'')+ap;
}
function fmtT(t){return fmtM(toMins(t))}
function span(d){return !d.o?'closed':d.all?'open 24 hours':fmtT(d.a)+'-'+fmtT(d.b)}
function summary(w){
  const out=[];let i=0;
  while(i<7){
    let j=i;
    while(j<6&&span(w[j+1])===span(w[i]))j++;
    out.push((i===j?DAYS[i]:DAYS[i]+'-'+DAYS[j])+' '+span(w[i]));
    i=j+1;
  }
  return out.length===1&&w[0].o?'Every day '+span(w[0]):out.join(', ');
}
function hoursLabel(d){return !d||!d.o?'Closed':d.all?'Open 24 hours':fmtT(d.a)+'–'+fmtT(d.b)}
function weekRows(w,today){
  const rows=[];let i=0;
  while(i<7){
    let j=i;
    while(j<6&&span(w[j+1])===span(w[i]))j++;
    rows.push({label:i===j?DAYS[i]:DAYS[i]+'–'+DAYS[j],hours:hoursLabel(w[i]),today:today!=null&&today>=i&&today<=j,from:i,to:j});
    i=j+1;
  }
  return rows;
}
const pt=s=>{
  const m=String(s||'').trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/);
  if(!m)return null;
  let h=+m[1],mi=+(m[2]||0);
  if(m[3]==='pm'&&h<12)h+=12;
  if(m[3]==='am'&&h===12)h=0;
  if(h>24||mi>59||(h===24&&mi>0))return null;
  const raw=+(m[2]||0);
  mi=raw<15?0:raw<45?30:0;
  if(raw>=45)h++;
  if(h>=24)return '24:00';
  return pad(Math.min(h,23))+':'+(mi? '30':'00');
};
function parse(txt){
  const raw=String(txt??'').trim();
  if(!raw)return {w:defaults(),holidays:[],ok:true,empty:true,usable:false,summary:''};
  if(raw[0]==='{'){
    try{
      const j=JSON.parse(raw);
      if(j&&Array.isArray(j.days)&&j.days.length===7){
        const w=j.days.map(normalizeDay);
        const holidays=(Array.isArray(j.holidays)?j.holidays:[]).map(normalizeHol).filter(Boolean);
        return {w,holidays,ok:true,empty:false,usable:true,summary:typeof j.summary==='string'&&j.summary?j.summary:summary(w)};
      }
    }catch(e){}
  }
  const w=DAYS.map(()=>({o:false,a:'09:00',b:'17:30',all:false}));
  let hit=0,bad=0;
  raw.replace(/[–—]/g,'-').replace(/\bto\b/gi,'-').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean).forEach(seg=>{
    const m=seg.match(/^(every ?day|daily|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)(?:\s*-\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*)?\s*:?\s*(.*)$/i);
    if(!m){bad++;return}
    const k=x=>DAYS.findIndex(d=>x.toLowerCase().startsWith(d.toLowerCase()));
    let a,b;
    if(/^(every|daily)/i.test(m[1])){a=0;b=6}
    else{a=k(m[1]);b=m[2]?k(m[2]):a}
    if(a<0||b<0){bad++;return}
    const r=m[3].trim().toLowerCase();
    let d;
    if(/closed/.test(r)||r==='shut'||r==='off')d={o:false,a:'09:00',b:'17:30',all:false};
    else if(/24/.test(r)&&/hour|24\/7|24h/.test(r))d={o:true,a:'00:00',b:'24:00',all:true};
    else{
      const t=r.replace(/^open\s*/,'').split(/\s*-\s*/);
      const x=pt(t[0]||''),y=pt(t[1]||'');
      if(!x||!y){bad++;return}
      d={o:true,a:x,b:y,all:false};
    }
    for(let i=a,guard=0;guard<8;i=(i+1)%7,guard++){w[i]={...d};hit++;if(i===b)break}
  });
  if(!hit)return {w:defaults(),holidays:[],ok:false,empty:false,usable:false,summary:''};
  return {w,holidays:[],ok:!bad,empty:false,usable:true,summary:summary(w)};
}
function encode(w,holidays){
  const days=(w||defaults()).map(normalizeDay);
  const seen=new Set();
  const hols=(holidays||[]).map(normalizeHol).filter(h=>{if(!h||seen.has(h.date))return false;seen.add(h.date);return true}).sort((a,b)=>a.date<b.date?-1:1);
  return JSON.stringify({v:2,tz:'Europe/London',days,holidays:hols,summary:summary(days)});
}
function display(txt){
  const p=parse(txt);
  if(p.usable)return p.summary||summary(p.w);
  return '';
}
function london(date){
  const d=date instanceof Date?date:new Date(date);
  const dtf=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const parts={};
  for(const p of dtf.formatToParts(d))if(p.type!=='literal')parts[p.type]=p.value;
  let hour=+parts.hour;if(hour===24)hour=0;
  const minute=+parts.minute;
  const weekday=WD[parts.weekday];
  return {weekday:weekday==null?0:weekday,mins:hour*60+minute,iso:parts.year+'-'+parts.month+'-'+parts.day,hour,minute};
}
function now(){
  try{if(typeof window!=='undefined'&&window.__SHOPNIP_NOW)return new Date(window.__SHOPNIP_NOW)}catch(e){}
  return new Date();
}
function addDays(iso,delta){
  const [y,m,d]=iso.split('-').map(Number);
  const t=new Date(Date.UTC(y,m-1,d+delta));
  return t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(t.getUTCDate());
}
function weekdayOf(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return (new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7;
}
function rangeOf(d){
  if(!d||d.closed||d.o===false)return null;
  if(d.all)return {start:0,end:1440,all:true,overnight:false,note:d.note||''};
  const start=toMins(d.a),end=toMins(d.b);
  return {start,end,all:false,overnight:end<=start,note:d.note||''};
}
function holidayOn(p,iso){
  return (p.holidays||[]).find(h=>h.date===iso)||null;
}
function daySchedule(p,iso){
  const hol=holidayOn(p,iso);
  if(hol)return hol.closed?null:rangeOf({o:true,a:hol.a,b:hol.b,all:hol.all,note:hol.note});
  const d=p.w[weekdayOf(iso)];
  return d&&d.o?rangeOf(d):null;
}
function findNextOpen(p,L){
  for(let k=0;k<8;k++){
    const iso=addDays(L.iso,k);
    const sch=daySchedule(p,iso);
    if(!sch)continue;
    if(k===0){
      if(!sch.all&&L.mins<sch.start)return {iso,mins:sch.start,k};
      continue;
    }
    return {iso,mins:sch.all?0:sch.start,k,all:sch.all};
  }
  return null;
}
function unknown(){
  return {open:false,unknown:true,openingSoon:false,closingSoon:false,state:'unknown',label:'Hours not set',notice:'Opening hours have not been added for this shop yet.',summary:'',closesAt:null,opensAt:null};
}
function status(txt,at){
  const p=parse(txt);
  if(!p.usable)return unknown();
  const L=london(at||now());
  const today=daySchedule(p,L.iso);
  const yIso=addDays(L.iso,-1);
  const yday=daySchedule(p,yIso);
  const openFromY=!!(yday&&yday.overnight&&L.mins<yday.end);
  const openFromT=!!(today&&(today.all||(today.overnight?L.mins>=today.start:(L.mins>=today.start&&L.mins<today.end))));
  const isOpen=openFromY||openFromT;
  let closesMin=null;
  if(openFromT&&today&&!today.all)closesMin=today.end;
  else if(openFromY&&yday)closesMin=yday.end;
  let minsUntilClose=null;
  if(isOpen&&closesMin!=null){
    if(openFromT&&today&&today.overnight)minsUntilClose=(1440-L.mins)+closesMin;
    else minsUntilClose=closesMin-L.mins;
  }
  const closingSoon=!!(minsUntilClose!=null&&minsUntilClose>0&&minsUntilClose<=SOON);
  const next=isOpen?null:findNextOpen(p,L);
  const openingSoon=!!(next&&next.k===0&&(next.mins-L.mins)<=SOON&&(next.mins-L.mins)>0);
  const hol=holidayOn(p,L.iso);
  let label,notice='';
  const browse='You can browse now — collection & delivery start when the shop opens.';
  if(isOpen){
    if(today&&today.all&&!openFromY)label='Open 24 hours';
    else if(closingSoon)label='Closes at '+fmtM(closesMin);
    else if(closesMin!=null)label='Open · Closes '+fmtM(closesMin);
    else label='Open now';
    notice=hol&&hol.note?hol.note+'.':'';
  }else if(!next){
    label='Closed';
    notice=browse;
  }else if(next.k===0){
    label='Opens at '+fmtM(next.mins);
    notice=browse;
  }else if(next.k===1){
    label='Opens tomorrow at '+fmtM(next.mins);
    notice=browse;
  }else{
    label='Opens '+DAYS[weekdayOf(next.iso)]+' at '+fmtM(next.mins);
    notice=browse;
  }
  if(!isOpen&&hol&&hol.note)notice=(hol.closed?hol.note+'. ':hol.note+'. ')+notice;
  return {
    open:isOpen,unknown:false,openingSoon,closingSoon,
    state:isOpen?(closingSoon?'closing-soon':'open'):(openingSoon?'opening-soon':'closed'),
    label,notice,summary:p.summary||summary(p.w),
    closesAt:isOpen&&closesMin!=null?fmtM(closesMin):null,
    opensAt:!isOpen&&next?fmtM(next.mins):null,
    holiday:hol&&hol.note?hol.note:null
  };
}

return {DAYS,FULL,parse,summary,encode,display,status,london,now,addDays,weekdayOf,daySchedule,fmtM,toMins,span,defaults,weekRows,hoursLabel};
});
