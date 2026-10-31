// ShopNip · p27: seller tools in seller.html (loaded after seller.js).
// Invoice auto-fill · Plan & fees (partner tier) · Smart re-order · Insights · Promote (branding, poster/QR, share) · Counter mode.
// Data: shop_listings (supplier, low_stock_threshold, reorder_qty from migration 019), shops.brand_color (019),
// wholesale_partners / shop_partner_links / listing_fee_settings + RPCs shop_fee_tier, request_partner_link (017).
// ?mock=1 runs on in-memory data. No payments are taken: fees are shown and recorded only.
(()=>{
const NB=window.NBSeller;if(!NB)return;
const {D,API,PAGES,NAV,TITLE,DASH,I,MOCK,sb,svg,esc,gbp,gbp0,toast,LOW,DEAD,OPEN,chip,actBtns,when,ago}=NB;
const rr=()=>NB.rerender();
const CFG=window.APP_CONFIG||{},SITE=(CFG.SITE_URL||'https://www.shopnip.co.uk').replace(/\/$/,'');
/* ---------- invoice parser (pure; also exposed as window.NBInvoice for tests) ---------- */
const NBInvoice=(()=>{
const num=s=>{if(s==null)return NaN;s=String(s).replace(/[£$€\s]/g,'').replace(/,(?=\d{3}\b)/g,'');if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');return parseFloat(s)};
function splitRow(line,d){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(q){if(c==='"'){if(line[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}else if(c==='"')q=true;else if(c===d){out.push(cur);cur=''}else cur+=c}out.push(cur);return out.map(x=>x.trim())}
const COLS={name:/^(product|item|description|desc|product name|item name|product title|title|details)/i,sku:/(sku|code|ref|item no|product no|barcode|ean|part)/i,
  qty:/^(qty|quantity|units|qty ordered|qty shipped|quantity ordered|no\.?|cases?|pack qty|ordered|shipped)/i,cost:/(unit\s*(cost|price)|cost price|price|rate|trade|each|net price|cost)/i,total:/(line total|total|amount|net|value|ext)/i,supplier:/(supplier|wholesaler|vendor)/i};
function csv(text){const rows=text.split(/\r?\n/).filter(l=>l.trim());if(rows.length<2)return null;
  const d=[',',';','\t'].map(c=>[c,rows.slice(0,5).filter(r=>r.split(c).length>2).length]).sort((a,b)=>b[1]-a[1])[0];if(d[1]<2)return null;const dl=d[0];
  let hi=rows.slice(0,8).findIndex(r=>{const h=splitRow(r,dl);return h.some(x=>COLS.name.test(x))&&h.some(x=>COLS.qty.test(x)||COLS.cost.test(x))});if(hi<0)return null;
  const H=splitRow(rows[hi],dl),col={};
  H.forEach((h,i)=>{h=h.trim();if(col.sku==null&&COLS.sku.test(h)&&!/desc/i.test(h))col.sku=i;else if(col.name==null&&COLS.name.test(h))col.name=i;else if(col.qty==null&&COLS.qty.test(h))col.qty=i;
    else if(col.supplier==null&&COLS.supplier.test(h))col.supplier=i;else if(col.cost==null&&COLS.cost.test(h)&&!/total|amount|line/i.test(h))col.cost=i;else if(col.total==null&&COLS.total.test(h))col.total=i});
  if(col.name==null)return null;const out=[];
  rows.slice(hi+1).forEach(r=>{const c=splitRow(r,dl),name=(c[col.name]||'').trim();if(!name||SKIP.test(name))return;
    const qty=col.qty!=null?Math.round(num(c[col.qty])):1,tot=col.total!=null?num(c[col.total]):NaN;let cost=col.cost!=null?num(c[col.cost]):NaN;
    if(!(cost>=0)&&tot>=0&&qty>0)cost=tot/qty;out.push(line(name,col.sku!=null?c[col.sku]:'',qty>0?qty:1,cost,false,col.supplier!=null?c[col.supplier]:''))});
  return out.length?out:null}
const SKIP=/\b(sub-?total|grand total|total|vat|balance|carriage|delivery charge|invoice (no|number|date)|amount due|payment|account no|page \d|thank you|discount total|credit)\b/i;
const MONEY=/£?\s?\d{1,6}(?:,\d{3})*[.,]\d{2}(?!\d)/g;
function text(t){const out=[];
  t.split(/\r?\n/).forEach(raw=>{let s=raw.replace(/\s+/g,' ').trim();if(s.length<5||SKIP.test(s))return;
    const money=[...s.matchAll(MONEY)].map(m=>({v:num(m[0]),i:m.index,l:m[0].length}));if(!money.length)return;
    let rest=s;for(const m of [...money].reverse())rest=rest.slice(0,m.i)+' '+rest.slice(m.i+m.l);
    rest=rest.replace(/\s+%\s*|\b\d{1,2}(\.\d+)?%/g,' ');
    let toks=rest.split(' ').filter(Boolean),sku='';
    if(toks.length>2&&/^[A-Z0-9][A-Z0-9\-\/.]{2,19}$/i.test(toks[0])&&/\d/.test(toks[0])&&!/^\d{1,3}$/.test(toks[0])){sku=toks.shift()}
    let qty=null,qi=-1;
    for(let i=toks.length-1;i>=0;i--){const x=toks[i];if(/^\d{1,5}$/.test(x)){qty=+x;qi=i;break}const m=x.match(/^(\d{1,5})x$/i);if(m){qty=+m[1];qi=i;break}if(i<toks.length-3)break}
    if(qi<0&&/^\d{1,4}$/.test(toks[0]||'')&&toks.length>2){qty=+toks[0];qi=0}
    if(qi>=0)toks.splice(qi,1);
    const name=toks.join(' ').replace(/(\s[x×@])+\s*$/i,'').replace(/^[-–:·\s]+|[-–:·\s]+$/g,'').trim();if(name.replace(/[^a-z]/gi,'').length<3)return;
    const V=money.map(m=>m.v);let cost,unsure=false;qty=qty||1;
    if(V.length>=2){const a=V[V.length-2],b=V[V.length-1];
      if(Math.abs(a*qty-b)<=0.02*Math.max(1,b))cost=a;else if(Math.abs(V[0]*qty-b)<=0.02*Math.max(1,b))cost=V[0];else if(qty>0&&Math.abs(b/qty-a)>0.01){cost=a;unsure=true}else cost=a}
    else{cost=V[0];unsure=qty>1}
    out.push(line(name,sku,qty,cost,unsure,''))});
  return out}
function line(name,sku,qty,cost,unsure,supplier){return{name:String(name).trim().slice(0,160),sku:String(sku||'').trim().slice(0,40),qty:Math.max(1,Math.round(+qty||1)),cost:+(+cost||0).toFixed(2),check:!!unsure||!(+cost>0),supplier:String(supplier||'').trim().slice(0,120)}}
function parse(t){t=String(t||'').replace(/\u00a0/g,' ');const c=csv(t);return c?{format:'csv',lines:c}:{format:'text',lines:text(t)}}
const retail=(cost,markup,exact)=>{const v=(+cost||0)*(1+(+markup||0)/100);return exact?+v.toFixed(2):Math.max(.05,Math.round(v*20)/20)};
return {parse,retail,splitRow}})();
window.NBInvoice=NBInvoice;

// ---------- icons, nav, titles ----------
Object.assign(I,{upl:'<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 16v4h16v-4"/>',cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/>',
  bars:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',crown:'<path d="M3 18h18l-2-10-5 4-2-6-2 6-5-4z"/>',qr:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
  tab:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M11 17h2"/>',copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',dlf:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',mailx:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  wa:'<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.2-2-1-1 .7a5 5 0 0 1-2.2-2.2l.7-1-1-2z"/>',link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',print:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>'});
const ADD=[['invoice','upl','Invoice auto-fill'],['reorder','cart','Re-order'],['insights','bars','Insights'],['plan','crown','Plan & fees'],['boost','qr','Promote my shop'],['counter','tab','Counter mode']];
ADD.forEach(([k,ic,t])=>{if(!DASH.includes(k))DASH.push(k);TITLE[k]=t;if(!NAV.find(n=>n[0]===k))NAV.push([k,ic])});

// ---------- small helpers ----------
const U={inv:{step:'in',markup:+(localStorage.nb_markup||60),supplier:'',text:'',lines:[],live:true,busy:false,fmt:''},re:{q:'',qty:{},rq:''},tier:null,tierErr:'',partners:null,bc:null,
  code:(new URLSearchParams(location.search).get('partner')||localStorage.nb_partner_code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12)};
if(U.code)localStorage.nb_partner_code=U.code;
const isSuman=()=>/suman\s*bros/i.test(D.shop?.name||'');
const markup=()=>isSuman()?50:U.inv.markup;
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
const shopURL=()=>D.shop?SITE+'/shop/'+slug(D.shop.name)+'-'+String(D.shop.id).slice(0,8):SITE;
const thr=l=>l.low_stock_threshold!=null?+l.low_stock_threshold:LOW;
const alive=o=>!DEAD.includes(o.status);
const copy=async(t,m)=>{try{await navigator.clipboard.writeText(t);toast(m||'Copied')}catch{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast(m||'Copied')}catch{toast('Could not copy')}a.remove()}};
const dl=(name,rows)=>{const c=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};const b=new Blob([rows.map(r=>r.map(c).join(',')).join('\n')],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
const loadScript=(src,integrity)=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;if(integrity){s.integrity=integrity;s.crossOrigin='anonymous'}s.onload=ok;s.onerror=()=>no(new Error('Could not load '+src.split('/').pop()));document.head.appendChild(s)});
const sold=(days)=>{const t=Date.now()-days*864e5,m={};D.O.filter(o=>alive(o)&&Date.parse(o.created_at)>=t).forEach(o=>o.order_items.forEach(i=>{const k=i.listing_id||i.sku;m[k]=(m[k]||0)+i.qty}));return m};

// ---------- data: partner tier / fees ----------
const MP={std:12,partners:[{id:'w1',name:'Suman Bros Wholesale',partner_fee:4},{id:'w2',name:'Riverside Cash & Carry',partner_fee:6}],link:null,codes:{SUMAN24:'w1'}};
const X=MOCK?{
  async partners(){return MP.partners},
  async tier(){const l=MP.link,w=l&&MP.partners.find(p=>p.id===l.partner_id),ok=l&&l.status==='verified';return{standard_fee:MP.std,tier:ok?'partner':'standard',fee:ok?w.partner_fee:MP.std,partner_id:l?.partner_id||null,partner_name:w?.name||null,link_status:l?.status||null}},
  async request(pid,code){if(code){pid=MP.codes[code.toUpperCase()];if(!pid)throw new Error('That invite code is not valid')}MP.link={partner_id:pid,status:'requested'};if(/suman/i.test(D.shop.name)&&pid==='w1')MP.link.status='verified'},
}:{
  async partners(){const {data,error}=await sb.from('wholesale_partners').select('id,name,partner_fee').eq('active',true).order('name');if(error)throw error;return data},
  async tier(){const {data,error}=await sb.rpc('shop_fee_tier',{p_shop:D.shop.id});if(error)throw error;return data},
  async request(pid,code){const {error}=await sb.rpc('request_partner_link',{p_partner:pid||null,p_code:code||null});if(error)throw error},
};
async function loadTier(force){if(!D.shop||(U.tier&&!force)||U._tl)return;U._tl=true;
  try{[U.tier,U.partners]=await Promise.all([X.tier(),X.partners()]);U.tierErr=''}catch(e){console.warn('tier',e);U.tierErr='Fee details are unavailable right now.'}U._tl=false;rr()}

// ---------- CSS ----------
const css=document.createElement('style');css.id='p27css';css.textContent=`
.p27g{display:grid;gap:16px}.p27two{display:grid;gap:16px}@media(min-width:960px){.p27two{grid-template-columns:1.2fr 1fr}}
.p27drop{border:2px dashed #b9c4cf;border-radius:16px;padding:22px;text-align:center;background:#fafbfc;display:grid;gap:8px;justify-items:center}.p27drop.on{border-color:var(--t);background:var(--tl)}
.p27drop svg{width:34px;height:34px;color:var(--t)}.p27drop b{font-size:16px}
.p27 textarea{width:100%;min-height:150px;font:13px/1.45 ui-monospace,Menlo,monospace;border:1px solid var(--line);border-radius:12px;padding:12px;box-sizing:border-box}
.p27row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.p27row .fld{flex:1;min-width:150px}
.p27 .tbl input{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:8px;padding:7px 8px;font:inherit;font-size:13.5px;min-width:0}.p27 .tbl input.n{width:84px;text-align:right}
.p27 .tbl td{padding:8px 10px}.p27 .tbl tr.off td{opacity:.45}.p27 .flag{display:inline-block;font-size:11px;font-weight:800;padding:2px 7px;border-radius:999px;background:#fff6d6;color:#92400e}
.p27 .flag.new{background:#ecfdf9;color:#0f766e}.p27 .flag.up{background:#eef2ff;color:#4338ca}
.p27sum{display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:14px 18px;border-top:1px solid var(--line);background:#fafbfc;border-radius:0 0 16px 16px}
.p27tier{display:grid;gap:12px}@media(min-width:720px){.p27tier{grid-template-columns:1fr 1fr}}
.p27t{border:1px solid var(--line);border-radius:16px;padding:18px;background:#fff;position:relative}.p27t.on{border:2px solid var(--t);background:linear-gradient(180deg,#f0fdfa,#fff)}
.p27t h4{margin:0 0 4px;font-size:15px}.p27t .pr{font-size:30px;font-weight:800;letter-spacing:-1px}.p27t .pr small{font-size:13px;color:var(--mut);font-weight:600;letter-spacing:0}
.p27t .cur{position:absolute;top:14px;right:14px;font-size:11px;font-weight:800;background:var(--t);color:#fff;padding:3px 9px;border-radius:999px}
.p27save{display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:14px;background:linear-gradient(90deg,#fff1ec,#fff7ed);border:1px solid #fed7c3;margin-bottom:16px;flex-wrap:wrap}
.p27save svg{width:26px;height:26px;color:var(--c2);flex:none}.p27save div{flex:1;min-width:200px}.p27save b{display:block}
.p27grp{margin-bottom:16px}.p27grp .chd small{color:var(--mut);font-weight:600}
.p27bars{display:flex;align-items:flex-end;gap:4px;height:160px;padding-top:8px}.p27bars div{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;min-width:0}
.p27bars i{display:block;width:100%;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#14b8a6,#0f766e);min-height:3px}.p27bars div.pk i{background:linear-gradient(180deg,#ff8a6b,#e8553a)}
.p27bars small{font-size:10.5px;color:var(--mut)}.p27bars em{font-style:normal;font-size:10.5px;font-weight:700;color:var(--txt);min-height:14px}
.p27top{display:grid;gap:8px}.p27top div{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:center;font-size:14px}.p27top span.b{grid-column:2/4;height:6px;border-radius:9px;background:#eef1f4;overflow:hidden}.p27top span.b i{display:block;height:100%;background:var(--t)}
.p27top em{font-style:normal;font-weight:800;color:var(--mut);font-size:12px}
.p27poster{width:100%;max-width:420px;aspect-ratio:1/1.414;margin:0 auto;background:#fff;border-radius:14px;box-shadow:var(--sh2);display:flex;flex-direction:column;align-items:center;text-align:center;padding:26px 22px;box-sizing:border-box;border-top:14px solid var(--bc,#0f766e)}
.p27poster .lg{width:64px;height:64px;border-radius:16px;background:var(--bc,#0f766e);color:#fff;font-size:30px;font-weight:800;display:grid;place-items:center;overflow:hidden}.p27poster .lg img{width:100%;height:100%;object-fit:cover}
.p27poster h2{margin:12px 0 2px;font-size:26px;letter-spacing:-.5px;color:var(--bc,#0f766e)}.p27poster p{margin:0;color:#475467;font-size:14px}
.p27poster .q{margin:16px 0 10px;width:58%;aspect-ratio:1}.p27poster .q svg{width:100%;height:100%}.p27poster .u{font-size:11.5px;color:#475467;word-break:break-all}
.p27poster .big{font-size:19px;font-weight:800;margin-top:auto;color:#101828}.p27poster .by{font-size:12px;color:#667085;margin-top:6px}.p27poster .by b{color:#ff6b4a}
.p27sw{display:flex;gap:8px;flex-wrap:wrap}.p27sw button{width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer}.p27sw button.on{box-shadow:0 0 0 2px var(--txt)}
.p27share{display:flex;gap:8px;flex-wrap:wrap}.p27share input{flex:1;min-width:200px;border:1px solid var(--line);border-radius:10px;padding:9px 10px;font:inherit;font-size:13px}
.dl:has(.p27c) .side,.dl:has(.p27c) .tb,.dl:has(.p27c) .bnav,.dl:has(.p27c) .dfoot,.dl:has(.p27c) .bnr{display:none}.dl:has(.p27c) .main{margin:0!important;padding:0!important;max-width:none}.dl:has(.p27c) .pg{padding:0!important;max-width:none}
.p27c{min-height:100vh;background:#0b3b38;color:#fff;padding:18px;box-sizing:border-box}.p27c .hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}.p27c .hd h2{margin:0;font-size:24px;flex:1}
.p27c .hd .btn.ghost{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)}
.p27c .pin{display:flex;gap:10px;background:rgba(255,255,255,.08);border-radius:16px;padding:12px;margin-bottom:16px;align-items:center;flex-wrap:wrap}.p27c .pin input{flex:1;min-width:180px;font-size:26px;font-weight:800;letter-spacing:.2em;padding:12px 16px;border-radius:12px;border:0;text-align:center;color:#14202e;background:#fff}
.p27c .cols{display:grid;gap:14px}@media(min-width:900px){.p27c .cols{grid-template-columns:repeat(3,1fr)}}
.p27c .col h3{margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;opacity:.8}.p27c .oc{background:#fff;color:var(--txt);border-radius:16px;padding:14px;margin-bottom:12px}
.p27c .oc .top{display:flex;justify-content:space-between;gap:8px;align-items:center}.p27c .oc .top b{font-size:20px}.p27c .oc ul{margin:8px 0;padding:0 0 0 18px;font-size:15px}.p27c .oc .acts{display:flex;gap:8px;flex-wrap:wrap}.p27c .oc .btn{padding:14px 18px;font-size:16px;flex:1}
.p27c .oc.new{box-shadow:0 0 0 4px #ff6b4a}.p27c .none{opacity:.7;padding:20px;text-align:center;border:1px dashed rgba(255,255,255,.3);border-radius:16px}
.p27c .match{background:#ecfdf9;color:#134e4a;border-radius:12px;padding:12px;width:100%;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
@media print{body *{visibility:hidden!important}.p27poster,.p27poster *{visibility:visible!important}.p27poster{position:fixed;left:0;top:0;width:100%;max-width:none;height:100%;box-shadow:none;border-radius:0}}
`;document.head.appendChild(css);

// ---------- tolerant writes: before migration 019 the new columns do not exist yet ----------
const NEWCOLS=['supplier','low_stock_threshold','reorder_qty'];
const strip=o=>{const r={...o};NEWCOLS.forEach(k=>delete r[k]);return r};
const colErr=e=>/supplier|low_stock_threshold|reorder_qty|schema cache|column/i.test(e?.message||'');
async function upd(id,ch){try{await API.updListing(id,ch)}catch(e){if(!colErr(e))throw e;const s=strip(ch);if(Object.keys(s).length)await API.updListing(id,s);U.noCols=true}}
async function add(l){try{return await API.addListing(l)}catch(e){if(!colErr(e))throw e;U.noCols=true;return await API.addListing(strip(l))}}

// =================== 1. INVOICE AUTO-FILL ===================
async function pdfText(file){
  if(!window.pdfjsLib){await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js','sha384-OemFRmhjDZwhIKuUld0HJozkF2YErsgDaCL41trxGQZt4/WgnopJQqQl2DvDZ07Z');
    await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js','sha384-sS8B4COeBqzQV9DaPpp5cbpF+xz2jPcFbN3L8FL3/dx0RMC6WLUwTUOFm0iFb1lw');}
  const lib=window.pdfjsLib;lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
  const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise,out=[];
  for(let p=1;p<=Math.min(doc.numPages,20);p++){const tc=await (await doc.getPage(p)).getTextContent(),rows=[];
    tc.items.forEach(it=>{if(!it.str.trim())return;const y=Math.round(it.transform[5]),x=it.transform[4];let r=rows.find(r=>Math.abs(r.y-y)<=3);if(!r)rows.push(r={y,c:[]});r.c.push([x,it.str])});
    rows.sort((a,b)=>b.y-a.y).forEach(r=>out.push(r.c.sort((a,b)=>a[0]-b[0]).map(c=>c[1]).join('  ')))}
  return out.join('\n')}
async function readFile(f){const n=f.name.toLowerCase();
  if(f.size>8e6)throw new Error('File is too big (8MB max)');
  if(/\.pdf$/.test(n)||f.type==='application/pdf')return pdfText(f);
  if(/^image\//.test(f.type))throw new Error('PHOTO');
  return await f.text()}
function catIdx(){if(U._ci&&U._ci.n===(D.cat||[]).length)return U._ci.m;const m=new Map();(D.cat||[]).forEach(p=>m.set(String(p.sku).toUpperCase(),p));U._ci={n:(D.cat||[]).length,m};return m}
function enrich(lines){const by=new Map(D.L.map(l=>[String(l.sku).toUpperCase(),l])),ci=catIdx();
  return lines.map((x,i)=>{const k=x.sku.toUpperCase(),ex=k&&by.get(k),cp=!ex&&k&&ci.get(k);
    return{...x,i,on:true,ex:ex?ex.id:null,img:ex?.image||cp?.images?.[0]||null,cat:ex?.category||cp?.category||null,name:cp&&!x.name?cp.name:x.name,supplier:x.supplier||U.inv.supplier,
      retail:ex?+ex.retail_price:NBInvoice.retail(x.cost,markup(),isSuman()),cm:!!cp}})}
async function doParse(text){const r=NBInvoice.parse(text);U.inv.fmt=r.format;
  if(!r.lines.length){U.inv.err='We could not find product lines in that invoice. Check it has a description, quantity and price on each line, or paste the lines below.';rr();return}
  await NB.catalog();U.inv.lines=enrich(r.lines);U.inv.step='rev';U.inv.err='';rr()}
PAGES.invoice=()=>{const v=U.inv,sm=isSuman();
  if(v.step==='done')return `<div class="p27"><div class="ph"><div><h2>Invoice added</h2><p>${esc(v.doneMsg||'')}</p></div></div><div class="card"><div class="cb p27g">
    <div class="bnr info">${svg('check')}<div><b>All saved.</b>New products are in Products &amp; stock. You can change prices, stock or hide items there at any time.</div></div>
    <div class="p27row"><a class="btn" href="#products">${svg('box')}Go to products</a><button class="btn ghost" data-k27="inv-new">${svg('upl')}Add another invoice</button></div></div></div></div>`;
  if(v.step==='rev')return invReview();
  return `<div class="p27"><div class="ph"><div><h2>Invoice auto-fill</h2><p>Upload a wholesale invoice and we fill in your products: name, code, quantity and cost, with a suggested shop price. You check everything before it’s saved.</p></div></div>
  ${sm?`<div class="bnr info">${svg('sync')}<div><b>Suman Bros orders still list automatically.</b>Products you buy from Suman Bros appear in your shop when they ship. Use this page for invoices from any other supplier, or for items bought in person.</div></div>`:''}
  <div class="p27two"><div class="card"><div class="chd"><h3>1. Add your invoice</h3></div><div class="cb p27g">
    <label class="p27drop" id="p27drop">${svg('upl')}<b>Choose a file or drop it here</b><span class="mut">CSV or spreadsheet export, PDF invoice, or a text file</span><input type="file" id="p27file" accept=".csv,.txt,.tsv,.pdf,text/plain,text/csv,application/pdf,image/*" hidden><span class="btn ghost sm">Browse files</span></label>
    <label class="fld"><span>Or paste the invoice lines</span><textarea id="p27txt" placeholder="SKU   Description              Qty   Unit    Total&#10;BIC-918  Cristal pen blue box 50   2   7.49   14.98">${esc(v.text)}</textarea></label>
    <small class="mut">Photo of a paper invoice? Open it on your phone, use the camera’s copy text option (Live Text on iPhone, Google Lens on Android), then paste the text here.</small>
    ${v.err?`<div class="bnr bad">${svg('alert')}<div>${esc(v.err)}</div></div>`:''}</div></div>
   <div class="card"><div class="chd"><h3>2. Pricing</h3></div><div class="cb p27g">
    <label class="fld"><span>Supplier name</span><input id="p27sup" value="${esc(v.supplier)}" placeholder="e.g. the wholesaler on the invoice" maxlength="120" autocomplete="off"></label>
    <label class="fld"><span>Markup on cost (%)</span><input id="p27mk" type="number" min="0" max="500" step="1" value="${sm?50:v.markup}" ${sm?'disabled':''}></label>
    <small class="mut">${sm?'Suman Bros prices are always trade × 1.5.':`Suggested shop price = cost + ${v.markup}%, rounded to 5p. Example: £1.00 cost → ${gbp(NBInvoice.retail(1,v.markup))}.`}</small>
    <button class="btn lg" data-k27="parse" ${v.busy?'disabled':''}>${v.busy?'Reading invoice…':'Read invoice'}</button></div></div></div></div>`};
function invReview(){const v=U.inv,L=v.lines,on=L.filter(x=>x.on),cost=on.reduce((a,x)=>a+x.cost*x.qty,0),val=on.reduce((a,x)=>a+x.retail*x.qty,0),nNew=on.filter(x=>!x.ex).length,nUp=on.length-nNew,chk=on.filter(x=>x.check).length;
  return `<div class="p27"><div class="ph"><div><h2>Check before saving</h2><p>${L.length} line${L.length===1?'':'s'} found${v.fmt==='csv'?' in your spreadsheet':''}. Untick anything you don’t want to sell, and fix any names or prices.</p></div>
   <div class="acts"><button class="btn ghost sm" data-k27="inv-back">Back</button></div></div>
  ${chk?`<div class="bnr">${svg('alert')}<div><b>${chk} line${chk>1?'s':''} to double-check</b>We weren’t sure of the quantity or cost on lines marked “Check”.</div></div>`:''}
  <div class="card"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th></th><th>Product</th><th>Code</th><th class="num">Qty</th><th class="num">Unit cost</th><th class="num">Shop price</th><th class="num">Margin</th><th>Supplier</th></tr></thead><tbody>
  ${L.map(x=>{const mg=x.retail>0?Math.round((x.retail-x.cost)/x.retail*100):0;return `<tr class="${x.on?'':'off'}" data-iv="${x.i}"><td><input type="checkbox" data-iv-f="on" ${x.on?'checked':''} aria-label="Include"></td>
   <td style="min-width:220px"><input id="iv${x.i}n" data-iv-f="name" value="${esc(x.name)}" aria-label="Product name"><div style="margin-top:4px">${x.ex?'<span class="flag up">Adds stock to your listing</span>':x.cm?'<span class="flag new">New · catalogue photo</span>':'<span class="flag new">New product</span>'} ${x.check?'<span class="flag">Check</span>':''}</div></td>
   <td style="min-width:110px"><input id="iv${x.i}s" data-iv-f="sku" value="${esc(x.sku)}" placeholder="auto" aria-label="Code"></td>
   <td class="num"><input id="iv${x.i}q" class="n" data-iv-f="qty" type="number" min="1" step="1" value="${x.qty}" aria-label="Quantity"></td>
   <td class="num"><input id="iv${x.i}c" class="n" data-iv-f="cost" type="number" min="0" step="0.01" value="${x.cost.toFixed(2)}" aria-label="Unit cost"></td>
   <td class="num">${x.ex?`<span class="mut">keeps ${gbp(x.retail)}</span>`:`<input id="iv${x.i}r" class="n" data-iv-f="retail" type="number" min="0.05" step="0.01" value="${x.retail.toFixed(2)}" aria-label="Shop price" ${isSuman()?'readonly':''}>`}</td>
   <td class="num mut" data-mg="${x.i}">${mg}%</td><td style="min-width:130px"><input id="iv${x.i}p" data-iv-f="supplier" value="${esc(x.supplier)}" placeholder="Supplier" aria-label="Supplier"></td></tr>`}).join('')}</tbody></table></div>
   <div class="p27sum"><div><b>${on.length} selected</b> <span class="mut">· ${nNew} new · ${nUp} stock top-up${nUp===1?'':'s'} · cost ${gbp(cost)} · shop value ${gbp(val)}</span></div>
    <label class="tg" style="padding:8px 12px"><span><b>Put new products live</b><small>Off = saved hidden so you can check them first</small></span><span class="sw"><input type="checkbox" id="p27live" ${v.live?'checked':''}><i></i></span></label>
    <button class="btn" data-k27="inv-save" ${v.busy||!on.length?'disabled':''}>${v.busy?'Saving…':`Save ${on.length} product${on.length===1?'':'s'}`}</button></div></div></div>`}
async function invSave(){const v=U.inv,on=v.lines.filter(x=>x.on&&x.name.trim());if(!on.length)return;v.busy=true;rr();let n=0,u=0,bad=0;
  for(const x of on){try{const sup=(x.supplier||'').trim()||null;
    if(x.ex){const l=D.L.find(z=>z.id===x.ex);const ch={stock:Math.max(0,(+l.stock||0)+x.qty),trade_price:x.cost,supplier:sup};await upd(l.id,ch);Object.assign(l,U.noCols?strip(ch):ch);u++}
    else{const sku=(x.sku||'').trim()||('INV-'+Date.now().toString(36).slice(-4).toUpperCase()+x.i);
      const rp=isSuman()?NBInvoice.retail(x.cost,50,true):Math.max(.05,+x.retail||NBInvoice.retail(x.cost,markup()));
      const l=await add({shop_id:D.shop.id,sku,name:x.name.trim().slice(0,160),image:x.img||null,category:x.cat||null,trade_price:x.cost,retail_price:rp,stock:x.qty,active:!!v.live&&rp>0,source:'invoice',supplier:sup});D.L.unshift(l);n++}}
   catch(e){console.warn(e);bad++}}
  v.busy=false;v.step='done';v.doneMsg=`${n} new product${n===1?'':'s'} added, ${u} listing${u===1?'':'s'} topped up${bad?`, ${bad} could not be saved`:''}.`;v.lines=[];v.text='';toast('Invoice saved');rr()}
function ivEdit(t){const tr=t.closest('[data-iv]'),x=U.inv.lines[+tr.dataset.iv],f=t.dataset.ivF;if(!x)return;
  if(f==='on'){x.on=t.checked;rr();return}
  if(f==='qty')x.qty=Math.max(1,Math.round(+t.value||1));else if(f==='cost'){x.cost=Math.max(0,+t.value||0);x.check=false;if(!x.ex){x.retail=NBInvoice.retail(x.cost,markup(),isSuman());const r=document.getElementById('iv'+x.i+'r');if(r)r.value=x.retail.toFixed(2)}}
  else if(f==='retail')x.retail=Math.max(0,+t.value||0);else x[f]=t.value;
  const m=document.querySelector(`[data-mg="${x.i}"]`);if(m)m.textContent=(x.retail>0?Math.round((x.retail-x.cost)/x.retail*100):0)+'%'}

// =================== 2. PLAN & FEES (two-tier) ===================
const feeTxt=f=>f>0?gbp(f):'£0';
function saveStrip(compact){const t=U.tier;if(!t)return '';const best=(U.partners||[]).reduce((m,p)=>Math.min(m,+p.partner_fee),Infinity),save=+t.standard_fee-best;
  if(t.tier==='partner')return compact?`<div class="bnr info">${svg('crown')}<div><b>Partner plan · ${feeTxt(t.fee)}/month</b>You’re linked to ${esc(t.partner_name||'a partner wholesaler')}, so you get the lower listing fee.</div></div>`:'';
  if(t.link_status==='requested')return `<div class="bnr">${svg('clock')}<div><b>Partner link pending</b>We’re checking your account with ${esc(t.partner_name||'the wholesaler')}. Once verified your fee drops to the partner rate.</div></div>`;
  if(!(save>0))return '';
  return `<div class="p27save">${svg('crown')}<div><b>Switch supplier and save ${gbp(save)}/month</b><span class="mut">Shops that buy from a ShopNip partner wholesaler pay ${feeTxt(best)}/month instead of ${feeTxt(t.standard_fee)}.</span></div><a class="btn coral sm" href="#plan">See partner plan</a></div>`}
PAGES.plan=()=>{loadTier();const t=U.tier;
  if(!t)return `<div class="p27"><div class="ph"><div><h2>Plan &amp; fees</h2></div></div><div class="card"><div class="empty">${svg('crown')}<b>${U.tierErr?esc(U.tierErr):'Loading your plan…'}</b></div></div></div>`;
  const P=U.partners||[],best=P.reduce((m,p)=>Math.min(m,+p.partner_fee),Infinity),isP=t.tier==='partner';
  return `<div class="p27"><div class="ph"><div><h2>Plan &amp; fees</h2><p>Your monthly listing fee depends on where you buy your stock.</p></div></div>
  <div class="bnr info">${svg('check')}<div><b>Your first 50 products are free to list.</b>The amounts below show the plan you’re on. Nothing is taken from your account.</div></div>
  ${saveStrip(false)}
  <div class="p27tier" style="margin-bottom:16px"><div class="p27t ${!isP?'on':''}">${!isP?'<span class="cur">Your plan</span>':''}<h4>Standard</h4><div class="pr">${feeTxt(t.standard_fee)}<small> /month</small></div><p class="mut">For any independent shop, whoever you buy from.</p></div>
   <div class="p27t ${isP?'on':''}">${isP?'<span class="cur">Your plan</span>':''}<h4>Partner</h4><div class="pr">${P.length?(isP?feeTxt(t.fee):'from '+feeTxt(best)):'–'}<small> /month</small></div><p class="mut">When your shop buys from a ShopNip partner wholesaler and the link is verified.${isP?` Linked to <b>${esc(t.partner_name||'')}</b>.`:''}</p></div></div>
  <div class="p27two"><div class="card"><div class="chd"><h3>Partner wholesalers</h3></div>${P.length?`<table class="tbl"><thead><tr><th>Wholesaler</th><th class="num">Your fee</th><th></th></tr></thead><tbody>
   ${P.map(p=>{const mine=t.partner_id===p.id;return `<tr><td><b>${esc(p.name)}</b></td><td class="num">${feeTxt(p.partner_fee)}/mo</td><td class="num">${mine?`<span class="flag ${t.link_status==='verified'?'new':''}">${t.link_status==='verified'?'Verified':t.link_status==='rejected'?'Not verified':'Pending'}</span>`:`<button class="btn ghost sm" data-k27="link" data-pid="${esc(p.id)}">I buy from them</button>`}</td></tr>`}).join('')}</tbody></table>`:`<div class="empty">${svg('crown')}<b>No partner wholesalers listed yet</b></div>`}</div>
   <div class="card"><div class="chd"><h3>Have an invite code?</h3></div><div class="cb p27g"><p class="mut" style="margin:0">Your wholesaler can give you a ShopNip code. Enter it and we’ll link your shop once they confirm you’re a customer.</p>
    <div class="p27row"><label class="fld"><span>Invite code</span><input id="p27code" value="${esc(U.code)}" maxlength="12" autocomplete="off" style="text-transform:uppercase;letter-spacing:.1em"></label><button class="btn" data-k27="code">Apply code</button></div></div></div></div></div>`};
async function linkReq(pid,code){if(!confirm(code?'Link your shop using this code? Our team checks it with the wholesaler.':'Ask to link your shop to this wholesaler? Our team checks it with them before the partner fee applies.'))return;
  try{await X.request(pid,code);localStorage.removeItem('nb_partner_code');U.code='';toast('Request sent');await loadTier(true)}catch(e){toast(e.message||'Could not send request')}}

// =================== 3. SMART RE-ORDER ===================
function reList(){const s30=sold(30);return D.L.filter(l=>l.stock<=thr(l)).map(l=>{const t=thr(l),q=U.re.qty[l.id]??(+l.reorder_qty>0?+l.reorder_qty:Math.max(1,t*2-l.stock,(s30[l.id]||0)-l.stock));return{l,q,s30:s30[l.id]||0}})}
const groups=R=>{const g={};R.forEach(r=>{const k=(r.l.supplier||'').trim()||'No supplier set';(g[k]=g[k]||[]).push(r)});return Object.entries(g).sort((a,b)=>a[0]==='No supplier set'?1:b[0]==='No supplier set'?-1:a[0].localeCompare(b[0]))};
const reText=(sup,rows)=>`Re-order for ${D.shop.name}${sup!=='No supplier set'?' from '+sup:''}\n${new Date().toLocaleDateString('en-GB')}\n\n`+rows.map(r=>`${r.q} x ${r.l.name}${r.l.sku?' ('+r.l.sku+')':''}`).join('\n')+`\n\nTotal lines: ${rows.length}`;
PAGES.reorder=()=>{if(MOCK&&!U._ms){U._ms=true;D.L.forEach((l,i)=>{if(l.supplier==null)l.supplier=l.source==='wholesale'?'Suman Bros Wholesale':i%3?'Riverside Cash & Carry':null})}const R=reList(),G=groups(R),q=U.re.rq.toLowerCase(),s30=sold(30);
  const rules=D.L.filter(l=>!q||(l.name+' '+l.sku+' '+(l.supplier||'')).toLowerCase().includes(q)).slice(0,q?40:12);
  return `<div class="p27"><div class="ph"><div><h2>Re-order</h2><p>Stock goes down automatically with every ShopNip order. Anything at or below its low-stock level shows here, grouped by supplier.</p></div>
   <div class="acts">${R.length?`<button class="btn ghost sm" data-k27="re-csv" data-g="*">${svg('dlf')}Download all (CSV)</button>`:''}</div></div>
  ${U.noCols?`<div class="bnr">${svg('alert')}<div><b>Supplier and low-stock settings can’t be saved yet.</b>Your stock levels still update.</div></div>`:''}
  ${G.length?G.map(([sup,rows])=>`<div class="card p27grp"><div class="chd"><h3>${esc(sup)} <small>· ${rows.length} item${rows.length>1?'s':''}</small></h3>
     <div class="p27row"><button class="btn ghost sm" data-k27="re-copy" data-g="${esc(sup)}">${svg('copy')}Copy</button><button class="btn ghost sm" data-k27="re-csv" data-g="${esc(sup)}">${svg('dlf')}CSV</button><button class="btn sm" data-k27="re-mail" data-g="${esc(sup)}">${svg('mailx')}Email draft</button></div></div>
    <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Product</th><th class="num">In stock</th><th class="num">Low at</th><th class="num">Sold 30 days</th><th class="num">Order qty</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td><b>${esc(r.l.name)}</b><div class="mut">${esc(r.l.sku)}${+r.l.trade_price>0?' · cost '+gbp(r.l.trade_price):''}</div></td><td class="num">${r.l.stock<=0?'<span class="flag">Out</span>':r.l.stock}</td><td class="num mut">${thr(r.l)}</td><td class="num">${r.s30}</td>
     <td class="num"><input class="n" id="rq${esc(r.l.id)}" data-rq="${esc(r.l.id)}" type="number" min="0" step="1" value="${r.q}" aria-label="Order quantity"></td></tr>`).join('')}</tbody></table></div></div>`).join('')
   :`<div class="card p27grp"><div class="empty">${svg('check')}<b>Nothing to re-order</b>Every product is above its low-stock level.</div></div>`}
  <div class="card"><div class="chd"><h3>Stock rules</h3><input id="p27rq" class="fld" style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;min-width:180px" placeholder="Find a product" value="${esc(U.re.rq)}"></div>
   <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Product</th><th class="num">Stock</th><th class="num">Sold 30d</th><th>Supplier</th><th class="num">Low at</th><th class="num">Re-order qty</th></tr></thead><tbody>
   ${rules.map(l=>`<tr data-rl="${esc(l.id)}"><td><b>${esc(l.name)}</b><div class="mut">${esc(l.sku)}</div></td><td class="num">${l.stock}</td><td class="num">${s30[l.id]||0}</td>
    <td style="min-width:140px"><input data-rf="supplier" value="${esc(l.supplier||'')}" placeholder="Supplier" maxlength="120" aria-label="Supplier"></td>
    <td class="num"><input class="n" data-rf="low_stock_threshold" type="number" min="0" step="1" value="${l.low_stock_threshold??''}" placeholder="${LOW}" aria-label="Low stock level"></td>
    <td class="num"><input class="n" data-rf="reorder_qty" type="number" min="0" step="1" value="${l.reorder_qty??''}" placeholder="auto" aria-label="Re-order quantity"></td></tr>`).join('')}</tbody></table></div>
   <div class="cb mut" style="font-size:13px">Showing ${rules.length} of ${D.L.length}. Supplier names are only for you; customers just see your shop. Blank “Low at” uses ${LOW}.</div></div></div>`};
function reGroup(g){const R=reList().filter(r=>(U.re.qty[r.l.id]??r.q)>0);return g==='*'?R:R.filter(r=>((r.l.supplier||'').trim()||'No supplier set')===g)}
const reSaveT={};
function ruleEdit(t){const id=t.closest('[data-rl]').dataset.rl,f=t.dataset.rf,l=D.L.find(x=>x.id===id);if(!l)return;let v=t.value.trim();v=f==='supplier'?(v||null):v===''?null:Math.max(0,Math.round(+v||0));
  clearTimeout(reSaveT[id+f]);reSaveT[id+f]=setTimeout(async()=>{try{await upd(id,{[f]:v});if(!U.noCols){l[f]=v;toast('Saved')}else toast('Could not save that setting yet');rr()}catch(e){toast(e.message||'Could not save')}},300)}

// =================== 9. INSIGHTS ===================
PAGES.insights=()=>{const days=+(U.idays||30),t0=Date.now()-days*864e5,O=D.O.filter(o=>alive(o)&&Date.parse(o.created_at)>=t0);
  const top={};O.forEach(o=>o.order_items.forEach(i=>{const k=i.listing_id||i.sku;const x=top[k]=top[k]||{n:i.name,u:0,v:0};x.u+=i.qty;x.v+=i.qty*+i.unit_price}));
  const T=Object.values(top).sort((a,b)=>b.u-a.u||b.v-a.v).slice(0,8),mu=Math.max(1,...T.map(x=>x.u));
  const hr=Array(24).fill(0);O.forEach(o=>hr[new Date(o.created_at).getHours()]++);let a=hr.findIndex(x=>x),b=23-[...hr].reverse().findIndex(x=>x);if(a<0){a=8;b=20}a=Math.min(a,8);b=Math.max(b,20);
  const H=hr.slice(a,b+1),mh=Math.max(1,...H),pk=hr.indexOf(Math.max(...hr));
  const wd=Array(7).fill(0);O.forEach(o=>wd[(new Date(o.created_at).getDay()+6)%7]++);const mw=Math.max(1,...wd);
  const rev=O.reduce((s,o)=>s+(+o.subtotal||+o.total||0),0),avg=O.length?rev/O.length:0,col=O.filter(o=>o.fulfilment!=='delivery').length;
  const kpi=(l,v,s)=>`<div class="kpi"><div class="kh">${l}</div><b>${v}</b><small>${s}</small></div>`;
  return `<div class="p27"><div class="ph"><div><h2>Shopkeeper insights</h2><p>What sells, and when your customers order.</p></div><div class="acts">${[7,30,90].map(d=>`<button class="btn ${days===d?'':'ghost'} sm" data-k27="idays" data-d="${d}">${d} days</button>`).join('')}</div></div>
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">${kpi('Orders',O.length,`Last ${days} days`)}${kpi('Sales',gbp0(rev),'Goods, excl. delivery')}${kpi('Average basket',gbp(avg),'Per order')}${kpi('Click &amp; collect',O.length?Math.round(col/O.length*100)+'%':'–','Of orders')}</div>
  <div class="p27two"><div class="card"><div class="chd"><h3>Top sellers</h3><span class="mut" style="font-size:13px">by units</span></div><div class="cb">${T.length?`<div class="p27top">${T.map((x,i)=>`<div><em>${i+1}</em><b style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.n)}</b><span class="mut" style="font-size:13px">${x.u} · ${gbp(x.v)}</span><span class="b"><i style="width:${x.u/mu*100}%"></i></span></div>`).join('')}</div>`:`<div class="empty">${svg('bars')}<b>No sales in this period</b></div>`}</div></div>
   <div class="p27g"><div class="card"><div class="chd"><h3>Orders by hour</h3>${O.length?`<span class="mut" style="font-size:13px">Busiest: ${String(pk).padStart(2,'0')}:00</span>`:''}</div><div class="cb"><div class="p27bars">${H.map((v,i)=>`<div class="${a+i===pk&&v?'pk':''}" title="${v} orders"><em>${v||''}</em><i style="height:${v/mh*100}%"></i><small>${(a+i)%3===0?a+i:''}</small></div>`).join('')}</div></div></div>
   <div class="card"><div class="chd"><h3>Orders by day</h3></div><div class="cb"><div class="p27bars" style="height:120px">${wd.map((v,i)=>`<div title="${v} orders"><em>${v||''}</em><i style="height:${v/mw*100}%"></i><small>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</small></div>`).join('')}</div></div></div></div></div></div>`};

// =================== 6 + 7. PROMOTE: branding, poster with QR, share ===================
const COLS=['#0f766e','#2563eb','#7c3aed','#db2777','#e8553a','#ca8a04','#15803d','#111827'];
const bc=()=>U.bc||D.shop?.brand_color||'#0f766e';
function qrSvg(t){try{const q=window.qrcode(0,'M');q.addData(t);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}catch{return ''}}
PAGES.boost=()=>{const s=D.shop,url=shopURL(),c=bc();if(!window.qrcode&&!U._ql){U._ql=true;loadScript('qrcode.js').then(rr).catch(()=>{})}
  const wa='https://wa.me/?text='+encodeURIComponent(`Order from ${s.name} on ShopNip: click & collect or local delivery. ${url}`);
  return `<div class="p27"><div class="ph"><div><h2>Promote my shop</h2><p>Make your shop look like yours, then tell customers where to find it.</p></div></div>
  ${s.status!=='approved'?`<div class="bnr">${svg('clock')}<div><b>Your shop link works once you’re approved.</b>You can set up your branding and print the poster now.</div></div>`:''}
  <div class="p27two"><div class="p27g"><div class="card"><div class="chd"><h3>Your branding</h3></div><div class="cb p27g">
     <div class="upl"><span class="lgp">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</span><div><b>Logo</b><small class="mut">Square, at least 256px</small></div><label class="btn ghost sm">Upload<input type="file" accept="image/*" data-up="logo" hidden></label></div>
     <div><b style="font-size:14px">Shop colour</b><div class="mut" style="font-size:13px;margin-bottom:8px">Used on your shop page and poster.</div>
      <div class="p27sw">${COLS.map(x=>`<button style="background:${x}" class="${x===c?'on':''}" data-k27="col" data-c="${x}" aria-label="Colour ${x}"></button>`).join('')}<input type="color" id="p27col" value="${esc(c)}" aria-label="Custom colour" style="width:40px;height:34px;border:0;background:none"></div></div>
     <div><button class="btn sm" data-k27="col-save" ${c===(s.brand_color||'#0f766e')?'disabled':''}>Save colour</button></div></div></div>
   <div class="card"><div class="chd"><h3>Share your shop</h3></div><div class="cb p27g">
     <div class="p27share"><input readonly value="${esc(url)}" id="p27url" aria-label="Shop link"><button class="btn ghost sm" data-k27="copy-url">${svg('copy')}Copy link</button></div>
     <div class="p27share"><a class="btn sm" style="background:#25d366" href="${esc(wa)}" target="_blank" rel="noopener">${svg('wa')}Share on WhatsApp</a>${navigator.share?`<button class="btn ghost sm" data-k27="share">${svg('link')}Share…</button>`:''}<button class="btn ghost sm" data-k27="print">${svg('print')}Print poster</button></div>
     <small class="mut">Tip: put the poster by your till and in the window. Customers scan the code to order for collection.</small></div></div></div>
   <div class="card"><div class="chd"><h3>Window poster</h3><span class="mut" style="font-size:13px">A4</span></div><div class="cb" style="background:#f2f4f7;border-radius:0 0 16px 16px">
    <div class="p27poster" style="--bc:${esc(c)}"><div class="lg">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(s.name[0])}</div><h2>${esc(s.name)}</h2><p>Order online. Click &amp; collect${s.delivery_options?.delivery?' or local delivery':''}.</p>
     <div class="q">${window.qrcode?qrSvg(url):''}</div><div class="big">Scan to shop with us</div><div class="u">${esc(url.replace(/^https?:\/\//,''))}</div><div class="by">On <b style="color:#0f766e">Shop</b><b>Nip</b> · your local shops, online</div></div></div></div></div></div>`};

// =================== 10. COUNTER MODE (tablet) ===================
PAGES.counter=()=>{const O=D.O.filter(o=>OPEN.includes(o.status)),col=(t,f)=>{const L=O.filter(f);return `<div class="col"><h3>${t} · ${L.length}</h3>${L.length?L.map(card).join(''):'<div class="none">None</div>'}</div>`};
  const pin=(U.cpin||'').replace(/\D/g,''),m=pin.length===4?D.O.filter(o=>o.collection_pin===pin&&['accepted','ready'].includes(o.status)):[];
  return `<div class="p27c" id="p27c"><div class="hd"><h2>${esc(D.shop.name)} · Counter</h2><span style="opacity:.75">${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
   <button class="btn ghost sm" data-k27="fs">Full screen</button><a class="btn ghost sm" href="#overview">Exit</a></div>
   <div class="pin"><b>Collection PIN</b><input id="p27pin" inputmode="numeric" maxlength="4" placeholder="••••" value="${esc(pin)}" autocomplete="off" aria-label="Customer collection PIN">
    ${pin.length===4?(m.length?m.map(o=>`<div class="match"><span><b>${esc(o.order_number)}</b> · ${o.order_items.reduce((a,i)=>a+i.qty,0)} items · ${gbp(o.total)}</span><button class="btn" data-collect="${esc(o.id)}">Hand over &amp; complete</button></div>`).join(''):'<div class="match" style="background:#fef3f2;color:#7a271a">No order waiting with that PIN</div>'):''}</div>
   <div class="cols">${col('New',o=>o.status==='placed')}${col('Preparing',o=>o.status==='accepted')}${col('Ready / out',o=>['ready','out_for_delivery'].includes(o.status))}</div></div>`};
const card=o=>`<div class="oc ${o.status==='placed'?'new':''}"><div class="top"><b>${esc(o.order_number)}</b>${chip(o.status)}</div><div class="mut">${o.fulfilment==='delivery'?'Delivery':'Collect'} · ${ago(o.created_at)} · ${gbp(o.total)}</div>
  <ul>${o.order_items.map(i=>`<li>${i.qty} × ${esc(i.name)}</li>`).join('')}</ul>${o.note?`<div class="mut" style="font-size:13px;margin-bottom:8px">Note: ${esc(o.note)}</div>`:''}<div class="acts">${actBtns(o,'')}</div></div>`;
setInterval(()=>{if(location.hash==='#counter'&&!document.activeElement?.id?.startsWith('p27pin'))rr()},30000);

// =================== overview additions ===================
const _ov=PAGES.overview;
PAGES.overview=()=>{loadTier();const h=_ov(),low=reList().length;
  const extra=saveStrip(true)+(low?`<div class="bnr info">${svg('cart')}<div><b>${low} product${low>1?'s':''} to re-order</b>Your re-order list is ready, grouped by supplier. <a href="#reorder">Open re-order list</a></div></div>`:'')
   +(U.code&&U.tier&&U.tier.tier!=='partner'&&U.tier.link_status!=='requested'?`<div class="p27save">${svg('crown')}<div><b>You have a partner invite code: ${esc(U.code)}</b><span class="mut">Apply it to move to the lower partner fee once verified.</span></div><a class="btn coral sm" href="#plan">Apply code</a></div>`:'');
  return extra+h};

// =================== events ===================
document.addEventListener('click',async e=>{const t=e.target.closest('[data-k27]');if(!t)return;const k=t.dataset.k27;e.preventDefault();
  if(k==='parse'){const v=U.inv,tx=document.getElementById('p27txt')?.value||'';v.text=tx;v.supplier=document.getElementById('p27sup')?.value.trim()||'';if(!tx.trim()){v.err='Choose an invoice file or paste the invoice lines first.';rr();return}v.busy=true;rr();try{await doParse(tx)}finally{v.busy=false;rr()}return}
  if(k==='inv-back'){U.inv.step='in';rr();return}if(k==='inv-new'){U.inv={...U.inv,step:'in',err:'',text:'',lines:[]};rr();return}if(k==='inv-save'){invSave();return}
  if(k==='link'){linkReq(t.dataset.pid,null);return}
  if(k==='code'){const c=(document.getElementById('p27code')?.value||'').trim().toUpperCase();if(!c)return toast('Enter your invite code');linkReq(null,c);return}
  if(k==='re-copy'||k==='re-csv'||k==='re-mail'){const g=t.dataset.g,R=reGroup(g);if(!R.length)return toast('Nothing to order in this list');
    if(k==='re-copy')return copy(reText(g,R),'Re-order list copied');
    if(k==='re-csv')return dl(`reorder-${slug(g==='*'?'all':g)}-${new Date().toISOString().slice(0,10)}.csv`,[['Supplier','SKU','Product','In stock','Order qty','Unit cost'],...R.map(r=>[(r.l.supplier||'').trim()||'',r.l.sku,r.l.name,r.l.stock,r.q,+r.l.trade_price||''])]);
    location.href='mailto:?subject='+encodeURIComponent(`Re-order: ${D.shop.name}`)+'&body='+encodeURIComponent(reText(g,R));return}
  if(k==='idays'){U.idays=+t.dataset.d;rr();return}
  if(k==='col'){U.bc=t.dataset.c;rr();return}
  if(k==='col-save'){try{const x=await API.saveShop({id:D.shop.id,brand_color:bc()});D.shop={...D.shop,...x,brand_color:bc()};if(MOCK)localStorage.nb_mock_brand=bc();toast('Colour saved');rr()}catch(er){toast(/brand_color|column/i.test(er.message||'')?'Shop colour can’t be saved yet':er.message||'Could not save')}return}
  if(k==='copy-url')return copy(shopURL(),'Shop link copied');
  if(k==='share'){try{await navigator.share({title:D.shop.name+' on ShopNip',url:shopURL()})}catch{}return}
  if(k==='print'){if(!window.qrcode){try{await loadScript('qrcode.js');rr()}catch{}}setTimeout(()=>print(),100);return}
  if(k==='fs'){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}catch{}return}});
document.addEventListener('input',e=>{const t=e.target;
  if(t.dataset.ivF&&t.dataset.ivF!=='on'){ivEdit(t);return}
  if(t.id==='p27mk'){U.inv.markup=Math.max(0,Math.min(500,+t.value||0));localStorage.nb_markup=U.inv.markup;return}
  if(t.id==='p27sup'){U.inv.supplier=t.value;return}if(t.id==='p27txt'){U.inv.text=t.value;return}
  if(t.dataset.rq){U.re.qty[t.dataset.rq]=Math.max(0,Math.round(+t.value||0));return}
  if(t.id==='p27rq'){U.re.rq=t.value;rr();return}
  if(t.id==='p27col'){U.bc=t.value;return}
  if(t.id==='p27pin'){U.cpin=t.value.replace(/\D/g,'').slice(0,4);if(U.cpin.length===4||U.cpin.length===0)rr();return}});
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.ivF==='on'){ivEdit(t);return}if(t.dataset.ivF){rr();return}
  if(t.id==='p27live'){U.inv.live=t.checked;return}
  if(t.dataset.rf){ruleEdit(t);return}
  if(t.id==='p27col'){rr();return}
  if(t.id==='p27file'&&t.files[0])takeFile(t.files[0])});
async function takeFile(f){const v=U.inv;v.busy=true;v.err='';rr();
  try{const tx=await readFile(f);v.text=tx;v.supplier=document.getElementById('p27sup')?.value.trim()||v.supplier;await doParse(tx)}
  catch(er){v.err=er.message==='PHOTO'?'Photos can’t be read directly. Open the photo on your phone, copy its text (Live Text or Google Lens) and paste it in the box.':(er.message||'Could not read that file')}
  v.busy=false;rr()}
['dragover','dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{const z=e.target.closest?.('#p27drop');if(!z)return;e.preventDefault();z.classList.toggle('on',ev==='dragover');if(ev==='drop'&&e.dataTransfer.files[0])takeFile(e.dataTransfer.files[0])}));

// first paint: seller.js may have rendered before this file loaded
if(DASH.includes(location.hash.slice(1)))NB.render();
})();
