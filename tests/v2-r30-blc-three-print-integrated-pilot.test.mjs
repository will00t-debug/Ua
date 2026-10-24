import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';

// Source-pinned printed physical IDs. This intentionally models only the
// already-supported clauses of 034: watcher, ENERGY onPlay ACTIVE and COLOR.
// The printed REST+RETIRE+facdown-under MAIN is NOT yet mapped. Thus all
// three entries stay OUTSIDE formal registry and full-card FAQ certification.
const ids=['BLC-2-019','BLC-2-047','BLC-4-034'];
const originals=ids.map(id=>CARDS.find(c=>c.identity===id));
assert.ok(originals.every(Boolean),'all 3 official printed source records must exist');
const [ichigo,zangetsu,riruka]=originals;
const name=ichigo.nameJa;
const when={from:'hand',to:'outside',sourceOnField:true,
 sourceName:name,sourceColor:'blue',reasons:['payment','own-effect']};
const payment={zone:'hand',field:'name',match:'containsAny',values:['斬月','月牙']};
const defs=Array.from({length:13},(_,i)=>({
 id:i===0?ids[0]:i===1?ids[1]:i===2?ids[2]:i===3?'BASE':'U'+i,
 name:i<=2?originals[i].nameJa:i===3?name:'Utility '+i,
 type:i===1?'event':'character',color:'blue',
 energy:i<=2?originals[i].energy:0,ap:1,
 bp:i===0?ichigo.bp:i===2?riruka.bp:i===1?0:3000,
 gen:i===1?0:1,implementation:i<=2?'dsl':'vanilla',
 ...(i===0?{trigger:'raid',raidName:name,
  effects:{onPlay:[{op:'enemyBpDown',bp:1500,minBp:2000,maxTargets:2,optional:true}]},
  mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,payment,then:[
    {op:'draw',count:1},{op:'buffSelf',bp:1000},
    {op:'grantOnAttack',target:'self',optional:true,until:'endOfTurn',
     then:[{op:'draw',count:1}]}
   ]}]}}:{}),
 ...(i===1?{effects:{onPlay:[{op:'draw',count:2}]},
  moveTriggers:[{when,then:[{op:'draw',count:1}]}]}:{}),
 ...(i===2?{trigger:'color',triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500},
  effects:{onPlay:[{op:'activeSelfIf',line:'energy'}]},
  moveObserver:{op:'restSelfTuckMovedFaceDown',when}}:{})
}));
const deck=Object.fromEntries(defs.map((c,i)=>[c.id,i===12?2:4]));
const pack=createUniversalPack({id:'r30-unregistered-blc-three-print-pilot',cards:defs});
const packs=[pack,pack];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],idx=list.findIndex(c=>c.cardId===id);
  if(idx>=0)return list.splice(idx,1)[0];
 }
 throw Error('No physical '+id);
}
function prepared(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:303447});
 const raid=take(s,0,ids[0]),event=take(s,0,ids[1]),
  watcher=take(s,0,ids[2]),base=take(s,0,'BASE');
 s.players[0].hand.push(raid,event);
 base.ready=false;base.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=base;
 // A valid existing ACTIVE 034 ENERGY witness is a setup fixture. This
 // particular test does NOT claim it was freshly AP-paid in the same turn.
 watcher.ready=true;watcher.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=watcher;
 for(const [i,id] of ['U4','U5','U6'].entries()){
  const card=take(s,0,id);card.ready=true;card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i+1]=card;
 }
 for(const [i,id] of ['U7','U8'].entries()){
  const foe=take(s,1,id);foe.ready=true;foe.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[i]=foe;
 }
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,raid,event,watcher,base};
}
test('R30 exact three official print signatures are registered whole prints',()=>{
 assert.deepEqual(originals.map(x=>[x.identity,x.energy,x.ap,x.bp,x.color,x.trigger]),[
  ['BLC-2-019',4,1,4000,'blue','raid'],
  ['BLC-2-047',2,1,0,'blue',null],
  ['BLC-4-034',0,1,1000,'blue','color']
 ]);
 assert.ok(riruka.effect.includes('裏向'));
 assert.ok(riruka.effect.includes('退場'));
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 const bleach=registeredV2TitlePack('bleach');
 assert.equal(bleach.cards['BLC-2-019'].raidName,'黒崎 一護');
 assert.equal(bleach.cards['BLC-2-047'].effects.onPlay[0].count,2);
 assert.equal(bleach.cards['BLC-4-034'].moveObserver.op,'restSelfTuckMovedFaceDown');
});
for(const firstMoved of [false,true])
 test('R30 paid real 019 Raid → full MAIN 047 → true 034 Q2315 witness → attack '+firstMoved,()=>{
  let {s,raid,event,watcher,base}=prepared();
  const paid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
   a.uid===raid.uid&&a.baseUid===base.uid);
  assert.ok(paid,'real energy-4 and one AP paid Raid');
  s=dispatchUniversalAction(packs,s,paid,{actor:0});
  assert.equal(s.players[0].front[0].uid,raid.uid);
  assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
  assert.equal(s.pending?.kind,'effect-target-many');
  const enemies=s.players[1].front.slice(0,2).map(c=>c.uid);
  for(const uid of enemies)
   s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid},{actor:0});
  assert.equal(s.pending,null);
  assert.deepEqual(s.players[1].front.slice(0,2).map(c=>universalBp(packs,s,c)),[1500,1500]);
  const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===raid.uid);
  assert.ok(activate);
  s=dispatchUniversalAction(packs,s,activate,{actor:0});
  assert.equal(s.pending?.kind,'effect-discard-gate');
  const before=s.players[0].deck.length;
  const ap=s.players[0].apCards.filter(c=>c.ready).length;
  s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:event.uid},{actor:0});
  assert.equal(s.pending?.kind,'effect-move-order');
  assert.equal(s.players[0].deck.length,before-1,'complete Ichigo MAIN before earned bonus');
  assert.equal(universalBp(packs,s,s.players[0].front[0]),5000);
  assert.equal(s.continuousStates.filter(c=>c.kind==='grantedOnAttack'&&c.targetUid===raid.uid).length,1);
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
  const choices=legalUniversalActions(packs,s);
  assert.equal(choices.length,2);
  const first=choices.find(a=>a.key.startsWith(firstMoved?'moved-':'observer-'));
  assert.ok(first);
  for(const difficulty of ['normal','hard'])
   assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(
    chooseUniversalAiAction(packs,s,{difficulty}))));
  s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
  s=dispatchUniversalAction(packs,s,first,{actor:0});
  assert.equal(s.pending?.kind,'effect-rest-tuck');
  s=dispatchUniversalAction(packs,s,{type:'chooseRestTuck',mode:'rest'},{actor:0});
  assert.equal(s.pending?.kind,'effect-tuck-moved');
  s=dispatchUniversalAction(packs,s,{type:'chooseTuckMoved',uid:event.uid},{actor:0});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].deck.length,before-2);
  assert.equal(s.players[0].energy[0].uid,watcher.uid);
  assert.equal(s.players[0].energy[0].ready,false);
  assert.equal(s.players[0].energy[0].under[0].uid,event.uid);
  assert.equal(s.players[0].energy[0].under[0].faceDown,true);
  assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),false);
  assert.equal(s.zoneMoveEvents.filter(x=>x.uid===event.uid&&x.from==='hand'&&x.to==='outside'&&x.sourceUid===raid.uid).length,1);
  const visible=universalPublicView(packs,s,0),foe=universalPublicView(packs,s,1);
  assert.equal(visible.players[0].energy[0].underLayers[0].uid,event.uid);
  assert.deepEqual(foe.players[0].energy[0].underLayers,[{faceDown:true}]);
  assert.equal(foe.players[0].hand,null);
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
  assert.equal(s.phase,'attack');
  assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&a.uid===raid.uid));
  const beforeAttack=s.players[0].deck.length;
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:raid.uid},{actor:0});
  assert.equal(s.pending?.kind,'granted-attack-draw');
  assert.equal(s.players[0].deck.length,beforeAttack);
  s=dispatchUniversalAction(packs,s,{type:'chooseGrantedDraw',mode:'draw'},{actor:0});
  assert.equal(s.players[0].deck.length,beforeAttack-1);
  assert.equal(s.pending?.kind,'block');
  assert.equal(assertUniversalMatch(packs,s),true);
 });
test('R30 full 034 MAIN remains unsupported and fail closed; do not publish half-card',()=>{
 const source=defs.find(c=>c.id==='BLC-4-034');
 for(const fake of [{op:'restSelfRetireRecoverFacedownUnder'},
  {op:'restSelfThenRecoverUnder',count:1},
  {op:'recoverFacedownUnder',optional:true}]){
  assert.throws(()=>createUniversalPack({id:'r30-034-main-incomplete',cards:[
   {...source,mainAbility:fake}
  ]}),/unsupported main action ability/i);
 }
});
