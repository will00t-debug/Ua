// One paired condition: identical initial seed, deck, first seat and specialist seat.
// Different policies can cause later draws/effects to diverge. That is expected.
// Benchmark only: neither variant changes the production AI.
import {parentPort} from 'node:worker_threads';
import {isDeepStrictEqual} from 'node:util';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame,summarizeGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';

const v1=loadModel('training/white-sword-ai/weights/candidate.json');
const v2=loadModel('training/white-sword-ai/weights/v2-capped.json');
if(!isDeepStrictEqual(v1.policy,v2.policy)||!isDeepStrictEqual(v1.value,v2.value))
 throw Error('v1 and v2 weights differ: comparison is not cap-only');
if(v2.hardCap!==7)throw Error('v2 search cap must be 7');

function specOf(row,variant){
 const model=variant==='v1'?v1:v2;
 const own={deckId:'white-sword',policy:'white-sword',model,
  mode:'blend',scale:6,hardCap:variant==='v1'?null:7,explore:0};
 const opponent={deckId:row.opponentDeck,policy:'hard-search-2',
  model:null,mode:'policy',explore:0,scale:0};
 const seats=[null,null];
 seats[row.specialistSeat]=own;
 seats[1-row.specialistSeat]=opponent;
 return {seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
  opponentDeck:row.opponentDeck,label:'paired-unseen',seats,
  keepActions:false,keepSamples:false};
}

parentPort.on('message',row=>{
 try{
  const one=summarizeGame(playGame(specOf(row,'v1')));
  const two=summarizeGame(playGame(specOf(row,'v2')));
  parentPort.postMessage({ok:true,result:{...row,v1:one,v2:two}});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),row});
 }
});
