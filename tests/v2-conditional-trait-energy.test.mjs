import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalEnergy,universalCardEnergy,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {ownFieldTraitKinds,matchesOwnDistinctTraits} from '../dist/universal-v2/field-conditions.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Synthetic QA ONLY: no unsupported real card is registered by this test.
// Authoritative aliases/composite traits must be normalized in source-proofed
// title adapters, never guessed by the generic distinct-trait predicate.
const cond=(opts={})=>({zone:'field',subject:'character',minimumDistinctTraits:3,
 extraEnergy:1,excludeSelf:true,requiresActive:false,...opts});
const specs=Array.from({length:13},(_,i)=>({
 id:'C'+i,name:'Synthetic '+i,color:i===12?'red':'green',
 energy:i===11?3:0,ap:1,bp:i===8?0:1500,gen:1,
 type:i===8?'field':'character',
 traits:[
  ['Self'],['Guild'],['Guild'],['Machine'],['Sky'],
  ['Guild','Machine'],['Ocean／Sky'],[],['FieldOnly'],['Ocean'],
  ['OnFront'],['Solo'],['Active']
 ][i],
 implementation:[0,10,11,12].includes(i)?'dsl':'vanilla',
 ...i===0?{conditionalTraitEnergy:cond()}:{},
 ...i===10?{conditionalTraitEnergy:cond({zone:'front',minimumDistinctTraits:2,
  extraEnergy:2,requiresActive:true})}:{},
 ...i===11?{conditionalTraitEnergy:cond({zone:'energy',subject:'card',
  minimumDistinctTraits:2,excludeSelf:false})}:{},
 ...i===12?{activeExtraEnergy:1}:{}
}));
const left=createUniversalPack({id:'conditional-qa-left',cards:specs});
const right=createUniversalPack({id:'conditional-qa-right',cards:specs.map(c=>({...c}))});
const packs=[left,right],deck=Object.fromEntries(specs.map((x,i)=>[x.id,i===12?2:4]));
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],seed:92903,first:0});
function pull(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const slot=s.players[p][zone],i=slot.findIndex(c=>c.cardId===id);
  if(i>=0)return slot.splice(i,1)[0];
 }
 throw Error('Synthetic physical fixture absent: '+id);
}
function put(s,p,id,line,slot,{ready=true}={}){
 const physical=pull(s,p,id);
 physical.ready=ready;
 assert.equal(s.players[p][line][slot],null,'fixture cannot overwrite physical card');
 s.players[p][line][slot]=physical;return physical;
}
const color=s=>universalEnergyByColor(packs,s,0).green||0;
function stageMain(s){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
test('strict passive schema: required zone, subject, N, X, self-exclusion, ACTIVE and known keys',()=>{
 assert.deepEqual(validateUniversalDeck(left,deck),[]);
 assert.deepEqual(left.cards.C0.conditionalTraitEnergy,cond());
 assert.equal(left.cards.C0.gen,1,'never change printed energy');
 assert.ok(Object.isFrozen(left.cards.C0.conditionalTraitEnergy));
 const base=specs[0];
 for(const bad of [
  {zone:'hand'},{zone:'field',subject:'unknown'},
  {minimumDistinctTraits:0},{minimumDistinctTraits:9},{minimumDistinctTraits:1.5},
  {extraEnergy:0},{extraEnergy:4},{excludeSelf:'yes'},{requiresActive:1},
  {other:'unexpected'}
 ]){
  assert.throws(()=>createUniversalPack({id:'invalid',cards:[{...base,
   conditionalTraitEnergy:cond(bad)}]}),/invalid conditional trait energy profile/,JSON.stringify(bad));
 }
 for(const missing of ['zone','subject','minimumDistinctTraits','extraEnergy','excludeSelf','requiresActive']){
  const broken=cond();delete broken[missing];
  assert.throws(()=>createUniversalPack({id:'missing',cards:[{...base,
   conditionalTraitEnergy:broken}]}),/invalid conditional trait energy profile/,missing);
 }
 assert.throws(()=>createUniversalPack({id:'bad-event',cards:[{...base,type:'event',bp:0,gen:0}]}),
  /invalid conditional trait energy profile/);
 assert.throws(()=>createUniversalPack({id:'bad-vanilla',cards:[{...base,implementation:'vanilla'}]}),
  /claims vanilla/);
});
test('distinct traits: three different actual kinds, not three cards; dynamically updates both color and total',()=>{
 const s=fresh(),base=put(s,0,'C0','energy',0,{ready:false});
 assert.equal(color(s),1);
 put(s,0,'C1','front',0);put(s,0,'C2','front',1);
 assert.equal(color(s),1,'duplicate Guild only one KIND');
 put(s,0,'C3','energy',1);
 assert.equal(color(s),2,'base C0 + C3; Guild/Machine only two kinds');
 const third=put(s,0,'C4','front',2);
 assert.equal(ownFieldTraitKinds(s,0,base.uid,cond(),x=>left.cards[x.cardId]).size,3);
 assert.equal(color(s),3,'C0 gains exactly +1 and existing C3 produces base 1');
 assert.equal(universalEnergy(packs,s,0),3);
 const v=universalPublicView(packs,s,1);
 assert.deepEqual(v.players[0].energy.map(c=>c&&[c.baseProduces,c.produces]),[[1,2],[1,1],null,null]);
 assert.equal(v.players[0].energyTotal,3);
 assert.equal(v.players[0].energyByColor.green,3);
 assert.equal(left.cards.C0.gen,1);
 third.ready=false;assert.equal(color(s),3,'unconditional profile does not depend on counted card READY');
 s.players[0].front[2]=null;s.players[0].outside.push(third);
 assert.equal(color(s),2,'retirement retracts bonus automatically, never caches it');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('trait scope never counts hand, outside, enemy field, Raid under cards or unverified slash components',()=>{
 const s=fresh(),source=put(s,0,'C0','energy',0);
 put(s,0,'C1','front',0);put(s,0,'C3','energy',1);
 let third=pull(s,0,'C4');s.players[0].hand.push(third);
 put(s,1,'C4','front',0);
 assert.equal(color(s),2,'opponent, own hand not a third trait');
 third=s.players[0].hand.splice(s.players[0].hand.findIndex(x=>x.uid===third.uid),1)[0];
 s.players[0].outside.push(third);
 assert.equal(color(s),2,'outside not a third trait');
 const layered=pull(s,0,'C4');
 s.players[0].front[0].stack.push(layered);
 assert.equal(color(s),2,'Raid lower physical layers must not count as field positions');
 const composite=put(s,0,'C6','front',1);
 assert.equal(ownFieldTraitKinds(s,0,source.uid,cond(),x=>left.cards[x.cardId]).size,3,
  'Guild, Machine, entire unverified Ocean／Sky string = exactly 3');
 assert.equal(color(s),3);
 assert.ok(!ownFieldTraitKinds(s,0,source.uid,cond(),x=>left.cards[x.cardId]).has('Sky'),
  'never split slash composition without title-source validation');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.ok(composite.uid);
});
test('verified multi-trait tokens are separately counted; self inclusion and traitless omitted',()=>{
 const s=fresh(),source=put(s,0,'C0','energy',0);
 put(s,0,'C5','front',0);const empty=put(s,0,'C7','front',1);
 assert.equal(color(s),1,'verified Guild + Machine = only 2, traitless = none');
 put(s,0,'C4','energy',1);
 assert.equal(color(s),3,'adding Sky reaches 3, base energy lines produce two');
 assert.ok(matchesOwnDistinctTraits(s,0,source.uid,cond(),x=>left.cards[x.cardId]));
 s.players[0].front[1]=null;s.players[0].outside.push(empty);
 assert.equal(color(s),3,'removing traitless cannot change threshold');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('explicit FRONT-only, ENERGY-only, include self and ACTIVE gate can differ without stale buffs',()=>{
 const s=fresh();
 const a=put(s,0,'C10','energy',0); // FRONT only, requires ACTIVE
 put(s,0,'C1','energy',1);put(s,0,'C3','energy',2);
 assert.equal(universalCardEnergy(packs,s,0,a),1,'front scope ignores energy types');
 put(s,0,'C4','front',0);put(s,0,'C1','front',1);
 assert.equal(universalCardEnergy(packs,s,0,a),3,'two FRONT kinds trigger +2');
 a.ready=false;assert.equal(universalCardEnergy(packs,s,0,a),1,'REST source drops only gated bonus');
 a.ready=true;assert.equal(universalCardEnergy(packs,s,0,a),3);
 s.players[0].energy[0]=null;s.players[0].front[2]=a;
 assert.equal(universalCardEnergy(packs,s,0,a),0,'front role never generates energy just because condition passes');
 const b=put(s,0,'C11','energy',0);
 assert.equal(universalCardEnergy(packs,s,0,b),2,'ENERGY card C11 Solo + own ENERGY Guild = 2; self included');
 for(const i of [1,2]){
  const removed=s.players[0].energy[i];
  s.players[0].energy[i]=null;
  s.players[0].outside.push(removed);
 }
 assert.equal(universalCardEnergy(packs,s,0,b),1,'no other ENERGY trait: self alone below N=2');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('each color stays isolated; ACTIVE +1 and conditional energy both display current, not printed',()=>{
 const s=fresh(),source=put(s,0,'C0','energy',0);
 put(s,0,'C1','front',0);put(s,0,'C3','front',1);put(s,0,'C4','front',2);
 const active=put(s,0,'C12','energy',1);
 assert.equal(universalCardEnergy(packs,s,0,source),2);
 assert.equal(universalCardEnergy(packs,s,0,active),2);
 assert.deepEqual({...universalEnergyByColor(packs,s,0)},{green:2,red:2});
 let v=universalPublicView(packs,s,0);
 assert.equal(v.players[0].energy[1].baseProduces,1);assert.equal(v.players[0].energy[1].produces,2);
 active.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,active),1);
 v=universalPublicView(packs,s,1);
 assert.equal(v.players[0].energy[1].produces,1);
 assert.equal(v.players[0].energyTotal,3);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('pre-play legal energy never includes own conditional onPlay bonus; AI action always exactly legal',()=>{
 let s=fresh();
 put(s,0,'C1','energy',0);put(s,0,'C3','energy',1);
 const candidate=pull(s,0,'C11');s.players[0].hand.push(candidate);
 s=stageMain(s);
 assert.equal(universalEnergy(packs,s,0),2);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===candidate.uid),
  'printed energy=3 C11 cannot borrow its OWN entering-field bonus');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'play',uid:candidate.uid,line:'energy',slot:2}),
  /not currently legal/);
 const third=pull(s,0,'C4');s.players[0].energy[2]=third;
 const before=universalEnergy(packs,s,0);
 assert.equal(before,3);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===candidate.uid&&a.line==='energy'));
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(ai)));
 assert.equal(assertUniversalMatch(packs,s),true);
});
