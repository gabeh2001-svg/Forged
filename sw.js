/* Swell offline support: keeps a copy of the app on the phone so it opens instantly with no signal.
   Also hosts OneSignal push notifications (both share this one worker at the root). */
try{importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')}catch(e){}
const CACHE='swell-v3';
const CORE=['./','index.html','manifest.json','swell-icon-180.png','swell-icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// rough meter of what this phone fetches from the site, so Swell can keep an eye on its monthly credits
let MET=null;const META='/__swell/meta';
const meta=()=>MET?Promise.resolve(MET):caches.open(CACHE).then(c=>c.match(META)).then(r=>r?r.json():null).catch(()=>null).then(m=>MET=m||{b:0,r:0,lv:0,nav:0});
const metaSave=()=>caches.open(CACHE).then(c=>c.put(META,new Response(JSON.stringify(MET)))).catch(()=>{});
const guess=u=>/traineddata/.test(u)?4.2e6:/wasm\.js$/.test(u)?4e6:/\.png$/.test(u)?7e4:1.3e5;
const tally=(u,r)=>{if(new URL(u).origin!==location.origin)return;meta().then(m=>{m.r++;m.b+=Number(r.headers.get('content-length'))||guess(u);metaSave()})};
const net=(req,key)=>fetch(req).then(r=>{tally(req.url||String(req),r);if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key||req,cp))}return r});
self.addEventListener('message',e=>{const d=e.data||{},port=e.ports&&e.ports[0];
 if(d.t==='meter')meta().then(m=>port&&port.postMessage({b:m.b,r:m.r}));
 if(d.t==='metered')meta().then(m=>{m.b=Math.max(0,m.b-(d.b||0));m.r=Math.max(0,m.r-(d.r||0));metaSave()});
 if(d.t==='lv')meta().then(m=>{m.lv=d.lv|0;metaSave()})});
// how often to fetch a fresh copy of the app, by saver level: every open, 6 hours, a day, a week
const GAP=[0,6*36e5,24*36e5,7*864e5];
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);
 // the app page: open the saved copy straight away, and quietly fetch the latest for next time
 if(req.mode==='navigate'||(u.origin===location.origin&&/\/(index\.html)?$/.test(u.pathname))){
  e.respondWith(Promise.all([caches.match('index.html'),meta()]).then(([hit,m])=>{if(hit&&Date.now()-(m.nav||0)<GAP[m.lv|0])return hit;const fresh=net(req,'index.html').then(r=>{m.nav=Date.now();metaSave();return r}).catch(()=>hit);if(hit){e.waitUntil(fresh.catch(()=>{}));return hit}return fresh}));return}
 // icons, fonts and the confetti script: use the saved copy, fetch once if missing
 if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(u.hostname)){
  e.respondWith(caches.match(req).then(hit=>hit||net(req).catch(()=>hit)))}});
