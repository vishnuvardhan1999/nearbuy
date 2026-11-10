/* Support desk: cases from customers ("Report a problem") and sellers (Support tab). One owner per case.
   Resolve can refund the whole order or chosen lines to the customer's ShopNip wallet (resolve_support_case RPC),
   capped at what the customer paid; a line is never refunded twice. Preview: ?mock=1 (reads the same nb_desk store as the shop site). */
(()=>{
const NA=window.NBAdmin;if(!NA)return;
const {ST,V,PAGES,esc,gbp,fmtDT,toast,MOCK}=NA;
const sb=NA.sb;
const SP={cases:[],loaded:false,loading:false,err:'',f:'open',draft:{},pick:{},ref:{}};
const KEY='nb_desk';
const meId=()=>MOCK?'admin':ST.user&&ST.user.id;
const SRC={declined:'Order declined',out_of_stock:'Out of stock',cancelled:'Order cancelled',support:'Support case'};
const STL={open:['Unowned','p-warn'],owned:['Owned','p-info'],resolved:['Resolved','p-ok']};
const r2=n=>Math.round(n*100)/100;

/* ---------- mock store ---------- */
function mload(){try{const s=JSON.parse(localStorage[KEY]||'{}');s.cases=s.cases||[];s.credits=s.credits||[];s.lines=s.lines||{};return s}catch(_){return {cases:[],credits:[],lines:{}}}}
function msave(s){try{localStorage[KEY]=JSON.stringify(s)}catch(_){}}
function mseed(s){if(s.cases.length||s.seeded)return;const o=ST.orders.find(x=>x.status==='completed'&&(x.order_items||[]).length)||ST.orders[0];if(!o)return;
  const t=Date.now()-25*60e3;s.seeded=true;
  s.cases.push({id:'mock-case-1',order_id:o.id,raised_by:'customer',user_id:o.customer_id||'u1',user_email:o.customer_email||'',shop_id:o.shop_id,message:'Damaged item: The box was crushed when it arrived.',
    photo_path:null,status:'open',owner:null,owner_email:null,needs_admin:true,refund_amount:0,created_at:new Date(t).toISOString(),reply_due_at:new Date(t+2*36e5).toISOString(),support_replies:[],
    order:{id:o.id,order_number:o.order_number,status:o.status,total:+o.total,wallet_applied:+o.wallet_applied||0,items:(o.order_items||[]).map((i,ix)=>({id:i.id||'ix'+ix,name:i.name,qty:i.qty,unit_price:+i.unit_price}))}});msave(s)}

/* ---------- data ---------- */
async function load(){if(SP.loading)return;SP.loading=true;SP.err='';
  try{if(MOCK){const s=mload();mseed(s);SP.cases=s.cases.slice().sort((a,b)=>a.created_at<b.created_at?1:-1)}
    else if(sb){const {data,error}=await sb.from('support_cases').select('*,support_replies(id,author_role,body,created_at)').order('created_at',{ascending:false}).limit(200);
      if(error)throw error;SP.cases=data||[]}}
  catch(e){SP.err=/relation|does not exist|schema cache/i.test(e.message||'')?'Support tables not found. Run the support desk migration in Supabase.':(e.message||String(e))}
  SP.loaded=true;SP.loading=false}
const unread=()=>SP.cases.filter(c=>c.needs_admin&&c.status!=='resolved').length;
const orderOf=c=>{const o=c.order_id&&ST.orders.find(x=>x.id===c.order_id);if(o)return {id:o.id,order_number:o.order_number,status:o.status,total:+o.total,wallet_applied:+o.wallet_applied||0,
  items:(o.order_items||[]).map((i,ix)=>({id:i.id||'ix'+ix,name:i.name,qty:i.qty,unit_price:+i.unit_price}))};return c.order||null};

async function act(kind,c,args){
  if(MOCK){const s=mload(),x=s.cases.find(y=>y.id===c.id);if(!x)throw new Error('Case not found');const me=meId(),now=new Date().toISOString();
    const take=()=>{if(x.owner&&x.owner!==me)throw new Error('Another admin already owns this case');if(!x.owner){x.owner=me;x.owner_email=ST.user&&ST.user.email||'admin';x.status='owned';x.owned_at=now}};
    if(x.status==='resolved'&&kind!=='take')throw new Error('This case is already resolved');
    take();
    if(kind==='reply'){x.support_replies=(x.support_replies||[]).concat([{id:Date.now(),author_role:'admin',body:args.body,created_at:now}]);x.needs_admin=false}
    if(kind==='resolve'){let credited=0;const o=orderOf(x);
      if(args.refund!=='none'){if(!o)throw new Error('This case has no order to refund');const done=new Set(s.lines[o.id]||[]);
        const pick=o.items.filter(i=>!done.has(i.id)&&(args.refund==='order'||args.items.includes(i.id)));
        const lines=r2(pick.reduce((t,i)=>t+i.qty*i.unit_price,0)),paid=o.status==='completed'?o.total:o.wallet_applied,prior=s.credits.filter(k=>k.order_id===o.id).reduce((t,k)=>t+k.amount,0);
        credited=r2(Math.max(0,Math.min(lines,paid-prior)));s.lines[o.id]=[...done,...pick.map(i=>i.id)];
        if(credited>0)s.credits.push({id:'cr'+Date.now(),user_id:x.user_id,order_id:o.id,amount:credited,note:'Refund for order '+(o.order_number||'')+' · Support case',at:now})}
      if(args.note)x.support_replies=(x.support_replies||[]).concat([{id:Date.now(),author_role:'admin',body:args.note,created_at:now}]);
      Object.assign(x,{status:'resolved',resolved_at:now,needs_admin:false,resolution:args.note||(args.refund==='none'?'Resolved':'Refunded'),refund_amount:r2((+x.refund_amount||0)+credited)});
      msave(s);return {refund:{credited}}}
    msave(s);return {}}
  const call=kind==='take'?['take_support_case',{p_case:c.id}]:kind==='reply'?['reply_support_case',{p_case:c.id,p_body:args.body}]
    :['resolve_support_case',{p_case:c.id,p_note:args.note||null,p_refund:args.refund,p_items:args.refund==='items'?args.items:null}];
  const {data,error}=await sb.rpc(...call);if(error)throw error;return data||{}}

/* ---------- view ---------- */
PAGES.support=['Support','alert'];
function caseCard(c){const me=meId(),mine=c.owner&&c.owner===me,o=orderOf(c),shop=c.shop_id&&NA.shopById(c.shop_id),now=Date.now();
  const rs=(c.support_replies||[]).slice().sort((a,b)=>a.created_at<b.created_at?-1:1),answered=rs.some(r=>r.author_role==='admin');
  const late=c.status!=='resolved'&&!answered&&now>Date.parse(c.reply_due_at);
  const pk=SP.pick[c.id]||{k:'none',items:[]},d=k=>esc(SP.draft[k+c.id]||'');
  return `<div class="card spc ${c.needs_admin&&c.status!=='resolved'?'new':''}"><div class="sph">${(()=>{const [l,k]=STL[c.status]||[c.status,'p-off'];return `<span class="pill ${k}">${esc(l)}</span>`})()}
    ${c.needs_admin&&c.status!=='resolved'?'<span class="pill p-bad">Unread</span>':''}<b>${c.raised_by==='seller'?'Seller':'Customer'}${o?' · '+esc(o.order_number||''):''}${shop?' · '+esc(shop.name):c.shop_name?' · '+esc(c.shop_name):''}</b>
    <span class="mut">${fmtDT(c.created_at)}${c.user_email?' · '+esc(c.user_email):''}</span>
    ${c.status!=='resolved'?`<span class="${late?'spl':'mut'}">${late?'Overdue · ':''}Reply by ${fmtDT(c.reply_due_at)}</span>`:''}</div>
   <p class="spm">${esc(c.message)}</p>${c.photo_path?`<button class="btn ghost sm" data-sp="photo" data-id="${esc(c.id)}">View photo</button>`:''}
   ${rs.map(r=>`<div class="spr ${r.author_role==='admin'?'a':''}"><b>${r.author_role==='admin'?'ShopNip':r.author_role==='seller'?'Seller':'Customer'}</b> ${esc(r.body)}<small>${fmtDT(r.created_at)}</small></div>`).join('')}
   <div class="spo mut">${c.status==='resolved'?`Resolved${c.owner_email?' by '+esc(c.owner_email):''}${+c.refund_amount?` · <b style="color:#15803d">${gbp(c.refund_amount)} refunded to wallet</b>`:''}`:c.owner?(mine?'You own this case':'Owned by '+esc(c.owner_email||'another admin')+'. Only they can reply or resolve.'):'Nobody owns this case yet.'}</div>
   ${c.status==='open'&&!c.owner?`<button class="btn sm" data-sp="take" data-id="${esc(c.id)}">Take ownership</button>`:''}
   ${mine&&c.status!=='resolved'?`<div class="spa"><div class="spf"><input class="inp" id="sp_r_${esc(c.id)}" placeholder="Reply to the ${c.raised_by}" value="${d('sp_r_')}" maxlength="2000"><button class="btn sm" data-sp="reply" data-id="${esc(c.id)}">Send reply</button></div>
    <div class="sec-t">Resolve</div><div class="spk">${[['none','No refund'],['order','Refund whole order'],['items','Refund chosen items']].filter(([k])=>k==='none'||o).map(([k,l])=>`<label><input type="radio" name="sp_k_${esc(c.id)}" value="${k}" data-spk="${esc(c.id)}" ${pk.k===k?'checked':''}> ${l}</label>`).join('')}</div>
    ${o&&pk.k==='items'?`<div class="spi">${o.items.map(i=>`<label><input type="checkbox" data-spi="${esc(c.id)}" value="${esc(i.id)}" ${pk.items.includes(i.id)?'checked':''}> ${esc(i.qty+' × '+i.name)} <span class="mut">${gbp(i.qty*i.unit_price)}</span></label>`).join('')}</div>`:''}
    ${o&&pk.k!=='none'?'<p class="mut" style="font-size:12.5px;margin:6px 0">Paid into the customer’s ShopNip wallet straight away. Never more than they paid; items already refunded are skipped.</p>':''}
    <div class="spf"><input class="inp" id="sp_n_${esc(c.id)}" placeholder="Note to the ${c.raised_by} (optional)" value="${d('sp_n_')}" maxlength="2000"><button class="btn sm" data-sp="resolve" data-id="${esc(c.id)}">Resolve</button></div></div>`:''}</div>`}
V.support=()=>{if(!SP.loaded){if(!SP.loading)load().then(NA.render);return '<div class="card"><div class="skel" style="height:160px;margin:18px"></div></div>'}
  const me=meId(),F={need:['Needs reply',c=>c.needs_admin&&c.status!=='resolved'],open:['Open',c=>c.status!=='resolved'],mine:['Mine',c=>c.owner===me&&c.status!=='resolved'],resolved:['Resolved',c=>c.status==='resolved'],all:['All',()=>true]};
  const list=SP.cases.filter(F[SP.f][1]);
  return `${SP.err?`<div class="msg err">${esc(SP.err)}</div>`:''}<div class="sptabs">${Object.entries(F).map(([k,[l,fn]])=>`<button class="btn sm ${SP.f===k?'':'ghost'}" data-sp="f" data-f="${k}">${l} (${SP.cases.filter(fn).length})</button>`).join('')}</div>
   <p class="mut" style="margin:0 0 12px">Customers and sellers are told: “We'll reply within 2 hours.” Take ownership so only one person handles each case.</p>
   ${list.map(caseCard).join('')||'<div class="card"><p class="mut" style="padding:18px;margin:0">No cases here.</p></div>'}`};

/* refunds on the order drawer */
NA.refundsHTML=o=>{if(!o)return '';let rows=SP.ref[o.id];
  if(MOCK){const s=mload(),done=new Set(s.lines[o.id]||[]),cr=s.credits.filter(k=>k.order_id===o.id);if(!done.size&&!cr.length)return '';
    return `<div class="sec-t">Refunds</div><div class="sprf">${cr.map(k=>`<div><span>${esc(k.note)}<br><small class="mut">${fmtDT(k.at)}</small></span><b style="color:#15803d">${gbp(k.amount)} to wallet</b></div>`).join('')||'<p class="mut">Lines marked refunded; nothing had been paid yet.</p>'}</div>`}
  if(rows===undefined){SP.ref[o.id]=null;if(sb)sb.from('order_refund_lines').select('*').eq('order_id',o.id).order('created_at').then(({data})=>{SP.ref[o.id]=data||[];NA.render()},()=>{SP.ref[o.id]=[]});return ''}
  if(!rows||!rows.length)return '';
  const nm=r=>r.part==='delivery'?'Delivery fee':((o.order_items||[]).find(i=>i.id===r.order_item_id)||{}).name||'Item';
  return `<div class="sec-t">Refunds</div><div class="sprf">${rows.map(r=>`<div><span>${esc(nm(r))}<br><small class="mut">${esc(SRC[r.source]||r.source)}${r.reason?' · '+esc(r.reason):''} · ${fmtDT(r.created_at)}</small></span><b>${+r.credited?`<span style="color:#15803d">${gbp(r.credited)} to wallet</span>`:'Taken off total'}${+r.credited<+r.line_amount&&+r.credited?`<br><small class="mut">of ${gbp(r.line_amount)}</small>`:''}</b></div>`).join('')}</div>`};
NA.supportUnread=unread;

/* ---------- events ---------- */
document.addEventListener('input',e=>{const t=e.target;if(t.id&&/^sp_[rn]_/.test(t.id))SP.draft[t.id]=t.value});
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.spk){const p=SP.pick[t.dataset.spk]=SP.pick[t.dataset.spk]||{k:'none',items:[]};p.k=t.value;NA.render()}
  if(t.dataset.spi){const p=SP.pick[t.dataset.spi]=SP.pick[t.dataset.spi]||{k:'items',items:[]};p.items=t.checked?[...new Set([...p.items,t.value])]:p.items.filter(x=>x!==t.value)}});
document.addEventListener('click',async e=>{const t=e.target.closest('[data-sp]');if(!t)return;e.preventDefault();const a=t.dataset.sp;
  if(a==='f'){SP.f=t.dataset.f;NA.render();return}
  const c=SP.cases.find(x=>x.id===t.dataset.id);if(!c)return;
  if(a==='photo'){try{let u=c.photo||null;if(!u&&sb){const {data,error}=await sb.storage.from('support-photos').createSignedUrl(c.photo_path,600);if(error)throw error;u=data.signedUrl}
    u?window.open(u,'_blank','noopener'):toast('Photo not available')}catch(er){toast(er.message||'Photo not available')}return}
  let args={};
  if(a==='reply'){args.body=(SP.draft['sp_r_'+c.id]||'').trim();if(!args.body)return toast('Write a reply first')}
  if(a==='resolve'){const p=SP.pick[c.id]||{k:'none',items:[]};args={refund:p.k,items:p.items,note:(SP.draft['sp_n_'+c.id]||'').trim()};
    if(p.k==='items'&&!p.items.length)return toast('Choose the items to refund');
    if(p.k!=='none'&&!confirm('Refund to the customer’s ShopNip wallet now? This can’t be undone.'))return}
  t.disabled=true;
  try{const r=await act(a,c,args);
    if(a==='reply'){delete SP.draft['sp_r_'+c.id];toast('Reply sent')}
    if(a==='take')toast('You own this case now');
    if(a==='resolve'){delete SP.draft['sp_n_'+c.id];delete SP.pick[c.id];const cr=+(r&&r.refund&&r.refund.credited)||0;
      toast(args.refund==='none'?'Case resolved':cr>0?`Resolved · ${gbp(cr)} refunded to the customer’s wallet`:'Resolved · nothing left to refund (the customer hadn’t paid for those items)');
      if(args.refund!=='none'&&!MOCK){SP.ref={};try{ST.orders=await NA.API.orders()}catch(_){}}}
    await load();NA.render()}
  catch(er){toast(er.message||'Could not update the case');t.disabled=false;await load();NA.render()}});

const st=document.createElement('style');st.textContent=`.spc{padding:14px 16px;margin-bottom:12px}.spc.new{border-left:4px solid #f59e0b}.sph{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sph .mut,.spl{font-size:12.5px}.spl{color:#b42318;font-weight:700}
.spm{white-space:pre-wrap;margin:10px 0}.spr{margin:6px 0;padding:8px 10px;border-radius:10px;background:#f6f7f9;font-size:14px}.spr.a{background:#effaf7}.spr small{display:block;color:#667085;font-size:12px}
.spo{margin:8px 0;font-size:13px}.spa{margin-top:8px}.spf{display:flex;gap:8px;margin:8px 0}.spf .inp{flex:1;min-width:0;padding:9px 10px;border:1px solid #d7dde4;border-radius:10px;font:inherit}
.spk,.spi{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px}.spi{flex-direction:column;margin:6px 0}.sptabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.sprf>div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #eef1f4;font-size:14px}.sprf>div:first-child{border-top:0}.sprf b{text-align:right;white-space:nowrap}`;document.head.appendChild(st);

/* badge: load once signed in, then every minute (never re-render while someone is typing) */
let last=-1;setInterval(async()=>{if(!ST.ok)return;await load();const n=unread(),busy=document.activeElement&&/^sp_/.test(document.activeElement.id||'');if(n!==last&&!busy){last=n;NA.render()}},60000);
(function first(){if(ST.ok&&ST.loaded){load().then(()=>{last=unread();NA.render()});return}setTimeout(first,800)})();
})();
