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

export function createDecisionQueue({storage,consent,send,schedule,onChange,now=()=>Date.now()}={}){
 let items=readQueue(storage);
 let timer=null;
 let flushing=false;
 let generation=0;
 let started=false;
 function save(){
  try{storage?.setItem(QUEUE_KEY,JSON.stringify(items));}
  catch{/* A private browser can keep the in-memory outbox for this page. */}
 }
 function notify(){onChange?.();}
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
    const hold=items[0].holdUntil||0;
    if(hold>now()){arm(Math.min(hold-now(),4000));return;}
    const item=items[0];
    let result=null;
    try{result=await send(item.body);}
    catch{result={ok:false,status:0};}
    if(generation!==gen)return;
    if(!consent?.()){items=[];save();notify();return;}
    if(result?.ok||result?.skipped==='sent'){
     items.shift();
     save();
     notify();
     continue;
    }
    if(result?.skipped==='consent'){items=[];save();notify();return;}
    item.attempts=(item.attempts||0)+1;
    const fatal=result?.status===400||result?.status===409||result?.status===413;
    item.holdUntil=now()+(fatal?60000:Math.min(30000,1000*2**Math.min(item.attempts,5)));
    item.lastStatus=result?.status||0;
    save();
    notify();
    arm(fatal?60000:item.holdUntil-now());
    return;
   }
  }finally{flushing=false;}
 }
 return {
  get length(){return items.length;},
  get bytes(){return items.reduce((sum,item)=>sum+(item.bytes||0),0);},
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
