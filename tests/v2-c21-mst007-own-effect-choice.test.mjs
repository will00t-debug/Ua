import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// UA54BT/MST-1-007, fetched 2026-10-24.
// Choose one: draw 1 and put 1 own hand card outside, or, only when this
// character entered by your effect, REST or Raid one blue energy<=3 AP1
// hand character named ルーデウス, エリス or ルイジェルド.
// Q2145: choosing that second effect spends it for every card of this printed
// name this turn. The draw effect can still be chosen again.

const mst=registeredV2TitlePack('mushoku-tensei');
const bleach=registeredV2TitlePack('bleach');
function deck(){
 const rest=Object.values(mst.cards).filter(c=>c.color==='blue'&&c.type==='character'&&
  c.maxCopies===4&&!['MST-1-006','MST-1-007'].includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=['MST-1-006','MST-1-007',...rest.slice(0,11)];
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 return counts;
}
const home=deck();
const foreign=(()=>{
 const rest=Object.values(bleach.cards).filter(c=>c.color==='blue'&&c.type==='character'&&
  c.maxCopies===4&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const counts=Object.fromEntries(rest.slice(0,13).map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
})();
const packs=[mst,bleach];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function boot(seed){
 let s=newUniversalMatch(packs,{decks:[home,foreign],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 for(let i=0;i<3;i++){s.players[0].apCards[i].inPlay=true;s.players[0].apCards[i].ready=true;}
 const gen=Object.keys(home).find(id=>id!=='MST-1-007'&&mst.cards[id].gen>0);
 const fuel=take(s,0,gen);fuel.ready=true;fuel.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=fuel;
 if(mst.cards[gen].gen<3){
  const more=take(s,0,gen);more.ready=true;more.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[1]=more;
 }
 return s;
}
function play(s,id){
 const src=take(s,0,id);s.players[0].hand.push(src);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&
  a.line==='front'&&!a.replaceUid);
 assert.ok(action,id);
 return {s:dispatchUniversalAction(packs,s,action),src};
}

test('a paid MST-1-007 can draw and discard, and cannot choose the entry mode',()=>{
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-007'));
 const card=mst.cards['MST-1-007'];
 assert.equal(card.effects.onPlay[0].options[1].entry,'ownEffect');
 assert.equal(card.effects.onPlay[0].options[1].then[0].op,'oncePerTurnGate');
 let s=boot(4007);
 ({s}=play(s,'MST-1-007'));
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['draw']);
 const deck=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,hand+1);
 const paid=s.players[0].hand[0];
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:paid.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===paid.uid),true);
 assert.deepEqual(s.onceEffectUses[0],[]);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('own-effect entry offers the named deploy once per Eris name, then only the draw',()=>{
 let s=boot(4008);
 const ally=take(s,0,'MST-1-007');s.players[0].hand.push(ally);
 const second=take(s,0,'MST-1-007');s.players[0].hand.push(second);
 ({s}=play(s,'MST-1-006'));
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 assert.ok(s.pending.choices.includes(ally.uid));
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.uid===ally.uid&&a.mode==='enter'&&a.line==='energy'&&!a.replaceUid));
 assert.equal(s.players[0].energy.some(c=>c?.uid===ally.uid&&c.ready===false),true);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id).sort(),['deploy','draw']);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'deploy'});
 assert.deepEqual(s.onceEffectUses[0],['name:エリス']);
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 assert.ok(s.pending.choices.includes(second.uid));
 const deck=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.uid===second.uid&&a.mode==='enter'&&a.line==='energy'&&!a.replaceUid));
 assert.equal(s.players[0].energy.some(c=>c?.uid===second.uid&&c.ready===false),true);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['draw']);
 assert.deepEqual(s.onceEffectUses[0],['name:エリス']);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deck-1);
 const dumped=s.players[0].hand[0];
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(s.pending,null);
 assert.deepEqual(s.onceEffectUses[0],['name:エリス']);
 assert.equal(assertUniversalMatch(packs,s),true);
});
