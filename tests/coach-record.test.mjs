import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalActor} from '../dist/universal-v2/engine.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay} from '../dist/universal-v2/preview-replay.mjs';
import {buildHumanStep,buildAiMark,buildAiDemonstration,coachHeader,coachObservation,
 hiddenLeak,pushSandbox,stateAtReplayIndex,newCoachMatchId} from '../dist/universal-v2/coach-record.mjs';
import {createCoachUploader} from '../dist/universal-v2/coach-client.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const deck=verifiedBleachPurplePilotDeck();
const packs=[deck.pack,deck.pack];
const header=coachHeader({matchId:newCoachMatchId(),packs,counts:deck.counts,aiVersion:'hard-search-2'});

function keep(state){
 const action=legalUniversalActions(packs,state).find(item=>item.mode==='keep');
 assert.ok(action);
 return action;
}

test('rest lock choices use the same words as the battle table',()=>{
 assert.equal(uiActionLabel({type:'chooseRestLock',uid:null}),'不鎖定這次休息');
 assert.equal(uiActionLabel({type:'chooseRestLock',uid:'1-4'}),'休息鎖定 指定卡片');
});

test('a player step keeps only that seat visible and can be rebuilt',()=>{
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:7,first:0,openingMulligan:true});
 let replay=makeUniversalPreviewReplay(packs,{decks:[deck.counts,deck.counts],seed:7,first:0,openingMulligan:true});
 const first=keep(state);
 const step=buildHumanStep({packs,state,action:first,step:0,replayIndex:0,previous:null,header});
 assert.equal(step.actor,'human');
 assert.equal(step.seat,0);
 assert.equal(step.observation.visible.players[1].hand,null);
 assert.equal(step.observation.visible.winner,undefined);
 assert.deepEqual(hiddenLeak(state,step.observation,0),[]);
 assert.equal(JSON.stringify(step).includes('"winner"'),false);
 state=dispatchUniversalAction(packs,state,first,{actor:0});
 replay=appendUniversalReplay(replay,first,0);
 assert.equal(universalActor(state),1);
 const ai=keep(state);
 const mark=buildAiMark({packs,state,action:ai,step:0,replayIndex:1,header});
 assert.equal(mark.observation.visible.players[0].hand,null);
 assert.ok(Array.isArray(mark.observation.visible.players[1].hand));
 assert.deepEqual(hiddenLeak(state,mark.observation,1),[]);
 const before=state;
 state=dispatchUniversalAction(packs,state,ai,{actor:1});
 replay=appendUniversalReplay(replay,ai,1);
 assert.equal(universalActor(state),0);
 const later=legalUniversalActions(packs,state)[0];
 const second=buildHumanStep({packs,state,action:later,step:1,replayIndex:2,
  previous:{step:0,type:first.type,replayIndex:0},header});
 assert.deepEqual(hiddenLeak(state,second.observation,0),[]);
 assert.equal(second.previous.step,0);
 const rebuilt=stateAtReplayIndex(packs,replay,2);
 assert.deepEqual(coachObservation(packs,rebuilt,0),second.observation);
 const original=structuredClone(before);
 const redraw=legalUniversalActions(packs,before).find(item=>item.mode==='redraw');
 const sandbox=pushSandbox(packs,before,redraw);
 assert.deepEqual(before,original);
 assert.notDeepEqual(sandbox,before);
 const demo=buildAiDemonstration(mark,[redraw,later],'energy');
 assert.equal(demo.reason,'energy');
 assert.equal(demo.correction.mode,'redraw');
 assert.equal(demo.demonstration.length,2);
 assert.throws(()=>buildAiDemonstration(mark,[mark.original],''),/改一個做法/);
});

test('consent off never calls the network',async()=>{
 let calls=0;
 const uploader=createCoachUploader({consent:()=>false,fetchImpl:()=>{calls++;throw Error('should not upload');}});
 const result=await uploader.step({clientKey:'m'.padEnd(33,'a')+':0:human'});
 assert.equal(result.skipped,'consent');
 assert.equal(calls,0);
});

test('a lost response can be sent again without a second client key',async()=>{
 const seen=[];
 let attempt=0;
 const uploader=createCoachUploader({
  consent:()=>true,
  fetchImpl:async(_path,options)=>{
   attempt++;
   if(attempt===1)throw Error('socket reset');
   seen.push(options.body);
   return {ok:true,json:async()=>({duplicate:attempt>2})};
  }
 });
 const body={clientKey:'m'+'b'.repeat(32)+':0:human',step:0};
 const first=await uploader.step(body);
 const second=await uploader.step(body);
 assert.equal(first.ok,true);
 assert.equal(second.skipped,'sent');
 assert.equal(seen.length,1);
});

test('closing consent cancels the retry even if recording is turned back on',async()=>{
 let attempt=0;
 let consent=true;
 const uploader=createCoachUploader({
  consent:()=>consent,
  fetchImpl:async()=>{
   attempt++;
   consent=false;
   uploader.invalidate();
   consent=true;
   return {ok:false,status:503,json:async()=>({error:'暫時無法保存。'})};
  }
 });
 const result=await uploader.step({clientKey:'m'+'d'.repeat(32)+':0:human',step:0});
 assert.equal(attempt,1);
 assert.equal(result.ok,false);
 assert.equal(result.status,503);
 assert.equal(result.skipped,'consent');
});

test('an in-flight success still resolves after consent is withdrawn',async()=>{
 let attempt=0;
 const uploader=createCoachUploader({
  consent:()=>true,
  fetchImpl:async()=>{
   attempt++;
   uploader.invalidate();
   return {ok:true,json:async()=>({duplicate:false})};
  }
 });
 const result=await uploader.step({clientKey:'m'+'e'.repeat(32)+':0:human',step:0});
 assert.equal(attempt,1);
 assert.equal(result.ok,true);
 const again=await uploader.step({clientKey:'m'+'e'.repeat(32)+':0:human',step:0});
 assert.equal(again.skipped,'sent');
 assert.equal(attempt,1);
});
