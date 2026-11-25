import {parentPort} from 'node:worker_threads';
import {finishFromAction} from '../training/white-sword-ai/v4b/lib/play.mjs';

parentPort.on('message',job=>{
 if(!job)return;
 try{
  const result=finishFromAction(job);
  parentPort.postMessage({ok:true,row:{
   id:job.id,positionId:job.positionId,attempt:job.attempt,side:job.side,
   status:result.status,winner:result.winner,steps:result.steps,finished:result.finished,
   endReason:result.endReason||null,error:result.error||null
  }});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),id:job.id||null});
 }
});
