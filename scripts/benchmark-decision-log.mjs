// Measure the extra work on the player action path when decision collection is on.
// Upload is not included: the queue does not wait for the network.
import {performance} from 'node:perf_hooks';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch, dispatchUniversalAction, legalUniversalActions, universalActor} from '../dist/universal-v2/engine.mjs';
import {buildHumanStep, coachHeader, newCoachMatchId} from '../dist/universal-v2/coach-record.mjs';

const deck=verifiedBleachPurplePilotDeck();
const packs=[deck.pack, deck.pack];
const steps=Math.min(40, Math.max(8, Number(process.argv[2]||16)));

function fresh(){
 return newUniversalMatch(packs, {decks:[deck.counts, deck.counts], seed:21, first:0, openingMulligan:true});
}
function play(collect){
 const header=coachHeader({matchId:newCoachMatchId(), packs, counts:deck.counts, aiVersion:'normal'});
 let state=fresh();
 let bytes=0;
 let humanSteps=0;
 let previous=null;
 const started=performance.now();
 for(let index=0;index<steps && state.status==='playing';index++){
  const legal=legalUniversalActions(packs, state);
  const actor=universalActor(state);
  const action=legal[0];
  if(collect && actor===0){
   const row=buildHumanStep({packs, state, action, step:humanSteps, replayIndex:index, previous, header, legal});
   bytes+=JSON.stringify(row).length;
   previous={step:row.step, type:row.choice.type, replayIndex:index, clientKey:row.clientKey};
   humanSteps++;
  }
  state=dispatchUniversalAction(packs, state, action, {actor});
 }
 return {ms:performance.now()-started, bytes, humanSteps};
}

play(false);
play(true);
const off=[];
const on=[];
for(let round=0;round<5;round++){
 off.push(play(false));
 on.push(play(true));
}
const sum=(rows, key)=>rows.reduce((total, row)=>total+row[key], 0);
const offMs=sum(off, 'ms')/off.length;
const onMs=sum(on, 'ms')/on.length;
const humanSteps=on[0].humanSteps;
const bytes=Math.round(sum(on, 'bytes')/on.length);
const report={
 actions:steps,
 rounds:5,
 humanSteps,
 collectionOffMs:Number(offMs.toFixed(2)),
 collectionOnMs:Number(onMs.toFixed(2)),
 extraMs:Number((onMs-offMs).toFixed(2)),
 extraMsPerHumanStep:Number(((onMs-offMs)/Math.max(1, humanSteps)).toFixed(2)),
 bytesPerRun:bytes,
 bytesPerHumanStep:Math.round(bytes/Math.max(1, humanSteps)),
 note:'Extra time is local observation capture and JSON serialization. The action path does not wait for upload.'
};
console.log(JSON.stringify(report, null, 2));
