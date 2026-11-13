// Round 7 shared engine. Synthetic cards only. The 24 unfinished IMC cards
// stay out of the battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';

const beyond='BEYOND THE STARLIGHT';
const wish='お願い！シンデレラ';
const OPEN=['IMC-1-003','IMC-1-004','IMC-1-009','IMC-1-011','IMC-1-012','IMC-1-016',
 'IMC-1-029','IMC-1-032','IMC-1-037','IMC-1-039','IMC-1-043','IMC-1-051','IMC-1-057',
 'IMC-1-061','IMC-1-064','IMC-1-068','IMC-1-072','IMC-1-073','IMC-1-074','IMC-1-075',
 'IMC-1-093','IMC-1-094','IMC-1-097','IMC-1-107'];
function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'yellow',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:null,
  ...rest,
  implementation:implementation||(Object.keys(effects).length||rest.mainAbility||
   rest.altMainAbility||rest.moveTriggers||rest.attackLoseActiveOnce||
   rest.attackLoseReadyTurn||rest.passiveBonuses?'dsl':'vanilla'),
  effects
 };
}
function open(cards,{seed=71,first=0,phase='main'}={}){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:'probe',version:'imc-r7-'+seed,cards:bodies});
 const counts={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first,openingMulligan:false});
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function hold(s,id,p=0){
 const card=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function seat(s,p,id,line,slot,ready=true){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function fuel(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function act(pack,s,pred){
 const action=legalUniversalActions(pack,s).find(pred);
 assert.ok(action,s.pending?.kind||'action');
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function passTo(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(pack,s,a=>a.type==='chooseHandLimit');
   continue;
  }
  if(s.pending?.kind==='block'){
   s=dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:null});
   continue;
  }
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>40)throw Error('Did not reach player '+player+' '+phase);
 }
 return s;
}
function moves(s,uid){return s.zoneMoveEvents.filter(e=>e.uid===uid);}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy,
  ...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid);
}

test('the battle pack stays at 89 while the new fields exist',()=>{
 const pack=createImcV2Pack();
 assert.equal(Object.keys(pack.cards).length,89);
 for(const id of OPEN)assert.equal(pack.cards[id],undefined);
});

test('two activates on one character do not lock each other',()=>{
 const alt={op:'frontOnceActiveSelf',frontOnly:true,oncePerTurn:true,minSelfBp:5000};
 const main={op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,when:{
  kind:'otherOwnCharacterBpAtLeast',turn:'any',zone:'field',excludeSelf:true,minBp:5000}};
 const cards=[
  face({id:'SELF',name:'自己',bp:5000,traits:[beyond],altMainAbility:alt,mainAbility:main}),
  face({id:'LOW',name:'低',bp:2000,altMainAbility:alt,mainAbility:main}),
  face({id:'TALL',name:'高',bp:5000}),
  face({id:'BASE',name:'底板',bp:1500}),
  face({id:'TOP',name:'自己',bp:5000,raidName:'底板',traits:[beyond],
   altMainAbility:alt,mainAbility:main})
 ];
 const opened=open(cards,71);
 fuel(opened.s);
 const self=seat(opened.s,0,'SELF','front',0,false);
 const tall=seat(opened.s,0,'TALL','front',1,true);
 const modes=()=>legalUniversalActions(opened.pack,opened.s)
  .filter(a=>a.type==='activate'&&a.uid===self.uid).map(a=>a.mode).sort();
 assert.deepEqual(modes(),['altFrontActive','onceBuffSelf']);
 let usedMain=act(opened.pack,opened.s,a=>a.mode==='onceBuffSelf'&&a.uid===self.uid);
 assert.equal(universalBp(opened.pack,usedMain,live(usedMain,self.uid)),6000);
 assert.deepEqual(usedMain.mainAbilityUsedUids,[self.uid]);
 assert.deepEqual(usedMain.altMainAbilityUsedUids,[]);
 assert.equal(legalUniversalActions(opened.pack,usedMain)
  .some(a=>a.uid===self.uid&&a.mode==='altFrontActive'),true);
 assert.equal(legalUniversalActions(opened.pack,usedMain)
  .some(a=>a.uid===self.uid&&a.mode==='onceBuffSelf'),false);
 usedMain=act(opened.pack,usedMain,a=>a.mode==='altFrontActive'&&a.uid===self.uid);
 assert.equal(live(usedMain,self.uid).ready,true);
 assert.deepEqual(usedMain.altMainAbilityUsedUids,[self.uid]);
 assert.equal(legalUniversalActions(opened.pack,usedMain)
  .some(a=>a.uid===self.uid&&a.type==='activate'),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,usedMain,
  {type:'activate',uid:self.uid,mode:'altFrontActive'}),/Action not currently legal/);
 assert.equal(usedMain.altMainAbilityUsedUids.length,1);
 let turned=dispatchUniversalAction(opened.pack,usedMain,{type:'next'});
 const again=passTo(opened.pack,turned,0,'main');
 assert.equal(legalUniversalActions(opened.pack,again)
  .some(a=>a.uid===self.uid&&a.mode==='altFrontActive'),true);
 assert.equal(legalUniversalActions(opened.pack,again)
  .some(a=>a.uid===self.uid&&a.mode==='onceBuffSelf'),true);

 const altFirst=open(cards,72);
 fuel(altFirst.s);
 const front=seat(altFirst.s,0,'SELF','front',0,true);
 seat(altFirst.s,0,'TALL','front',1,true);
 let s=act(altFirst.pack,altFirst.s,a=>a.mode==='altFrontActive'&&a.uid===front.uid);
 assert.deepEqual(s.mainAbilityUsedUids,[]);
 assert.equal(legalUniversalActions(altFirst.pack,s)
  .some(a=>a.uid===front.uid&&a.mode==='onceBuffSelf'),true);
 assert.equal(legalUniversalActions(altFirst.pack,s)
  .some(a=>a.uid===front.uid&&a.mode==='altFrontActive'),false);

 const energy=open(cards,73);
 fuel(energy.s);
 const back=seat(energy.s,0,'SELF','energy',0,true);
 seat(energy.s,0,'TALL','front',0,true);
 assert.equal(legalUniversalActions(energy.pack,energy.s)
  .some(a=>a.uid===back.uid&&a.mode==='onceBuffSelf'),true);
 assert.equal(legalUniversalActions(energy.pack,energy.s)
  .some(a=>a.uid===back.uid&&a.mode==='altFrontActive'),false);
 assert.throws(()=>dispatchUniversalAction(energy.pack,energy.s,
  {type:'activate',uid:back.uid,mode:'altFrontActive'}),/Action not currently legal/);

 const short=open(cards,74);
 const low=seat(short.s,0,'LOW','front',0,true);
 seat(short.s,0,'TALL','front',1,true);
 assert.equal(legalUniversalActions(short.pack,short.s)
  .some(a=>a.uid===low.uid&&a.mode==='altFrontActive'),false);
 low.buffs=[{bp:3000,untilTurn:short.s.turn}];
 assert.equal(universalBp(short.pack,short.s,low),5000);
 assert.equal(legalUniversalActions(short.pack,short.s)
  .some(a=>a.uid===low.uid&&a.mode==='altFrontActive'),true);

 const quiet=open(cards,75);
 const hidden=seat(quiet.s,0,'SELF','front',0,true);
 seat(quiet.s,0,'TALL','front',1,true);
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:hidden.uid,targetUid:hidden.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 assert.equal(legalUniversalActions(quiet.pack,quiet.s)
  .some(a=>a.uid===hidden.uid&&a.type==='activate'),false);
 assert.equal(assertUniversalMatch(quiet.pack,quiet.s),true);

 const raid=open(cards,76);
 fuel(raid.s);
 const base=seat(raid.s,0,'BASE','front',0,true);
 seat(raid.s,0,'TALL','front',1,true);
 const top=hold(raid.s,'TOP');
 s=act(raid.pack,raid.s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid&&a.slot===0);
 const raided=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.ok(raided);
 assert.equal([...(raided.stack||[]),...(raided.under||[])].some(c=>c.uid===base.uid),true);
 assert.equal(legalUniversalActions(raid.pack,s)
  .some(a=>a.uid===top.uid&&a.mode==='altFrontActive'),true);
 assert.equal(legalUniversalActions(raid.pack,s)
  .some(a=>a.uid===base.uid&&a.type==='activate'),false);
});

test('a hand-to-outside trigger can match the cause trait and keeps the move ledger',()=>{
 const hook={from:'hand',to:'outside',sourceTrait:beyond,reasons:['payment','own-effect']};
 const then=[{op:'buffOwnField',filter:{field:'trait',value:beyond},bp:1000,
  optional:true,excludeSelf:false}];
 const cards=[
  face({id:'CAUSE',name:'原因',energy:0,traits:[beyond],effects:{onPlay:[
   {op:'drawDiscard',count:1}]}}),
  face({id:'PAYER',name:'支付',traits:[beyond],effects:{onPlay:[
   {op:'discardGate',optional:false,then:[{op:'draw',count:1}]}]}}),
  face({id:'PLAIN',name:'無特徵',energy:0,effects:{onPlay:[{op:'drawDiscard',count:1}]}}),
  face({id:'EVENT',name:'事件',type:'event',bp:0,energy:0,traits:[beyond],effects:{
   onPlay:[{op:'drawDiscard',count:1}]}}),
  face({id:'HOOK',name:'被動',implementation:'dsl',moveTriggers:[{when:hook,then}]}),
  face({id:'NAMED',name:'具名',implementation:'dsl',moveTriggers:[{
   when:{from:'hand',to:'outside',sourceOnField:true,sourceName:'其他作品',reasons:['own-effect']},
   then:[{op:'buffAnyCharacter',bp:1000,optional:true,excludeSelf:false}]
  }]}),
  face({id:'OTHER',name:'其他作品',energy:0,effects:{onPlay:[{op:'drawDiscard',count:1}]}}),
  face({id:'ALLY',name:'同伴',traits:[beyond],bp:3000}),
  face({id:'CGD-1-001',name:'舊作',energy:0,effects:{onPlay:[{op:'drawDiscard',count:1}]}})
 ];
 function discard(pack,s,id){
  const card=hold(s,id);
  s=act(pack,s,a=>a.type==='chooseDiscard'&&a.uid===card.uid);
  return [s,card];
 }
 const own=open(cards,81);
 fuel(own.s);
 const ally=seat(own.s,0,'ALLY','front',1,true);
 hold(own.s,'HOOK');
 let s=act(own.pack,own.s,a=>a.type==='play'&&a.uid===hold(own.s,'CAUSE').uid);
 let moved;
 [s,moved]=discard(own.pack,s,'HOOK');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(ally.uid),true);
 const ledger=moves(s,moved.uid);
 assert.equal(ledger.length,1);
 assert.equal(ledger[0].from,'hand');
 assert.equal(ledger[0].to,'outside');
 assert.equal(ledger[0].reason,'own-effect');
 assert.equal(ledger[0].sourceCardId,'CAUSE');
 assert.equal(ledger[0].sourceOnField,true);
 assert.deepEqual(ledger[0].sourceTraits,[beyond]);
 assert.equal(JSON.stringify(universalPublicView(own.pack,s,1)).includes('sourceTraits'),false);
 s=act(own.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(own.pack,s,live(s,ally.uid)),4000);

 const paid=open(cards,82);
 fuel(paid.s);
 const paidAlly=seat(paid.s,0,'ALLY','front',0,true);
 const payCard=hold(paid.s,'HOOK');
 const payer=hold(paid.s,'PAYER');
 s=act(paid.pack,paid.s,a=>a.type==='play'&&a.uid===payer.uid);
 s=act(paid.pack,s,a=>a.type==='chooseDiscardGate'&&a.uid===payCard.uid);
 const payMove=moves(s,payCard.uid);
 assert.equal(payMove.length,1);
 assert.equal(payMove[0].reason,'payment');
 assert.equal(payMove[0].sourceCardId,'PAYER');
 assert.deepEqual(payMove[0].sourceTraits,[beyond]);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=act(paid.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===paidAlly.uid);
 assert.equal(universalBp(paid.pack,s,live(s,paidAlly.uid)),4000);

 const missed=open(cards,83);
 fuel(missed.s);
 seat(missed.s,0,'ALLY','front',0,true);
 hold(missed.s,'HOOK');
 const plainCause=hold(missed.s,'PLAIN');
 s=act(missed.pack,missed.s,a=>a.type==='play'&&a.uid===plainCause.uid);
 const lost=hold(missed.s,'HOOK');
 s=act(missed.pack,s,a=>a.type==='chooseDiscard'&&a.uid===lost.uid);
 assert.notEqual(s.pending?.kind,'effect-buff-own');
 assert.equal(moves(s,lost.uid).length,1);
 assert.equal(moves(s,lost.uid)[0].sourceTraits,undefined);
 assert.equal(universalBp(missed.pack,s,s.players[0].front.find(c=>c?.cardId==='ALLY')),3000);

 const event=open(cards,84);
 fuel(event.s);
 const witness=seat(event.s,0,'ALLY','energy',0,true);
 hold(event.s,'HOOK');
 const cast=hold(event.s,'EVENT');
 s=act(event.pack,event.s,a=>a.type==='event'&&a.uid===cast.uid);
 const fromEvent=hold(event.s,'HOOK');
 s=act(event.pack,s,a=>a.type==='chooseDiscard'&&a.uid===fromEvent.uid);
 const eventMove=moves(s,fromEvent.uid)[0];
 assert.equal(eventMove.sourceCardId,'EVENT');
 assert.equal(eventMove.sourceOnField,false);
 assert.deepEqual(eventMove.sourceTraits,[beyond]);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(witness.uid),true);

 const named=open(cards,85);
 fuel(named.s);
 const old=seat(named.s,0,'ALLY','front',0,true);
 hold(named.s,'NAMED');
 const otherCause=hold(named.s,'OTHER');
 s=act(named.pack,named.s,a=>a.type==='play'&&a.uid===otherCause.uid);
 const namedCard=hold(named.s,'NAMED');
 s=act(named.pack,s,a=>a.type==='chooseDiscard'&&a.uid===namedCard.uid);
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.choices.includes(old.uid),true);
 const foreign=open(cards,86);
 fuel(foreign.s);
 seat(foreign.s,0,'ALLY','front',0,true);
 hold(foreign.s,'NAMED');
 const foreignCause=hold(foreign.s,'CGD-1-001');
 s=act(foreign.pack,foreign.s,a=>a.type==='play'&&a.uid===foreignCause.uid);
 const foreignCard=hold(foreign.s,'NAMED');
 s=act(foreign.pack,s,a=>a.type==='chooseDiscard'&&a.uid===foreignCard.uid);
 assert.notEqual(s.pending?.kind,'effect-buff-any');
});

test('one buff choice can also grant impact to the chosen card',()=>{
 const rika='城ヶ崎 莉嘉';
 const cards=[
  face({id:'SHOW',name:'登場',type:'event',bp:0,energy:0,effects:{onPlay:[
   {op:'draw',count:1},
   {op:'buffOwnField',filter:{field:'trait',value:beyond},bp:2000,optional:true,
    excludeSelf:true,impactIfName:rika}]}}),
  face({id:'RIKA',name:rika,traits:[beyond],bp:2000}),
  face({id:'ALLY',name:'同伴',traits:[beyond],bp:2000}),
  face({id:'PLAIN',name:'無關',bp:2000})
 ];
 const named=open(cards,91);
 fuel(named.s);
 const star=seat(named.s,0,'RIKA','front',0,true);
 const ally=seat(named.s,0,'ALLY','front',1,true);
 const plain=seat(named.s,0,'PLAIN','energy',0,true);
 let s=act(named.pack,named.s,a=>a.type==='event');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.impactIfName,rika);
 assert.equal(s.pending.choices.includes(star.uid),true);
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 s=act(named.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===star.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(named.pack,s,live(s,star.uid)),4000);
 assert.equal(universalImpact(named.pack,s,live(s,star.uid)),1);
 assert.equal(universalBp(named.pack,s,live(s,ally.uid)),2000);
 assert.equal(universalImpact(named.pack,s,live(s,ally.uid)),0);

 const other=open(cards,92);
 fuel(other.s);
 const mate=seat(other.s,0,'ALLY','front',0,true);
 const heroine=seat(other.s,0,'RIKA','front',1,true);
 s=act(other.pack,other.s,a=>a.type==='event');
 s=act(other.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===mate.uid);
 assert.equal(universalBp(other.pack,s,live(s,mate.uid)),4000);
 assert.equal(universalImpact(other.pack,s,live(s,mate.uid)),0);
 assert.equal(universalImpact(other.pack,s,live(s,heroine.uid)),0);

 const skipped=open(cards,93);
 fuel(skipped.s);
 const left=seat(skipped.s,0,'RIKA','front',0,true);
 s=act(skipped.pack,skipped.s,a=>a.type==='event');
 const before=structuredClone(s);
 s=act(skipped.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(universalBp(skipped.pack,s,live(s,left.uid)),2000);
 assert.equal(universalImpact(skipped.pack,s,live(s,left.uid)),0);
 assert.equal(before.players[0].apCards.filter(c=>c.ready).length,
  s.players[0].apCards.filter(c=>c.ready).length);
});

test('the same choice grants impact only while the live condition is true',()=>{
 const gate={kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',
  excludeSelf:false,trait:wish,min:9};
 const cards=[
  face({id:'NINE',name:'九種',energy:0,traits:[wish],effects:{onPlay:[{op:'buffOwnField',
   filter:{field:'trait',value:wish},bp:1000,optional:true,excludeSelf:false,
   impactIf:gate}]}}),
  ...Array.from({length:9},(_,i)=>face({id:'N'+i,name:'名'+i,traits:[wish],bp:1500}))
 ];
 function place(s,count){
  const seated=[];
  const spots=[['front',1],['front',2],['front',3],
   ['energy',0],['energy',1],['energy',2],['energy',3]];
  for(let i=0;i<count;i++){
   const id='N'+i;
   if(i<spots.length)seated.push(seat(s,0,id,spots[i][0],spots[i][1],true));
   else{
    const card=pull(s,0,id);
    s.players[0].outside.push(card);
    seated.push(card);
   }
  }
  return seated;
 }
 const full=open(cards,101);
 fuel(full.s);
 const nine=place(full.s,8);
 const nineCard=hold(full.s,'NINE');
 let s=act(full.pack,full.s,a=>a.type==='play'&&a.uid===nineCard.uid&&a.replaceUid===undefined);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(nine[0].uid),true);
 const pending=s;
 const dropped=structuredClone(s);
 const extra=dropped.players[0].outside.pop();
 dropped.players[0].hand.push(extra);
 const faded=dispatchUniversalAction(full.pack,dropped,
  {type:'chooseOwnBuff',uid:nine[0].uid});
 assert.equal(universalBp(full.pack,faded,live(faded,nine[0].uid)),2500);
 assert.equal(universalImpact(full.pack,faded,live(faded,nine[0].uid)),0);
 s=act(full.pack,pending,a=>a.type==='chooseOwnBuff'&&a.uid===nine[1].uid);
 assert.equal(universalBp(full.pack,s,live(s,nine[1].uid)),2500);
 assert.equal(universalImpact(full.pack,s,live(s,nine[1].uid)),1);
 assert.equal(universalImpact(full.pack,s,live(s,nine[0].uid)),0);

 const six=open(cards,102);
 fuel(six.s);
 const few=place(six.s,5);
 const sixCard=hold(six.s,'NINE');
 s=act(six.pack,six.s,a=>a.type==='play'&&a.uid===sixCard.uid&&a.replaceUid===undefined);
 s=act(six.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===few[0].uid);
 assert.equal(universalBp(six.pack,s,live(s,few[0].uid)),2500);
 assert.equal(universalImpact(six.pack,s,live(s,few[0].uid)),0);
});

test('impact after an AP payment does not change another payment',()=>{
 const cards=[
  face({id:'BUY',name:'買衝擊',bp:3000,effects:{onAttack:[{op:'optionalPayApThen',
   ap:1,optional:true,then:[{op:'grantSelfImpactThisTurn',amount:1}]}]}}),
  face({id:'DRAW',name:'買抽牌',bp:3000,effects:{onAttack:[{op:'optionalPayApThen',
   ap:1,optional:true,then:[{op:'draw',count:1}]}]}}),
  face({id:'WALL',name:'阻擋',bp:1000})
 ];
 function swing(pack,s,uid){
  while(s.phase!=='attack')s=act(pack,s,a=>a.type==='next');
  s=act(pack,s,a=>a.type==='attack'&&a.uid===uid);
  if(s.pending?.kind==='block')s=dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:null});
  return s;
 }
 const broke=open(cards,111);
 fuel(broke.s,0);
 const buyer=seat(broke.s,0,'BUY','front',0,true);
 seat(broke.s,1,'WALL','front',0,true);
 let s=broke.s;
 while(s.phase!=='attack')s=act(broke.pack,s,a=>a.type==='next');
 s=act(broke.pack,s,a=>a.type==='attack'&&a.uid===buyer.uid);
 if(s.pending?.kind==='block')s=dispatchUniversalAction(broke.pack,s,{type:'chooseBlock',uid:null});
 assert.notEqual(s.pending?.kind,'effect-optional-pay-ap');
 assert.equal(universalImpact(broke.pack,s,live(s,buyer.uid)),0);

 const offered=open(cards,112);
 fuel(offered.s,1);
 const attacker=seat(offered.s,0,'BUY','front',0,true);
 seat(offered.s,1,'WALL','front',0,true);
 s=offered.s;
 while(s.phase!=='attack')s=act(offered.pack,s,a=>a.type==='next');
 s=act(offered.pack,s,a=>a.type==='attack'&&a.uid===attacker.uid);
 if(s.pending?.kind==='block')s=dispatchUniversalAction(offered.pack,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 const ready=s.players[0].apCards.filter(c=>c.ready).length;
 const skipped=dispatchUniversalAction(offered.pack,structuredClone(s),
  {type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,ready);
 assert.equal(universalImpact(offered.pack,skipped,live(skipped,attacker.uid)),0);
 assert.throws(()=>dispatchUniversalAction(offered.pack,structuredClone(s),
  {type:'chooseOptionalPayAp',mode:'nope'}),/Action not currently legal/);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ready);
 const paid=dispatchUniversalAction(offered.pack,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(assertUniversalMatch(offered.pack,paid),true);
 assert.equal(paid.players[0].apCards.filter(c=>c.ready).length,ready-1);
 assert.equal(universalImpact(offered.pack,paid,live(paid,attacker.uid)),1);

 const drawing=open(cards,113);
 fuel(drawing.s,1);
 const artist=seat(drawing.s,0,'DRAW','front',0,true);
 seat(drawing.s,1,'WALL','front',0,true);
 const hand=drawing.s.players[0].hand.length;
 s=swing(drawing.pack,drawing.s,artist.uid);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=dispatchUniversalAction(drawing.pack,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(universalImpact(drawing.pack,s,live(s,artist.uid)),0);
 assert.equal(assertUniversalMatch(drawing.pack,s),true);
});

test('field and outside names raise and lower BP immediately',()=>{
 const cards=[
  face({id:'SELF',name:'本人',bp:4000,traits:[wish],passiveBonuses:[{bp:1000,condition:{
   kind:'ownDistinctTraitNames',turn:'own',zone:'fieldOutside',excludeSelf:false,
   trait:wish,min:6}}]}),
  ...Array.from({length:8},(_,i)=>face({id:'N'+i,name:'名'+i,traits:[wish],bp:1000})),
  face({id:'COPY',name:'名0',traits:[wish],bp:1000}),
  face({id:'FOE',name:'對方名',traits:[wish],bp:1000})
 ];
 const opened=open(cards,121);
 const self=seat(opened.s,0,'SELF','front',0,true);
 const spots=[['front',1],['front',2],['front',3],['energy',0]];
 const seated=spots.map((spot,i)=>seat(opened.s,0,'N'+i,spot[0],spot[1],true));
 assert.equal(universalBp(opened.pack,opened.s,self),4000);
 const sixth=pull(opened.s,0,'N5');
 opened.s.players[0].outside.push(sixth);
 assert.equal(universalBp(opened.pack,opened.s,self),5000);
 const copy=pull(opened.s,0,'COPY');
 opened.s.players[0].outside.push(copy);
 assert.equal(universalBp(opened.pack,opened.s,self),5000);
 hold(opened.s,'N6');
 assert.equal(universalBp(opened.pack,opened.s,self),5000);
 assert.ok(opened.s.players[0].deck.some(c=>c.cardId==='N7'));
 assert.equal(universalBp(opened.pack,opened.s,self),5000);
 const buried=pull(opened.s,0,'N6');
 self.under=[buried];
 assert.equal(universalBp(opened.pack,opened.s,self),5000);
 seat(opened.s,1,'FOE','front',0,true);
 assert.equal(universalBp(opened.pack,opened.s,self),5000);
 opened.s.players[0].outside=opened.s.players[0].outside.filter(c=>c.uid!==sixth.uid);
 opened.s.players[0].hand.push(sixth);
 assert.equal(universalBp(opened.pack,opened.s,self),4000);
 opened.s.players[0].hand=opened.s.players[0].hand.filter(c=>c.uid!==sixth.uid);
 opened.s.players[0].outside.push(sixth);
 assert.equal(universalBp(opened.pack,opened.s,self),5000);
 let s=passTo(opened.pack,opened.s,1,'main');
 assert.equal(universalBp(opened.pack,s,live(s,self.uid)),4000);
 s=passTo(opened.pack,s,0,'main');
 assert.equal(universalBp(opened.pack,s,live(s,self.uid)),5000);
 assert.equal(assertUniversalMatch(opened.pack,s),true);
 void seated;
});

test('losing an attack can activate once without adding BP',()=>{
 const cards=[
  face({id:'LOSE',name:'敗北',bp:1000,attackLoseActiveOnce:{once:'card'}}),
  face({id:'OLD',name:'舊敗北',bp:1000,attackLoseReadyTurn:{bp:1000}}),
  face({id:'QUIET',name:'無',bp:1000}),
  face({id:'WALL',name:'牆',bp:5000})
 ];
 function lose(pack,s,uid){
  while(s.phase!=='attack')s=act(pack,s,a=>a.type==='next');
  s=act(pack,s,a=>a.type==='attack'&&a.uid===uid);
  const wall=s.players[1].front.find(c=>c?.cardId==='WALL'&&c.ready);
  assert.equal(s.pending.kind,'block');
  s=dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:wall.uid});
  assert.equal(assertUniversalMatch(pack,s),true);
  return s;
 }
 const opened=open(cards,131);
 const loser=seat(opened.s,0,'LOSE','front',0,true);
 seat(opened.s,1,'WALL','front',0,true);
 seat(opened.s,1,'WALL','front',1,true);
 let s=lose(opened.pack,opened.s,loser.uid);
 assert.equal(live(s,loser.uid).ready,true);
 assert.equal(universalBp(opened.pack,s,live(s,loser.uid)),1000);
 assert.equal(s.onceEffectUses[0].includes('uid:'+loser.uid+'|attackLoseActiveOnce'),true);
 s=lose(opened.pack,s,loser.uid);
 assert.equal(live(s,loser.uid).ready,false);
 assert.equal(universalBp(opened.pack,s,live(s,loser.uid)),1000);

 const legacy=open(cards,132);
 const old=seat(legacy.s,0,'OLD','front',0,true);
 seat(legacy.s,1,'WALL','front',0,true);
 s=lose(legacy.pack,legacy.s,old.uid);
 assert.equal(live(s,old.uid).ready,true);
 assert.equal(universalBp(legacy.pack,s,live(s,old.uid)),2000);

 const silent=open(cards,133);
 const hidden=seat(silent.s,0,'LOSE','front',0,true);
 seat(silent.s,1,'WALL','front',0,true);
 grantContinuousState(silent.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:hidden.uid,targetUid:hidden.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 s=lose(silent.pack,silent.s,hidden.uid);
 assert.equal(live(s,hidden.uid).ready,false);
 assert.equal(universalBp(silent.pack,s,live(s,hidden.uid)),1000);

 const plain=open(cards,134);
 const quiet=seat(plain.s,0,'QUIET','front',0,true);
 seat(plain.s,1,'WALL','front',0,true);
 s=lose(plain.pack,plain.s,quiet.uid);
 assert.equal(live(s,quiet.uid).ready,false);
 assert.equal(universalBp(plain.pack,s,live(s,quiet.uid)),1000);
});

test('an optional field buff can choose two different characters',()=>{
 const cards=[
  face({id:'TWO',name:'兩張',energy:0,effects:{onPlay:[{op:'buffOwnField',
   filter:{field:'trait',value:wish},bp:1000,optional:true,excludeSelf:true,max:2}]}}),
  face({id:'ONE',name:'一張',energy:0,effects:{onPlay:[{op:'buffOwnField',
   filter:{field:'trait',value:wish},bp:1000,optional:true,excludeSelf:true}]}}),
  face({id:'A',name:'甲',traits:[wish],bp:2000}),
  face({id:'B',name:'乙',traits:[wish],bp:2000}),
  face({id:'C',name:'丙',traits:[wish],bp:2000}),
  face({id:'D',name:'丁',bp:2000})
 ];
 const opened=open(cards,141);
 fuel(opened.s);
 const a=seat(opened.s,0,'A','front',0,true);
 const b=seat(opened.s,0,'B','front',1,true);
 const c=seat(opened.s,0,'C','energy',0,true);
 const d=seat(opened.s,0,'D','energy',1,true);
 let s=act(opened.pack,opened.s,a=>a.type==='play'&&
  opened.s.players[0].hand.find(c=>c.uid===a.uid)?.cardId==='TWO');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.remaining,2);
 assert.equal(s.pending.choices.includes(d.uid),false);
 s=act(opened.pack,s,action=>action.type==='chooseOwnBuff'&&action.uid===a.uid);
 assert.equal(s.pending.remaining,1);
 assert.equal(s.pending.choices.includes(a.uid),false);
 assert.equal(universalBp(opened.pack,s,live(s,a.uid)),3000);
 s=act(opened.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===b.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(opened.pack,s,live(s,b.uid)),3000);
 assert.equal(universalBp(opened.pack,s,live(s,c.uid)),2000);

 const skipped=open(cards,142);
 fuel(skipped.s);
 const skippedA=seat(skipped.s,0,'A','front',0,true);
 s=act(skipped.pack,skipped.s,a=>a.type==='play'&&
  skipped.s.players[0].hand.find(c=>c.uid===a.uid)?.cardId==='TWO');
 s=act(skipped.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(universalBp(skipped.pack,s,live(s,skippedA.uid)),2000);

 const single=open(cards,143);
 fuel(single.s);
 const one=seat(single.s,0,'A','front',0,true);
 const two=seat(single.s,0,'B','front',1,true);
 s=act(single.pack,single.s,a=>a.type==='play'&&
  single.s.players[0].hand.find(c=>c.uid===a.uid)?.cardId==='ONE');
 assert.equal(s.pending.remaining,undefined);
 s=act(single.pack,s,a=>a.type==='chooseOwnBuff'&&a.uid===one.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(single.pack,s,live(s,one.uid)),3000);
 assert.equal(universalBp(single.pack,s,live(s,two.uid)),2000);
});

test('a trait filter can rest or raid from hand and then cut printed energy',()=>{
 const hand={op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',maxEnergy:3,ap:1,
  max:1,optional:true,names:null,trait:beyond,energyPenalty:1000};
 const cards=[
  face({id:'SRC',name:'來源',energy:0,bp:5000,effects:{onPlay:[hand]}}),
  face({id:'OPEN',name:'不限',energy:0,bp:5000,effects:{onPlay:[{
   op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',maxEnergy:3,ap:1,
   max:1,optional:true,names:null}]}}),
  face({id:'STAR',name:'星',color:'yellow',energy:2,ap:1,bp:1500,traits:[beyond]}),
  face({id:'RAIDER',name:'突襲',color:'yellow',energy:3,ap:1,bp:1500,traits:[beyond],
   raidName:'底板'}),
  face({id:'BASE',name:'底板',bp:1500}),
  face({id:'OTHER',name:'其他',color:'yellow',energy:2,ap:1,bp:1500}),
  face({id:'COSTLY',name:'太貴',color:'yellow',energy:4,ap:1,bp:1500,traits:[beyond]}),
  face({id:'BLUE',name:'藍',color:'blue',energy:1,ap:1,bp:1500,traits:[beyond]})
 ];
 const rested=open(cards,151);
 fuel(rested.s);
 const star=hold(rested.s,'STAR');
 hold(rested.s,'OTHER');
 hold(rested.s,'COSTLY');
 hold(rested.s,'BLUE');
 const src=hold(rested.s,'SRC');
 let s=act(rested.pack,rested.s,a=>a.type==='play'&&a.uid===src.uid);
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 assert.equal(s.pending.trait,beyond);
 assert.deepEqual(s.pending.choices,[star.uid]);
 const skipped=dispatchUniversalAction(rested.pack,structuredClone(s),
  {type:'chooseHandRestOrRaid',uid:null});
 assert.equal(universalBp(rested.pack,skipped,live(skipped,src.uid)),5000);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===star.uid));
 assert.throws(()=>dispatchUniversalAction(rested.pack,structuredClone(s),{
  type:'chooseHandRestOrRaid',mode:'enter',uid:hold(rested.s,'OTHER').uid,line:'energy',slot:0
 }),/Action not currently legal/);
 assert.ok(s.players[0].hand.some(c=>c.uid===star.uid));
 s=act(rested.pack,s,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='enter'&&
  a.uid===star.uid&&a.line==='energy');
 assert.equal(s.players[0].energy.find(c=>c?.uid===star.uid).ready,false);
 assert.equal(universalBp(rested.pack,s,live(s,src.uid)),3000);
 assert.equal(moves(s,star.uid).length,1);
 assert.equal(moves(s,star.uid)[0].from,'hand');

 const raided=open(cards,152);
 fuel(raided.s);
 const base=seat(raided.s,0,'BASE','front',1,true);
 const raider=hold(raided.s,'RAIDER');
 const source=hold(raided.s,'SRC');
 s=act(raided.pack,raided.s,a=>a.type==='play'&&a.uid===source.uid);
 s=act(raided.pack,s,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='raid'&&
  a.uid===raider.uid&&a.baseUid===base.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===raider.uid),true);
 assert.equal(universalBp(raided.pack,s,live(s,source.uid)),2000);
 assert.equal(moves(s,raider.uid).some(e=>e.to==='front'||e.to==='raid-under'||e.from==='hand'),true);

 const plain=open(cards,153);
 fuel(plain.s);
 const other=hold(plain.s,'OTHER');
 const openSource=hold(plain.s,'OPEN');
 s=act(plain.pack,plain.s,a=>a.type==='play'&&a.uid===openSource.uid);
 assert.equal(s.pending.choices.includes(other.uid),true);
 s=act(plain.pack,s,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='enter'&&
  a.uid===other.uid&&a.line==='energy');
 assert.equal(universalBp(plain.pack,s,live(s,openSource.uid)),5000);
});

test('a live draw can be replaced by looking at the top two cards',()=>{
 const follow={op:'ifLiveThen',when:{kind:'ownDistinctTraitNames',turn:'any',
  zone:'fieldOutside',excludeSelf:false,trait:wish,min:9},
  then:[{op:'takeTopHandRestOutside',count:2}],else:[{op:'draw',count:1}]};
 const cards=[
  face({id:'LOOK',name:'查看',energy:0,traits:[wish],effects:{onPlay:[follow]}}),
  ...Array.from({length:8},(_,i)=>face({id:'N'+i,name:'名'+i,traits:[wish],bp:1000})),
  face({id:'TOP-A',name:'牌頂甲',bp:1000}),
  face({id:'TOP-B',name:'牌頂乙',bp:1000})
 ];
 function names(s,count){
  const spots=[['front',1],['front',2],['front',3],['energy',0],
   ['energy',1],['energy',2],['energy',3]];
  for(let i=0;i<count;i++){
   if(i<spots.length)seat(s,0,'N'+i,spots[i][0],spots[i][1],true);
   else s.players[0].outside.push(pull(s,0,'N'+i));
  }
 }
 const few=open(cards,161);
 fuel(few.s);
 names(few.s,5);
 const self=hold(few.s,'LOOK');
 const before=few.s.players[0].hand.length;
 let s=act(few.pack,few.s,a=>a.type==='play'&&a.uid===self.uid&&a.replaceUid===undefined);
 assert.equal(s.players[0].hand.length,before);
 assert.notEqual(s.pending?.kind,'effect-top-take-one');

 const many=open(cards,162);
 fuel(many.s);
 names(many.s,8);
 const look=hold(many.s,'LOOK');
 const first=pull(many.s,0,'TOP-A');
 const second=pull(many.s,0,'TOP-B');
 many.s.players[0].deck.unshift(first,second);
 s=act(many.pack,many.s,a=>a.type==='play'&&a.uid===look.uid&&
  a.line==='front'&&a.slot===0&&a.replaceUid===undefined);
 assert.equal(s.pending.kind,'effect-top-take-one');
 assert.deepEqual(s.pending.uids,[first.uid,second.uid]);
 const mine=universalPrivateChoices(many.pack,s,0);
 assert.deepEqual(mine.options.map(option=>option.card?.cardId),['TOP-A','TOP-B']);
 assert.equal(universalPrivateChoices(many.pack,s,1),null);
 const shown=JSON.stringify(universalPublicView(many.pack,s,1));
 assert.equal(shown.includes(first.uid),false);
 assert.equal(shown.includes(second.uid),false);
 s=act(many.pack,s,a=>a.type==='chooseTopTakeOne'&&a.uid===second.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===second.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===first.uid));
 assert.equal(s.players[0].deck.some(c=>c.uid===first.uid||c.uid===second.uid),false);
 assert.equal(moves(s,second.uid).filter(e=>e.from==='deck'&&e.to==='hand').length,1);
 assert.equal(moves(s,first.uid).filter(e=>e.from==='deck'&&e.to==='outside').length,1);
 assert.equal(assertUniversalMatch(many.pack,s),true);
});
