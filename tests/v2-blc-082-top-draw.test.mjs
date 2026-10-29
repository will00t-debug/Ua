import test from 'node:test';
import assert from 'node:assert/strict';
import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalPrivateChoices,universalPublicView
} from '../dist/universal-v2/engine.mjs';

// The real 50-card purple V2 pilot deck, swapping one vanilla four-of for Ichigo.
const pack=registeredV2TitlePack('bleach'),packs=[pack,pack];
const deck={...BLEACH_PURPLE_V2_PILOT_COUNTS,'BLC-4-082':4};
delete deck['BLC-1-036'];

function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[0][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing physical card '+id);
}
function setup(seed){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
 const source=take(s,'BLC-4-082');
 s.players[0].hand.push(source);
 for(let i=0;i<3;i++){
  const maker=take(s,'BLC-1-039');
  maker.ready=true;
  maker.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=maker;
 }
 for(let i=0;i<3&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 // The first player's opening turn has restricted AP. Open one legal AP slot
 // explicitly, as in the existing printed-card V2 integration tests.
 for(let i=0;i<3;i++){
  s.players[0].apCards[i].inPlay=i<1;
  s.players[0].apCards[i].ready=i<1;
 }
 // Force a known low-energy card followed by a >=3-energy card on top.
 const low=take(s,'BLC-1-040'),high=take(s,'BLC-4-082');
 assert.ok(pack.cards[low.cardId].energy<3);
 assert.ok(pack.cards[high.cardId].energy>=3);
 s.players[0].deck.unshift(low,high);
 assert.equal(assertUniversalMatch(packs,s),true);
 const originalDeck=s.players[0].deck.map(c=>c.uid);
 const action=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'the printed purple 3/AP1 character must be playable');
 const pending=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(pending.pending?.kind,'effect-top-inspect-many');
 assert.deepEqual(pending.pending.uids,[low.uid,high.uid]);
 assert.equal(universalPrivateChoices(packs,pending,1),null);
 assert.ok(!JSON.stringify(universalPublicView(packs,pending,1)).includes(low.uid));
 assert.ok(!JSON.stringify(universalPublicView(packs,pending,1)).includes(high.uid));
 return {pending,low,high,originalDeck,source};
}
const move=(s,a)=>dispatchUniversalAction(packs,s,a,{actor:0});

test('UA01DC/BLC-4-082: qualifying outside card draws the exact card returned to TOP',()=>{
 const {pending,low,high,originalDeck}=setup(408201);
 const handSize=pending.players[0].hand.length;
 let s=move(pending,{type:'chooseInspectedOutside',uid:high.uid});
 s=move(s,{type:'chooseInspectedOutside',uid:null});
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending?.thenDraw,true);
 s=move(s,{type:'chooseTopOrder',uid:low.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handSize+1);
 assert.equal(s.players[0].hand.at(-1).uid,low.uid,
  'draw MUST take the returned top card, not the previously unseen card');
 assert.equal(s.players[0].deck[0].uid,originalDeck[2]);
 assert.ok(s.players[0].outside.some(c=>c.uid===high.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('UA01DC/BLC-4-082: sending only a low-energy card outside does NOT draw',()=>{
 const {pending,low,high,originalDeck}=setup(408202);
 const handSize=pending.players[0].hand.length;
 let s=move(pending,{type:'chooseInspectedOutside',uid:low.uid});
 s=move(s,{type:'chooseInspectedOutside',uid:null});
 assert.equal(s.pending?.thenDraw,undefined);
 s=move(s,{type:'chooseTopOrder',uid:high.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handSize);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[high.uid,originalDeck[2]]);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('UA01DC/BLC-4-082: sending both outside draws from the next unseen deck card',()=>{
 const {pending,low,high,originalDeck}=setup(408203);
 const handSize=pending.players[0].hand.length;
 let s=move(pending,{type:'chooseInspectedOutside',uid:high.uid});
 s=move(s,{type:'chooseInspectedOutside',uid:low.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handSize+1);
 assert.equal(s.players[0].hand.at(-1).uid,originalDeck[2]);
 assert.equal(s.players[0].deck[0].uid,originalDeck[3]);
 assert.ok(s.players[0].outside.some(c=>c.uid===high.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===low.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('UA01DC/BLC-4-082: returning both to TOP without sending outside never draws',()=>{
 const {pending,low,high,originalDeck}=setup(408204);
 const handSize=pending.players[0].hand.length;
 let s=move(pending,{type:'chooseInspectedOutside',uid:null});
 s=move(s,{type:'chooseTopOrder',uid:high.uid});
 s=move(s,{type:'chooseTopOrder',uid:low.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handSize);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),
  [high.uid,low.uid,originalDeck[2]]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
