// Consent defaults off. A dropped response can be sent again; the server
// keeps one row per match step, so a retry does not create a second decision.
export const COACH_CONSENT_KEY='ua-v2-coach-consent';
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
export function setCoachConsent(storage,enabled){
 if(enabled)storage.setItem(COACH_CONSENT_KEY,'1');
 else storage.removeItem(COACH_CONSENT_KEY);
}

export function createCoachUploader({consent,fetchImpl=globalThis.fetch,onUploaded,onError}={}){
 const done=new Set();
 const inflight=new Map();
 async function send(path,body,key){
  if(!consent?.())return {skipped:'consent'};
  if(done.has(key))return {skipped:'sent'};
  const pending=inflight.get(key);
  if(pending)return pending;
  const task=(async()=>{
   let last=null;
   for(let attempt=0;attempt<2;attempt++){
    try{
     const response=await fetchImpl(path,{
      method:'POST',credentials:'same-origin',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify(body)
     });
     const data=await response.json().catch(()=>null);
     if(response.ok){
      done.add(key);
      onUploaded?.(data);
      return {ok:true,data};
     }
     last={ok:false,status:response.status,data};
     if(response.status===401||response.status===403||response.status===409||response.status===400||response.status===413)break;
    }catch{
     last={ok:false,status:0,data:{error:'網路中斷，稍後會再送一次。'}};
    }
   }
   onError?.(last?.data?.error||'紀錄沒有送出。',last);
   return last;
  })();
  inflight.set(key,task);
  try{return await task;}
  finally{inflight.delete(key);}
 }
 return {
  step(body){return send('/api/coach/steps',body,body.clientKey);},
  label(body){return send('/api/coach/labels',body,body.matchId+':label:'+body.endReason);},
  mark(body){return send('/api/coach/demos',body,body.clientKey+':mark');},
  demonstration(body){return send('/api/coach/demos',body,body.clientKey+':fixed');},
  debug(body){return send('/api/coach/debug-replays',body,body.header.matchId+':debug');}
 };
}
