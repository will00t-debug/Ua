import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const cards=Array.from({length:13},(_,i)=>({id:'HD'+i,name:'HD'+i,
 color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla'}));
const packs=[createUniversalPack({id:'hidden-a',cards}),createUniversalPack({id:'hidden-b',cards})];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function setup(owner,zone){
 const s=newUniversalMatch(packs,{decks:[deck,deck],seed:2615,first:0}),p=s.players[owner];
 const take=()=>p.deck.splice(0,1)[0],root=take(),hidden=take(),publicCard=take();
 hidden.faceDown=true;publicCard.faceDown=false;root.fieldEntryStamp=s.nextFieldEntryStamp++;
 root.under=[hidden,publicCard];p[zone][2]=root;
 assert.equal(assertUniversalMatch(packs,s),true);return {s,root,hidden,publicCard};
}
for(const owner of [0,1])for(const zone of ['front','energy'])
 test('Q2316 root underLayers are visible to own owner, protected from opponent '+owner+' '+zone,()=>{
  const {s,root,hidden,publicCard}=setup(owner,zone);
  const own=universalPublicView(packs,s,owner);
  const foe=universalPublicView(packs,s,1-owner);
  assert.equal(own.players[owner][zone][2].uid,root.uid);
  assert.deepEqual(own.players[owner][zone][2].underLayers.map(x=>x.cardId),
   [hidden.cardId,publicCard.cardId]);
  const opponent=foe.players[owner][zone][2].underLayers;
  assert.deepEqual(opponent[0],{faceDown:true});
  assert.equal(JSON.stringify(opponent).includes(hidden.uid),false);
  assert.equal(JSON.stringify(opponent).includes(hidden.cardId),false);
  assert.equal(opponent[1].uid,publicCard.uid);
  assert.equal(foe.players[owner].hand,null);
  const restored=JSON.parse(JSON.stringify(s));
  assert.deepEqual(universalPublicView(packs,restored,owner),own);
  assert.equal(assertUniversalMatch(packs,restored),true);
 });
