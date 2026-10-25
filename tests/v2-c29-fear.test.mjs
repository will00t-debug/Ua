import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState,attemptFieldActive} from '../dist/universal-v2/continuous-states.mjs';

// Card image checked 2026-10-25.
// UA08BT/BLC-1-031 The Fear
//   黄3 / AP1 / イベント / 発生なし / SPECIAL
//   相手のフロントLのキャラを1枚まで選び、『レストにする』。
//   自分の場に〈エス・ノト〉がある場合、
//   『レストにする。それは次の1回アクティブにならない。カードを1枚引く』に代わる。
//   「1枚まで」 may be declined, and declining does not draw.
//   Zero front characters still let the event be played, with no draw.
//   Hand, outside and the opponent's 〈エス・ノト〉 do not switch the sentence.
//   Silence keeps the printed name.
//   SPECIAL: 相手のフロントLのキャラを1枚選び、退場させる。
// fullyAccepted stays 0.

const bleach=registeredV2TitlePack('bleach');
const NAME='エス・ノト';
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const yellow=realDeck(['BLC-1-031','BLC-1-002','BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-016'],'yellow');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index,ready=true){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function hold(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function main(deck,seed,first=0){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first});
 for(let n=0;n<8&&!(s.phase==='main'&&s.active===first);n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(s.active,first);
 return {packs,s};
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function fuel(s,p,ids){
 ids.forEach((id,i)=>put(s,p,id,'energy',i,true));
}
function shell(extra){
 return {id:'BAD',name:'BAD',color:'yellow',energy:0,ap:1,bp:1000,gen:1,traits:[],
  trigger:null,implementation:'dsl',effects:{},...extra};
}
function live(s,p,uid){
 return s.players[p].front.find(c=>c?.uid===uid)||
  s.players[p].energy.find(c=>c?.uid===uid);
}

test('BLC-1-031 rests one front character, and draws only after the Es Not sentence',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-031');
 assert.equal(printed.effect,'可選最多 1 個敵方前線角色，將其轉為 REST；己方場上有〈艾斯・諾特〉時，改為將其轉為 REST、使其跳過下一次轉為 ACTIVE，並抽 1 張。');
 assert.equal(printed.nameJa,'The Fear');
 assert.equal(printed.gen,0);
 assert.equal(printed.type,'event');
 const card=bleach.cards['BLC-1-031'];
 assert.equal(card.gen,0);
 assert.equal(card.step,false);
 assert.equal(card.trigger,'special');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'restOrRestSkipDrawByOwnName',optional:true,
  name:NAME,draw:1}]);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'event',bp:0,gen:0,
  trigger:'special',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
   {op:'restOrRestSkipDrawByOwnName',optional:false,name:NAME,draw:1}]}})]}),
  /invalid named REST or skip draw/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'event',bp:0,gen:0,
  trigger:'special',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
   {op:'restOrRestSkipDrawByOwnName',optional:true,name:NAME,draw:2}]}})]}),
  /invalid named REST or skip draw/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'character',effects:{onPlay:[
  {op:'restOrRestSkipDrawByOwnName',optional:true,name:NAME,draw:1}]}})]}),
  /named REST-or-skip-draw is only an event onPlay effect/);

 const plain=main(yellow,291031);
 fuel(plain.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-016']);
 assert.equal(plain.s.players[0].front.concat(plain.s.players[0].energy)
  .some(c=>c&&c.cardId==='BLC-1-002'),false);
 assert.ok((universalEnergyByColor(plain.packs,plain.s,0).yellow||0)>=3);
 const standing=put(plain.s,1,'BLC-1-009','front',0,true);
 const other=put(plain.s,1,'BLC-1-012','front',1,true);
 const energyFoe=put(plain.s,1,'BLC-1-001','energy',0,true);
 const event=hold(plain.s,0,'BLC-1-031');
 assert.ok(legalUniversalActions(plain.packs,plain.s).some(a=>a.type==='event'&&a.uid===event.uid));
 let opened=dispatchUniversalAction(plain.packs,plain.s,{type:'event',uid:event.uid});
 assert.equal(opened.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(opened.pending.kind,'effect-rest-bp');
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.skipNextActive,undefined);
 assert.equal(opened.pending.namedDraw,undefined);
 assert.ok(opened.pending.choices.includes(standing.uid));
 assert.ok(opened.pending.choices.includes(other.uid));
 assert.equal(opened.pending.choices.includes(energyFoe.uid),false);
 aiOk(plain.packs,opened);
 const deckAtChoice=opened.players[0].deck.length;
 const handAtChoice=opened.players[0].hand.length;
 assert.throws(()=>dispatchUniversalAction(plain.packs,opened,
  {type:'chooseRestBp',uid:energyFoe.uid}),/not currently legal/);
 let rested=dispatchUniversalAction(plain.packs,opened,{type:'chooseRestBp',uid:standing.uid});
 assert.equal(rested.pending,null);
 assert.equal(rested.players[0].deck.length,deckAtChoice);
 assert.equal(rested.players[0].hand.length,handAtChoice);
 const restedOne=live(rested,1,standing.uid);
 assert.equal(restedOne.ready,false);
 assert.equal(live(rested,1,other.uid).ready,true);
 assert.equal(universalPublicView(plain.packs,rested,0).players[1].front
  .find(c=>c?.uid===standing.uid).restrictions.length,0);
 assert.equal(attemptFieldActive(rested,1,restedOne),true);
 assert.equal(restedOne.ready,true);
 const forged={...rested,pending:{kind:'effect-rest-bp',player:0,sourceUid:event.uid,
  choices:[other.uid],limit:null,optional:true,skipNextActive:true,
  namedDraw:1,namedDrawName:NAME}};
 assert.throws(()=>assertUniversalMatch(plain.packs,forged),/Unproven named REST or skip draw/);

 const declinedPlain=main(yellow,291039);
 fuel(declinedPlain.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-016']);
 const kept=put(declinedPlain.s,1,'BLC-1-009','front',0,true);
 const declinedEvent=hold(declinedPlain.s,0,'BLC-1-031');
 let declinedOpen=dispatchUniversalAction(declinedPlain.packs,declinedPlain.s,
  {type:'event',uid:declinedEvent.uid});
 const declinedDeck=declinedOpen.players[0].deck.length;
 declinedOpen=dispatchUniversalAction(declinedPlain.packs,declinedOpen,
  {type:'chooseRestBp',uid:null});
 assert.equal(declinedOpen.pending,null);
 assert.equal(declinedOpen.players[0].deck.length,declinedDeck);
 assert.equal(live(declinedOpen,1,kept.uid).ready,true);

 const named=main(yellow,291032);
 fuel(named.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-002']);
 const esNot=named.s.players[0].energy.find(c=>c?.cardId==='BLC-1-002');
 assert.equal(esNot.cardId,'BLC-1-002');
 const victim=put(named.s,1,'BLC-1-009','front',0,true);
 const spare=put(named.s,1,'BLC-1-016','front',1,true);
 const cast=hold(named.s,0,'BLC-1-031');
 let branch=dispatchUniversalAction(named.packs,named.s,{type:'event',uid:cast.uid});
 assert.equal(branch.pending.kind,'effect-rest-bp');
 assert.equal(branch.pending.skipNextActive,true);
 assert.equal(branch.pending.namedDraw,1);
 assert.equal(branch.pending.namedDrawName,NAME);
 assert.equal(assertUniversalMatch(named.packs,branch),true);
 aiOk(named.packs,branch);
 const drawDeck=branch.players[0].deck.length;
 const drawHand=branch.players[0].hand.length;
 branch=dispatchUniversalAction(named.packs,branch,{type:'chooseRestBp',uid:victim.uid});
 assert.equal(branch.pending,null);
 assert.equal(branch.players[0].deck.length,drawDeck-1);
 assert.equal(branch.players[0].hand.length,drawHand+1);
 const marked=live(branch,1,victim.uid);
 assert.equal(marked.ready,false);
 assert.equal(live(branch,1,spare.uid).ready,true);
 assert.deepEqual(universalPublicView(named.packs,branch,0).players[1].front
  .find(c=>c?.uid===victim.uid).restrictions,[{kind:'skipNextActive',until:null}]);
 assert.equal(attemptFieldActive(branch,1,marked),false);
 assert.equal(marked.ready,false);
 assert.equal(attemptFieldActive(branch,1,marked),true);
 assert.equal(marked.ready,true);

 const passed=main(yellow,291040);
 fuel(passed.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-002']);
 const passedVictim=put(passed.s,1,'BLC-1-009','front',0,true);
 const passedEvent=hold(passed.s,0,'BLC-1-031');
 let passedOpen=dispatchUniversalAction(passed.packs,passed.s,{type:'event',uid:passedEvent.uid});
 assert.equal(passedOpen.pending.namedDraw,1);
 const passedDeck=passedOpen.players[0].deck.length;
 const passedHand=passedOpen.players[0].hand.length;
 passedOpen=dispatchUniversalAction(passed.packs,passedOpen,{type:'chooseRestBp',uid:null});
 assert.equal(passedOpen.pending,null);
 assert.equal(passedOpen.players[0].deck.length,passedDeck);
 assert.equal(passedOpen.players[0].hand.length,passedHand);
 assert.equal(live(passedOpen,1,passedVictim.uid).ready,true);

 const frontName=main(yellow,291033);
 fuel(frontName.s,0,['BLC-1-001','BLC-1-009','BLC-1-012']);
 const onFront=put(frontName.s,0,'BLC-1-002','front',0,true);
 assert.equal(onFront.cardId,'BLC-1-002');
 const frontVictim=put(frontName.s,1,'BLC-1-009','front',0,true);
 const frontEvent=hold(frontName.s,0,'BLC-1-031');
 let fromFront=dispatchUniversalAction(frontName.packs,frontName.s,{type:'event',uid:frontEvent.uid});
 assert.equal(fromFront.pending.namedDraw,1);
 const frontDeck=fromFront.players[0].deck.length;
 fromFront=dispatchUniversalAction(frontName.packs,fromFront,{type:'chooseRestBp',uid:frontVictim.uid});
 assert.equal(fromFront.players[0].deck.length,frontDeck-1);
 assert.equal(live(fromFront,1,frontVictim.uid).ready,false);

 const quiet=main(yellow,291034);
 fuel(quiet.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-002']);
 const silenced=quiet.s.players[0].energy.find(c=>c?.cardId==='BLC-1-002');
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:silenced.uid,targetUid:silenced.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 const quietVictim=put(quiet.s,1,'BLC-1-016','front',0,true);
 const quietEvent=hold(quiet.s,0,'BLC-1-031');
 let despite=dispatchUniversalAction(quiet.packs,quiet.s,{type:'event',uid:quietEvent.uid});
 assert.equal(despite.pending.namedDraw,1);
 const quietDeck=despite.players[0].deck.length;
 despite=dispatchUniversalAction(quiet.packs,despite,{type:'chooseRestBp',uid:quietVictim.uid});
 assert.equal(despite.players[0].deck.length,quietDeck-1);
 assert.equal(attemptFieldActive(despite,1,live(despite,1,quietVictim.uid)),false);

 const held=main(yellow,291035);
 fuel(held.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-016']);
 held.s.players[0].hand.push(take(held.s,0,'BLC-1-002'));
 held.s.players[0].outside.push(take(held.s,0,'BLC-1-002'));
 assert.equal(held.s.players[0].front.concat(held.s.players[0].energy)
  .some(c=>c&&c.cardId==='BLC-1-002'),false);
 const heldVictim=put(held.s,1,'BLC-1-009','front',0,true);
 const heldEvent=hold(held.s,0,'BLC-1-031');
 let away=dispatchUniversalAction(held.packs,held.s,{type:'event',uid:heldEvent.uid});
 assert.equal(away.pending.namedDraw,undefined);
 assert.equal(away.pending.skipNextActive,undefined);
 const awayDeck=away.players[0].deck.length;
 away=dispatchUniversalAction(held.packs,away,{type:'chooseRestBp',uid:heldVictim.uid});
 assert.equal(away.players[0].deck.length,awayDeck);
 assert.equal(live(away,1,heldVictim.uid).ready,false);
 assert.equal(universalPublicView(held.packs,away,0).players[1].front
  .find(c=>c?.uid===heldVictim.uid).restrictions.length,0);

 const theirs=main(yellow,291036);
 fuel(theirs.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-016']);
 const oppName=put(theirs.s,1,'BLC-1-002','front',0,true);
 const oppEvent=hold(theirs.s,0,'BLC-1-031');
 let opp=dispatchUniversalAction(theirs.packs,theirs.s,{type:'event',uid:oppEvent.uid});
 assert.equal(opp.pending.namedDraw,undefined);
 assert.deepEqual(opp.pending.choices,[oppName.uid]);
 const oppDeck=opp.players[0].deck.length;
 opp=dispatchUniversalAction(theirs.packs,opp,{type:'chooseRestBp',uid:oppName.uid});
 assert.equal(opp.players[0].deck.length,oppDeck);
 assert.equal(live(opp,1,oppName.uid).ready,false);
 assert.equal(attemptFieldActive(opp,1,live(opp,1,oppName.uid)),true);

 const empty=main(yellow,291037);
 fuel(empty.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-002']);
 const emptyEvent=hold(empty.s,0,'BLC-1-031');
 const emptyDeck=empty.s.players[0].deck.length;
 const emptyHand=empty.s.players[0].hand.length;
 assert.ok(legalUniversalActions(empty.packs,empty.s).some(a=>a.type==='event'&&a.uid===emptyEvent.uid));
 let missed=dispatchUniversalAction(empty.packs,empty.s,{type:'event',uid:emptyEvent.uid});
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].deck.length,emptyDeck);
 assert.equal(missed.players[0].hand.length,emptyHand-1);
 assert.equal(missed.players[0].outside.some(c=>c.uid===emptyEvent.uid),true);

 const trigger=main(yellow,291038,1);
 fuel(trigger.s,0,['BLC-1-001','BLC-1-009','BLC-1-012','BLC-1-002']);
 const striker=put(trigger.s,1,'BLC-1-009','front',0,true);
 const stays=put(trigger.s,1,'BLC-1-016','front',1,true);
 const retired=put(trigger.s,1,'BLC-1-001','front',2,true);
 const old=trigger.s.players[0].life[0];
 const special=take(trigger.s,0,'BLC-1-031');
 trigger.s.players[0].life[0]=special;
 trigger.s.players[0].deck.push(old);
 const handBefore=trigger.s.players[0].hand.length;
 let hit=dispatchUniversalAction(trigger.packs,trigger.s,{type:'next'});
 hit=dispatchUniversalAction(trigger.packs,hit,{type:'attack',uid:striker.uid});
 hit=dispatchUniversalAction(trigger.packs,hit,{type:'chooseBlock',uid:null});
 const specialHit=legalUniversalActions(trigger.packs,hit).find(a=>
  a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===retired.uid);
 assert.ok(specialHit);
 hit=dispatchUniversalAction(trigger.packs,hit,specialHit);
 for(let n=0;n<8&&hit.pending;n++){
  assert.notEqual(hit.pending.kind,'effect-rest-bp');
  const step=legalUniversalActions(trigger.packs,hit)[0];
  hit=dispatchUniversalAction(trigger.packs,hit,step);
 }
 assert.equal(hit.pending,null);
 assert.equal(hit.players[1].outside.some(c=>c.uid===retired.uid),true);
 assert.ok(hit.players[1].front.find(c=>c?.uid===striker.uid));
 assert.ok(hit.players[1].front.find(c=>c?.uid===stays.uid));
 assert.equal(hit.players[0].hand.length,handBefore);

 assert.equal(assertUniversalMatch(plain.packs,rested),true);
 assert.equal(assertUniversalMatch(declinedPlain.packs,declinedOpen),true);
 assert.equal(assertUniversalMatch(named.packs,branch),true);
 assert.equal(assertUniversalMatch(passed.packs,passedOpen),true);
 assert.equal(assertUniversalMatch(frontName.packs,fromFront),true);
 assert.equal(assertUniversalMatch(quiet.packs,despite),true);
 assert.equal(assertUniversalMatch(held.packs,away),true);
 assert.equal(assertUniversalMatch(theirs.packs,opp),true);
 assert.equal(assertUniversalMatch(empty.packs,missed),true);
 assert.equal(assertUniversalMatch(trigger.packs,hit),true);
});
