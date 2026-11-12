import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {legalCsmPending} from '../dist/universal-v2/csm-runtime.mjs';

// Rule error, not a search error. Two 40ms tree-vs-rollout games on the
// Chainsaw Man raid deck hit the same assertion and were left unfinished:
// seed 8300, first 0, challenger seat 1, step 125, attack uid 1-17;
// seed 8301, first 0, challenger seat 0, step 89, attack uid 0-19.
// Both had already used a Chainsaw Man choice, which arms the CSM helper.
// UA53BT/CSM-1-056 in a face-up raid, with one facedown under it and 姫野
// on our side, peels that facedown on attack and grants sniper plus impact.
// Main's engine recognizes that printed attack grant, so the swing resolves.

function countsFor(pack){
 const required=['CSM-1-056','CSM-1-063','CSM-1-011'];
 const fillers=Object.values(pack.cards).filter(card=>!required.includes(card.id)&&
  !['special','color','final'].includes(card.trigger)).map(card=>card.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 const counts=Object.fromEntries(ids.map((id,index)=>[id,index===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(state,player,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=state.players[player][zone];
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}

test('CSM-1-056 attack grant resolves under the current battle-grant check',()=>{
 const pack=officialV2Pack('csm');
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[countsFor(pack),countsFor(pack)],seed:3,first:0});
 while(state.phase!=='attack')state=dispatchUniversalAction(packs,state,{type:'next'});
 const attacker=take(state,0,'CSM-1-056');
 const base=take(state,0,'CSM-1-011');
 base.faceDown=false;
 attacker.stack=[base];
 const hidden=state.players[0].deck.pop();
 hidden.faceDown=true;
 attacker.under=[hidden];
 attacker.ready=true;
 attacker.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[0].front[0]=attacker;
 const himeno=take(state,0,'CSM-1-063');
 himeno.ready=true;
 himeno.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[0].front[1]=himeno;
 legalCsmPending(packs,state);
 assert.equal(assertUniversalMatch(packs,state),true);
 const swing=legalUniversalActions(packs,state).find(action=>action.type==='attack'&&action.uid===attacker.uid);
 assert.ok(swing);
 // Main recognizes this printed CSM-1-056 attack grant. The swing resolves
 // instead of being rejected as a forged temporary battle keyword.
 const next=dispatchUniversalAction(packs,state,swing);
 assert.equal(assertUniversalMatch(packs,next),true);
 const body=next.players[0].front.find(card=>card?.uid===attacker.uid);
 assert.ok(body);
 assert.equal(body.sniperGranted?.turn, next.turn);
 assert.equal(body.impactGranted?.turn, next.turn);
});
