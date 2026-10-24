import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {createUniversalAiObservation} from '../dist/universal-v2/ai-observation.mjs';
import {rankUniversalAiActions} from '../dist/universal-v2/ai-strategy.mjs';
import {boundedUniversalAiContinuationDetailed,stableUniversalAiActionKey} from '../dist/universal-v2/ai-planner.mjs';
import {evaluateTrustedUniversalAiTactics} from '../dist/universal-v2/ai-tactics.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const presets=createAllV2PreviewRealDecks();
const p=presets['solo-leveling'],packs=[p.pack,p.pack];
const begin=()=>{
 let s=newUniversalMatch(packs,{decks:[p.counts,p.counts],seed:20261026});
 for(let n=0;n<10&&s.phase!=='main';n++){
  const legal=legalUniversalActions(packs,s);
  const a=legal.find(x=>x.type==='next')||legal[0];
  s=dispatchUniversalAction(packs,s,a,{actor:s.pending?.player??s.active});
 }
 assert.equal(s.phase,'main');
 return s;
};
test('Round 3: canonical tie keys cannot depend on original reducer field order',()=>{
 const a={type:'play',uid:'0-7',line:'front',slot:3};
 const b={slot:3,line:'front',uid:'0-7',type:'play'};
 assert.equal(stableUniversalAiActionKey(a),stableUniversalAiActionKey(b));
});
test('Round 3: legal list permutations keep full-set heuristic best and bounded estimates',()=>{
 const s=begin(),o=createUniversalAiObservation(packs,s,legalUniversalActions(packs,s));
 const base=rankUniversalAiActions(packs,o)[0]?.action;
 const reversed={...o,legal:[...o.legal].reverse()};
 assert.deepEqual(rankUniversalAiActions(packs,reversed)[0].action,base);
 const one=boundedUniversalAiContinuationDetailed(packs,o,{timeMs:100});
 const two=boundedUniversalAiContinuationDetailed(packs,reversed,{timeMs:100});
 assert.equal(one.fallback,two.fallback);
 assert.deepEqual([...one.bonuses].sort(),[...two.bonuses].sort());
});
test('Round 3: insufficient fixed node budget returns no partial bonuses',()=>{
 const s=begin(),o=createUniversalAiObservation(packs,s,legalUniversalActions(packs,s));
 const disabled=boundedUniversalAiContinuationDetailed(packs,o,{nodes:0});
 assert.equal(disabled.bonuses.size,0);
 assert.equal(disabled.fallback,'disabled');
 const tiny=boundedUniversalAiContinuationDetailed(packs,o,{nodes:1,timeMs:100});
 if(tiny.fallback==='node-budget')assert.equal(tiny.bonuses.size,0);
});
test('Round 3: native tactical bridge returns a genuine root legal action without mutating state',()=>{
 const s=begin(),before=JSON.stringify(s),legal=legalUniversalActions(packs,s);
 const o=createUniversalAiObservation(packs,s,legal),ranked=rankUniversalAiActions(packs,o);
 const result=evaluateTrustedUniversalAiTactics(packs,s,o,ranked,{nodes:40,timeMs:100});
 assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(result.action)));
 assert.equal(JSON.stringify(s),before);
 assert.ok(result.nodes<=41);
 assert.equal(evaluateTrustedUniversalAiTactics(packs,s,o,ranked,{nodes:0}).action.type,
  ranked[0].action.type);
});
test('Round 3: emergency timing disables rollout safely; Hard remains legal',()=>{
 const s=begin(),legal=legalUniversalActions(packs,s);
 const o=createUniversalAiObservation(packs,s,legal),ranked=rankUniversalAiActions(packs,o);
 const aborted=evaluateTrustedUniversalAiTactics(packs,s,o,ranked,{timeMs:0});
 assert.equal(aborted.fallback,'not-eligible');
 assert.deepEqual(aborted.action,ranked[0].action);
 for(const tactical of [false,true]){
  const picked=chooseUniversalAiAction(packs,s,{difficulty:'hard',tactical});
  assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(picked)));
 }
});
test('Round 3: hidden-zone reordering never becomes a future exact LIFE prediction',()=>{
 const s=begin(),other=structuredClone(s);
 for(const pl of other.players){pl.deck.reverse();pl.life.reverse();}
 const take=state=>{
  const legal=legalUniversalActions(packs,state);
  const o=createUniversalAiObservation(packs,state,legal);
  return evaluateTrustedUniversalAiTactics(packs,state,o,
   rankUniversalAiActions(packs,o),{timeMs:100,nodes:40}).action;
 };
 assert.deepEqual(take(s),take(other));
});
