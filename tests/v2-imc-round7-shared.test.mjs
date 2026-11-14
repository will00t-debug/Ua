// Round 7 shared engine. Synthetic cards only. Cards still without a program
// stay out of the battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {grantContinuousState,originalEffectsDisabled} from '../dist/universal-v2/continuous-states.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';

const beyond='BEYOND THE STARLIGHT';
const wish='お願い！シンデレラ';
const DONE=['IMC-1-003','IMC-1-004','IMC-1-009','IMC-1-016','IMC-1-029','IMC-1-032','IMC-1-037','IMC-1-043','IMC-1-057','IMC-1-064','IMC-1-068','IMC-1-072','IMC-1-073','IMC-1-074','IMC-1-093','IMC-1-094','IMC-1-097'];
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
   rest.attackLoseReadyTurn||rest.passiveBonuses||rest.cannotAttack||
   rest.attackWinDraw||rest.phaseEffects?'dsl':'vanilla'),
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
function cast(pack,s,id,p=0){
 const card=hold(s,id,p);
 fuel(s,2,p);
 const action=legalUniversalActions(pack,s).find(a=>a.uid===card.uid&&a.type==='event');
 assert.ok(action,id);
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function walk(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(pack,s,a=>a.type==='chooseHandLimit');
   continue;
  }
  if(s.pending)return s;
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>30)throw Error('Did not reach '+player+' '+phase+' from '+s.phase);
 }
 return s;
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

test('the battle pack is the cards that are actually ready',()=>{
 const pack=createImcV2Pack();
 assert.deepEqual(Object.keys(pack.cards),Array.from({length:113},(_,i)=>'IMC-1-'+String(i+1).padStart(3,'0')));
 assert.equal(pack.cards['IMC-1-011'].bpGainFollow.bp,1000);
 assert.equal(pack.cards['IMC-1-039'].mainAbility.dest,'front');
 assert.equal(pack.cards['IMC-1-061'].effects.onPlay[0].op,'activeSelf');
 assert.equal(pack.cards['IMC-1-075'].effects.onPlay[0].trait,'お願い！シンデレラ');
 assert.equal(pack.cards['IMC-1-107'].mainAbility.then[0].type,'character');
 for(const id of DONE)assert.equal(pack.cards[id].id,id);
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

test('a front peek then buffs one other character or every other character from current BP',()=>{
 const peek={op:'frontPeekThenBuffOthers',frontOnly:true,oncePerTurn:true,
  minSelfBp:5000,highBp:7000,bp:1000};
 const cards=[
  face({id:'SELF',name:'看牌',bp:5000,mainAbility:peek}),
  face({id:'HIGH',name:'高看',bp:7000,mainAbility:peek}),
  face({id:'ALLY',name:'同伴',bp:2000}),
  face({id:'OTHER',name:'另一',bp:2500}),
  face({id:'SECRET',name:'秘密',bp:1000})
 ];
 const low=open(cards,201);
 fuel(low.s);
 const self=seat(low.s,0,'SELF','front',0,true);
 const ally=seat(low.s,0,'ALLY','front',1,true);
 const other=seat(low.s,0,'OTHER','energy',0,true);
 const secret=pull(low.s,0,'SECRET');
 low.s.players[0].deck.unshift(secret);
 let s=act(low.pack,low.s,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='peekBuffOthers');
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(s.pending.follow,'buffOthers');
 const mine=universalPrivateChoices(low.pack,s,0);
 assert.equal(mine.options[0].card.cardId,'SECRET');
 assert.equal(universalPrivateChoices(low.pack,s,1),null);
 const shown=JSON.stringify(universalPublicView(low.pack,s,1));
 assert.equal(shown.includes(secret.uid),false);
 s=act(low.pack,s,a=>a.type==='chooseTopCard'&&a.mode==='top');
 assert.equal(s.pending.kind,'effect-peek-buff');
 assert.equal(legalUniversalActions(low.pack,s).some(a=>a.uid===null),false);
 s=act(low.pack,s,a=>a.type==='choosePeekBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(low.pack,s,live(s,ally.uid)),3000);
 assert.equal(universalBp(low.pack,s,live(s,other.uid)),2500);
 assert.equal(legalUniversalActions(low.pack,s).some(a=>a.uid===self.uid&&a.mode==='peekBuffOthers'),false);
 assert.throws(()=>dispatchUniversalAction(low.pack,s,
  {type:'activate',uid:self.uid,mode:'peekBuffOthers'}),/Action not currently legal/);
 assert.equal(s.players[0].deck[0].uid,secret.uid);

 const high=open(cards,202);
 fuel(high.s);
 const tall=seat(high.s,0,'HIGH','front',0,true);
 const left=seat(high.s,0,'ALLY','front',1,true);
 const right=seat(high.s,0,'OTHER','front',2,true);
 const hidden=pull(high.s,0,'SECRET');
 high.s.players[0].deck.unshift(hidden);
 s=act(high.pack,high.s,a=>a.type==='activate'&&a.uid===tall.uid&&a.mode==='peekBuffOthers');
 s=act(high.pack,s,a=>a.type==='chooseTopCard'&&a.mode==='outside');
 assert.equal(s.pending,null);
 assert.equal(universalBp(high.pack,s,live(s,left.uid)),3000);
 assert.equal(universalBp(high.pack,s,live(s,right.uid)),3500);
 assert.equal(moves(s,hidden.uid).some(e=>e.from==='deck'&&e.to==='outside'&&
  e.reason==='own-effect'&&e.sourceUid===tall.uid),true);
 const turned=passTo(high.pack,dispatchUniversalAction(high.pack,s,{type:'next'}),0,'main');
 assert.equal(legalUniversalActions(high.pack,turned).some(a=>a.uid===tall.uid&&
  a.mode==='peekBuffOthers'),true);

 const side=open(cards,203);
 fuel(side.s);
 const energy=seat(side.s,0,'SELF','energy',0,true);
 assert.equal(legalUniversalActions(side.pack,side.s).some(a=>a.uid===energy.uid&&
  a.mode==='peekBuffOthers'),false);
 side.s.players[0].outside.push(...side.s.players[0].deck.splice(0));
 const empty=open(cards,204);
 fuel(empty.s);
 const lone=seat(empty.s,0,'HIGH','front',0,true);
 const mate=seat(empty.s,0,'ALLY','front',1,true);
 empty.s.players[0].outside.push(...empty.s.players[0].deck.splice(0));
 s=act(empty.pack,empty.s,a=>a.type==='activate'&&a.uid===lone.uid&&a.mode==='peekBuffOthers');
 assert.equal(s.pending,null);
 assert.equal(universalBp(empty.pack,s,live(s,mate.uid)),3000);
});

test('a field discard scales the buff and a separate rest grants impact',()=>{
 const main={op:'fieldDiscardOrRestImpact',bp:1000,triggerBp:3000,trigger:'special',
  trait:beyond,minBp:7000,impact:1};
 const cards=[
  face({id:'FIELD',name:'場地',type:'field',bp:0,mainAbility:main,traits:[beyond]}),
  face({id:'TALL',name:'高',bp:7000,traits:[beyond]}),
  face({id:'SHORT',name:'低',bp:2000,traits:[beyond]}),
  face({id:'PLAIN',name:'無',bp:8000}),
  face({id:'SPECIAL',name:'特殊',bp:1000,trigger:'special',
   triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{op:'draw',count:1}]}}),
  face({id:'NORMAL',name:'普通',bp:1000,trigger:'draw'})
 ];
 const opened=open(cards,211);
 fuel(opened.s);
 const fieldCard=seat(opened.s,0,'FIELD','energy',0,true);
 const tall=seat(opened.s,0,'TALL','front',0,true);
 const short=seat(opened.s,0,'SHORT','front',1,true);
 const special=hold(opened.s,'SPECIAL');
 hold(opened.s,'NORMAL');
 const modes=()=>legalUniversalActions(opened.pack,opened.s)
  .filter(a=>a.type==='activate'&&a.uid===fieldCard.uid).map(a=>a.mode).sort();
 assert.deepEqual(modes(),['discardScale','restImpact']);
 let s=act(opened.pack,opened.s,a=>a.mode==='discardScale'&&a.uid===fieldCard.uid);
 assert.equal(s.pending.kind,'effect-discard-scale');
 s=act(opened.pack,s,a=>a.type==='chooseDiscardScale'&&a.uid===special.uid);
 assert.equal(s.pending.kind,'effect-scale-buff');
 assert.equal(s.players[0].outside.some(c=>c.uid===special.uid),true);
 assert.equal(moves(s,special.uid).some(e=>e.from==='hand'&&e.to==='outside'&&
  e.reason==='own-effect'&&e.sourceUid===fieldCard.uid),true);
 s=act(opened.pack,s,a=>a.type==='chooseScaleBuff'&&a.uid===null);
 assert.equal(universalBp(opened.pack,s,live(s,tall.uid)),7000);
 assert.deepEqual(legalUniversalActions(opened.pack,s)
  .filter(a=>a.type==='activate'&&a.uid===fieldCard.uid).map(a=>a.mode).sort(),
  ['discardScale','restImpact']);
 const normal=s.players[0].hand.find(c=>c.cardId==='NORMAL');
 s=act(opened.pack,s,a=>a.mode==='discardScale'&&a.uid===fieldCard.uid);
 s=act(opened.pack,s,a=>a.type==='chooseDiscardScale'&&a.uid===normal.uid);
 s=act(opened.pack,s,a=>a.type==='chooseScaleBuff'&&a.uid===short.uid);
 assert.equal(universalBp(opened.pack,s,live(s,short.uid)),3000);
 assert.equal(live(s,fieldCard.uid).ready,true);
 s=act(opened.pack,s,a=>a.mode==='restImpact'&&a.uid===fieldCard.uid);
 assert.equal(live(s,fieldCard.uid).ready,false);
 assert.equal(s.pending.kind,'effect-rest-impact');
 assert.equal(s.pending.choices.includes(short.uid),false);
 s=act(opened.pack,s,a=>a.type==='chooseRestImpact'&&a.uid===tall.uid);
 assert.equal(universalImpact(opened.pack,s,live(s,tall.uid)),1);
 assert.equal(legalUniversalActions(opened.pack,s).some(a=>a.uid===fieldCard.uid&&
  a.mode==='restImpact'),false);
 live(s,fieldCard.uid).ready=true;
 assert.equal(legalUniversalActions(opened.pack,s).some(a=>a.uid===fieldCard.uid&&
  a.mode==='restImpact'),true);

 const blocked=open(cards,212);
 fuel(blocked.s);
 const area=seat(blocked.s,0,'FIELD','energy',0,true);
 seat(blocked.s,0,'PLAIN','front',0,true);
 hold(blocked.s,'NORMAL');
 assert.deepEqual(legalUniversalActions(blocked.pack,blocked.s)
  .filter(a=>a.type==='activate'&&a.uid===area.uid).map(a=>a.mode),['discardScale']);
 assert.throws(()=>dispatchUniversalAction(blocked.pack,blocked.s,
  {type:'activate',uid:area.uid,mode:'restImpact'}),/Action not currently legal/);
});

test('an event bounce can become a retirement when enough field traits are present',()=>{
 const cards=[
  face({id:'EVENT',name:'回手',type:'event',bp:0,effects:{onPlay:[{
   op:'bounceOrRetireOppByFieldTrait',bp:5000,min:3,trait:'LiPPS'}]}}),
  face({id:'A',name:'甲',bp:2000,traits:['LiPPS']}),
  face({id:'B',name:'乙',bp:2000,traits:['LiPPS']}),
  face({id:'C',name:'丙',bp:2000,traits:['LiPPS']}),
  face({id:'FOE',name:'對手',bp:4000}),
  face({id:'BIG',name:'大',bp:6000})
 ];
 const few=open(cards,221);
 fuel(few.s);
 seat(few.s,0,'A','front',0,true);
 seat(few.s,0,'B','energy',0,true);
 const foe=seat(few.s,1,'FOE','front',0,true);
 const big=seat(few.s,1,'BIG','front',1,true);
 let s=cast(few.pack,few.s,'EVENT');
 assert.equal(s.pending.kind,'effect-field-trait-bounce');
 assert.equal(legalUniversalActions(few.pack,s).some(a=>a.mode==='retire'),false);
 assert.equal(legalUniversalActions(few.pack,s).some(a=>a.uid===big.uid),false);
 assert.throws(()=>dispatchUniversalAction(few.pack,s,
  {type:'chooseFieldTraitBounce',uid:foe.uid,mode:'retire'}),/Action not currently legal/);
 assert.equal(s.players[1].front[0].uid,foe.uid);
 const event=s.players[0].resolvingEvents.find(c=>c.cardId==='EVENT')||
  s.players[0].outside.find(c=>c.cardId==='EVENT');
 s=act(few.pack,s,a=>a.type==='chooseFieldTraitBounce'&&a.uid===foe.uid&&a.mode==='bounce');
 assert.ok(s.players[1].hand.some(c=>c.uid===foe.uid));
 assert.equal(moves(s,foe.uid).some(e=>e.from==='front'&&e.to==='hand'&&
  e.reason==='opponent-effect'&&e.sourceUid===event.uid),true);

 const many=open(cards,222);
 fuel(many.s);
 seat(many.s,0,'A','front',0,true);
 seat(many.s,0,'B','front',1,true);
 seat(many.s,0,'C','energy',0,true);
 const target=seat(many.s,1,'FOE','front',0,true);
 s=cast(many.pack,many.s,'EVENT');
 assert.equal(legalUniversalActions(many.pack,s).some(a=>a.uid===target.uid&&a.mode==='retire'),true);
 s=act(many.pack,s,a=>a.type==='chooseFieldTraitBounce'&&a.uid===target.uid&&a.mode==='retire');
 assert.ok(s.players[1].outside.some(c=>c.uid===target.uid));
 assert.equal(s.players[1].front.some(c=>c?.uid===target.uid),false);
});

test('a look can rest one card, bottom the rest, then discard to activate only that card',()=>{
 const girl='FRONT';
 const look={op:'bottomOwnCharacterThen',optional:true,max:1,type:'character',then:[{
  op:'lookTopScript',count:3,rest:'bottom',afterEntered:'discardActive',
  takes:[{to:'rest',type:'character',max:1,color:'blue',trait:girl}]
 }]};
 const cards=[
  face({id:'LOOK',name:'查看',bp:3000,raidName:'底板',effects:{
   onAttack:[look],
   onRetire:[{op:'returnOwnRaidBase',optional:true,max:1}]
  }}),
  face({id:'GIRL',name:'女孩',color:'blue',bp:2000,traits:[girl],
   effects:{onPlay:[{op:'draw',count:1}]}}),
  face({id:'JUNK',name:'雜一',bp:1000}),
  face({id:'JUNK2',name:'雜二',bp:1000}),
  face({id:'BASE',name:'底板',bp:1500}),
  face({id:'AWAY',name:'放底',bp:1800}),
  face({id:'HAND',name:'手牌',bp:1000}),
  face({id:'RETIRE',name:'退場',bp:1000,effects:{onPlay:[{
   op:'retireOwnCharacterOne',optional:true,after:[{op:'draw',count:1}]
  }]}})
 ];
 const skipped=open(cards,231);
 fuel(skipped.s);
 const actor=seat(skipped.s,0,'LOOK','front',0,true);
 seat(skipped.s,0,'AWAY','front',1,true);
 let s=walk(skipped.pack,skipped.s,0,'attack');
 s=act(skipped.pack,s,a=>a.type==='attack'&&a.uid===actor.uid);
 assert.equal(s.pending.kind,'effect-bottom-own');
 s=act(skipped.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===null);
 assert.notEqual(s.pending?.kind,'effect-top-script');
 assert.notEqual(s.pending?.kind,'effect-entered-discard');

 const entered=open(cards,232);
 fuel(entered.s);
 const attacker=seat(entered.s,0,'LOOK','front',0,true);
 const away=seat(entered.s,0,'AWAY','front',1,true);
 const girlCard=pull(entered.s,0,'GIRL');
 const junk=pull(entered.s,0,'JUNK');
 const junk2=pull(entered.s,0,'JUNK2');
 entered.s.players[0].deck.unshift(girlCard,junk,junk2);
 const handBefore=entered.s.players[0].hand.length;
 s=walk(entered.pack,entered.s,0,'attack');
 s=act(entered.pack,s,a=>a.type==='attack'&&a.uid===attacker.uid);
 s=act(entered.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===away.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(legalUniversalActions(entered.pack,s).some(a=>a.mode==='raid'),false);
 const hidden=JSON.stringify(universalPublicView(entered.pack,s,1));
 assert.equal(hidden.includes(girlCard.uid),false);
 assert.equal(universalPrivateChoices(entered.pack,s,1),null);
 assert.ok(universalPrivateChoices(entered.pack,s,0).options.some(o=>o.card?.cardId==='GIRL'));
 s=act(entered.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='enter'&&a.uid===girlCard.uid);
 assert.equal(s.players[0].hand.length,handBefore+1);
 assert.equal(live(s,girlCard.uid).ready,false);
 assert.equal(moves(s,girlCard.uid).some(e=>e.from==='deck'&&e.to==='front'&&
  e.sourceUid===attacker.uid),true);
 while(s.pending?.kind==='effect-top-order'){
  s=act(entered.pack,s,a=>a.type==='chooseTopOrder');
 }
 assert.equal(s.pending.kind,'effect-entered-discard');
 const kept=s.players[0].hand[0];
 s=act(entered.pack,s,a=>a.type==='chooseEnteredDiscard'&&a.uid===null);
 assert.equal(live(s,girlCard.uid).ready,false);
 assert.ok(s.players[0].hand.some(c=>c.uid===kept.uid));

 const paid=open(cards,233);
 fuel(paid.s);
 const payer=seat(paid.s,0,'LOOK','front',0,true);
 const awayPaid=seat(paid.s,0,'AWAY','front',1,true);
 const coming=pull(paid.s,0,'GIRL');
 const a=pull(paid.s,0,'JUNK');
 const b=pull(paid.s,0,'JUNK2');
 paid.s.players[0].deck.unshift(coming,a,b);
 const cost=hold(paid.s,'HAND');
 s=walk(paid.pack,paid.s,0,'attack');
 s=act(paid.pack,s,a=>a.type==='attack'&&a.uid===payer.uid);
 s=act(paid.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===awayPaid.uid);
 s=act(paid.pack,s,a=>a.type==='chooseTopScript'&&a.mode==='enter'&&a.uid===coming.uid);
 while(s.pending?.kind==='effect-top-order')s=act(paid.pack,s,a=>a.type==='chooseTopOrder');
 s=act(paid.pack,s,a=>a.type==='chooseEnteredDiscard'&&a.uid===cost.uid);
 assert.equal(live(s,coming.uid).ready,true);
 assert.equal(moves(s,cost.uid).some(e=>e.from==='hand'&&e.to==='outside'&&
  e.reason==='own-effect'&&e.sourceUid===payer.uid),true);

 const raid=open(cards,234);
 fuel(raid.s);
 const base=seat(raid.s,0,'BASE','front',0,true);
 const top=hold(raid.s,'LOOK');
 const remover=hold(raid.s,'RETIRE');
 s=act(raid.pack,raid.s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid&&a.slot===0);
 const raider=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.ok(raider.stack.some(c=>c.uid===base.uid));
 s=act(raid.pack,s,a=>a.type==='play'&&a.uid===remover.uid&&a.line==='front'&&
  a.slot===1&&a.replaceUid===undefined);
 assert.equal(s.pending.kind,'effect-retire-own-character');
 s=act(raid.pack,s,a=>a.type==='chooseOwnCharacterRetire'&&a.uid===top.uid);
 assert.equal(s.pending?.kind,'effect-return-raid-base');
 assert.ok(s.players[0].outside.some(c=>c.uid===base.uid));
 assert.equal(moves(s,base.uid).some(e=>e.from==='raid-under'&&e.to==='outside'&&
  e.reason==='rule'&&e.attachedToUid===top.uid),true);
 s=act(raid.pack,s,a=>a.type==='chooseReturnRaidBase'&&a.uid===base.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===base.uid));
 assert.equal(moves(s,base.uid).some(e=>e.from==='outside'&&e.to==='hand'&&
  e.sourceUid===top.uid),true);
});

test('one printed option set lets the player take at most one composite sentence',()=>{
 const wishOption={op:'choosePrintedOptions',max:1,optional:true,options:[
  {id:'retire',label:'退自己',then:[{op:'optionalRetireOwnOtherThen',then:[
   {op:'draw',count:2},
   {op:'deployOwnHandRest',type:'character',color:'red',energy:3,ap:1,max:2,trait:wish}
  ]}]},
  {id:'front',label:'退對手',when:{kind:'ownDistinctTraitNames',turn:'any',
   zone:'fieldOutside',excludeSelf:false,trait:wish,min:9},
   then:[{op:'retireOppFrontOneUnderBp',bp:5000,optional:true}]}
 ]};
 assert.throws(()=>createUniversalPack({id:'probe',version:'old-068',cards:[face({
  id:'OLD',effects:{onPlay:[{op:'choosePrintedOptions',max:1,optional:true,options:[
   {id:'retire',label:'退場',then:[{op:'draw',count:2}]},
   {id:'front',label:'退場對手',then:[{op:'retireOppFrontOneUnderBp',bp:5000,optional:true}]}
  ]}]}})]}),/invalid printed option set/);
 const names=Array.from({length:8},(_,i)=>face({
  id:'N'+i,name:'名'+i,traits:[wish],bp:1000
 }));
 const cards=[
  face({id:'SELF',name:'本體',traits:[wish],effects:{onPlay:[wishOption]}}),
  face({id:'OTHER',name:'其他',bp:2000}),
  face({id:'RED',name:'紅',color:'red',energy:2,ap:1,traits:[wish],bp:1500}),
  face({id:'FOE',name:'對手',bp:3000}),
  ...names
 ];
 const few=open(cards,241);
 fuel(few.s);
 const other=seat(few.s,0,'OTHER','front',1,true);
 const self=hold(few.s,'SELF');
 const red=hold(few.s,'RED');
 let s=act(few.pack,few.s,a=>a.type==='play'&&a.uid===self.uid&&a.slot===0&&
  a.replaceUid===undefined);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.options.map(o=>o.id),['retire']);
 s=act(few.pack,s,a=>a.type==='chooseOrderedSubset'&&a.mode==='confirm');
 assert.equal(live(s,other.uid).uid,other.uid);
 const again=open(cards,242);
 fuel(again.s);
 const victim=seat(again.s,0,'OTHER','front',1,true);
 const actor=hold(again.s,'SELF');
 hold(again.s,'RED');
 const before=again.s.players[0].hand.length;
 s=act(again.pack,again.s,a=>a.type==='play'&&a.uid===actor.uid&&a.slot===0&&
  a.replaceUid===undefined);
 s=act(again.pack,s,a=>a.type==='chooseOrderedSubset'&&a.mode==='pick'&&a.id==='retire');
 s=act(again.pack,s,a=>a.type==='chooseOrderedSubset'&&a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-option-retire-own');
 s=act(again.pack,s,a=>a.type==='chooseRetireOwnOther'&&a.uid===victim.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.pending.kind,'effect-hand-rest');
 s=act(again.pack,s,a=>a.type==='chooseHandRest'&&a.uid===red.uid);
 assert.equal(live(s,red.uid).ready,false);
 assert.equal(moves(s,red.uid).some(e=>e.from==='hand'&&(e.to==='front'||e.to==='energy')),true);

 const many=open(cards,243);
 fuel(many.s);
 for(let i=0;i<4;i++)seat(many.s,0,'N'+i,i<3?'front':'energy',i<3?i+1:0,true);
 for(let i=4;i<8;i++)many.s.players[0].outside.push(pull(many.s,0,'N'+i));
 seat(many.s,1,'FOE','front',0,true);
 const ninth=hold(many.s,'SELF');
 s=act(many.pack,many.s,a=>a.type==='play'&&a.uid===ninth.uid&&a.slot===0&&
  a.replaceUid===undefined);
 assert.deepEqual(s.pending.options.map(o=>o.id).sort(),['front','retire']);
 s=act(many.pack,s,a=>a.type==='chooseOrderedSubset'&&a.mode==='pick'&&a.id==='retire');
 assert.throws(()=>dispatchUniversalAction(many.pack,s,
  {type:'chooseOrderedSubset',mode:'pick',id:'front'}),/Action not currently legal/);
});

test('a trait payment can activate, and a battle win can optionally draw one',()=>{
 const cards=[
  face({id:'SELF',name:'勝利',bp:8000,traits:[wish],attackWinDraw:{
   count:1,optional:true,condition:{kind:'ownDistinctTraitNames',turn:'any',
    zone:'fieldOutside',excludeSelf:false,trait:wish,min:9}
  },effects:{onPlay:[{op:'optionalHandTraitOutsideThenActive',trait:wish}]}}),
  face({id:'PAY',name:'支付',traits:[wish],bp:1000}),
  face({id:'WALL',name:'牆',bp:1500}),
  ...Array.from({length:8},(_,i)=>face({id:'N'+i,name:'名'+i,traits:[wish],bp:1000}))
 ];
 const quiet=open(cards,251);
 fuel(quiet.s);
 const self=hold(quiet.s,'SELF');
 quiet.s.players[0].deck.push(...quiet.s.players[0].hand.filter(c=>c.uid!==self.uid));
 quiet.s.players[0].hand=[self];
 let s=act(quiet.pack,quiet.s,a=>a.type==='play'&&a.uid===self.uid&&a.slot===0&&
  a.replaceUid===undefined);
 assert.equal(s.pending,null);
 const paid=open(cards,252);
 fuel(paid.s);
 const actor=hold(paid.s,'SELF');
 const cost=hold(paid.s,'PAY');
 s=act(paid.pack,paid.s,a=>a.type==='play'&&a.uid===actor.uid&&a.slot===0&&
  a.replaceUid===undefined);
 assert.equal(s.pending.kind,'effect-hand-trait-active');
 live(s,actor.uid).ready=false;
 s=act(paid.pack,s,a=>a.type==='chooseHandTraitActive'&&a.uid===null);
 assert.equal(live(s,actor.uid).ready,false);
 assert.ok(s.players[0].hand.some(c=>c.uid===cost.uid));
 const again=open(cards,253);
 fuel(again.s);
 const winner=hold(again.s,'SELF');
 const payment=hold(again.s,'PAY');
 s=act(again.pack,again.s,a=>a.type==='play'&&a.uid===winner.uid&&a.line==='front'&&
  a.slot===0&&a.replaceUid===undefined);
 s=act(again.pack,s,a=>a.type==='chooseHandTraitActive'&&a.uid===payment.uid);
 assert.equal(live(s,winner.uid).ready,true);
 assert.equal(moves(s,payment.uid).some(e=>e.from==='hand'&&e.to==='outside'&&
  e.reason==='payment'&&e.sourceUid===winner.uid),true);
 for(let i=0;i<4;i++)seat(s,0,'N'+i,i<3?'front':'energy',i<3?i+1:0,true);
 for(let i=4;i<8;i++)s.players[0].outside.push(pull(s,0,'N'+i));
 seat(s,1,'WALL','front',0,true);
 const deck=s.players[0].deck.length;
 s=walk(again.pack,s,0,'attack');
 s=act(again.pack,s,a=>a.type==='attack'&&a.uid===winner.uid);
 s=dispatchUniversalAction(again.pack,s,{type:'chooseBlock',uid:s.players[1].front[0].uid});
 assert.equal(s.pending.kind,'effect-attack-win-draw');
 s=act(again.pack,s,a=>a.type==='chooseAttackWinDraw'&&a.mode==='skip');
 assert.equal(s.players[0].deck.length,deck);
 const drawn=open(cards,254);
 fuel(drawn.s);
 const striker=seat(drawn.s,0,'SELF','front',0,true);
 for(let i=0;i<4;i++)seat(drawn.s,0,'N'+i,i<3?'front':'energy',i<3?i+1:0,true);
 for(let i=4;i<8;i++)drawn.s.players[0].outside.push(pull(drawn.s,0,'N'+i));
 const wall=seat(drawn.s,1,'WALL','front',0,true);
 const before=drawn.s.players[0].deck.length;
 s=walk(drawn.pack,drawn.s,0,'attack');
 s=act(drawn.pack,s,a=>a.type==='attack'&&a.uid===striker.uid);
 s=dispatchUniversalAction(drawn.pack,s,{type:'chooseBlock',uid:wall.uid});
 s=act(drawn.pack,s,a=>a.type==='chooseAttackWinDraw'&&a.mode==='draw');
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.zoneMoveEvents.some(e=>e.to==='hand'&&e.from==='deck'&&
  e.reason==='own-effect'&&e.sourceUid===striker.uid),true);
});

test('a hand payment during an attack can rest the live raid base onto the field',()=>{
 const cards=[
  face({id:'TOP',name:'上層',bp:4000,raidName:'底板',effects:{
   onAttack:[{op:'optionalHandOutsideThenRaidBase'}]
  }}),
  face({id:'BASE',name:'底板',bp:2000}),
  face({id:'PAY',name:'支付',bp:1000}),
  face({id:'OTHER',name:'其他',bp:1500})
 ];
 const paid=open(cards,261);
 fuel(paid.s);
 const base=seat(paid.s,0,'BASE','front',0,true);
 const top=hold(paid.s,'TOP');
 const cost=hold(paid.s,'PAY');
 let s=act(paid.pack,paid.s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid&&a.slot===0);
 s=walk(paid.pack,s,0,'attack');
 s=act(paid.pack,s,a=>a.type==='attack'&&a.uid===top.uid);
 assert.equal(s.pending.kind,'effect-pay-raid-base');
 s=act(paid.pack,s,a=>a.type==='choosePayRaidBase'&&a.uid===null);
 assert.equal(s.players[0].front[0].stack.some(c=>c.uid===base.uid),true);
 const again=open(cards,262);
 fuel(again.s);
 const under=seat(again.s,0,'BASE','front',0,true);
 const raider=hold(again.s,'TOP');
 const payment=hold(again.s,'PAY');
 s=act(again.pack,again.s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===under.uid&&a.slot===0);
 s=walk(again.pack,s,0,'attack');
 s=act(again.pack,s,a=>a.type==='attack'&&a.uid===raider.uid);
 s=act(again.pack,s,a=>a.type==='choosePayRaidBase'&&a.uid===payment.uid);
 assert.equal(s.pending.kind,'effect-raid-under-rest');
 s=act(again.pack,s,a=>a.type==='chooseRaidUnderRest'&&a.uid===under.uid&&a.line==='front');
 assert.equal(live(s,under.uid).ready,false);
 assert.equal(s.players[0].front.find(c=>c?.uid===raider.uid).stack.some(c=>c.uid===under.uid),false);
 assert.equal(live(s,under.uid).raidBaseUid,undefined);
 assert.equal(moves(s,under.uid).some(e=>e.from==='raid-under'&&e.to==='front'&&
  e.attachedToUid===raider.uid&&e.sourceUid===raider.uid),true);
 assert.equal(moves(s,payment.uid).some(e=>e.from==='hand'&&e.to==='outside'&&
  e.reason==='payment'),true);
 const empty=open(cards,263);
 fuel(empty.s);
 const lonely=seat(empty.s,0,'BASE','front',1,true);
 const plain=hold(empty.s,'TOP');
 s=act(empty.pack,empty.s,a=>a.type==='play'&&a.uid===plain.uid&&a.line==='front'&&
  a.slot===0&&a.replaceUid===undefined);
 s.players[0].deck.push(...s.players[0].hand);
 s.players[0].hand=[];
 live(s,plain.uid).ready=true;
 s=walk(empty.pack,s,0,'attack');
 s=act(empty.pack,s,a=>a.type==='attack'&&a.uid===plain.uid);
 assert.notEqual(s.pending?.kind,'effect-pay-raid-base');
 assert.equal(live(s,lonely.uid).uid,lonely.uid);
});

test('paying AP at the attack start removes only this turn printed effects',()=>{
 const cards=[
  face({id:'SELF',name:'沉默',bp:3000,cannotAttack:true,ownTurnBp:1000,opponentTurnBp:-1000,
   phaseEffects:[{phase:'attack',edge:'start',turn:'own',then:[{
    op:'optionalPayApThen',ap:1,optional:true,then:[{op:'silencePrintedSelf'}]
   }]}]}),
  face({id:'GRANT',name:'禁止',type:'field',bp:0})
 ];
 const broke=open(cards,271);
 fuel(broke.s,0);
 const self=seat(broke.s,0,'SELF','front',0,true);
 let s=walk(broke.pack,broke.s,0,'attack');
 assert.equal(s.pending,null);
 assert.equal(legalUniversalActions(broke.pack,s).some(a=>a.type==='attack'&&a.uid===self.uid),false);
 const skipped=open(cards,272);
 fuel(skipped.s);
 const quiet=seat(skipped.s,0,'SELF','front',0,true);
 s=walk(skipped.pack,skipped.s,0,'attack');
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 const readyAp=()=>s.players[0].apCards.filter(c=>c.ready).length;
 const beforeSkip=readyAp();
 s=act(skipped.pack,s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='skip');
 assert.equal(readyAp(),beforeSkip);
 assert.equal(originalEffectsDisabled(s,quiet),false);
 assert.equal(universalBp(skipped.pack,s,quiet),4000);
 const paid=open(cards,273);
 fuel(paid.s);
 const actor=seat(paid.s,0,'SELF','front',0,true);
 actor.impactGranted={turn:paid.s.turn,stamp:actor.fieldEntryStamp,amount:1};
 s=walk(paid.pack,paid.s,0,'attack');
 const beforePay=s.players[0].apCards.filter(c=>c.ready).length;
 s=act(paid.pack,s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,beforePay-1);
 assert.equal(originalEffectsDisabled(s,actor),true);
 actor.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(paid.pack,s,actor),5000);
 assert.equal(legalUniversalActions(paid.pack,s).some(a=>a.type==='attack'&&a.uid===actor.uid),true);
 const grant=seat(paid.s,0,'GRANT','energy',0,true);
 grantContinuousState(s,{kind:'cannotAttack',controller:0,sourceUid:grant.uid,
  targetUid:actor.uid,until:{player:0,phase:'start',edge:'start'}});
 assert.equal(legalUniversalActions(paid.pack,s).some(a=>a.type==='attack'&&a.uid===actor.uid),false);
 assert.equal(actor.impactGranted.amount,1);
 s=walk(paid.pack,s,1,'main');
 assert.equal(originalEffectsDisabled(s,actor),false);
 assert.equal(universalBp(paid.pack,s,actor),2000);
 s=walk(paid.pack,s,0,'attack');
 if(s.pending?.kind==='effect-optional-pay-ap')
  s=act(paid.pack,s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='skip');
 assert.equal(originalEffectsDisabled(s,actor),false);
 assert.equal(legalUniversalActions(paid.pack,s).some(a=>a.type==='attack'&&a.uid===actor.uid),false);
});
