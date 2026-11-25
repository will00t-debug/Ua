import {parentPort} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {playFairMatch} from '../training/white-sword-ai/v5b1/lib/play.mjs';

const policy=loadModel(V2_FILE);
const frozen=readJson('training/white-sword-ai/v5d1/model.json');
if(frozen?.columns?.length)throw Error('這一輪不安裝殘差權重');
if(!frozen?.rules?.length)throw Error('沒有決策規則就不打診斷');
for(const rule of frozen.rules){
 if(rule.id||rule.position)throw Error('決策規則不能記局面編號');
 for(const side of [rule.loser,rule.winner]){
  if(!side||typeof side.type!=='string')throw Error('規則缺少動作');
 }
}
const rules=frozen.rules.map(rule=>({
 loser:{type:rule.loser.type,card:rule.loser.card??null,line:rule.loser.line??null},
 winner:{type:rule.winner.type,card:rule.winner.card??null,line:rule.winner.line??null}
}));

parentPort.on('message',job=>{
 if(!job)return;
 try{
  const seats=job.seats.map(seat=>{
   if(seat.policy!=='white-sword'||seat.modelRole!=='candidate'){
    return {...seat,residual:false,rules:[],columns:[],baselineColumns:[]};
   }
   return {...seat,residual:true,rules,columns:[],baselineColumns:[],model:policy};
  });
  parentPort.postMessage({ok:true,row:playFairMatch({...job,seats},policy)});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),seed:job.seed});
 }
});
