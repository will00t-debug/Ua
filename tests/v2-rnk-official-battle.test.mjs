import test from 'node:test';
import assert from 'node:assert/strict';
import {rnkPracticeDeck,officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {V2_TITLE_LABELS} from '../dist/universal-v2/preview-actions.mjs';

test('the blue Rurouni Kenshin practice deck starts an official match the AI can play',()=>{
 const {pack,counts}=rnkPracticeDeck();
 assert.equal(officialV2Pack('rnk').id,'rnk');
 assert.equal(Object.keys(pack.cards).length,114);
 assert.equal(V2_TITLE_LABELS.rnk,'浪客劍心');
 const packs=[pack,pack];
 let state=newUniversalMatch(pack,{decks:[counts,counts],seed:11,first:0,openingMulligan:true});
 assert.equal(assertUniversalMatch(packs,state),true);
 for(let step=0;step<6 && state.status==='playing';step++){
  const legal=legalUniversalActions(packs,state);
  assert.ok(legal.length);
  const ai=chooseUniversalAiAction(packs,state,{difficulty:'easy'});
  assert.ok(legal.some(action=>JSON.stringify(action)===JSON.stringify(ai)));
  state=dispatchUniversalAction(packs,state,ai);
  assert.equal(assertUniversalMatch(packs,state),true);
 }
 assert.equal(state.status,'playing');
});
