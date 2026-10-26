import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

// UA51BT/SLG-1-063 and SLG-1-054. Official pages were not re-read this batch.
// The registered trait token is 第四次架南島レイド, not the catalogue Raid label.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-063','SLG-1-054','SLG-1-056','SLG-1-015','SLG-1-050','SLG-1-070',
 'SLG-1-045','SLG-1-062','SLG-1-069','SLG-1-065','SLG-1-072','SLG-1-017'];
const filler=Object.values(slg.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
 !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
const ids=[...required,filler[0]];
const counts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
assert.deepEqual(validateUniversalDeck(slg,counts),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing card: '+id);
}
function main(s){
 for(let i=0;i<6&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function order(s){
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
test('063 adds one raid-trait card from the top three, bottoms the rest, then discards',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8063,first:0});
 const actor=take(s,0,'SLG-1-063');s.players[0].hand.push(actor);
 const fuel=take(s,0,'SLG-1-070');fuel.ready=true;s.players[0].energy[0]=fuel;
 const hit=take(s,0,'SLG-1-056'),miss=take(s,0,'SLG-1-015'),miss2=take(s,0,'SLG-1-050');
 s.players[0].deck.unshift(miss,hit,miss2);
 s=main(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 let next=dispatchUniversalAction(packs,s,play);
 assert.equal(next.pending.kind,'effect-top-filter-choice');
 const choices=legalUniversalActions(packs,next);
 assert.deepEqual(choices.filter(a=>a.uid).map(a=>a.uid),[hit.uid]);
 next=dispatchUniversalAction(packs,next,choices.find(a=>a.uid===hit.uid));
 assert.equal(next.pending.kind,'effect-top-order');
 assert.equal(next.pending.rest,'bottom');
 assert.equal(next.pending.discardAfter,true);
 next=order(next);
 assert.equal(next.pending.kind,'effect-discard');
 const discard=next.players[0].hand.find(c=>c.uid!==hit.uid);
 const handBefore=next.players[0].hand.length;
 next=dispatchUniversalAction(packs,next,{type:'chooseDiscard',uid:discard.uid});
 assert.equal(next.pending,null);
 assert.ok(next.players[0].hand.some(c=>c.uid===hit.uid));
 assert.equal(next.players[0].hand.length,handBefore-1);
 assert.ok(next.players[0].outside.some(c=>c.uid===discard.uid));
 assert.deepEqual(next.players[0].deck.slice(-2).map(c=>c.uid),[miss.uid,miss2.uid]);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('063 does not discard when the top window is declined',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8064,first:0});
 const actor=take(s,0,'SLG-1-063');s.players[0].hand.push(actor);
 const fuel=take(s,0,'SLG-1-070');fuel.ready=true;s.players[0].energy[0]=fuel;
 const hit=take(s,0,'SLG-1-056'),miss=take(s,0,'SLG-1-015'),miss2=take(s,0,'SLG-1-050');
 s.players[0].deck.unshift(miss,hit,miss2);
 s=main(s);
 const outside=s.players[0].outside.length,hand=s.players[0].hand.length;
 let next=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===actor.uid));
 next=dispatchUniversalAction(packs,next,{type:'chooseTopFiltered',uid:null});
 next=order(next);
 assert.equal(next.pending,null);
 assert.equal(next.players[0].outside.length,outside);
 assert.equal(next.players[0].hand.length,hand-1);
 assert.deepEqual(next.players[0].deck.slice(-3).map(c=>c.uid),[miss.uid,hit.uid,miss2.uid]);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('054 may send one top raid-trait card outside and returns the other to the top',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:8054,first:0});
 const actor=take(s,0,'SLG-1-054');s.players[0].hand.push(actor);
 const hit=take(s,0,'SLG-1-062'),miss=take(s,0,'SLG-1-015');
 s.players[0].deck.unshift(miss,hit);
 s=main(s);
 let next=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===actor.uid&&a.line==='energy'));
 assert.equal(next.pending.kind,'effect-top-trait-outside');
 assert.deepEqual(legalUniversalActions(packs,next).filter(a=>a.uid).map(a=>a.uid),[hit.uid]);
 next=dispatchUniversalAction(packs,next,{type:'chooseTopTraitOutside',uid:hit.uid});
 assert.equal(next.pending.kind,'effect-top-order');
 assert.equal(next.pending.rest,'top');
 next=order(next);
 assert.equal(next.pending,null);
 assert.equal(next.players[0].deck[0].uid,miss.uid);
 assert.ok(next.players[0].outside.some(c=>c.uid===hit.uid));
 assert.equal(assertUniversalMatch(packs,next),true);
});
