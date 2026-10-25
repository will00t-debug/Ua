import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState,attemptFieldActive} from '../dist/universal-v2/continuous-states.mjs';

// Card images checked 2026-10-25.
// UA08BT/BLC-1-014 バンビエッタ・バスターバイン
//   黄4 / AP1 / キャラ / BP4000 / 星十字騎士団 / 発生黄 / RAID
//   【レイド】〈バンビエッタ・バスターバイン〉アクティブにし、フロントLに移動できる。
//   【登場時】自分のターン中の場合、相手のフロントLのレストのキャラを
//   1枚まで選び、退場させる。
//   「1枚まで」 may be declined. No BP cap. Energy-line characters are not
//   the front line. A life Raid during the opponent's attack does not retire.
// UA08BT/BLC-1-096 大紅蓮氷輪丸
//   緑4 / AP1 / イベント / 発生なし / SPECIAL
//   BP5000以下の相手のフロントLのキャラを1枚選び、
//   『レストにする。それは次の1回アクティブにならない』。
//   自分の場に〈日番谷 冬獅郎〉がある場合、『退場させる』に代わる。
//   「1枚選び」 is mandatory while a legal front character exists.
//   SPECIAL: 相手のフロントLのキャラを1枚選び、退場させる。
// fullyAccepted stays 0.

const bleach=registeredV2TitlePack('bleach');
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const yellow=realDeck(['BLC-1-014','BLC-1-012','BLC-1-001','BLC-1-002','BLC-1-013','BLC-1-016','BLC-1-009'],'yellow');
const green=realDeck(['BLC-1-096','BLC-1-083','BLC-1-067','BLC-1-080','BLC-1-071','BLC-1-086'],'green');
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
 return {id:'BAD',name:'BAD',color:'green',energy:0,ap:1,bp:1000,gen:1,traits:[],
  trigger:null,implementation:'dsl',effects:{},...extra};
}

test('BLC-1-014 retires one opposing rested front character on its own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-014');
 assert.equal(printed.effect,'Raid〈邦比愛塔・芭絲塔拜茵〉：轉為 ACTIVE，可移至前線。登場：若現在是己方回合，可使最多 1 個敵方前線的 REST 角色退場。');
 assert.equal(printed.nameJa,'バンビエッタ・バスターバイン');
 assert.equal(printed.gen,1);
 assert.equal(printed.traits,'星十字騎士團');
 const card=bleach.cards['BLC-1-014'];
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.raidName,'バンビエッタ・バスターバイン');
 assert.equal(card.step,false);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects.onPlay,[{op:'retireOppRestFront',optional:true,ownTurnOnly:true}]);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({effects:{onRetire:[
  {op:'retireOppRestFront',optional:true,ownTurnOnly:true}]}})]}));
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({effects:{onPlay:[
  {op:'retireOppRestFront',optional:false,ownTurnOnly:true}]}})]}));

 const played=main(yellow,291014);
 fuel(played.s,0,['BLC-1-001','BLC-1-013','BLC-1-016','BLC-1-009']);
 assert.ok((universalEnergyByColor(played.packs,played.s,0).yellow||0)>=4);
 const rested=put(played.s,1,'BLC-1-002','front',0,false);
 const standing=put(played.s,1,'BLC-1-012','front',1,true);
 const energyRest=put(played.s,1,'BLC-1-001','energy',0,false);
 const handCard=hold(played.s,0,'BLC-1-014');
 const play=legalUniversalActions(played.packs,played.s).find(a=>
  a.type==='play'&&a.uid===handCard.uid&&a.line==='energy');
 assert.ok(play);
 let entered=dispatchUniversalAction(played.packs,played.s,play);
 const self=entered.players[0].energy.find(c=>c?.uid===handCard.uid);
 assert.equal(self.ready,false);
 assert.equal(entered.pending.kind,'effect-retire-bp');
 assert.equal(entered.pending.optional,true);
 assert.equal(entered.pending.onlyRest,true);
 assert.deepEqual(entered.pending.choices,[rested.uid]);
 assert.equal(entered.mainAbilityUsedUids.includes(self.uid),false);
 aiOk(played.packs,entered);
 assert.throws(()=>dispatchUniversalAction(played.packs,entered,
  {type:'chooseRetireBp',uid:standing.uid}),/not currently legal/);
 let skipped=dispatchUniversalAction(played.packs,entered,{type:'chooseRetireBp',uid:null});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[1].front.find(c=>c?.uid===rested.uid));
 assert.ok(skipped.players[1].energy.find(c=>c?.uid===energyRest.uid));

 const raided=main(yellow,291015);
 fuel(raided.s,0,['BLC-1-001','BLC-1-002','BLC-1-013','BLC-1-016']);
 const base=put(raided.s,0,'BLC-1-012','front',0,true);
 const wrong=raided.s.players[0].energy.find(c=>c?.cardId==='BLC-1-002');
 const foe=put(raided.s,1,'BLC-1-009','front',0,false);
 put(raided.s,1,'BLC-1-001','front',1,true);
 const rider=hold(raided.s,0,'BLC-1-014');
 const raids=legalUniversalActions(raided.packs,raided.s).filter(a=>a.type==='raid'&&a.uid===rider.uid);
 assert.ok(raids.some(a=>a.baseUid===base.uid&&a.slot===0));
 assert.equal(raids.some(a=>a.baseUid===wrong.uid),false);
 let stacked=dispatchUniversalAction(raided.packs,raided.s,
  raids.find(a=>a.baseUid===base.uid&&a.slot===0));
 assert.equal(stacked.players[0].front[0].cardId,'BLC-1-014');
 assert.equal(stacked.players[0].front[0].ready,true);
 assert.equal(stacked.players[0].front[0].stack[0].cardId,'BLC-1-012');
 assert.deepEqual(stacked.pending.choices,[foe.uid]);
 stacked=dispatchUniversalAction(raided.packs,stacked,{type:'chooseRetireBp',uid:foe.uid});
 assert.equal(stacked.pending,null);
 assert.equal(stacked.players[1].front.find(c=>c?.uid===foe.uid),undefined);
 assert.equal(stacked.players[1].outside.some(c=>c.uid===foe.uid),true);
 assert.ok(stacked.players[1].front[1]);

 const life=main(yellow,291016,1);
 fuel(life.s,0,['BLC-1-001','BLC-1-002','BLC-1-013','BLC-1-016']);
 assert.ok((universalEnergyByColor(life.packs,life.s,0).yellow||0)>=4);
 const home=put(life.s,0,'BLC-1-012','front',0,true);
 const attacker=put(life.s,1,'BLC-1-009','front',0,true);
 const already=put(life.s,1,'BLC-1-001','front',1,false);
 const revealed=life.s.players[0].life[0];
 const fromLife=take(life.s,0,'BLC-1-014');
 life.s.players[0].life[0]=fromLife;
 life.s.players[0].deck.push(revealed);
 let attacking=dispatchUniversalAction(life.packs,life.s,{type:'next'});
 assert.equal(attacking.phase,'attack');
 assert.equal(attacking.active,1);
 attacking=dispatchUniversalAction(life.packs,attacking,{type:'attack',uid:attacker.uid});
 attacking=dispatchUniversalAction(life.packs,attacking,{type:'chooseBlock',uid:null});
 const lifeRaid=legalUniversalActions(life.packs,attacking).find(a=>
  a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===home.uid);
 assert.ok(lifeRaid);
 let arrived=dispatchUniversalAction(life.packs,attacking,lifeRaid);
 for(let n=0;n<12&&arrived.pending;n++){
  assert.notEqual(arrived.pending.kind,'effect-retire-bp');
  const step=legalUniversalActions(life.packs,arrived)[0];
  assert.ok(step);
  arrived=dispatchUniversalAction(life.packs,arrived,step);
 }
 assert.equal(arrived.pending,null);
 assert.equal(arrived.effectQueue.some(e=>e.op==='retireOppRestFront'),false);
 assert.equal(arrived.players[0].front[0].cardId,'BLC-1-014');
 assert.equal(arrived.players[0].front[0].ready,true);
 assert.ok(arrived.players[1].front.find(c=>c?.uid===attacker.uid));
 assert.ok(arrived.players[1].front.find(c=>c?.uid===already.uid));
 assert.equal(assertUniversalMatch(played.packs,skipped),true);
 assert.equal(assertUniversalMatch(raided.packs,stacked),true);
 assert.equal(assertUniversalMatch(life.packs,arrived),true);
});

test('BLC-1-096 rests below 5000, and retires instead while Hitsugaya is on the field',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-096');
 assert.equal(printed.effect,'選 1 個敵方前線 BP 5000 以下角色，將其轉為 REST，並使其跳過下一次轉為 ACTIVE；己方場上有〈日番谷冬獅郎〉時，改為使該角色退場。');
 assert.equal(printed.nameJa,'大紅蓮氷輪丸');
 assert.equal(printed.gen,0);
 assert.equal(printed.type,'event');
 const card=bleach.cards['BLC-1-096'];
 assert.equal(card.gen,0);
 assert.equal(card.trigger,'special');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'restOrRetireOppFrontByOwnName',bp:5000,
  optional:false,name:'日番谷 冬獅郎'}]);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'event',bp:0,gen:0,
  trigger:'special',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
   {op:'restOrRetireOppFrontByOwnName',bp:5000,optional:true,name:'日番谷 冬獅郎'}]}})]}));
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({effects:{onPlay:[
  {op:'restOrRetireOppFrontByOwnName',bp:5000,optional:false,name:'日番谷 冬獅郎'}]}})]}));

 const opened=main(green,291096);
 fuel(opened.s,0,['BLC-1-086','BLC-1-067','BLC-1-080','BLC-1-071']);
 assert.equal(opened.s.players[0].front.concat(opened.s.players[0].energy)
  .some(c=>c&&c.cardId==='BLC-1-083'),false);
 assert.ok((universalEnergyByColor(opened.packs,opened.s,0).green||0)>=4);
 const event=hold(opened.s,0,'BLC-1-096');
 const none=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(none,undefined);
 const tall=put(opened.s,1,'BLC-1-080','front',0,true);
 tall.buffs=[{bp:2000,untilTurn:opened.s.turn}];
 assert.ok(universalBp(opened.packs,opened.s,tall)>5000);
 assert.equal(legalUniversalActions(opened.packs,opened.s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const low=put(opened.s,1,'BLC-1-067','front',1,true);
 const exact=put(opened.s,1,'BLC-1-071','front',2,true);
 exact.buffs=[{bp:3500,untilTurn:opened.s.turn}];
 assert.equal(universalBp(opened.packs,opened.s,exact),5000);
 const energyFoe=put(opened.s,1,'BLC-1-083','energy',0,true);
 assert.ok(legalUniversalActions(opened.packs,opened.s).some(a=>a.type==='event'&&a.uid===event.uid));
 let rested=dispatchUniversalAction(opened.packs,opened.s,{type:'event',uid:event.uid});
 assert.equal(rested.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(rested.pending.kind,'effect-rest-bp');
 assert.equal(rested.pending.optional,false);
 assert.equal(rested.pending.skipNextActive,true);
 assert.ok(rested.pending.choices.includes(low.uid));
 assert.ok(rested.pending.choices.includes(exact.uid));
 assert.equal(rested.pending.choices.includes(tall.uid),false);
 assert.equal(rested.pending.choices.includes(energyFoe.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.packs,rested,
  {type:'chooseRestBp',uid:null}),/not currently legal/);
 aiOk(opened.packs,rested);
 rested=dispatchUniversalAction(opened.packs,rested,{type:'chooseRestBp',uid:low.uid});
 assert.equal(rested.pending,null);
 const restedLow=rested.players[1].front.find(c=>c?.uid===low.uid);
 const restedExact=rested.players[1].front.find(c=>c?.uid===exact.uid);
 assert.equal(restedLow.ready,false);
 assert.equal(restedExact.ready,true);
 assert.deepEqual(universalPublicView(opened.packs,rested,0).players[1].front
  .find(c=>c?.uid===low.uid).restrictions,[{kind:'skipNextActive',until:null}]);
 assert.equal(attemptFieldActive(rested,1,restedLow),false);
 assert.equal(restedLow.ready,false);
 assert.equal(attemptFieldActive(rested,1,restedLow),true);
 assert.equal(restedLow.ready,true);

 const named=main(green,291097);
 fuel(named.s,0,['BLC-1-067','BLC-1-080','BLC-1-071','BLC-1-083']);
 const hitsugaya=named.s.players[0].energy.find(c=>c?.cardId==='BLC-1-083');
 assert.equal(hitsugaya.cardId,'BLC-1-083');
 const victim=put(named.s,1,'BLC-1-067','front',0,true);
 const cast=hold(named.s,0,'BLC-1-096');
 let retired=dispatchUniversalAction(named.packs,named.s,{type:'event',uid:cast.uid});
 assert.equal(retired.pending.kind,'effect-retire-bp');
 assert.equal(retired.pending.skipNextActive,undefined);
 assert.deepEqual(retired.pending.choices,[victim.uid]);
 retired=dispatchUniversalAction(named.packs,retired,{type:'chooseRetireBp',uid:victim.uid});
 assert.equal(retired.pending,null);
 assert.equal(retired.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(retired.players[1].front.find(c=>c?.uid===victim.uid),undefined);

 const quiet=main(green,291098);
 fuel(quiet.s,0,['BLC-1-067','BLC-1-080','BLC-1-071','BLC-1-083']);
 const silenced=quiet.s.players[0].energy.find(c=>c?.cardId==='BLC-1-083');
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:silenced.uid,targetUid:silenced.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 const marked=put(quiet.s,1,'BLC-1-080','front',0,true);
 const second=hold(quiet.s,0,'BLC-1-096');
 let despite=dispatchUniversalAction(quiet.packs,quiet.s,{type:'event',uid:second.uid});
 assert.equal(despite.pending.kind,'effect-retire-bp');
 despite=dispatchUniversalAction(quiet.packs,despite,{type:'chooseRetireBp',uid:marked.uid});
 assert.equal(despite.players[1].outside.some(c=>c.uid===marked.uid),true);

 const handOnly=main(green,291099);
 fuel(handOnly.s,0,['BLC-1-067','BLC-1-080','BLC-1-071','BLC-1-086']);
 const spare=take(handOnly.s,0,'BLC-1-083');
 handOnly.s.players[0].hand.push(spare);
 const heldOut=take(handOnly.s,0,'BLC-1-083');
 handOnly.s.players[0].outside.push(heldOut);
 assert.equal(handOnly.s.players[0].front.concat(handOnly.s.players[0].energy)
  .some(c=>c&&c.cardId==='BLC-1-083'),false);
 const plain=put(handOnly.s,1,'BLC-1-067','front',0,true);
 const third=hold(handOnly.s,0,'BLC-1-096');
 assert.ok((universalEnergyByColor(handOnly.packs,handOnly.s,0).green||0)>=4);
 let stayed=dispatchUniversalAction(handOnly.packs,handOnly.s,{type:'event',uid:third.uid});
 assert.equal(stayed.pending.kind,'effect-rest-bp');
 stayed=dispatchUniversalAction(handOnly.packs,stayed,{type:'chooseRestBp',uid:plain.uid});
 assert.equal(stayed.players[1].front.find(c=>c?.uid===plain.uid).ready,false);
 assert.equal(stayed.players[1].outside.some(c=>c.uid===plain.uid),false);

 const trigger=main(green,291100,1);
 const striker=put(trigger.s,1,'BLC-1-067','front',0,true);
 const huge=put(trigger.s,1,'BLC-1-080','front',1,true);
 huge.buffs=[{bp:2000,untilTurn:trigger.s.turn}];
 assert.ok(universalBp(trigger.packs,trigger.s,huge)>5000);
 const old=trigger.s.players[0].life[0];
 const special=take(trigger.s,0,'BLC-1-096');
 trigger.s.players[0].life[0]=special;
 trigger.s.players[0].deck.push(old);
 let hit=dispatchUniversalAction(trigger.packs,trigger.s,{type:'next'});
 hit=dispatchUniversalAction(trigger.packs,hit,{type:'attack',uid:striker.uid});
 hit=dispatchUniversalAction(trigger.packs,hit,{type:'chooseBlock',uid:null});
 const specialHit=legalUniversalActions(trigger.packs,hit).find(a=>
  a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===huge.uid);
 assert.ok(specialHit);
 hit=dispatchUniversalAction(trigger.packs,hit,specialHit);
 for(let n=0;n<8&&hit.pending;n++){
  const step=legalUniversalActions(trigger.packs,hit)[0];
  hit=dispatchUniversalAction(trigger.packs,hit,step);
 }
 assert.equal(hit.pending,null);
 assert.equal(hit.players[1].outside.some(c=>c.uid===huge.uid),true);
 assert.ok(hit.players[1].front.find(c=>c?.uid===striker.uid));
 assert.equal(assertUniversalMatch(opened.packs,rested),true);
 assert.equal(assertUniversalMatch(named.packs,retired),true);
 assert.equal(assertUniversalMatch(quiet.packs,despite),true);
 assert.equal(assertUniversalMatch(handOnly.packs,stayed),true);
 assert.equal(assertUniversalMatch(trigger.packs,hit),true);
});
