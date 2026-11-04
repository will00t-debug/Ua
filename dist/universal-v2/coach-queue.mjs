// Local outbox for decision rows. Gameplay never waits on the network or on
// another tab's write lock. A row is queued only after its own write is read
// back. Quota failures keep the previous rows and report that this one is not
// stored yet. Legacy rows move one at a time; the old copy is removed only
// after the new copy is confirmed, and the migrated flag is set only when no
// full legacy copy remains. A retract can cancel an enqueue that has not
// entered storage yet; a later replacement of that same key is still written.
const QUEUE_KEY='ua-v2-coach-queue-v1';
const ITEM_PREFIX='ua-v2-coach-queue-v1/item/';
const ORDER_KEY='ua-v2-coach-queue-v1/order';
const MIGRATED_KEY='ua-v2-coach-queue-v1/migrated';
const LOCK_NAME='ua-v2-coach-queue-v1';
const BATCH=8;
const ACCOUNT_ID=/^u[a-f0-9]{16}$/;
const gates=new WeakMap();

function scopeOf(body){
 return typeof body?.accountId==='string'&&ACCOUNT_ID.test(body.accountId)?body.accountId:'unknown';
}
function recordId(body){
 return scopeOf(body)+'\n'+String(body?.clientKey||'');
}
function encodedId(body){
 return encodeURIComponent(recordId(body));
}
function parseList(raw){
 try{
  const parsed=raw?JSON.parse(raw):[];
  return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item.clientKey==='string'&&item.body):[];
 }catch{return [];}
}
function parseItem(raw){
 try{
  const item=JSON.parse(raw);
  return item&&typeof item.clientKey==='string'&&item.body?item:null;
 }catch{return null;}
}
function gateFor(storage){
 let state=gates.get(storage);
 if(!state){
  state={holding:0, tail:Promise.resolve()};
  gates.set(storage, state);
 }
 return state;
}
function readOrder(storage){
 try{
  const parsed=JSON.parse(storage.getItem(ORDER_KEY)||'[]');
  return Array.isArray(parsed)?parsed.filter(id=>typeof id==='string'):[];
 }catch{return [];}
}
function listStored(storage){
 const found=new Map();
 const total=storage?.length;
 if(typeof total!=='number'||typeof storage.key!=='function')return found;
 for(let index=0;index<total;index++){
  const key=storage.key(index);
  if(typeof key!=='string'||!key.startsWith(ITEM_PREFIX))continue;
  const item=parseItem(storage.getItem(key));
  if(item)found.set(key.slice(ITEM_PREFIX.length), item);
 }
 return found;
}
function legacyBodies(storage){
 try{if(storage.getItem(MIGRATED_KEY)==='1')return [];}catch{return [];}
 return parseList(storage.getItem(QUEUE_KEY));
}
function readMerged(storage){
 if(!storage?.getItem)return [];
 const keyed=listStored(storage);
 const items=[];
 const seen=new Set();
 const push=item=>{
  if(!item?.body)return;
  const id=recordId(item.body);
  if(seen.has(id))return;
  seen.add(id);
  items.push(item);
 };
 for(const id of readOrder(storage))push(keyed.get(id));
 for(const item of keyed.values())push(item);
 for(const item of legacyBodies(storage))push(item);
 return items;
}
export function readStoredQueue(storage){
 return readMerged(storage);
}
function confirmed(storage, key, value){
 storage.setItem(key, value);
 return storage.getItem(key)===value;
}
function saveRecord(storage, record){
 const id=encodedId(record.body);
 const key=ITEM_PREFIX+id;
 const encoded=JSON.stringify(record);
 try{
  if(storage.getItem(key)!==encoded&&!confirmed(storage, key, encoded))return false;
 }catch{return false;}
 try{
  const order=readOrder(storage);
  if(!order.includes(id)){
   const next=JSON.stringify([...order, id]);
   if(!confirmed(storage, ORDER_KEY, next)&&storage.getItem(key)!==encoded)return false;
  }
 }catch{/* The record key is the copy that counts. */}
 return storage.getItem(key)===encoded;
}
function markMigrated(storage){
 if(legacyBodies(storage).length)return false;
 try{storage.setItem(MIGRATED_KEY, '1');}catch{/* Retry the flag later. The rows are already in their own keys. */}
 try{if(storage.getItem(MIGRATED_KEY)==='1')storage.setItem(QUEUE_KEY, '[]');}catch{/* A stale array is ignored once the flag is set. */}
 return storage.getItem(MIGRATED_KEY)==='1';
}
function migrateOne(storage){
 try{if(storage.getItem(MIGRATED_KEY)==='1')return 'done';}catch{return 'blocked';}
 const legacy=parseList(storage.getItem(QUEUE_KEY));
 if(!legacy.length){
  markMigrated(storage);
  return 'done';
 }
 if(!saveRecord(storage, legacy[0]))return 'blocked';
 const raw=JSON.stringify(legacy.slice(1));
 try{
  if(!confirmed(storage, QUEUE_KEY, raw))return 'blocked';
 }catch{return 'blocked';}
 if(legacy.length===1)markMigrated(storage);
 return 'moved';
}
function migrateAvailable(storage){
 const cap=Math.max(readMerged(storage).length, 1)+2;
 for(let count=0;count<cap;count++){
  if(migrateOne(storage)!=='moved')return;
 }
}
function hasKey(storage, item){
 try{return storage.getItem(ITEM_PREFIX+encodedId(item.body))!=null;}catch{return false;}
}
function forgetRecord(storage, body){
 const id=encodedId(body);
 try{storage.removeItem(ITEM_PREFIX+id);}catch{/* Already gone. */}
 try{
  const order=readOrder(storage).filter(item=>item!==id);
  storage.setItem(ORDER_KEY, JSON.stringify(order));
 }catch{/* The missing record key keeps it out of the readable queue. */}
 try{
  if(storage.getItem(MIGRATED_KEY)==='1')storage.setItem(QUEUE_KEY, '[]');
  else{
   const legacy=parseList(storage.getItem(QUEUE_KEY)).filter(item=>recordId(item.body)!==recordId(body));
   storage.setItem(QUEUE_KEY, JSON.stringify(legacy));
  }
 }catch{/* The next attempt removes the old copy after the new one is still confirmed. */}
}
function forgetClientKey(storage, clientKey){
 const matches=readMerged(storage).filter(item=>item.clientKey===clientKey);
 for(const item of matches)forgetRecord(storage, item.body);
 return matches.length>0;
}
function storageKeys(storage, include){
 const keys=[];
 const total=storage?.length;
 if(typeof total!=='number'||typeof storage.key!=='function')return keys;
 for(let index=0;index<total;index++){
  const key=storage.key(index);
  if(typeof key==='string'&&include(key))keys.push(key);
 }
 return keys;
}
function wipeStorage(storage){
 for(const key of storageKeys(storage, name=>name.startsWith(ITEM_PREFIX)||name===ORDER_KEY)){
  try{storage.removeItem(key);}catch{/* Continue clearing the rest. */}
 }
 try{storage.setItem(QUEUE_KEY, '[]');}catch{/* Consent off still drops the in-memory rows. */}
 try{storage.setItem(MIGRATED_KEY, '1');}catch{/* A later stale copy of the old array stays ignored. */}
}

function isLabel(body){
 return String(body?.format||'').includes('label');
}
function sameRecord(entry, body){
 return recordId(entry?.body)===recordId(body);
}
function rejected(entry, failed){
 if(sameRecord(entry, failed.body))return true;
 if(scopeOf(entry.body)!==scopeOf(failed.body))return false;
 const matchId=failed.body?.matchId;
 if(!matchId||isLabel(failed.body)||isLabel(entry.body)||entry.body?.matchId!==matchId)return false;
 return true;
}

const UNFILTERED={};
export function createDecisionQueue({storage, consent, consentVersion, send, schedule, onChange, account, locks, now=()=>Date.now()}={}){
 let timer=null;
 let retryTimer=null;
 let flushing=false;
 let generation=0;
 let started=false;
 let sendingKey=null;
 let dropped=0;
 let lastError='';
 let opSeq=0;
 const waiting=[];
 const pendingByKey=new Map();
 const cancelledThrough=new Map();
 function webLock(){
  const source=locks?.request?locks:globalThis.navigator?.locks;
  const request=source?.request;
  return typeof request==='function'?request.bind(source):null;
 }
 function canRunSync(){
  return gateFor(storage).holding===0&&!webLock();
 }
 function runSync(fn){
  const state=gateFor(storage);
  state.holding++;
  try{return fn();}
  finally{state.holding--;}
 }
 function runAsync(fn){
  const state=gateFor(storage);
  const job=state.tail.then(async()=>{
   state.holding++;
   try{
    const lock=webLock();
    if(lock)return await lock(LOCK_NAME, async()=>fn());
    return await fn();
   }finally{state.holding--;}
  });
  state.tail=job.then(()=>{}, ()=>{});
  return job;
 }
 function withWrite(fn){
  if(canRunSync())return Promise.resolve(runSync(fn));
  return runAsync(fn);
 }
 async function readOwner(){
  if(typeof account!=='function')return UNFILTERED;
  try{
   const id=await account();
   return typeof id==='string'&&id?id:null;
  }catch{return null;}
 }
 function ownedBy(entry, owner){
  return owner===UNFILTERED||entry?.body?.accountId===owner;
 }
 function notify(){onChange?.();}
 function remember(record){
  if(!waiting.some(item=>sameRecord(item, record.body)))waiting.push(record);
  lastError='紀錄尚未儲存';
 }
 function scheduleRetry(){
  if(retryTimer!=null||!waiting.length)return;
  const run=()=>{retryTimer=null;void persistWaiting();};
  retryTimer=schedule?schedule(run, 400):setTimeout(run, 400);
 }
 function finish(result){
  if(result?.queued){notify();arm();}
  if(result?.retry){notify();scheduleRetry();}
 }
 function queuePending(clientKey, op){
  const list=pendingByKey.get(clientKey);
  if(list)list.push(op);
  else pendingByKey.set(clientKey, [op]);
 }
 function takePending(clientKey, op){
  const list=pendingByKey.get(clientKey);
  if(!list)return;
  const index=list.indexOf(op);
  if(index>=0)list.splice(index, 1);
  if(!list.length)pendingByKey.delete(clientKey);
 }
 function cancelPending(clientKey){
  const list=pendingByKey.get(clientKey);
  if(!list?.length)return;
  const ceiling=Math.max(cancelledThrough.get(clientKey)||0, ...list);
  cancelledThrough.set(clientKey, ceiling);
 }
 function dropRejected(failed){
  const removed=readMerged(storage).filter(entry=>rejected(entry, failed));
  for(const entry of removed)forgetRecord(storage, entry.body);
  const before=waiting.length;
  for(let index=waiting.length-1;index>=0;index--){
   if(rejected(waiting[index], failed))waiting.splice(index, 1);
  }
  const count=removed.length+(before-waiting.length);
  dropped+=count;
  return count;
 }
 function discardRevoked(){
  if(!consentVersion)return;
  const version=consentVersion();
  for(const item of readMerged(storage)){
   if((item.consentVersion??null)!==version)forgetRecord(storage,item.body);
  }
  for(let index=waiting.length-1;index>=0;index--){
   if((waiting[index].consentVersion??null)!==version)waiting.splice(index,1);
  }
 }
 function commitEnqueue(body, holdMs, version){
  discardRevoked();
  migrateAvailable(storage);
  const items=readMerged(storage);
  if(items.some(item=>sameRecord(item, body))||waiting.some(item=>sameRecord(item, body)))
   return {skipped:'queued'};
  let encoded='';
  try{encoded=JSON.stringify(body);}catch{return {stored:false, error:'storage'};}
  const record={clientKey:body.clientKey, body, consentVersion:version, attempts:0, bytes:encoded.length, holdUntil:holdMs?now()+holdMs:0};
  const behind=legacyBodies(storage).length>0||waiting.some(item=>item.body?.matchId&&item.body.matchId===body.matchId);
  if(behind||!saveRecord(storage, record)){
   remember(record);
   return {stored:false, error:'quota', retry:true};
  }
  if(!legacyBodies(storage).length)markMigrated(storage);
  if(!waiting.length&&lastError==='紀錄尚未儲存')lastError='';
  return {queued:true, bytes:encoded.length};
 }
 async function persistWaiting(){
  if(!waiting.length||!consent?.())return;
  const exec=()=>{
   discardRevoked();
   migrateAvailable(storage);
   if(legacyBodies(storage).length){
    lastError='紀錄尚未儲存';
    return;
   }
   const batch=waiting.splice(0, waiting.length);
   let blocked=false;
   for(const record of batch){
    if(consentVersion&&(record.consentVersion??null)!==consentVersion())continue;
    if(blocked||!saveRecord(storage, record)){
     remember(record);
     blocked=true;
     continue;
    }
   }
   if(!waiting.length&&lastError==='紀錄尚未儲存')lastError='';
   if(!legacyBodies(storage).length)markMigrated(storage);
  };
  if(canRunSync())runSync(exec);
  else await runAsync(exec);
  notify();
  if(waiting.length)scheduleRetry();
  else if(started)arm();
 }
 function arm(delay){
  if(!started||timer!=null)return;
  const count=readMerged(storage).length;
  const wait=delay??(count>=BATCH?0:1200);
  timer=schedule?schedule(run, wait):setTimeout(run, wait);
 }
 function run(){
  timer=null;
  void flush();
 }
 function pick(owner){
  discardRevoked();
  migrateAvailable(storage);
  for(const item of readMerged(storage)){
   if(!ownedBy(item, owner))continue;
   if(!hasKey(storage, item))return {kind:'blocked'};
   if(item.lastStatus===400||item.lastStatus===409||item.lastStatus===413){
    lastError=item.lastError||lastError||'有一筆紀錄被拒絕，已跳過。';
    dropRejected(item);
    return {kind:'rejected'};
   }
   const hold=item.holdUntil||0;
   if(hold>now())return {kind:'hold', delay:Math.min(hold-now(), 4000)};
   return {kind:'send', item};
  }
  return {kind:'idle'};
 }
 function commitSend(item, result){
  if(!consent?.()){waiting.length=0;wipeStorage(storage);return 'cleared';}
  const items=readMerged(storage);
  const index=items.findIndex(entry=>sameRecord(entry, item.body));
  if(result?.ok||result?.skipped==='sent'){
   if(index>=0)forgetRecord(storage, item.body);
   return 'next';
  }
  if(result?.skipped==='consent'){waiting.length=0;wipeStorage(storage);return 'cleared';}
  if(index<0)return 'next';
  const fatal=result?.status===400||result?.status===409||result?.status===413;
  if(fatal){
   lastError=result?.data?.error||'有一筆紀錄被拒絕，已跳過。';
   dropRejected(items[index]);
   return 'next';
  }
  const current=items[index];
  current.attempts=(current.attempts||0)+1;
  current.holdUntil=now()+Math.min(30000, 1000*2**Math.min(current.attempts, 5));
  current.lastStatus=result?.status||0;
  current.lastError=result?.data?.error||'';
  saveRecord(storage, current);
  if(result?.status===403)lastError=current.lastError||'這筆紀錄屬於另一個帳號，已暫停上傳。';
  return {kind:'retry', delay:current.holdUntil-now()};
 }
 async function flush(){
  if(flushing||!started)return;
  const gen=generation;
  const version=consentVersion?.();
  const active=()=>generation===gen&&version===consentVersion?.()&&consent?.();
  flushing=true;
  let retry=false;
  try{
   while(active()){
    const owner=await readOwner();
    if(!active())return;
    if(owner===null)return;
    const picked=await withWrite(()=>pick(owner));
    if(!active())return;
    if(picked.kind==='idle')return;
    if(picked.kind==='blocked'){arm(400);return;}
    if(picked.kind==='rejected'){notify();continue;}
    if(picked.kind==='hold'){arm(picked.delay);return;}
    const item=picked.item;
    if(owner!==UNFILTERED){
     const fresh=await readOwner();
     if(!active())return;
     if(fresh!==item.body?.accountId){retry=true;return;}
    }
    sendingKey=item.clientKey;
    let result=null;
    try{result=await send(item.body);}
    catch{result={ok:false, status:0};}
    finally{sendingKey=null;}
    if(!active())return;
    const action=await withWrite(()=>{
     if(!active())return 'stale';
     return commitSend(item, result);
    });
    notify();
    if(action==='stale'||action==='cleared')return;
    if(action?.kind==='retry'){arm(action.delay);return;}
   }
  }finally{
   flushing=false;
   if(retry&&generation===gen)arm(0);
  }
 }
 return {
  get length(){return readMerged(storage).length;},
  get bytes(){return readMerged(storage).reduce((sum, item)=>sum+(item.bytes||0), 0);},
  get dropped(){return dropped;},
  get lastError(){return lastError;},
  paused(owner){
   const items=readMerged(storage);
   if(typeof owner!=='string'||!owner)return items.length;
   return items.filter(item=>item.body?.accountId!==owner).length;
  },
  start(){
   started=true;
   if(consent?.())arm(0);
   else if(readMerged(storage).length||waiting.length){
    waiting.length=0;
    const clear=consentVersion?discardRevoked:()=>wipeStorage(storage);
    if(canRunSync())runSync(clear);
    else void runAsync(clear);
    notify();
   }
  },
  enqueue(body, {holdMs=0}={}){
   if(!consent?.())return {skipped:'consent'};
   const op=++opSeq;
   const version=consentVersion?.();
   const clientKey=String(body?.clientKey||'');
   const exec=()=>{
    takePending(clientKey, op);
    if((cancelledThrough.get(clientKey)||0)>=op||version!==consentVersion?.()||!consent?.())return {skipped:'cancelled'};
    return commitEnqueue(body, holdMs, version);
   };
   if(canRunSync()){
    const result=runSync(exec);
    finish(result);
    return result;
   }
   queuePending(clientKey, op);
   const done=runAsync(exec).then(result=>{finish(result);return result;});
   return {pending:true, done, op};
  },
  drop(clientKey){
   if(clientKey===sendingKey)return false;
   cancelPending(clientKey);
   const memory=waiting.some(item=>item.clientKey===clientKey);
   if(memory){
    for(let index=waiting.length-1;index>=0;index--){
     if(waiting[index].clientKey===clientKey)waiting.splice(index, 1);
    }
    if(!waiting.length&&lastError==='紀錄尚未儲存')lastError='';
   }
   const exec=()=>forgetClientKey(storage, clientKey);
   if(canRunSync()){
    const removed=runSync(exec)||memory;
    if(removed)notify();
    return removed;
   }
   return runAsync(exec).then(removed=>{
    const ok=removed||memory;
    if(ok)notify();
    return ok;
   });
  },
  discard(){
   const items=readMerged(storage).concat(waiting);
   const version=consentVersion?.();
   const bodies=items.filter(item=>!consentVersion||(item.consentVersion??null)!==version).map(item=>item.body);
   this.clear();
   return bodies;
  },
  clear(){
   generation++;
   if(timer!=null){clearTimeout(timer);timer=null;}
   if(retryTimer!=null){clearTimeout(retryTimer);retryTimer=null;}
   waiting.length=0;
   if(lastError==='紀錄尚未儲存')lastError='';
   const clear=consentVersion?discardRevoked:()=>wipeStorage(storage);
   if(canRunSync())runSync(clear);
   else void runAsync(clear);
   notify();
  },
  exclusive(fn){
   return runAsync(()=>fn());
  },
  async flushNow(){
   if(timer!=null){clearTimeout(timer);timer=null;}
   await persistWaiting();
   await flush();
  }
 };
}
