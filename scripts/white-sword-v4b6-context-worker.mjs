import {parentPort} from 'node:worker_threads';
import {collectGame} from '../training/white-sword-ai/v4b6/lib/replay.mjs';

parentPort.on('message',job=>{
 if(!job)return;
 try{
  parentPort.postMessage({ok:true,rows:collectGame(job)});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),seed:job.seed,opponent:job.opponent});
 }
});
