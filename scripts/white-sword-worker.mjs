import {parentPort} from 'node:worker_threads';
import {playGame,summarizeGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {timingOf} from '../dist/universal-v2/white-sword-ai/stats.mjs';

parentPort.on('message',spec=>{
 if(!spec)return;
 try{
  const game=playGame(spec);
  if(spec.keepSamples){
   game.timing=timingOf(game.decisionMs||[]);
   delete game.decisionMs;
   if(!spec.keepActions)delete game.actions;
   parentPort.postMessage({ok:true,game});
  }else parentPort.postMessage({ok:true,game:summarizeGame(game)});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error)});
 }
});
