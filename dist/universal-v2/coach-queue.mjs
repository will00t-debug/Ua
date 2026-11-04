// Local outbox for decision rows. Gameplay never waits on the network.
// Each record is stored by account scope and clientKey. A mutation re-reads
// that record, changes only it, and writes it back inside one lock so another
// tab cannot replace the rest of the queue. Turning consent off drops
// everything that has not been uploaded yet.
const QUEUE_KEY='ua-v2-coach-queue-v1';
const ITEM_PREFIX='ua-v2-coach-queue-v1/item/';
const LOCK_KEY='ua-v2-coach-queue-v1/lock';
const MIGRATED_KEY='ua-v2-coach-queue-v1/migrated';
const LOCK_NAME='ua-v2-coach-queue-v1';
const BATCH=8;
const ACCOUNT_ID=/^u[a-f0-9]{16}$/;

function scopeOf(body){
 return typeof body?.accountId==='string'&&ACCOUNT_ID.test(body.accountId)?body.accountId:'unknown';
}
function recordId(body){
 return scopeOf(body)+'\n'+String(body?.clientKey||'');
}
function itemStorageKey(item){
 return ITEM_PREFIX+encodeURIComponent(recordId(item?.body));
}
function parseList(raw){
 try{
  const parsed=raw?JSON.parse(raw):[];
  return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item.clientKey==='string'&&item.body):[];
 }catch{return [];}
}
function parseItem(raw){
 const listed=parseList(raw?`[${raw}]`:null);
 return listed[0]||null;
}
function listStoredItems(storage){
 const found=[];
 const total=storage?.length;
 if(typeof total!=='number'||typeof storage.key!=='function')return found;
 for(let index=0;index<total;index++){
  const key=storage.key(index);
  if(typeof key!=='string'||!key.startsWith(ITEM_PREFIX))continue;
  const item=parseItem(storage.getItem(key));
  if(item)found.push([key, item]);
 }
 return found;
}
function readQueue(storage){
 const listed=parseList(storage?.getItem?.(QUEUE_KEY));
 let migrated=false;
 try{migrated=storage?.getItem?.(MIGRATED_KEY)==='1';}catch{migrated=false;}
 const keyed=listStoredItems(storage);
 if(!migrated&&keyed.length===0)return {items:listed, keys:listed.map(itemStorageKey)};
 const byKey=new Map(keyed);
 const items=[];
 const seen=new Set();
 for(const item of listed){
  const key=itemStorageKey(item);
  if(!byKey.has(key))continue;
  items.push(byKey.get(key));
  seen.add(key);
 }
 const extras=keyed.filter(([key])=>!seen.has(key)).sort((left, right)=>left[0]<right[0]?-1:1);
 for(const [, item] of extras)items.push(item);
 return {items, keys:[...byKey.keys()]};
}
function writeQueue(storage, items, previousKeys, prior){
 const live=new Set(items.map(itemStorageKey));
 for(const key of previousKeys){
  if(live.has(key))continue;
  try{storage?.removeItem(key);}catch{/* The ordered array below still omits this record. */}
 }
 for(const item of items){
  const key=itemStorageKey(item);
  const encoded=JSON.stringify(item);
  if(prior.get(key)===encoded)continue;
  try{storage?.setItem(key, encoded);}catch{/* Keep the ordered array. */}
 }
 try{storage?.setItem(QUEUE_KEY, JSON.stringify(items));}catch{/* A private browser can still play. */}
 try{storage?.setItem(MIGRATED_KEY, '1');}catch{/* Legacy rows remain readable from the array. */}
}
function acquireLock(storage){
 const token=Math.random().toString(16).slice(2)+'|'+Date.now().toString(16);
 const deadline=Date.now()+1500;
 while(true){
  let current=null;
  try{current=storage?.getItem?.(LOCK_KEY)||null;}catch{return token;}
  const stamp=Number(String(current||'').split('|')[1]);
  const stale=!current||!Number.isFinite(stamp)||Date.now()-stamp>3000;
  if(stale){
   try{storage.setItem(LOCK_KEY, token+'|'+Date.now());}catch{return token;}
   let check=null;
   try{check=storage.getItem(LOCK_KEY);}catch{return token;}
   if(String(check||'').startsWith(token+'|'))return token;
  }
  if(Date.now()>deadline)return token;
  const until=Date.now()+4;
  while(Date.now()<until){/* Another tab is writing one record. */}
 }
}
function releaseLock(storage, token){
 try{
  if(String(storage?.getItem?.(LOCK_KEY)||'').startsWith(token+'|'))storage.removeItem(LOCK_KEY);
 }catch{/* The lock expires if this tab closes mid-update. */}
}
function transaction(storage, fn){
 const token=acquireLock(storage);
 try{
  const loaded=readQueue(storage);
  const prior=new Map(listStoredItems(storage).map(([key, item])=>[key, JSON.stringify(item)]));
  const result=fn(loaded.items);
  writeQueue(storage, loaded.items, loaded.keys, prior);
  return result;
 }finally{releaseLock(storage, token);}
}
async function lockSection(fn){
 const request=globalThis.navigator?.locks?.request;
 if(typeof request!=='function')return fn();
 return request.call(globalThis.navigator.locks, LOCK_NAME, ()=>fn());
}

function isLabel(body){
 return String(body?.format||'').includes('label');
}
function replace(items, next){
 items.length=0;
 for(const item of next)items.push(item);
}
function sameRecord(entry, body){
 return recordId(entry?.body)===recordId(body);
}

const UNFILTERED={};
export function createDecisionQueue({storage, consent, send, schedule, onChange, account, now=()=>Date.now()}={}){
 let timer=null;
 let flushing=false;
 let generation=0;
 let started=false;
 let sendingKey=null;
 let dropped=0;
 let lastError='';
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
 function rejectIn(items, failed){
  const matchId=failed.body?.matchId;
  const scope=scopeOf(failed.body);
  const before=items.length;
  replace(items, items.filter(entry=>{
   if(sameRecord(entry, failed.body))return false;
   if(scopeOf(entry.body)!==scope)return true;
   if(!matchId||isLabel(failed.body)||isLabel(entry.body)||entry.body?.matchId!==matchId)return true;
   return false;
  }));
  const removed=before-items.length;
  dropped+=removed;
  return removed;
 }
 function arm(delay){
  if(!started||timer!=null)return;
  const count=readQueue(storage).items.length;
  const wait=delay??(count>=BATCH?0:1200);
  timer=schedule?schedule(run, wait):setTimeout(run, wait);
 }
 function run(){
  timer=null;
  void flush();
 }
 async function flush(){
  if(flushing||!started)return;
  const gen=generation;
  flushing=true;
  let retry=false;
  try{
   while(generation===gen&&consent?.()){
    const owner=await readOwner();
    if(generation!==gen)return;
    if(owner===null)return;
    const picked=transaction(storage, items=>{
     const found=items.findIndex(entry=>ownedBy(entry, owner));
     if(found<0)return {kind:'idle'};
     const item=items[found];
     if(item.lastStatus===400||item.lastStatus===409||item.lastStatus===413){
      lastError=item.lastError||lastError||'有一筆紀錄被拒絕，已跳過。';
      rejectIn(items, item);
      return {kind:'rejected'};
     }
     const hold=item.holdUntil||0;
     if(hold>now())return {kind:'hold', delay:Math.min(hold-now(), 4000)};
     return {kind:'send', item};
    });
    if(picked.kind==='idle')return;
    if(picked.kind==='rejected'){notify();continue;}
    if(picked.kind==='hold'){arm(picked.delay);return;}
    const item=picked.item;
    if(owner!==UNFILTERED){
     const fresh=await readOwner();
     if(generation!==gen)return;
     if(fresh!==item.body?.accountId){retry=true;return;}
    }
    sendingKey=item.clientKey;
    let result=null;
    try{result=await send(item.body);}
    catch{result={ok:false, status:0};}
    finally{sendingKey=null;}
    if(generation!==gen)return;
    const action=await lockSection(()=>{
     if(generation!==gen)return 'stale';
     return transaction(storage, items=>{
      if(!consent?.()){replace(items, []);return 'cleared';}
      const index=items.findIndex(entry=>sameRecord(entry, item.body));
      if(result?.ok||result?.skipped==='sent'){
       if(index>=0)items.splice(index, 1);
       return 'next';
      }
      if(result?.skipped==='consent'){replace(items, []);return 'cleared';}
      if(index<0)return 'next';
      const fatal=result?.status===400||result?.status===409||result?.status===413;
      if(fatal){
       lastError=result?.data?.error||'有一筆紀錄被拒絕，已跳過。';
       rejectIn(items, items[index]);
       return 'next';
      }
      const current=items[index];
      current.attempts=(current.attempts||0)+1;
      current.holdUntil=now()+Math.min(30000, 1000*2**Math.min(current.attempts, 5));
      current.lastStatus=result?.status||0;
      current.lastError=result?.data?.error||'';
      if(result?.status===403)lastError=current.lastError||'這筆紀錄屬於另一個帳號，已暫停上傳。';
      return {kind:'retry', delay:current.holdUntil-now()};
     });
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
  get length(){return readQueue(storage).items.length;},
  get bytes(){return readQueue(storage).items.reduce((sum, item)=>sum+(item.bytes||0), 0);},
  get dropped(){return dropped;},
  get lastError(){return lastError;},
  paused(owner){
   const items=readQueue(storage).items;
   if(typeof owner!=='string'||!owner)return items.length;
   return items.filter(item=>item.body?.accountId!==owner).length;
  },
  start(){
   started=true;
   if(consent?.())arm(0);
   else if(readQueue(storage).items.length){
    transaction(storage, items=>{replace(items, []);});
    notify();
   }
  },
  enqueue(body, {holdMs=0}={}){
   if(!consent?.())return {skipped:'consent'};
   const result=transaction(storage, items=>{
    if(items.some(item=>sameRecord(item, body)))return {skipped:'queued'};
    const encoded=JSON.stringify(body);
    items.push({clientKey:body.clientKey, body, attempts:0, bytes:encoded.length, holdUntil:holdMs?now()+holdMs:0});
    return {queued:true, bytes:encoded.length};
   });
   if(result?.queued){notify();arm();}
   return result;
  },
  drop(clientKey){
   if(clientKey===sendingKey)return false;
   const removed=transaction(storage, items=>{
    const before=items.length;
    replace(items, items.filter(item=>item.clientKey!==clientKey));
    return items.length!==before;
   });
   if(removed)notify();
   return removed;
  },
  discard(){
   const bodies=readQueue(storage).items.map(item=>item.body);
   this.clear();
   return bodies;
  },
  clear(){
   generation++;
   if(timer!=null){clearTimeout(timer);timer=null;}
   transaction(storage, items=>{replace(items, []);});
   notify();
  },
  async flushNow(){if(timer!=null){clearTimeout(timer);timer=null;}await flush();}
 };
}
