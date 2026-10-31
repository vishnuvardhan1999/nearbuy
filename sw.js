const C='shopnip-v37',SHELL=['/','/index.html','/boot.js','/style.css','/app.js','/p2.js','/p3.js','/p4.js','/p5.js','/p6.js','/p7.js','/p8.js','/p13.js','/p16.js','/p22.js','/p25.js','/p26.js','/p28.js','/p29.js','/p30.js','/home.js','/p27.js','/qrcode.js','/offline.html','/offline.js','/seller.html','/seller.css','/seller.js','/hours-core.js','/hours.js','/config.js','/manifest.json','/icon-192.png','/favicon.svg','/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin)return;
 // SEO/AEO files: always straight to network, never cached or swapped for index.html
 if(/^\/(sitemap\.xml|robots\.txt|llms\.txt)$/.test(u.pathname))return;
 // app routes (/products, /shop/x, /product/y, ...) are all index.html: fall back to the cached shell when offline
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html')).then(r=>r||caches.match('/offline.html'))));return}
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request)))});

self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{const w=l.find(c=>'focus' in c);if(w){w.navigate&&w.navigate('/orders');return w.focus()}return clients.openWindow('/orders')}))});
