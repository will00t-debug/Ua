// Local outbox for decision rows. Gameplay never waits on the network.
// Turning consent off drops everything that has not been uploaded yet.
const QUEUE_KEY='ua-v2-coach-queue-v1';
const BATCH=8;

function readQueue(storage){
 try{
  const raw=storage?.getItem(QUEUE_KEY);
  const parsed=raw?JSON.parse(raw):[];
  return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item.clientKey==='string'&&item.body):[];
 }catch{return [];}
}

function isLabel(body){
 return String(body?.format||'').includes('label');
}

export function createDecisionQueue({storage,consent,send,schedule,onChange,now=()=>Date.now()}={}){
 let items=readQueue(storage);
 let timer=null;
 let flushing=false;
 let generation=0;
 let started=false;
 let sendingKey=null;
 let dropped=0;
 let lastError='';
 function save(){
  try{storage?.setItem(QUEUE_KEY,JSON.stringify(items));}
  catch{/* A private browser can keep the in-memory outbox for this page. */}
 }
 function notify(){onChange?.();}
 function reject(failed){
  const matchId=failed.body?.matchId;
  const before=items.length;
  items=items.filter(entry=>{
   if(entry.clientKey===failed.clientKey)return false;
   if(!matchId||isLabel(failed.body)||isLabel(entry.body)||entry.body?.matchId!==matchId)return true;
   return false;
  });
  dropped+=before-items.length;
 }
 function arm(delay){
  if(!started||timer!=null)return;
  const wait=delay??(items.length>=BATCH?0:1200);
  timer=schedule?schedule(run,wait):setTimeout(run,wait);
 }
 function run(){
  timer=null;
  void flush();
 }
 async function flush(){
  if(flushing||!started)return;
  const gen=generation;
  flushing=true;
  try{
   while(generation===gen&&consent?.()&&items.length){
    const item=items[0];
    const held=item.lastStatus===400||item.lastStatus===409||item.lastStatus===413;
    const hold=item.holdUntil||0;
    if(held){
     lastError=item.lastError||lastError||'有一筆紀錄被拒絕，已跳過。';
     reject(item);
     save();
     notify();
     continue;
    }
    if(hold>now()){arm(Math.min(hold-now(),4000));return;}
    sendingKey=item.clientKey;
    let result=null;
    try{result=await send(item.body);}
    catch{result={ok:false,status:0};}
    finally{sendingKey=null;}
    if(generation!==gen)return;
    if(!consent?.()){items=[];save();notify();return;}
    const index=items.findIndex(entry=>entry.clientKey===item.clientKey);
    if(result?.ok||result?.skipped==='sent'){
     if(index>=0)items.splice(index,1);
     save();
     notify();
     continue;
    }
    if(result?.skipped==='consent'){items=[];save();notify();return;}
    if(index<0)continue;
    const fatal=result?.status===400||result?.status===409||result?.status===413;
    if(fatal){
     lastError=result?.data?.error||'有一筆紀錄被拒絕，已跳過。';
     reject(item);
     save();
     notify();
     continue;
    }
    item.attempts=(item.attempts||0)+1;
    item.holdUntil=now()+Math.min(30000,1000*2**Math.min(item.attempts,5));
    item.lastStatus=result?.status||0;
    item.lastError=result?.data?.error||'';
    save();
    notify();
    arm(item.holdUntil-now());
    return;
   }
  }finally{flushing=false;}
 }
 return {
  get length(){return items.length;},
  get bytes(){return items.reduce((sum,item)=>sum+(item.bytes||0),0);},
  get dropped(){return dropped;},
  get lastError(){return lastError;},
  start(){started=true;if(consent?.())arm(0);else if(items.length){items=[];save();}},
  enqueue(body,{holdMs=0}={}){
   if(!consent?.())return {skipped:'consent'};
   if(items.some(item=>item.clientKey===body.clientKey))return {skipped:'queued'};
   const encoded=JSON.stringify(body);
   items.push({clientKey:body.clientKey,body,attempts:0,bytes:encoded.length,holdUntil:holdMs?now()+holdMs:0});
   save();
   notify();
   arm();
   return {queued:true,bytes:encoded.length};
  },
  drop(clientKey){
   if(clientKey===sendingKey)return false;
   const before=items.length;
   items=items.filter(item=>item.clientKey!==clientKey);
   const removed=items.length!==before;
   if(removed){save();notify();}
   return removed;
  },
  discard(){
   const bodies=items.map(item=>item.body);
   this.clear();
   return bodies;
  },
  clear(){
   generation++;
   items=[];
   if(timer!=null){clearTimeout(timer);timer=null;}
   save();
   notify();
  },
  async flushNow(){if(timer!=null){clearTimeout(timer);timer=null;}await flush();}
 };
}
