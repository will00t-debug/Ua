import {createHash} from 'node:crypto';
import {parentPort} from 'node:worker_threads';
import {playGame,summarizeGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';

function tally(game){
 const seat=game.specialistSeat;
 const out={energy:0,front:0,move:0,raid:0,attack:0,apSpent:game.counts?.apSpent||0};
 for(const action of game.actions||[]){
  if(action.actor!==seat)continue;
  if(action.type==='play'&&action.line==='energy')out.energy++;
  else if(action.type==='play'&&action.line==='front')out.front++;
  else if(action.type==='move')out.move++;
  else if(action.type==='raid')out.raid++;
  else if(action.type==='attack')out.attack++;
 }
 return out;
}
parentPort.on('message',spec=>{
 if(!spec)return;
 try{
  const game=playGame({...spec,keepActions:true,keepSamples:false});
  const summary=summarizeGame(game);
  summary.specKey=spec.key;
  summary.candidateId=spec.candidateId;
  summary.opponentKind=spec.opponentKind;
  summary.stage=spec.stage;
  summary.role=spec.role||'candidate';
  summary.round=spec.round;
  summary.historicalSame=!!spec.historicalSame;
  summary.tally=tally(game);
  summary.actionHash=createHash('sha256').update(JSON.stringify(game.actions||[])).digest('hex').slice(0,16);
  parentPort.postMessage({ok:true,game:summary});
 }catch(error){
  parentPort.postMessage({ok:false,error:String(error?.stack||error),specKey:spec.key||null});
 }
});
