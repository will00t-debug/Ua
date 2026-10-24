import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {createUniversalAiObservation} from '../dist/universal-v2/ai-observation.mjs';
const presets=createAllV2PreviewRealDecks();
const left=presets['bleach-green'],right=presets['gurren-lagann-red'];
const packs=[left.pack,right.pack];
const match=()=>newUniversalMatch(packs,{decks:[left.counts,right.counts],seed:853});
test('all difficulty decisions are exact native actions and do not mutate state',()=>{
 let s=match();
 for(let n=0;n<140&&s.status==='playing';n++){
  const before=JSON.stringify(s),legal=legalUniversalActions(packs,s);
  for(const difficulty of ['easy','normal','hard']){
   const a=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(a)),difficulty);
  }
  assert.equal(JSON.stringify(s),before);
  s=dispatchUniversalAction(packs,s,chooseUniversalAiAction(packs,s,{difficulty:'hard'}),{actor:s.pending?.player??s.active});
 }
});
test('safe observation excludes hidden identities, RNG and opponent deck list',()=>{
 const s=match(),obs=createUniversalAiObservation(packs,s,legalUniversalActions(packs,s));
 assert.deepEqual(obs.players[1].hand,[]);
 assert.equal(obs.rng,undefined);assert.equal(obs.effectQueue,undefined);
 assert.equal(obs.players[0].deck,undefined);assert.equal(obs.players[0].life.length,undefined);
 const hidden=s.players[1].hand.map(x=>x.uid);
 for(const uid of hidden)assert.ok(!JSON.stringify(obs).includes('"'+uid+'"'));
});
