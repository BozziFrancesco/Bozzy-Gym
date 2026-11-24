const CACHE_NAME='atleta-hybrid-bozzi-gym-v2-2';
const APP_FILES=['./','./index.html','./style.css?v=21','./data.js','./app.js?v=21','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES.map(path => new Request(path, {cache: 'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('atleta-hybrid-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{let req=event.request;if(req.method!=='GET')return;
 const u=new URL(req.url);
 if(u.origin!==self.location.origin){if(req.destination==='image'){event.respondWith(caches.open('atleta-photo-v1').then(async cache=>{const found=await cache.match(req);if(found)return found;try{const res=await fetch(req);if(res.ok||res.type==='opaque')cache.put(req,res.clone());return res;}catch(e){return new Response('',{status:503});}}));}return;}
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('./index.html')));return;}
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){let copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match('./index.html'))));
});
