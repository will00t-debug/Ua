import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'M'+String(i).padStart(2,'0'));
const mk=onPlay=>{
 const cards=ids.map(id=>({id,name:id,type:'character',color:'green',
  energy:0,ap:1,bp:1000,gen:1,implementation:id==='M00'?'dsl':'vanilla',
  ...(id==='M00'?{effects:{onPlay}}:{})}));
 const pack=createUniversalPack({id:'r19-movement-'+onPlay[0].op,cards});
 const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 return {packs:[pack,pack],deck};
};
function take(s,id){
 for(const z of ['hand','deck','life','outside']){
  const arr=s.players[0][z],i=arr.findIndex(x=>x.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }throw Error('No card '+id);
}
function play(packs,deck){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:19192});
 const source=take(s,'M00');s.players[0].hand.push(source);
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(action);
 return {s:dispatchUniversalAction(packs,s,action),source};
}
test('actual onPlay deck mill stamps two distinct ordered UID moves only after deck removal',()=>{
 const {packs,deck}=mk([{op:'millTop',count:2}]);
 const {s,source}=play(packs,deck);
 const actual=s.zoneMoveEvents.filter(x=>x.from==='deck'&&x.to==='outside');
 assert.equal(actual.length,2);
 assert.ok(actual.every(x=>x.sourceUid===source.uid&&x.reason==='own-effect'));
 assert.ok(actual.every(x=>s.players[0].outside.some(c=>c.uid===x.uid)));
 assert.ok(actual[0].order<actual[1].order);
 assert.ok(s.zoneMoveEvents.some(x=>x.uid===source.uid&&x.from==='hand'&&x.to==='front'));
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes('zoneMoveEvents'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('field to hand onPlay bounce records same physical UID and original card source',()=>{
 const {packs,deck}=mk([{op:'bounceOwnOtherUnderEnergy',energy:0}]);
 const {s,source}=play(packs,deck);
 assert.ok(s.players[0].hand.some(x=>x.uid===source.uid));
 assert.ok(!s.players[0].front.some(x=>x?.uid===source.uid));
 const exit=s.zoneMoveEvents.find(x=>x.uid===source.uid&&x.to==='hand');
 assert.ok(exit);
 assert.equal(exit.from,'front');assert.equal(exit.reason,'own-effect');
 assert.equal(exit.sourceUid,source.uid);
 assert.equal(exit.sourceCardId,source.cardId);
 assert.equal(exit.sourceOnField,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
