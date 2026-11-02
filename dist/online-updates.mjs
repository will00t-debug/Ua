export function parseOnlineRelease(data,origin){
 if(!data?.ok||typeof data.uiVersion!=='string'||!/^[-\w.]{1,96}$/.test(data.uiVersion)||typeof data.uiScript!=='string')
  throw new Error('對戰版本資訊不完整');
 const base=new URL(origin),url=new URL(data.uiScript,base);
 const hashed=/^\/online-client-([A-Z0-9]{8})\.mjs$/.exec(url.pathname);
 if(url.origin!==base.origin||url.username||url.password||url.hash||
  !(hashed||url.pathname==='/online.mjs')||hashed&&hashed[1]!==data.uiVersion||!hashed&&url.searchParams.get('v')!==data.uiVersion)
  throw new Error('對戰程式版本不一致');
 return {version:data.uiVersion,script:url.href};
}

export async function fetchOnlineRelease(fetcher=globalThis.fetch,origin=globalThis.location.origin){
 const response=await fetcher('/api/health',{cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}});
 if(!response.ok)throw new Error('無法取得對戰版本');
 return parseOnlineRelease(await response.json(),origin);
}

export function markOnlineRelease(version,doc=globalThis.document){
 let meta=doc.querySelector('meta[name="ua-ui-version"]');
 if(!meta&&doc.head){meta=doc.createElement('meta');meta.name='ua-ui-version';doc.head.append(meta);}
 if(meta)meta.content=version;
}

// An open match keeps its current code until the player chooses to update.
// Reloading the same URL preserves the room fragment and authenticated session.
export function watchOnlineRelease(initial,{doc=globalThis.document,win=globalThis.window,fetcher=globalThis.fetch}={}){
 let stopped=false,busy=false,dismissed='',notice=null;
 async function check(){
  if(stopped||busy||doc.hidden)return;
  busy=true;
  try{
   const next=await fetchOnlineRelease(fetcher,win.location.origin);
   if(stopped||next.version===initial.version){notice?.remove();notice=null;return;}
   if(next.version===dismissed||notice)return;
   notice=doc.createElement('aside');notice.className='online-update-notice';
   notice.setAttribute('style','position:fixed;top:56px;right:12px;z-index:1200;display:flex;align-items:center;gap:8px;flex-wrap:wrap;max-width:min(380px,calc(100vw - 24px));padding:10px 12px;border:1px solid #608db9;border-radius:8px;background:#142339;color:#e7f2ff;box-shadow:0 4px 18px #0008;font-size:13px');
   notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
   const text=doc.createElement('span');text.textContent='有新版介面可以使用。';
   const update=doc.createElement('button');update.type='button';update.textContent='更新介面';
   update.setAttribute('style','width:auto;min-height:30px;padding:4px 9px;font-size:12px');
   update.addEventListener('click',()=>win.location.reload());
   const later=doc.createElement('button');later.type='button';later.textContent='稍後';
   later.setAttribute('style','width:auto;min-height:30px;padding:4px 9px;font-size:12px');
   later.addEventListener('click',()=>{dismissed=next.version;notice.remove();notice=null;});
   notice.append(text,update,later);doc.body.append(notice);
  }catch{/* A temporary version-check failure must not interrupt the match. */}
  finally{busy=false;}
 }
 const timer=win.setInterval(check,60000);
 win.addEventListener('focus',check);doc.addEventListener('visibilitychange',check);
 const stop=()=>{
  stopped=true;win.clearInterval(timer);notice?.remove();
  win.removeEventListener('focus',check);doc.removeEventListener('visibilitychange',check);
 };
 win.addEventListener('pagehide',stop,{once:true});
 return stop;
}
