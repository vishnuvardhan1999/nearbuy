/* Per-route title, description and canonical for the static SPA shell. */
const fs = require('fs');
const path = require('path');
const SITE = 'https://www.shopnip.co.uk';
const PAGES = {
  about: ['About ShopNip', 'ShopNip is a local marketplace for independent shops in the UK. Click & collect or local delivery. Pay at the shop.'],
  how: ['How it works', 'Set your postcode, order from a local shop, then collect or get local delivery. You pay the shop.'],
  sell: ['Sell on ShopNip', 'Put your independent shop online. Free during the pilot. Seller accounts are separate from shopping accounts.'],
  faq: ['FAQ', 'Payment, delivery, click & collect and how to list your shop on ShopNip.'],
  contact: ['Contact', 'Contact the ShopNip team.'],
  terms: ['Terms of Use', 'Terms for shopping on ShopNip.'],
  privacy: ['Privacy Policy', 'How ShopNip uses personal data.'],
  'seller-terms': ['Seller Terms', 'Terms for shops that sell on ShopNip.'],
  cookies: ['Cookie Notice', 'How ShopNip uses storage on your device.'],
  products: ['All products', 'Browse products from independent shops near you.'],
  basket: ['Your basket', 'Your ShopNip basket. One shop per order.'],
  checkout: ['Checkout', 'Choose click & collect or local delivery. Your first delivery is free.'],
  account: ['Shopping account', 'Sign in to shop on ShopNip. Seller sign-in is separate.'],
  register: ['Register your shop', 'Register a shop with your seller account.'],
  search: ['Search', 'Search independent shops on ShopNip.']
};
function human(s){return String(s||'').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function metaFor(p){
  const seg=String(p||'/').split('/').filter(Boolean);
  let title='ShopNip · Your local shops, online | Click & collect or delivery';
  let desc='Order stationery, party, gift and craft essentials from independent shops near you. Click & collect or local delivery. Pay at the shop.';
  if(PAGES[seg[0]]){title=PAGES[seg[0]][0]+' · ShopNip';desc=PAGES[seg[0]][1]}
  else if(seg[0]==='category'&&seg[1]){title=human(seg[1])+' · ShopNip';desc='Shop '+human(seg[1]).toLowerCase()+' from independent shops near you on ShopNip.'}
  else if(seg[0]==='collection'&&seg[1]){title=human(seg[1])+' · ShopNip';desc=human(seg[1])+' from local shops on ShopNip.'}
  else if(seg[0]==='shop'&&seg[1]){title=human(seg[1])+' · ShopNip';desc=human(seg[1])+' on ShopNip. Order online for click & collect or local delivery.'}
  else if(seg[0]==='product'&&seg[1]){title='Product '+seg[1]+' · ShopNip';desc='Order this product from a local shop on ShopNip.'}
  else if(seg[0]==='orders'){title='Your orders · ShopNip';desc='Track your ShopNip orders.'}
  const canon=SITE+(p&&p!=='/'?p:'/');
  return {title,desc,canon};
}
function apply(html,p){
  const m=metaFor(p);
  return html
    .replace(/<title>[^<]*<\/title>/,'<title>'+esc(m.title)+'</title>')
    .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+esc(m.desc)+'">')
    .replace(/rel="canonical" href="[^"]*"/,'rel="canonical" href="'+m.canon+'"')
    .replace(/property="og:url" content="[^"]*"/,'property="og:url" content="'+m.canon+'"')
    .replace(/property="og:title" content="[^"]*"/,'property="og:title" content="'+esc(m.title)+'"')
    .replace(/property="og:description" content="[^"]*"/,'property="og:description" content="'+esc(m.desc)+'"')
    .replace(/property="og:image" content="[^"]*"/,'property="og:image" content="'+SITE+'/og-image.jpg"')
    .replace(/name="twitter:title" content="[^"]*"/,'name="twitter:title" content="'+esc(m.title)+'"')
    .replace(/name="twitter:image" content="[^"]*"/,'name="twitter:image" content="'+SITE+'/og-image.jpg"');
}
function handler(req,res){
  const p='/'+String((req.query&&req.query.path)||'').replace(/^\/+/,'');
  const html=apply(fs.readFileSync(path.join(process.cwd(),'index.html'),'utf8'),p==='/'?'/':p);
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  res.end(html);
}
module.exports=handler;
module.exports.apply=apply;
module.exports.metaFor=metaFor;
