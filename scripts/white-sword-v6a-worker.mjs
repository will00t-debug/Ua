import {parentPort} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {playFairMatch} from '../training/white-sword-ai/v5b1/lib/play.mjs';

const policy=loadModel(V2_FILE);
const frozen=readJson('training/white-sword-ai/v6a/candidate.json');
if(!frozen?.beta?.length||frozen.candidate!==true)throw Error('沒有通過獨立測試的候選模型');
const valueModel={beta:frozen.beta,scale:frozen.scale,interactions:frozen.interactions||[],clip:frozen.clip};

parentPort.on('message',job=>{
 if(!job)return;
 try{
  const seats=job.seats.map(seat=>{
   if(seat.policy!=='white-sword'||seat.modelRole!=='candidate')return {...seat,residual:false,valueModel:null};
   return {...seat,residual:true,columns:[],baselineColumns:[],rules:[],valueModel};
  });
  parentPort.postMessage({ok:true,row:playFairMatch({...job,seats},policy)});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),seed:job.seed});
 }
});
