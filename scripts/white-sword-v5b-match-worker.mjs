import {parentPort} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {playResidualMatch} from '../training/white-sword-ai/v5b/lib/match.mjs';
import {installColumn} from '../training/white-sword-ai/v5b/lib/protocol.mjs';

const model=loadModel(V2_FILE);
const installed=installColumn();
if(!installed.ok)throw Error(installed.reason);

parentPort.on('message',job=>{
 if(!job)return;
 try{
  const seats=job.seats.map(seat=>({
   ...seat,
   model:seat.policy==='white-sword'?model:null,
   feature:installed.feature,
   weight:seat.residual?job.weight:0
  }));
  const row=playResidualMatch({...job,seats});
  parentPort.postMessage({ok:true,row});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),seed:job.seed});
 }
});
