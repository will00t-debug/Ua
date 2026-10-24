import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {legalUniversalActions,newUniversalMatch,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay,replayUniversalPreview} from '../dist/universal-v2/preview-replay.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const row=summarizeDesignatedDecks(id=>!!pack.cards[id]);
const d=Object.fromEntries(row.map(x=>[x.key,designatedPlayableCounts(x)]));
const source=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');

test('manual AI rescue uses one native legal reducer action without an AI chooser or timers',()=>{
 const code=source.split('function manualAiStep(){')[1]?.split('function driveAi(){')[0];
 assert.ok(code);
 assert.match(code,/resetAi\(\)/);
 assert.match(code,/legalUniversalActions\(app.packs,app.state\)/);
 assert.match(code,/legal\.find\(a=>a.type==='next'\)/);
 assert.match(code,/isExactLegal\(move,legal\)/);
 assert.match(code,/dispatchUniversalAction\(app.packs,app.state,move,\{actor:1\}\)/);
 assert.match(code,/app.replay=appendUniversalReplay\(app.replay,move,1\)/);
 assert.doesNotMatch(code,/setTimeout|chooseUniversalAiAction|chooseProgressSafeAiAction/);
 assert.match(source,/btn\('手動推進 AI 一步',manualAiStep/);
 assert.match(source,/btn\('暫停 AI'/);
 assert.match(source,/CLIENT_RELEASE='AI 修復 R2/);
 assert.match(source,/app.aiCompletedSteps\+\+/);
 assert.match(source,/app\.aiTimer=setTimeout\(chunk,16\)/);
 const parse=spawnSync(process.execPath,['--check','dist/universal-v2-preview.mjs'],{encoding:'utf8'});
 assert.equal(parse.status,0,parse.stderr);
});

test('manual native-legal progress goes from purple AI start to green player without altering rules',()=>{
 const decks=[d['white-sword'],d.renruki];
 for(const seed of [20261015,20261016]){
  let s=newUniversalMatch(packs,{decks,seed,first:1});
  let tape=makeUniversalPreviewReplay(packs,{decks,seed,first:1});
  let steps=0;
  for(;s.status==='playing'&&(s.pending?.player??s.active)===1&&steps<100;steps++){
   const legal=legalUniversalActions(packs,s);
   assert.ok(legal.length);
   const next=!s.pending?legal.find(a=>a.type==='next'):null;
   const move=next||legal.find(a=>a.type==='chooseBlock'&&a.uid===null)||
    legal.find(a=>a.mode==='skip')||legal[0];
   assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(move)));
   s=dispatchUniversalAction(packs,s,move,{actor:1});
   tape=appendUniversalReplay(tape,move,1);
   assert.equal(assertUniversalMatch(packs,s),true);
  }
  assert.ok(steps>0&&steps<100,'manual assistance should yield AI turn to player: '+steps);
  assert.equal((s.pending?.player??s.active),0);
  assert.deepEqual(replayUniversalPreview(packs,tape),s);
 }
});
