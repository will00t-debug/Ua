import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {chooseProgressSafeAiAction,AI_ACTIONS_PER_FRAME,AI_PHASE_ACTION_BUDGET} from '../dist/universal-v2/ai-driver-safety.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay,replayUniversalPreview} from '../dist/universal-v2/preview-replay.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const rows=summarizeDesignatedDecks(id=>!!pack.cards[id]);
const deck=Object.fromEntries(rows.map(r=>[r.key,designatedPlayableCounts(r)]));
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

test('AI crash/null/invalid choices yield only real legal fallback and do not modify state',()=>{
 const original=newUniversalMatch(packs,{decks:[deck['white-sword'],deck.renruki],seed:20261015,first:1});
 for(const [chooser,expected] of [
  [()=>{throw Error('simulated mobile AI crash');},'ai-exception'],
  [()=>null,'empty-ai-choice'],
  [()=>({type:'play',uid:'FAKE',line:'front',slot:8}),'invalid-ai-choice']
 ]){
  const snapshot=structuredClone(original);
  const result=chooseProgressSafeAiAction(packs,original,{choose:chooser,difficulty:'normal'});
  assert.equal(result.reason,expected);
  const legal=legalUniversalActions(packs,original);
  assert.ok(legal.some(a=>exact(a,result.action)));
  assert.deepEqual(original,snapshot,'AI strategy must not mutate reducer state');
  assert.equal(result.action.type,'next','safe phase advance on AI failure');
 }
});

test('runaway MAIN decision is forced to the reducer-provided next phase action',()=>{
 let s=newUniversalMatch(packs,{decks:[deck.renruki,deck['white-sword']],seed:20261015,first:0});
 while(s.phase!=='main'){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next,{actor:0});
 }
 const result=chooseProgressSafeAiAction(packs,s,{
  actionsInPhase:AI_PHASE_ACTION_BUDGET,choose:()=>{throw Error('should not run infinite chooser');}
 });
 assert.equal(result.reason,'phase-budget');
 assert.deepEqual(result.action,{type:'next'});
 assert.ok(AI_ACTIONS_PER_FRAME<=4,'must yield frequently on mobile');
});

test('original green player versus Renruki AI completes seeded hands and exact replay',()=>{
 for(const [seed,first] of [[20261015,0],[20261015,1],[20261016,0],[20261017,1]]){
  const counts=[deck['white-sword'],deck.renruki];
  let s=newUniversalMatch(packs,{decks:counts,seed,first});
  let replay=makeUniversalPreviewReplay(packs,{decks:counts,seed,first});
  let lastPhase='',stepsInPhase=0,steps=0,backups=0;
  for(;s.status==='playing'&&steps<2300;steps++){
   const phase=s.turn+'|'+s.active+'|'+s.phase;
   if(phase!==lastPhase){lastPhase=phase;stepsInPhase=0;}
   const {action,reason}=chooseProgressSafeAiAction(packs,s,{difficulty:'normal',
    actionsInPhase:stepsInPhase});
   if(reason)backups++;
   const legal=legalUniversalActions(packs,s);
   assert.ok(legal.some(a=>exact(a,action)),seed+': illegal driver action '+steps);
   const actor=s.pending?.player??s.active;
   s=dispatchUniversalAction(packs,s,action,{actor});
   replay=appendUniversalReplay(replay,action,actor);
   stepsInPhase++;
   if(steps%25===0)assert.equal(assertUniversalMatch(packs,s),true);
  }
  assert.equal(s.status,'finished','stalled at '+seed+' first '+first+' phase '+s.phase+' steps '+steps);
  assert.equal(assertUniversalMatch(packs,s),true);
  assert.deepEqual(replayUniversalPreview(packs,replay,{maxActions:2301}),s);
  console.log('MOBILE_GREEN_PURPLE',JSON.stringify({seed,first,steps,backups,endReason:s.endReason}));
 }
});

test('classic battle UI exposes an AI recovery button, top error and small async chunks',()=>{
 const script=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(script,/AI 沒反應？重新繼續/);
 assert.match(script,/resetAi\(\);app.error='';driveAi\(\);/);
 assert.match(script,/role:'alert',text:app.error/);
 assert.match(script,/n\+\+<AI_ACTIONS_PER_FRAME/);
 assert.match(script,/chooseProgressSafeAiAction\(app.packs,app.state/);
 assert.doesNotMatch(script,/n\+\+<35/);
 assert.match(script,/app.aiPhaseCount\+\+/);
 assert.match(script,/app.replay=appendUniversalReplay\(app.replay,choice,1\)/);
 const syntax=spawnSync(process.execPath,['--check','dist/universal-v2-preview.mjs'],{encoding:'utf8'});
 assert.equal(syntax.status,0,syntax.stderr);
});
