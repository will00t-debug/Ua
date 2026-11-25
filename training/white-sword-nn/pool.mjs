import {Worker} from 'node:worker_threads';

export function runPool(jobs,workers){
 if(!jobs.length)return Promise.resolve([]);
 const width=Math.max(1,Math.min(workers|0,jobs.length));
 return new Promise((resolve,reject)=>{
  const results=new Array(jobs.length);
  let cursor=0;
  let finished=0;
  let failed=false;
  const pool=[];
  const fail=error=>{
   if(failed)return;
   failed=true;
   for(const worker of pool)worker.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  const assign=(worker,index)=>{
   const onMessage=message=>{
    if(message?.type==='progress'){
     console.log(message.text);
     return;
    }
    worker.off('message',onMessage);
    if(!message?.ok)return fail(message?.error||'worker failed');
    results[index]=message.game;
    finished++;
    console.log('game',finished+'/'+jobs.length,'seed',message.game.seed,message.game.status,Math.round(message.game.ms)+'ms');
    if(cursor<jobs.length)assign(worker,cursor++);
    else if(finished===jobs.length){
     for(const item of pool)item.terminate();
     resolve(results);
    }
   };
   worker.on('message',onMessage);
   worker.postMessage(jobs[index]);
  };
  for(let i=0;i<width;i++){
   const worker=new Worker(new URL('./worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
