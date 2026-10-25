/* Swell offline support: keeps a copy of the app on the phone so it opens instantly with no signal.
   Also hosts OneSignal push notifications (both share this one worker at the root). */
try{importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')}catch(e){}
const CACHE='swell-v2';
const CORE=['./','index.html','manifest.json','swell-icon-180.png','swell-icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const net=(req,key)=>fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key||req,cp))}return r});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);
 // the app page: open the saved copy straight away, and quietly fetch the latest for next time
 if(req.mode==='navigate'||(u.origin===location.origin&&/\/(index\.html)?$/.test(u.pathname))){
  e.respondWith(caches.match('index.html').then(hit=>{const fresh=net(req,'index.html').catch(()=>hit);if(hit){e.waitUntil(fresh.catch(()=>{}));return hit}return fresh}));return}
 // icons, fonts and the confetti script: use the saved copy, fetch once if missing
 if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(u.hostname)){
  e.respondWith(caches.match(req).then(hit=>hit||net(req).catch(()=>hit)))}});
