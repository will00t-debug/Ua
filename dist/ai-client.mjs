import {chooseAiAction} from './ai-v2.mjs';
let worker=null,sequence=0;
const waiting=new Map();

function stopWorker(){
 if(!worker)return;
 const stale=worker;worker=null;
 stale.onmessage=null;stale.onerror=null;
 stale.terminate();
}
function fallbackWorker(){
 stopWorker();
 for(const item of waiting.values()){
  clearTimeout(item.timer);
  item.resolve(chooseAiAction(item.state,{difficulty:'easy'}));
 }
 waiting.clear();
}
// Browsing away or replacing the game must NOT apply a fallback action from a
// stale decision. Drop work still queued/running so the next state can be
// evaluated immediately instead of waiting behind a canceled search.
export function cancelPendingAiActions(){
 if(!waiting.size)return;
 stopWorker();
 for(const item of waiting.values()){
  clearTimeout(item.timer);
  item.resolve(null);
 }
 waiting.clear();
}
// Keep expensive search off the browser UI thread. Timeout falls back to the
// old opponent, but voluntary cancellation never plays an old action.
export function requestAiAction(state,{difficulty='normal'}={}){
 if(typeof Worker==='undefined'||difficulty==='easy')
  return Promise.resolve(chooseAiAction(state,{difficulty}));
 try{
  if(!worker){
   worker=new Worker(new URL('./ai-worker.mjs',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{
    const item=waiting.get(data?.id);if(!item)return;
    waiting.delete(data.id);clearTimeout(item.timer);
    item.resolve(data.error?chooseAiAction(item.state,{difficulty:'easy'}):data.action);
   };
   worker.onerror=fallbackWorker;
  }
  return new Promise(resolve=>{
   const id=++sequence,timer=setTimeout(fallbackWorker,2000);
   waiting.set(id,{resolve,timer,state});
   try{worker.postMessage({id,state,difficulty});}catch{fallbackWorker();}
  });
 }catch{return Promise.resolve(chooseAiAction(state,{difficulty:'easy'}));}
}
