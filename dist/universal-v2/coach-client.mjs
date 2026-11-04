// Consent defaults off. A dropped response can be sent again; the server
// keeps one row per match step, so a retry does not create a second decision.
export const COACH_CONSENT_KEY='ua-v2-coach-consent';
const CONSENT_VERSION_KEY=COACH_CONSENT_KEY+'-version';
const ACCOUNT_ID=/^u[a-f0-9]{16}$/;

export function validAccountId(value){
 return typeof value==='string'&&ACCOUNT_ID.test(value)?value:null;
}
// null means the server confirmed nobody is logged in.
// undefined means the browser could not check, so callers must not guess.
export async function currentAccountId(fetchImpl=globalThis.fetch){
 try{
  const response=await fetchImpl('/api/me',{credentials:'same-origin',headers:{accept:'application/json'}});
  if(response?.status===401)return null;
  if(!response?.ok)return undefined;
  const data=await response.json().catch(()=>null);
  return validAccountId(data?.id)??undefined;
 }catch{return undefined;}
}

export function coachConsentEnabled(storage){
 try{return storage?.getItem(COACH_CONSENT_KEY)==='1';}
 catch{return false;}
}
export function coachConsentVersion(storage){
 try{return storage?.getItem(CONSENT_VERSION_KEY)??null;}
 catch{return null;}
}
export function setCoachConsent(storage,enabled){
 if(enabled)storage.setItem(COACH_CONSENT_KEY,'1');
 else{
  storage.removeItem(COACH_CONSENT_KEY);
  storage.setItem(CONSENT_VERSION_KEY,globalThis.crypto.randomUUID());
 }
}

export function createCoachUploader({consent,storage,fetchImpl=globalThis.fetch,onUploaded,onError,uploadTimeout=8000}={}){
 const done=new Set();
 const inflight=new Map();
 let round=0;
 async function send(path,body,key){
  key=(body?.accountId||'')+'\n'+key;
  if(!consent?.())return {skipped:'consent'};
  if(done.has(key))return {skipped:'sent'};
  const pending=inflight.get(key);
  if(pending)return pending;
  const generation=round;
  const version=coachConsentVersion(storage);
  const blocked=()=>generation!==round||version!==coachConsentVersion(storage)||!consent?.();
  const task=(async()=>{
   let last=null;
   for(let attempt=0;attempt<2;attempt++){
    if(blocked())return last?{...last,skipped:'consent'}:{skipped:'consent'};
    let timer;
    let flight;
    try{
     flight=fetchImpl(path,{
      method:'POST',credentials:'same-origin',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify(body)
     });
     const response=await Promise.race([
      flight,
      new Promise(resolve=>{
       timer=setTimeout(()=>resolve({timeout:true}), uploadTimeout);
      })
     ]);
     if(timer)clearTimeout(timer);
     if(response?.timeout){
      last={ok:false,status:0,timeout:true,data:{error:'紀錄確認逾時。'}};
      continue;
     }
     const data=await response.json().catch(()=>null);
     if(response.ok){
      done.add(key);
      onUploaded?.(data);
      return {ok:true,data};
     }
     last={ok:false,status:response.status,data};
     if(blocked())return {...last,skipped:'consent'};
     if(response.status===401||response.status===403||response.status===409||response.status===400||response.status===413)break;
    }catch{
     if(timer)clearTimeout(timer);
     last={ok:false,status:0,data:{error:'網路中斷，稍後會再送一次。'}};
     if(blocked())return {...last,skipped:'consent'};
    }
   }
   if(blocked())return last?{...last,skipped:'consent'}:{skipped:'consent'};
   onError?.(last?.data?.error||'紀錄沒有送出。',last,body);
   return last;
  })();
  inflight.set(key,task);
  try{return await task;}
  finally{inflight.delete(key);}
 }
 return {
  invalidate(){round+=1;},
  step(body){return send('/api/coach/steps',body,body.clientKey);},
  label(body){return send('/api/coach/labels',body,body.matchId+':label:'+body.endReason);},
  mark(body){return send('/api/coach/demos',body,body.clientKey+':mark');},
  demonstration(body){return send('/api/coach/demos',body,body.clientKey+':fixed');},
  debug(body){return send('/api/coach/debug-replays',body,body.header.matchId+':debug');}
 };
}
