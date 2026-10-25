import test from 'node:test';
import assert from 'node:assert/strict';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {grantContinuousState,originalEffectsDisabled} from '../dist/universal-v2/continuous-states.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalCardEnergy,universalPublicView,universalPrivateChoices,
 universalBp,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS,EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// C26: ten BLEACH prints whose whole text is covered by tested primitives.
// Official pages checked 2026-10-25. Life-trigger icons are not in the stored
// effect string. BLC-2-006 COLOR is rest + skip the next ACTIVE, not a deploy.
// 自分のキャラの効果 is a character source, not every own effect.
// This is not per-card FAQ acceptance.

const IDS=['BLC-1-080','BLC-1-032','BLC-4-046','BLC-3-004','BLC-1-091',
 'BLC-3-007','BLC-4-001','BLC-3-002','BLC-2-005','BLC-2-006'];
const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
const ALIAS='山本 元柳斎 重國';
function deck(){
 const ids=[...IDS,'BLC-1-001','BLC-1-002','BLC-1-041','BLC-4-027','BLC-2-003',
  'BLC-2-004','BLC-2-029','BLC-1-047'];
 const counts=Object.fromEntries(ids.map(id=>[id,2]));
 let total=ids.length*2;
 for(const id of ids){
  if(total>=50)break;
  counts[id]+=2;total+=2;
 }
 if(counts['BLC-1-001']<4){
  const need=4-counts['BLC-1-001'];
  counts['BLC-1-080']-=need;
  counts['BLC-1-001']=4;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','outside','removed']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 const i=pl.life.findIndex(c=>c.cardId===id);
 if(i<0)throw Error('Missing '+id);
 const card=pl.life[i];
 const replacement=pl.deck.pop();
 if(!replacement)throw Error('No deck card to keep life full');
 pl.life[i]=replacement;
 return card;
}
function occupy(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function setTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function toMain(s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function fresh(){
 return toMain(newUniversalMatch(packs,{decks:[counts,counts],seed:2601,first:0}));
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1+(c.stack||[]).length+(c.under||[]).length;
 return n;
}
function aiOk(s,use=packs){
 const legal=legalUniversalActions(use,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(use,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function play(s,uid,line){
 const action=legalUniversalActions(packs,s).find(a=>
  (a.type==='play'||a.type==='event')&&a.uid===uid&&(line===undefined||a.line===line)&&
  a.replaceUid===undefined);
 assert.ok(action,'legal play '+uid);
 return dispatchUniversalAction(packs,s,action);
}
function at(s,p,uid){
 return s.players[p].front.find(c=>c?.uid===uid)||s.players[p].energy.find(c=>c?.uid===uid);
}
function silence(s,uid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,
  targetUid:uid,until:{player:0,phase:'attack',edge:'end'},sourceLinked:false});
}
function orderBottom(s){
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}

test('C26 registers the ten whole prints on the independent manifest',()=>{
 assert.equal(EXPECTED_V2_COUNTS.bleach,180);
 assert.equal(EXPECTED_V2_TOTAL,432);
 assert.equal(Object.keys(bleach.cards).length,180);
 for(const id of IDS){
  const entry=contribution.entries.find(x=>x.id===id);
  assert.ok(entry,id);
  assert.equal(entry.definition.id,id);
  assert.equal(entry.evidence.printedTextFragments[0],entry.sourceRecord.effect);
  assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
  assert.equal(bleach.cards[id].name,entry.sourceRecord.nameJa);
 }
 const ken=bleach.cards['BLC-1-080'];
 assert.equal(ken.bpDownImmune,true);
 assert.equal(ken.ownTurnBp,1000);
 assert.equal(ken.bp,4000);
 const orihime=bleach.cards['BLC-4-046'];
 assert.equal(orihime.effects.onPlay[0].color,'purple');
 assert.equal(orihime.effects.onPlay[0].filter.value,'黒崎 一護');
 const rukia=bleach.cards['BLC-3-002'];
 assert.equal(rukia.effects.onPlay[0].filters.length,4);
 assert.deepEqual(bleach.cards['BLC-2-005'].traits,['護廷十三隊／殭屍']);
 assert.deepEqual(bleach.cards['BLC-2-006'].traits,['星十字騎士團／殭屍']);
 assert.equal(bleach.cards['BLC-2-006'].triggerEffect.op,'restOppFrontSkipNextActive');
 assert.deepEqual(bleach.cards['BLC-1-091'].nameAliases,[ALIAS]);
 assert.equal(bleach.cards['BLC-4-001'].nameAliases[0],'バズビー');
});

test('BLC-1-080 adds 1000 BP on its own turn and ignores BP reduction',()=>{
 let s=fresh();
 const self=occupy(s,0,'BLC-1-080','front',0);
 const foe=occupy(s,1,'BLC-1-080','front',0);
 assert.equal(universalBp(packs,s,self),5000);
 s.active=1;
 assert.equal(universalBp(packs,s,self),4000);
 s.active=0;
 self.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,self),5000);
 occupy(s,0,'BLC-1-001','energy',0);
 const event=toHand(s,0,'BLC-1-032');
 s=play(s,event.uid);
 assert.equal(s.pending.kind,'effect-choice-mode');
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'down'});
 assert.equal(s.pending.kind,'effect-target');
 assert.ok(s.pending.choices.includes(foe.uid));
 const before=universalBp(packs,s,at(s,1,foe.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:foe.uid});
 assert.equal(universalBp(packs,s,at(s,1,foe.uid)),before);
 let down=fresh();
 occupy(down,0,'BLC-1-001','energy',0);
 const plain=occupy(down,1,'BLC-1-001','front',0);
 const again=toHand(down,0,'BLC-1-032');
 down=play(down,again.uid);
 down=dispatchUniversalAction(packs,down,{type:'chooseEffectMode',mode:'down'});
 down=dispatchUniversalAction(packs,down,{type:'chooseTarget',uid:plain.uid});
 assert.equal(universalBp(packs,down,at(down,1,plain.uid)),1000);
 silence(s,self.uid);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),3000);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-1-032 must choose a mode and may skip the target',()=>{
 let s=fresh();
 occupy(s,0,'BLC-1-001','energy',0);
 const ally=occupy(s,0,'BLC-1-002','front',0);
 const event=toHand(s,0,'BLC-1-032');
 s=play(s,event.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='skip'),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'buff'});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.ok(s.pending.optional);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,s,ally),2000);
 assert.equal(s.pending,null);
 assert.throws(()=>dispatchUniversalAction(packs,fresh(),{type:'chooseOwnBuff',uid:'0-999'}));
});

test('BLC-4-046 buffs one purple Ichigo and not a blue one',()=>{
 let s=fresh();
 const purple=occupy(s,0,'BLC-1-041','energy',0);
 const blue=occupy(s,0,'BLC-4-027','front',0);
 const card=toHand(s,0,'BLC-4-046');
 s=play(s,card.uid,'front');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[purple.uid]);
 assert.equal(s.pending.color,'purple');
 const view=JSON.stringify(universalPublicView(packs,s,1));
 assert.equal(view.includes(purple.uid),true);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:purple.uid});
 assert.equal(universalBp(packs,s,at(s,0,purple.uid)),5500);
 assert.equal(universalBp(packs,s,at(s,0,blue.uid)),2500);
 assert.throws(()=>dispatchUniversalAction(packs,(()=>{
  let t=fresh();
  occupy(t,0,'BLC-1-041','front',0);
  const c=toHand(t,0,'BLC-4-046');
  t=play(t,c.uid,'front');
  return t;
 })(),{type:'chooseOwnBuff',uid:blue.uid}));
});

test('BLC-3-004 rests another active front and generates purple only on energy',()=>{
 let s=fresh();
 const source=occupy(s,0,'BLC-3-004','energy',0);
 const ally=occupy(s,0,'BLC-1-002','front',0);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.mode==='restFrontGainEnergy'));
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'restFrontGainEnergy'});
 assert.equal(at(s,0,source.uid).ready,false);
 s=dispatchUniversalAction(packs,s,{type:'chooseRestFrontEnergy',uid:ally.uid});
 assert.equal(at(s,0,ally.uid).ready,false);
 assert.equal(universalCardEnergy(packs,s,0,at(s,0,source.uid)),2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 at(s,0,ally.uid).ready=true;at(s,0,source.uid).ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.mode==='restFrontGainEnergy'),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'restFrontGainEnergy'}));

 let front=fresh();
 const onFront=occupy(front,0,'BLC-3-004','front',0);
 const other=occupy(front,0,'BLC-1-002','front',1);
 front=dispatchUniversalAction(packs,front,{type:'activate',uid:onFront.uid,mode:'restFrontGainEnergy'});
 front=dispatchUniversalAction(packs,front,{type:'chooseRestFrontEnergy',uid:other.uid});
 assert.equal(at(front,0,other.uid).ready,false);
 assert.equal(universalCardEnergy(packs,front,0,at(front,0,onFront.uid)),0);
 assert.equal(universalEnergyByColor(packs,front,0).purple||0,0);
 let alone=fresh();
 occupy(alone,0,'BLC-3-004','front',0,true);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.mode==='restFrontGainEnergy'),false);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-1-091 is the long Yamamoto name only while its front has no other character',()=>{
 let s=fresh();
 const card=occupy(s,0,'BLC-1-091','front',0);
 assert.equal(cardHasName(bleach.cards['BLC-1-091'],ALIAS),true);
 assert.equal(universalBp(packs,s,card),3000);
 occupy(s,0,'BLC-1-002','energy',0);
 assert.equal(universalBp(packs,s,card),3000);
 const other=occupy(s,0,'BLC-1-001','front',1);
 assert.equal(universalBp(packs,s,card),2000);
 s.players[0].front[1]=null;
 s.players[0].hand.push(other);
 assert.equal(universalBp(packs,s,card),3000);
 s.active=1;
 assert.equal(universalBp(packs,s,card),3000);
 s.active=0;
 silence(s,card.uid);
 assert.equal(cardHasName(bleach.cards['BLC-1-091'],ALIAS,originalEffectsDisabled(s,card)),false);
 assert.equal(universalBp(packs,s,card),2000);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-3-007 searches one exact Gotei card, then discards only if one was added',()=>{
 let s=fresh();
 occupy(s,0,'BLC-3-007','energy',0);
 occupy(s,0,'BLC-3-007','energy',1);
 const actor=toHand(s,0,'BLC-3-007');
 const top=setTop(s,0,['BLC-1-080','BLC-2-005','BLC-1-002']);
 const handBefore=s.players[0].hand.length;
 s=play(s,actor.uid,'front');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[top[0].uid]);
 const hidden=universalPublicView(packs,s,1);
 assert.equal(hidden.players[0].hand,null);
 assert.equal(JSON.stringify(hidden).includes(top[1].uid),false);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.ok(universalPrivateChoices(packs,s,0).options.some(o=>o.card&&o.card.cardId==='BLC-1-080'));
 aiOk(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:'0-nope'}));
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 s=orderBottom(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.equal(s.players[0].deck.slice(-3).map(c=>c.uid).sort().join(),top.map(c=>c.uid).sort().join());

 let added=fresh();
 occupy(added,0,'BLC-3-007','energy',0);
 occupy(added,0,'BLC-3-007','energy',1);
 const played=toHand(added,0,'BLC-3-007');
 const window=setTop(added,0,['BLC-1-091','BLC-1-002','BLC-4-027']);
 added=play(added,played.uid,'front');
 added=dispatchUniversalAction(packs,added,{type:'chooseTopFiltered',uid:window[0].uid});
 added=orderBottom(added);
 assert.equal(added.pending.kind,'effect-discard');
 const discard=added.players[0].hand.find(c=>c.uid!==window[0].uid);
 added=dispatchUniversalAction(packs,added,{type:'chooseDiscard',uid:discard.uid});
 assert.equal(added.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(added.players[0].outside.some(c=>c.uid===discard.uid),true);
 assert.equal(universalPublicView(packs,added,1).players[0].hand,null);
 assert.equal(countCards(added.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(added)),true);
});

test('BLC-4-001 finds its Bazbee alias or Hashwalth, and BLC-3-002 finds four names',()=>{
 let s=fresh();
 occupy(s,0,'BLC-1-001','energy',0);
 const actor=toHand(s,0,'BLC-4-001');
 const top=setTop(s,0,['BLC-4-001','BLC-1-002','BLC-2-004']);
 s=play(s,actor.uid,'energy');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.cardId+':'+c.uid),top.map(c=>c.cardId+':'+c.uid));
 assert.deepEqual(s.pending.choices.slice().sort(),[top[0].uid,top[2].uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:top[0].uid});
 s=orderBottom(s);
 assert.equal(s.pending.kind,'effect-discard');
 aiOk(s);

 let names=fresh();
 occupy(names,0,'BLC-3-002','energy',0);
 const rukia=toHand(names,0,'BLC-3-002');
 const window=setTop(names,0,['BLC-2-029','BLC-1-047','BLC-1-002']);
 names=play(names,rukia.uid,'front');
 assert.equal(names.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(names.pending.choices.slice().sort(),[window[0].uid,window[1].uid].sort());
 names=dispatchUniversalAction(packs,names,{type:'chooseTopFiltered',uid:window[0].uid});
 names=orderBottom(names);
 assert.equal(names.pending.kind,'effect-discard');
 assert.equal(countCards(names.players[0]),50);
});

test('BLC-2-005 rests only after an own character effect, and BLC-2-006 draws then grants Impact',()=>{
 let paid=fresh();
 for(let i=0;i<3;i++)occupy(paid,0,'BLC-1-001','energy',i);
 const foe=occupy(paid,1,'BLC-1-002','front',0,true);
 const toshiro=toHand(paid,0,'BLC-2-005');
 const deckBefore=paid.players[0].deck.length;
 paid=play(paid,toshiro.uid,'front');
 assert.equal(paid.pending,null);
 assert.equal(foe.ready,true);
 assert.equal(paid.players[0].deck.length,deckBefore);

 function plain(id){
  const c=bleach.cards[id];
  return {id:c.id,name:c.name,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
   bp:c.bp,gen:c.gen,trigger:c.trigger,implementation:'dsl',traits:[...c.traits],
   ...(c.nameAliases?{nameAliases:[...c.nameAliases]}:{}),
   effects:structuredClone(c.effects),
   ...(c.mainAbility?{mainAbility:structuredClone(c.mainAbility)}:{}),
   ...(c.triggerEffect?{triggerEffect:structuredClone(c.triggerEffect)}:{})};
 }
 const hitsugaya=plain('BLC-2-005');
 const bambi=plain('BLC-2-006');
 const character={id:'LAB-CHAR-DEPLOY',name:'Lab Character',color:'yellow',type:'character',
  energy:0,ap:1,bp:1000,gen:1,trigger:null,implementation:'dsl',traits:[],
  effects:{onPlay:[{op:'deployOutsideNameRest',name:hitsugaya.name,optional:true}]}};
 const field={id:'LAB-FIELD-DEPLOY',name:'Lab Field',color:'yellow',type:'field',
  energy:0,ap:1,bp:0,gen:0,trigger:null,implementation:'dsl',traits:[],
  effects:{onPlay:[{op:'deployOutsideNameRest',name:hitsugaya.name,optional:true}]}};
 const event={id:'LAB-EVENT-DEPLOY',name:'Lab Event',color:'yellow',type:'event',
  energy:0,ap:1,bp:0,gen:0,trigger:null,implementation:'dsl',traits:[],
  effects:{onPlay:[{op:'deployOutsideNameRest',name:hitsugaya.name,optional:true}]}};
 const hand={id:'LAB-HAND-DEPLOY',name:'Lab Hand',color:'blue',type:'character',
  energy:0,ap:1,bp:1000,gen:1,trigger:null,implementation:'dsl',traits:[],
  effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'yellow',energy:4,ap:1,max:1}]}};
 const handBambi={id:'LAB-HAND-BAMBI',name:'Lab Bambi',color:'blue',type:'character',
  energy:0,ap:1,bp:1000,gen:1,trigger:null,implementation:'dsl',traits:[],
  effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'yellow',energy:4,ap:1,max:1}]}};
 const fillers=Array.from({length:8},(_,i)=>({id:'LAB-FILL-'+i,name:'Fill '+i,
  color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,trigger:null,
  implementation:'vanilla',traits:[],effects:{}}));
 const mixed=createUniversalPack({id:'c26-own-character',cards:[
  hitsugaya,bambi,character,field,event,hand,handBambi,...fillers]});
 const both=[mixed,mixed];
 const ids=['BLC-2-005','BLC-2-006','LAB-CHAR-DEPLOY','LAB-FIELD-DEPLOY','LAB-EVENT-DEPLOY',
  'LAB-HAND-DEPLOY','LAB-HAND-BAMBI',...fillers.map(c=>c.id)];
 const mixCounts=Object.fromEntries(ids.map(id=>[id,2]));
 let total=ids.length*2;
 for(const id of ids){if(total>=50)break;mixCounts[id]+=2;total+=2;}
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(mixed,mixCounts),[]);
 function labMain(){
  let s=newUniversalMatch(both,{decks:[mixCounts,mixCounts],seed:2606,first:0});
  s=dispatchUniversalAction(both,s,{type:'next'});
  s=dispatchUniversalAction(both,s,{type:'next'});
  return s;
 }
 function labTake(s,p,id){
  const pl=s.players[p];
  for(const zone of ['hand','deck','life','outside','removed']){
   const i=pl[zone].findIndex(c=>c.cardId===id);
   if(i>=0)return pl[zone].splice(i,1)[0];
  }
  throw Error('Missing lab '+id);
 }
 function emptyHand(s,p){
  s.players[p].deck.push(...s.players[p].hand);
  s.players[p].hand.length=0;
 }
 let own=labMain();
 const outside=labTake(own,0,'BLC-2-005');
 own.players[0].outside.push(outside);
 const enemy=labTake(own,1,'LAB-FILL-0');
 enemy.ready=true;enemy.fieldEntryStamp=own.nextFieldEntryStamp++;
 own.players[1].front[0]=enemy;
 emptyHand(own,0);
 const deployer=labTake(own,0,'LAB-CHAR-DEPLOY');
 own.players[0].hand.push(deployer);
 const deckOwn=own.players[0].deck.length;
 own=dispatchUniversalAction(both,own,{type:'play',uid:deployer.uid,line:'front',slot:0});
 assert.equal(own.pending.kind,'effect-outside-name-rest');
 const enter=legalUniversalActions(both,own).find(a=>a.type==='chooseOutsideNameRest'&&a.uid===outside.uid&&a.line==='front');
 assert.ok(enter);
 own=dispatchUniversalAction(both,own,enter);
 assert.equal(own.pending.kind,'effect-rest-bp');
 assert.equal(own.pending.optional,true);
 aiOk(own,both);
 own=dispatchUniversalAction(both,own,{type:'chooseRestBp',uid:enemy.uid});
 assert.equal(at(own,1,enemy.uid).ready,false);
 assert.equal(own.players[0].deck.length,deckOwn);
 assert.equal(countCards(own.players[0]),50);

 let byField=labMain();
 const buried=labTake(byField,0,'BLC-2-005');
 byField.players[0].outside.push(buried);
 const watcher=labTake(byField,1,'LAB-FILL-1');
 watcher.ready=true;watcher.fieldEntryStamp=byField.nextFieldEntryStamp++;
 byField.players[1].front[0]=watcher;
 emptyHand(byField,0);
 const area=labTake(byField,0,'LAB-FIELD-DEPLOY');
 byField.players[0].hand.push(area);
 byField=dispatchUniversalAction(both,byField,{type:'play',uid:area.uid,line:'energy',slot:0});
 const fieldEnter=legalUniversalActions(both,byField).find(a=>a.uid===buried.uid&&a.line==='energy');
 byField=dispatchUniversalAction(both,byField,fieldEnter);
 assert.equal(byField.pending,null);
 assert.equal(at(byField,1,watcher.uid).ready,true);

 let byEvent=labMain();
 const sidelined=labTake(byEvent,0,'BLC-2-005');
 byEvent.players[0].outside.push(sidelined);
 const victim=labTake(byEvent,1,'LAB-FILL-2');
 victim.ready=true;victim.fieldEntryStamp=byEvent.nextFieldEntryStamp++;
 byEvent.players[1].front[0]=victim;
 emptyHand(byEvent,0);
 const spell=labTake(byEvent,0,'LAB-EVENT-DEPLOY');
 byEvent.players[0].hand.push(spell);
 byEvent=dispatchUniversalAction(both,byEvent,{type:'event',uid:spell.uid});
 const eventEnter=legalUniversalActions(both,byEvent).find(a=>a.uid===sidelined.uid);
 byEvent=dispatchUniversalAction(both,byEvent,eventEnter);
 assert.equal(byEvent.pending,null);
 assert.equal(at(byEvent,1,victim.uid).ready,true);

 let fromHand=labMain();
 const enemyHand=labTake(fromHand,1,'LAB-FILL-3');
 enemyHand.ready=true;enemyHand.fieldEntryStamp=fromHand.nextFieldEntryStamp++;
 fromHand.players[1].front[0]=enemyHand;
 emptyHand(fromHand,0);
 const handSource=labTake(fromHand,0,'LAB-HAND-DEPLOY');
 const handTarget=labTake(fromHand,0,'BLC-2-005');
 fromHand.players[0].hand.push(handSource,handTarget);
 fromHand=dispatchUniversalAction(both,fromHand,{type:'play',uid:handSource.uid,line:'front',slot:0});
 assert.equal(fromHand.pending.kind,'effect-hand-rest');
 const handEnter=legalUniversalActions(both,fromHand).find(a=>a.type==='chooseHandRest'&&a.uid===handTarget.uid&&a.line==='front');
 assert.ok(handEnter);
 fromHand=dispatchUniversalAction(both,fromHand,handEnter);
 assert.equal(fromHand.pending.kind,'effect-rest-bp');
 fromHand=dispatchUniversalAction(both,fromHand,{type:'chooseRestBp',uid:null});
 assert.equal(at(fromHand,1,enemyHand.uid).ready,true);
 assert.equal(countCards(fromHand.players[0]),50);
 assert.equal(assertUniversalMatch(both,structuredClone(fromHand)),true);

 let draw=labMain();
 emptyHand(draw,0);
 const drawSource=labTake(draw,0,'LAB-HAND-BAMBI');
 const drawTarget=labTake(draw,0,'BLC-2-006');
 draw.players[0].hand.push(drawSource,drawTarget);
 const before=draw.players[0].deck.length;
 draw=dispatchUniversalAction(both,draw,{type:'play',uid:drawSource.uid,line:'energy',slot:0});
 const drawEnter=legalUniversalActions(both,draw).find(a=>a.uid===drawTarget.uid&&a.line==='energy');
 draw=dispatchUniversalAction(both,draw,drawEnter);
 const live=draw.players[0].energy.find(c=>c?.uid===drawTarget.uid);
 assert.ok(live);
 assert.equal(draw.players[0].deck.length,before-1);
 assert.equal(live.ready,false);
 assert.equal(countCards(draw.players[0]),50);
 assert.equal(universalPublicView(both,draw,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(both,structuredClone(draw)),true);

 let pay=fresh();
 const unit=occupy(pay,0,'BLC-2-006','energy',0,false);
 assert.ok(legalUniversalActions(packs,pay).some(a=>a.uid===unit.uid&&a.mode==='oncePay'));
 pay=dispatchUniversalAction(packs,pay,{type:'activate',uid:unit.uid,mode:'oncePay'});
 const granted=at(pay,0,unit.uid);
 assert.equal(granted.impactGranted.amount,1);
 assert.equal(granted.impactGranted.turn,pay.turn);
 silence(pay,granted.uid);
 assert.equal(at(pay,0,unit.uid).impactGranted.amount,1);
 assert.equal(legalUniversalActions(packs,pay).some(a=>a.uid===unit.uid&&a.mode==='oncePay'),false);
 let broke=fresh();
 const rested=occupy(broke,0,'BLC-2-006','front',0,false);
 for(const ap of broke.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(packs,broke).some(a=>a.uid===rested.uid&&a.mode==='oncePay'),false);
 assert.throws(()=>dispatchUniversalAction(packs,broke,{type:'activate',uid:rested.uid,mode:'oncePay'}));
 assert.equal(countCards(pay.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(pay)),true);
});

test('BLC-2-006 COLOR life rests one front character and skips its next ACTIVE',()=>{
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2607,first:1});
 const foe=occupy(s,1,'BLC-1-002','front',0,true);
 const attacker=occupy(s,1,'BLC-1-001','front',1,true);
 const revealed=take(s,0,'BLC-2-006');
 const buried=s.players[0].life.shift();
 s.players[0].deck.push(buried);
 s.players[0].life.unshift(revealed);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.active,1);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'color');
 const modes=legalUniversalActions(packs,s);
 assert.ok(modes.some(a=>a.mode==='skip'));
 assert.ok(modes.every(a=>a.mode==='skip'||a.mode==='colorRestSkip'));
 const deckBefore=s.players[0].deck.length;
 const handBefore=s.players[0].hand.length;
 aiOk(s);
 s=dispatchUniversalAction(packs,s,modes.find(a=>a.mode==='colorRestSkip'&&a.uid===foe.uid));
 assert.equal(at(s,1,foe.uid).ready,false);
 assert.ok(s.continuousStates.some(x=>x.kind==='skipNextActive'&&x.targetUid===foe.uid));
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='BLC-2-006'),false);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});
