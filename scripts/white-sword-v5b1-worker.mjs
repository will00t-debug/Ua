import {parentPort} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {FROZEN_WEIGHT,installColumn} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {playAudit,playFairMatch} from '../training/white-sword-ai/v5b1/lib/play.mjs';

const model=loadModel(V2_FILE);
const installed=installColumn();
if(!installed.ok)throw Error(installed.reason);

parentPort.on('message',job=>{
 if(!job)return;
 try{
  if(job.audit){
   parentPort.postMessage({ok:true,row:playAudit(job,model,installed.feature)});
   return;
  }
  if(job.arm!=='v2'&&job.weight!==FROZEN_WEIGHT)throw Error('工人拒絕沒有凍結的權重');
  const seats=job.seats.map(seat=>{
   if(seat.policy!=='white-sword')return {...seat,model:null,feature:null,weight:0,residual:false};
   const residual=Boolean(seat.residual);
   return {...seat,model,feature:installed.feature,residual,weight:residual?FROZEN_WEIGHT:0};
  });
  parentPort.postMessage({ok:true,row:playFairMatch({...job,seats},model)});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),seed:job.seed});
 }
});
