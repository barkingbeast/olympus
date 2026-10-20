const CACHE='olympus-static-v8';
const ASSETS=['./','./index.html','./style.css?v=8','./app.js?v=8','./api.js','./art.js?v=8','./game.js?v=8','./motion.js?v=8','./minigames.js?v=8','./recap.js?v=8','./icon.svg','./icon.png','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||new Response('You’re offline. Reconnect to save a check-in.',{status:503,headers:{'Content-Type':'text/plain'}}))))});
