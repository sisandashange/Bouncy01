/* BOUNCY service worker: push notifications */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("push",e=>{
  let d={};try{d=e.data?e.data.json():{};}catch(_){}
  const isCall=d.type==="call";
  e.waitUntil((async()=>{
    const wins=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const visible=wins.some(w=>w.visibilityState==="visible");
    if(visible&&!isCall)return;            // app is open: no banner for plain messages
    await self.registration.showNotification(d.title||"BOUNCY",{
      body:d.body||"",tag:d.tag||undefined,renotify:true,
      requireInteraction:isCall,
      icon:"icon-192.png",badge:"icon-192.png",
      vibrate:isCall?[300,150,300,150,300]:[120],
      data:d
    });
  })());
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const data=e.notification.data||{};
  e.waitUntil((async()=>{
    const wins=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const w of wins){
      if("focus" in w){w.postMessage({type:"open",data});return w.focus();}
    }
    return self.clients.openWindow("./");
  })());
});
