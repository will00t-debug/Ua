import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'K'+String(i).padStart(2,'0'));
const counts=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));counts.K12=2;
const make=title=>createUniversalPack({id:title,cards:ids.map((id,i)=>({
 id,name:i===1?'Group Ability':i===2?'Own Ability':'Unit '+i,
 type:'character',color:'red',energy:i===0?0:1,ap:1,bp:2000,gen:i===0?4:1,
 implementation:[1,2].includes(i)?'dsl':'vanilla',
 ...([1,2].includes(i)?{templateEffects:{onPlay:[{template:'oncePerTurnThen',
 scope:i===1?'name':'card',optional:i===1,then:[{template:'draw',count:1}]}]}}:{})
}))});
const packs=[make('independent-a'),make('independent-b')];
const extract=(s,p,id)=>{
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing fixture physical card '+id);
};
function prepared(){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1004,first:0});
 const generator=extract(s,0,'K00');s.players[0].energy[0]=generator;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const p=s.players[0];
 p.apCards.forEach(c=>{c.inPlay=true;c.ready=true;});
 // Reserve DISTINCT physical UIDs: a generic hand-first take+push helper
 // can repeatedly "preload" the same single hand card; count by identity.
 for(const [id,required] of [['K01',3],['K02',2]]){
  while(p.hand.filter(c=>c.cardId===id).length<required){
   const zone=['deck','life','outside'].find(z=>p[z].some(c=>c.cardId===id));
   if(!zone)throw Error('No unreserved physical copy '+id);
   const at=p[zone].findIndex(c=>c.cardId===id);
   p.hand.push(p[zone].splice(at,1)[0]);
  }
  assert.equal(new Set(p.hand.filter(c=>c.cardId===id).map(c=>c.uid)).size,
   p.hand.filter(c=>c.cardId===id).length);
 }
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(packs,s),true);
 return s;
}
function playFromPreparedHand(s,id,slot){
 const source=s.players[0].hand.find(c=>c.cardId===id);
 assert.ok(source,'Fixture prepared own hand contains '+id);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===slot);
 assert.ok(action,'Legal play from PRELOADED hand exists');
 const before=structuredClone(s);
 const after=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.deepEqual(s,before,'Reducer did not mutate action input');
 assert.equal(assertUniversalMatch(packs,after),true);
 return after;
}
test('[V2-E] optional same-name gate: skip does not consume, accept does, third copy gets no extra draw',()=>{
 let s=prepared(),deck=s.players[0].deck.length;
 s=playFromPreparedHand(s,'K01',0);
 assert.equal(s.pending?.kind,'effect-once-choice');
 assert.equal(s.players[0].deck.length,deck,'placing prepared card is not a deck draw');
 const prior=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'invalid'},{actor:0}),/not currently legal/);
 assert.deepEqual(s,prior,'Illegal mode cannot change UID or AP');
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'skip'},{actor:0});
 assert.equal(s.players[0].deck.length,deck);
 assert.deepEqual(s.onceEffectUses[0],[]);
 s=playFromPreparedHand(s,'K01',1);
 assert.equal(s.pending?.kind,'effect-once-choice');
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'activate'},{actor:0});
 assert.equal(s.players[0].deck.length,deck-1);
 assert.deepEqual(s.onceEffectUses[0],['name:Group Ability']);
 s=playFromPreparedHand(s,'K01',2);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.deepEqual(s.onceEffectUses[0],['name:Group Ability']);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('[V2-E] two independent physical UID-gated abilities each draw once; no hidden fixture deck removal',()=>{
 let s=prepared(),deck=s.players[0].deck.length;
 const uid0=s.players[0].hand.find(c=>c.cardId==='K02').uid;
 s=playFromPreparedHand(s,'K02',0);
 assert.equal(s.players[0].deck.length,deck-1);
 const uid1=s.players[0].hand.find(c=>c.cardId==='K02').uid;
 assert.notEqual(uid0,uid1);
 s=playFromPreparedHand(s,'K02',1);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.deepEqual(new Set(s.onceEffectUses[0]),new Set(['uid:'+uid0,'uid:'+uid1]));
 assert.equal(s.onceEffectUses[0].length,2);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('[V2-E] original helper artificially consumes from deck when it ignores preloaded copies',()=>{
 let s=prepared();const deck=s.players[0].deck.length;
 const inHand=s.players[0].hand.filter(c=>c.cardId==='K01').map(c=>c.uid);
 const source=s.players[0].deck;
 const idx=source.findIndex(c=>c.cardId==='K01');
 assert.ok(idx>=0,'At least one extra physical K01 remains in deck');
 const fromDeck=source.splice(idx,1)[0];
 assert.ok(!inHand.includes(fromDeck.uid),'source was taken from DECK, not preloaded hand');
 s.players[0].hand.push(fromDeck);
 assert.equal(s.players[0].deck.length,deck-1,'fixture setup alone changes deck length');
 const act=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===fromDeck.uid&&a.line==='front'&&a.slot===0);
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending?.kind,'effect-once-choice');
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'skip'});
 assert.equal(s.players[0].deck.length,deck-1,'optional effect skipped: no actual draw');
 assert.deepEqual(s.onceEffectUses[0],[]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
