import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';

const pilot=verifiedBleachPurplePilotDeck();
const packs=[pilot.pack,pilot.pack];
const counts=[pilot.counts,pilot.counts];
const source=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');

test('BLEACH purple opening: both buttons complete AI-versus-human setup for either first player',()=>{
 for(const first of [0,1])for(const mode of ['keep','redraw']){
  let s=newUniversalMatch(packs,{decks:counts,seed:20261105,first,openingMulligan:true});
  assert.equal(s.phase,'setup');
  assert.equal(s.status,'playing');
  assert.equal(s.pending.player,first);
  assert.deepEqual(legalUniversalActions(packs,s),[
   {type:'openingMulligan',mode:'keep'},
   {type:'openingMulligan',mode:'redraw'}
  ]);
  const old= s.players[0].hand.map(c=>c.uid);
  const aiChoice=()=>{
   const action=chooseProgressSafeAiAction(packs,s,{difficulty:'hard'}).action;
   assert.equal(action.type,'openingMulligan');
   s=dispatchUniversalAction(packs,s,action,{actor:1});
  };
  if(first===1)aiChoice();
  assert.equal(s.pending.player,0);
  s=dispatchUniversalAction(packs,s,{type:'openingMulligan',mode},{actor:0});
  assert.equal(assertUniversalMatch(packs,s),true);
  if(mode==='redraw')assert.equal(
   old.some(uid=>s.players[0].hand.some(c=>c.uid===uid)),false,
   'the original hand cannot be redrawn'
  );
  if(first===0){
   assert.equal(s.pending.player,1);
   aiChoice();
  }
  assert.equal(s.pending,null);
  assert.equal(s.phase,'start');
  assert.equal(s.turn,1);
  assert.equal(s.status,'playing');
  for(const player of s.players){
   assert.equal(player.hand.length,7);
   assert.equal(player.life.length,7);
   assert.equal(player.deck.length,36);
  }
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});

test('opening UI never silently traps either choice behind a stale AI busy state',()=>{
 const panel=source.split('function renderOpeningMulligan(target,s){')[1]?.split('function printedCatalogue(')[0];
 const action=source.split('function applyAction(a){')[1]?.split('function undoMove(){')[0];
 assert.ok(panel&&action,'opening and human-action handlers must exist');
 assert.match(panel,/onClick|=>applyAction\(action\)/);
 assert.match(panel,/if\(app\.error\)panel\.append\(el\('p',\{class:'v2-error',role:'alert'/);
 assert.match(panel,/重新繼續電腦調度/);
 assert.match(panel,/手動完成電腦調度/);
 assert.match(action,/if\(!app\.state\|\|uiActor\(app\.state\)!==0\)return/);
 assert.match(action,/app\.state\.pending\?\.kind!=='opening-mulligan'/);
 assert.match(action,/resetAi\(\)/);
 assert.match(action,/const nextState=dispatchUniversalAction/);
 assert.match(action,/assertUniversalMatch\(app\.packs,nextState\)/);
 assert.match(action,/const nextReplay=appendUniversalReplay/);
 for(const file of ['dist/universal-v2-battle.html','dist/universal-v2-preview.html']){
  const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.match(html,/universal-v2-preview\.mjs\?v=20261105lifetablemulligan1/);
 }
});
