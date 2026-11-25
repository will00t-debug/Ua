import {parentPort} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {FROZEN_WEIGHT,WEIGHT_CLIP} from '../training/white-sword-ai/v5c/lib/protocol.mjs';
import {playFairMatch} from '../training/white-sword-ai/v5b1/lib/play.mjs';

const policy=loadModel(V2_FILE);
const frozen=readJson('training/white-sword-ai/v5c/model.json');
for(const column of [...(frozen.columns||[]),...(frozen.baseline||[])]){
 if(!(Math.abs(column.weight)<=WEIGHT_CLIP+1e-9))throw Error('診斷權重超出夾限');
}
if(frozen.includes070){
 const control=(frozen.columns||[]).find(column=>column.signature==='+|play|BLC-4-070|energy');
 if(!control||control.weight!==FROZEN_WEIGHT)throw Error('診斷改到了凍結的 070 權重');
}

function columnsFor(role){
 if(role==='candidate')return {columns:frozen.columns||[],baselineColumns:frozen.baseline||[]};
 if(role==='baseline')return {columns:frozen.baseline||[],baselineColumns:[]};
 return {columns:[],baselineColumns:[]};
}

parentPort.on('message',job=>{
 if(!job)return;
 try{
  const seats=job.seats.map(seat=>{
   if(seat.policy!=='white-sword')return {...seat,residual:false,columns:[],baselineColumns:[]};
   const used=columnsFor(seat.modelRole);
   return {...seat,residual:seat.modelRole!=='none',columns:used.columns,baselineColumns:used.baselineColumns,model:policy};
  });
  parentPort.postMessage({ok:true,row:playFairMatch({...job,seats},policy)});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),seed:job.seed});
 }
});
