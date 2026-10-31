/* Dismissible "outside the UK" notice. ShopNip only serves UK shops.
   Automatic check uses /api/geo (Vercel x-vercel-ip-country) and, if that
   is missing, a free IP lookup. A failed lookup does not show the notice. */
(function(root){
const UK=/^(GIR\s*0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i;
function isUkPostcode(s){return UK.test(String(s||'').trim())}
function looksForeign(s){
  const t=String(s||'').trim();
  if(!t||isUkPostcode(t))return false;
  if(/^\d{4,6}$/.test(t))return true;
  if(/\b(india|tirupati|hyderabad|andhra|pradesh|usa|united states|france|germany|dubai|singapore|australia|canada|pakistan|bangladesh)\b/i.test(t))return true;
  const compact=t.replace(/\s+/g,'');
  if(/^[A-Z]{1,2}\d[A-Z\d]{0,3}$/i.test(compact))return false;
  if(!/^[A-Z]{1,2}\d/i.test(compact))return true;
  return false;
}
const api={isUkPostcode,looksForeign};
if(typeof module==='object'&&module.exports)module.exports=api;
if(!root||!root.document)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dismiss(){root.document.getElementById('ukout')?.remove();try{root.sessionStorage.nb_uk_ip_dismiss='1'}catch(e){}}
function show(place){
  const old=root.document.getElementById('ukout');if(old)old.remove();
  const where=String(place||'').trim();
  const d=root.document.createElement('div');d.id='ukout';
  d.innerHTML=`<div class="ukcard" role="dialog" aria-modal="true" aria-labelledby="ukout-title">
    <h2 id="ukout-title">You are outside the UK</h2>
    <p>ShopNip serves independent shops in the United Kingdom only. We can’t match local shops, delivery or a shop registration to a location outside the UK.</p>
    ${where?`<p class="ukplace">You entered <b>${esc(where)}</b>${/^\d{6}$/.test(where)?' — an Indian PIN code, not a UK postcode':''}.</p>`:'<p class="ukplace">Your connection looks like it is outside the United Kingdom.</p>'}
    <p>You can close this and keep browsing. Nothing else is blocked.</p>
    <button type="button" class="ukgo" data-ukdismiss>Continue anyway</button>
  </div>`;
  root.document.body.appendChild(d);
  setTimeout(()=>d.querySelector('[data-ukdismiss]')?.focus(),30);
}
function checkPlace(text){if(!looksForeign(text))return false;show(text);return true}
async function ipCountry(){
  try{const r=await fetch('/api/geo',{headers:{accept:'application/json'}});if(r.ok){const j=await r.json();if(j&&/^[A-Za-z]{2}$/.test(j.country||''))return String(j.country).toUpperCase()}}catch(e){}
  try{const r=await fetch('https://get.geojs.io/v1/ip/country.json');if(r.ok){const j=await r.json();if(j&&/^[A-Za-z]{2}$/.test(j.country||''))return String(j.country).toUpperCase()}}catch(e){}
  try{const r=await fetch('https://ipwho.is/');if(r.ok){const j=await r.json();if(j&&j.success!==false&&/^[A-Za-z]{2}$/.test(j.country_code||''))return String(j.country_code).toUpperCase()}}catch(e){}
  return null;
}
async function checkIp(){
  try{if(root.sessionStorage.nb_uk_ip_dismiss==='1')return}catch(e){}
  try{if(new URLSearchParams(root.location.search).get('nouk')==='1')return}catch(e){}
  const c=await ipCountry();
  if(c&&c!=='GB'&&c!=='UK')show('');
}
root.document.addEventListener('click',e=>{if(e.target.id==='ukout'||e.target.closest?.('[data-ukdismiss]')){e.preventDefault();dismiss()}});
root.document.addEventListener('change',e=>{const t=e.target;if(!t||!t.id&&!t.name)return;
  if(t.id==='s_pc'||t.id==='loc_pc'||t.id==='co_pc'||(t.name==='postcode'&&t.form?.id==='setf')){if(looksForeign(t.value))show(t.value)}});
const css=root.document.createElement('style');css.textContent=`
#ukout{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:rgba(10,20,20,.55);padding:16px}
#ukout .ukcard{background:#fff;border-radius:18px;max-width:440px;width:100%;padding:24px 22px 20px;box-shadow:0 24px 60px rgba(0,0,0,.28);color:#14202e}
#ukout h2{margin:0 0 8px;font-size:22px;letter-spacing:-.3px;color:#8f2d2d}
#ukout p{margin:0 0 10px;font-size:15px;line-height:1.45;color:#3d4a57}
#ukout .ukplace{background:#fff4f2;border:1px solid #ffd0c8;border-radius:12px;padding:10px 12px;color:#7a2e0e}
#ukout .ukgo{margin-top:6px;width:100%;background:#0f766e;color:#fff;border:0;border-radius:12px;padding:12px 16px;font:inherit;font-weight:700;font-size:15px;cursor:pointer}
#ukout .ukgo:focus-visible{outline:2px solid #0f766e;outline-offset:3px}`;
root.document.head.appendChild(css);
root.UKGate={show,dismiss,checkPlace,checkIp,isUkPostcode,looksForeign,ipCountry};
/* IP check is off: CSP blocks third-party lookups and there is no /api/geo here. Postcode checks still run. */

})(typeof window!=='undefined'?window:null);
