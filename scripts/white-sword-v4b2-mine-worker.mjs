import {parentPort} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {mineGame} from '../training/white-sword-ai/v4b/lib/play.mjs';

const parent=loadModel('training/white-sword-ai/weights/v2-capped.json');
parentPort.on('message',job=>{
 if(!job)return;
 try{
  const game=mineGame({parent,opponent:job.opponent,seed:job.seed,maxSteps:job.maxSteps});
  parentPort.postMessage({ok:true,row:JSON.parse(JSON.stringify({...game,index:job.index}))});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),seed:job.seed,opponent:job.opponent});
 }
});
