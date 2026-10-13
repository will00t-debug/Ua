import {chooseAiAction} from './ai-v2.mjs';
let worker=null,sequence=0;
const waiting=new Map();
function resetWorker(){
 worker?.terminate();worker=null;
 for(const item of waiting.values()){clearTimeout(item.timer);item.resolve(chooseAiAction(item.state,{difficulty:'easy'}));}
 waiting.clear();
}
// Keep expensive search off the browser UI thread. Timeout falls back to the old AI.
export function requestAiAction(state,{difficulty='normal'}={}){
 if(typeof Worker==='undefined'||difficulty==='easy')return Promise.resolve(chooseAiAction(state,{difficulty}));
 try{
  if(!worker){
   worker=new Worker(new URL('./ai-worker.mjs',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{
    const item=waiting.get(data.id);if(!item)return;
    waiting.delete(data.id);clearTimeout(item.timer);
    item.resolve(data.error?chooseAiAction(item.state,{difficulty:'easy'}):data.action);
   };
   worker.onerror=resetWorker;
  }
  return new Promise(resolve=>{
   const id=++sequence,timer=setTimeout(resetWorker,2000);
   waiting.set(id,{resolve,timer,state});
   try{worker.postMessage({id,state,difficulty});}catch{resetWorker();}
  });
 }catch{return Promise.resolve(chooseAiAction(state,{difficulty:'easy'}));}
}
