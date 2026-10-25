import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// Card images checked 2026-10-25.
// EX15BT/BLC-4-047 コン
//   紫0 / AP1 / キャラ / BP500 / no trait / 発生紫 / DRAW
//   【起動メイン】【レストにする】【このカードを退場させる】
//   自分の場外から必要エナジーが0の紫の〈黒崎 一護〉を1枚まで
//   自分の場にレストで登場させる。
//   「1枚まで」 may be declined. No AP filter and no Raid exclusion.
//   The retired Kon is in outside before the choice and is not a target.
// UA08BT/BLC-1-011 バズビー
//   黄5 / AP1 / キャラ / BP4000 / 星十字騎士団 / 発生黄 / DRAW
//   Image: 【起動メイン】手札を1枚場外に置く。このキャラはこのターン中、
//   【ダメージ（2）】と「このキャラがアタックしてバトルに勝利した時、
//   カードを1枚引く。」を得る。
//   No ターン1 and no front restriction. The stored catalogue sentence
//   says 主要階段 and does not print the timing icon.
// DRAW life triggers stay the generic sentence. fullyAccepted stays 0.

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
const purple=realDeck(['BLC-4-047','BLC-1-039','BLC-1-040','BLC-1-045'],'purple');
const yellow=realDeck(['BLC-1-011','BLC-1-002','BLC-1-009','BLC-1-001','BLC-1-017','BLC-1-010'],'yellow');
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
function outside(s,p,id){
 const c=take(s,p,id);
 s.players[p].outside.push(c);
 return c;
}
function main(deck,seed){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(s.active,0);
 return {packs,s};
}
function advance(packs,s,pred,limit=48){
 for(let n=0;n<limit&&!pred(s);n++){
  assert.equal(s.pending,null);
  const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(step);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(pred(s),true);
 return s;
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function live(s,p,uid){
 for(const line of ['front','energy']){
  const c=s.players[p][line].find(x=>x?.uid===uid);
  if(c)return c;
 }
 return null;
}
function activate(packs,s,uid,mode){
 return legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode===mode);
}
function quietLife(s,p,ids){
 const pl=s.players[p],want=new Set(ids),pool=[];
 for(const zone of ['life','deck','outside']){
  const list=pl[zone];
  for(let i=list.length-1;i>=0&&pool.length<7;i--)
   if(want.has(list[i].cardId))pool.push(list.splice(i,1)[0]);
 }
 assert.equal(pool.length,7);
 pl.deck.push(...pl.life.splice(0));
 pl.life.push(...pool);
 for(const c of pl.life)assert.equal(bleach.cards[c.cardId].trigger,null);
}
function finishLife(packs,s){
 while(s.pending?.kind==='life-batch-order'||s.pending?.kind==='life-trigger'){
  const a=legalUniversalActions(packs,s)[0];
  assert.ok(a);
  s=dispatchUniversalAction(packs,s,a);
 }
 return s;
}

test('BLC-4-047 rests, retires, then optionally deploys one energy-0 purple Ichigo',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-047');
 assert.equal(printed.effect,'啟動・主要〔改為Rest，並使此卡退場〕：可從自己場外將最多1張所需能量0的紫色《黑崎一護》以Rest登場。');
 assert.equal(printed.nameJa,'コン');
 assert.equal(printed.gen,1);
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-047'];
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.step,false);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.mainAbility,{op:'restRetireDeployOutside',then:[
  {op:'deployOutsideEnergyRest',name:'黒崎 一護',color:'purple',maxEnergy:0,optional:true,anyAp:true}]});

 const opened=main(purple,294047);
 const self=put(opened.s,0,'BLC-4-047','front',0,true);
 const energyCopy=put(opened.s,0,'BLC-4-047','energy',0,true);
 const good=outside(opened.s,0,'BLC-1-039');
 const costly=outside(opened.s,0,'BLC-1-040');
 const renji=outside(opened.s,0,'BLC-1-045');
 const retiredSelf=outside(opened.s,0,'BLC-4-047');
 const resting=put(opened.s,0,'BLC-4-047','front',1,false);
 assert.equal(activate(opened.packs,opened.s,resting.uid,'restRetireDeploy'),undefined);
 assert.throws(()=>dispatchUniversalAction(opened.packs,opened.s,
  {type:'activate',uid:resting.uid,mode:'restRetireDeploy'}),/not currently legal/);
 const foe=put(opened.s,1,'BLC-1-045','front',0,true);
 grantContinuousState(opened.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:foe.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(activate(opened.packs,opened.s,self.uid,'restRetireDeploy'),undefined);
 opened.s.continuousStates=[];
 const act=activate(opened.packs,opened.s,self.uid,'restRetireDeploy');
 assert.ok(act);
 assert.ok(activate(opened.packs,opened.s,energyCopy.uid,'restRetireDeploy'));
 aiOk(opened.packs,opened.s);
 let used=dispatchUniversalAction(opened.packs,opened.s,act);
 assert.equal(live(used,0,self.uid),null);
 assert.equal(used.players[0].outside.some(c=>c.uid===self.uid),true);
 assert.equal(used.pending.kind,'effect-outside-rest');
 assert.equal(used.pending.anyAp,true);
 assert.equal(used.pending.optional,true);
 assert.equal(used.mainAbilityUsedUids.includes(self.uid),false);
 const choices=legalUniversalActions(opened.packs,used).filter(a=>a.type==='chooseOutsideRest');
 const chosen=choices.map(a=>a.uid);
 assert.equal(chosen.includes(good.uid),true);
 assert.equal(chosen.includes(null),true);
 assert.equal(chosen.includes(costly.uid),false);
 assert.equal(chosen.includes(renji.uid),false);
 assert.equal(chosen.includes(retiredSelf.uid),false);
 assert.equal(chosen.includes(self.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.packs,used,{type:'chooseOutsideRest',uid:'0-nope'}),
  /not currently legal/);
 const skipped=dispatchUniversalAction(opened.packs,used,{type:'chooseOutsideRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===good.uid),true);
 const again=activate(opened.packs,skipped,energyCopy.uid,'restRetireDeploy');
 assert.ok(again);
 let replay=dispatchUniversalAction(opened.packs,skipped,again);
 assert.ok(legalUniversalActions(opened.packs,replay).some(a=>a.type==='chooseOutsideRest'&&
  a.uid===good.uid&&a.line==='energy'&&!a.replaceUid));
 const toFront=legalUniversalActions(opened.packs,replay).find(a=>a.type==='chooseOutsideRest'&&
  a.uid===good.uid&&a.line==='front'&&!a.replaceUid);
 assert.ok(toFront);
 replay=dispatchUniversalAction(opened.packs,replay,toFront);
 assert.equal(replay.pending,null);
 const arrived=live(replay,0,good.uid);
 assert.equal(arrived.ready,false);
 assert.equal(replay.players[0].front.some(c=>c?.uid===good.uid),true);
 assert.equal(universalBp(opened.packs,replay,arrived),1500);
 assert.equal(replay.players[0].outside.some(c=>c.uid===energyCopy.uid),true);

 const empty=main(purple,294048);
 const lone=put(empty.s,0,'BLC-4-047','energy',1,true);
 assert.equal(empty.s.players[0].outside.length,0);
 const quiet=dispatchUniversalAction(empty.packs,empty.s,
  activate(empty.packs,empty.s,lone.uid,'restRetireDeploy'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===lone.uid),true);
 assert.equal(live(quiet,0,lone.uid),null);
 aiOk(opened.packs,replay);
 assert.equal(assertUniversalMatch(opened.packs,used),true);
 assert.equal(assertUniversalMatch(opened.packs,skipped),true);
 assert.equal(assertUniversalMatch(opened.packs,replay),true);
 assert.equal(assertUniversalMatch(empty.packs,quiet),true);
});

test('energy-filtered outside REST accepts any AP and Raid, and the exact-AP op does not',()=>{
 const basic=(id,extra)=>({id,name:id,type:'character',color:'purple',energy:0,ap:1,bp:1000,
  gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const kon=basic('KON',{name:'コン',bp:500,implementation:'dsl',mainAbility:{
  op:'restRetireDeployOutside',then:[{op:'deployOutsideEnergyRest',name:'黒崎 一護',
   color:'purple',maxEnergy:0,optional:true,anyAp:true}]}});
 const exact=basic('EXACT',{implementation:'dsl',effects:{onPlay:[{op:'deployOutsideRest',
  name:'黒崎 一護',color:'purple',energy:0,ap:1,optional:true}]}});
 const ap2=basic('AP2',{name:'黒崎 一護',ap:2,raidName:'黒崎 一護'});
 const raid1=basic('RAID1',{name:'黒崎 一護',raidName:'黒崎 一護'});
 const drawI=basic('DRAWI',{name:'黒崎 一護',implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}});
 const blue=basic('BLUE',{name:'黒崎 一護',color:'blue'});
 const wrong=basic('WRONG',{name:'阿散井 恋次'});
 const cards=[kon,exact,ap2,raid1,drawI,blue,wrong,
  ...Array.from({length:6},(_,i)=>basic('FILL'+i))];
 const pack=createUniversalPack({id:'kon-filter',cards});
 const both=[pack,pack];
 const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[basic('BAD',{implementation:'dsl',effects:{
  onPlay:[{op:'deployOutsideEnergyRest',name:'黒崎 一護',color:'purple',maxEnergy:0,
   optional:true,anyAp:true}]}})]}));
 assert.throws(()=>createUniversalPack({id:'bad',cards:[basic('BAD',{implementation:'dsl',mainAbility:{
  op:'restRetireDeployOutside',then:[{op:'deployOutsideEnergyRest',name:'黒崎 一護',
   color:'purple',maxEnergy:0,optional:true,anyAp:false}]}})]}));
 assert.throws(()=>createUniversalPack({id:'bad',cards:[basic('BAD',{implementation:'dsl',effects:{
  onAttack:[{op:'discardGate',optional:false,then:[{op:'grantSelfAttackDamageThisTurn',amount:2},
   {op:'grantSelfAttackWinDrawThisTurn'}]}]}})]}));
 let s=newUniversalMatch(both,{decks:[deck,deck],seed:294049,first:0});
 for(let n=0;n<4&&s.phase!=='main';n++)s=dispatchUniversalAction(both,s,{type:'next'});
 const source=take(s,0,'KON');
 source.ready=true;source.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=source;
 const payer=take(s,0,'EXACT');
 s.players[0].hand.push(payer);
 const parked={};
 for(const id of ['AP2','RAID1','DRAWI','BLUE','WRONG'])parked[id]=outside(s,0,id);
 const before=s.players[0].hand.length;
 const play=legalUniversalActions(both,s).find(a=>a.type==='play'&&a.uid===payer.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(both,s,play);
 assert.equal(s.pending.kind,'effect-outside-rest');
 assert.equal(s.pending.anyAp,undefined);
 let uids=legalUniversalActions(both,s).filter(a=>a.type==='chooseOutsideRest').map(a=>a.uid);
 assert.equal(uids.includes(parked.DRAWI.uid),true);
 assert.equal(uids.includes(parked.AP2.uid),false);
 assert.equal(uids.includes(parked.RAID1.uid),false);
 assert.equal(uids.includes(parked.BLUE.uid),false);
 assert.equal(uids.includes(parked.WRONG.uid),false);
 const drawChoice=legalUniversalActions(both,s).find(a=>a.type==='chooseOutsideRest'&&
  a.uid===parked.DRAWI.uid&&a.line==='energy'&&!a.replaceUid);
 s=dispatchUniversalAction(both,s,drawChoice);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before);
 assert.equal(live(s,0,parked.DRAWI.uid).ready,false);
 const deploy=activate(both,s,source.uid,'restRetireDeploy');
 assert.ok(deploy);
 s=dispatchUniversalAction(both,s,deploy);
 uids=legalUniversalActions(both,s).filter(a=>a.type==='chooseOutsideRest').map(a=>a.uid);
 assert.equal(uids.includes(parked.AP2.uid),true);
 assert.equal(uids.includes(parked.RAID1.uid),true);
 assert.equal(uids.includes(parked.BLUE.uid),false);
 assert.equal(uids.includes(parked.WRONG.uid),false);
 assert.equal(uids.includes(source.uid),false);
 const apChoice=legalUniversalActions(both,s).find(a=>a.type==='chooseOutsideRest'&&
  a.uid===parked.AP2.uid&&a.line==='front'&&!a.replaceUid);
 s=dispatchUniversalAction(both,s,apChoice);
 assert.equal(s.pending,null);
 assert.equal(live(s,0,parked.AP2.uid).ready,false);
 assert.equal(pack.cards.AP2.raidName,'黒崎 一護');
 assert.equal(assertUniversalMatch(both,s),true);
});

test('BLC-1-011 discards one hand card for this-turn DAMAGE(2) and a battle-win draw',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-011');
 assert.equal(printed.effect,'主要階段：將 1 張手牌送至場外，使此角色本回合獲得 Damage 2，以及「攻擊並贏得戰鬥時，抽 1 張」。');
 assert.equal(printed.nameJa,'バズビー');
 assert.equal(printed.traits,'星十字騎士團');
 const card=bleach.cards['BLC-1-011'];
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.mainAbility,{op:'discardGrantProgram',frontOnly:false,then:[
  {op:'discardGate',optional:false,then:[
   {op:'grantSelfAttackDamageThisTurn',amount:2},
   {op:'grantSelfAttackWinDrawThisTurn'}]}]});
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{
  id:'BAD',name:'BAD',type:'character',color:'yellow',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{},
  mainAbility:{op:'discardGrantProgram',frontOnly:true,oncePerTurn:true,then:[
   {op:'discardGate',optional:false,then:[
    {op:'grantSelfAttackDamageThisTurn',amount:2},
    {op:'grantSelfAttackWinDrawThisTurn'}]}]}}]}));

 const opened=main(yellow,294011);
 const self=put(opened.s,0,'BLC-1-011','front',0,false);
 const energyCopy=put(opened.s,0,'BLC-1-011','energy',0,true);
 assert.ok(opened.s.players[0].hand.length>1);
 assert.ok(activate(opened.packs,opened.s,self.uid,'discardGrant'));
 assert.ok(activate(opened.packs,opened.s,energyCopy.uid,'discardGrant'));
 const pay=opened.s.players[0].hand[0];
 const secondPay=opened.s.players[0].hand[1];
 aiOk(opened.packs,opened.s);
 let used=dispatchUniversalAction(opened.packs,opened.s,
  activate(opened.packs,opened.s,self.uid,'discardGrant'));
 assert.equal(used.pending.kind,'effect-discard-gate');
 assert.equal(used.pending.optional,false);
 assert.equal(used.mainAbilityUsedUids.includes(self.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.packs,used,{type:'chooseDiscardGate',uid:null}),
  /not currently legal/);
 used=dispatchUniversalAction(opened.packs,used,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(used.pending,null);
 assert.equal(used.players[0].outside.some(c=>c.uid===pay.uid),true);
 const granted=live(used,0,self.uid);
 assert.equal(granted.ready,false);
 assert.equal(universalAttackDamage(opened.packs,used,granted),2);
 assert.equal(granted.attackWinDrawGranted.turn,used.turn);
 assert.equal(granted.attackWinDrawGranted.stamp,granted.fieldEntryStamp);
 assert.ok(activate(opened.packs,used,self.uid,'discardGrant'));
 let repeat=dispatchUniversalAction(opened.packs,used,
  activate(opened.packs,used,self.uid,'discardGrant'));
 repeat=dispatchUniversalAction(opened.packs,repeat,{type:'chooseDiscardGate',uid:secondPay.uid});
 assert.equal(universalAttackDamage(opened.packs,repeat,live(repeat,0,self.uid)),2);
 assert.equal(repeat.players[0].outside.some(c=>c.uid===secondPay.uid),true);
 const held=repeat.players[0].hand.splice(0);
 repeat.players[0].deck.push(...held);
 assert.equal(activate(opened.packs,repeat,self.uid,'discardGrant'),undefined);
 assert.throws(()=>dispatchUniversalAction(opened.packs,repeat,
  {type:'activate',uid:self.uid,mode:'discardGrant'}),/not currently legal/);
 repeat.players[0].hand.push(...repeat.players[0].deck.splice(-held.length));

 const battle=main(yellow,294012);
 const attacker=put(battle.s,0,'BLC-1-011','front',0,true);
 const discard=battle.s.players[0].hand[0];
 const handBefore=battle.s.players[0].hand.length;
 let armed=dispatchUniversalAction(battle.packs,battle.s,
  activate(battle.packs,battle.s,attacker.uid,'discardGrant'));
 armed=dispatchUniversalAction(battle.packs,armed,{type:'chooseDiscardGate',uid:discard.uid});
 assert.equal(armed.players[0].hand.length,handBefore-1);
 const weak=put(armed,1,'BLC-1-002','front',0,true);
 armed=dispatchUniversalAction(battle.packs,armed,{type:'next'});
 assert.equal(armed.phase,'attack');
 const handAtAttack=armed.players[0].hand.length;
 const lifeAtAttack=armed.players[1].life.length;
 let won=dispatchUniversalAction(battle.packs,armed,{type:'attack',uid:attacker.uid});
 assert.equal(won.pending.kind,'block');
 won=dispatchUniversalAction(battle.packs,won,{type:'chooseBlock',uid:weak.uid});
 assert.equal(won.pending,null);
 assert.equal(won.players[0].hand.length,handAtAttack+1);
 assert.equal(won.players[1].life.length,lifeAtAttack);
 assert.equal(won.players[1].outside.some(c=>c.uid===weak.uid),true);
 assert.ok(live(won,0,attacker.uid));

 const lost=main(yellow,294013);
 const loser=put(lost.s,0,'BLC-1-011','front',0,true);
 const lostPay=lost.s.players[0].hand[0];
 let losing=dispatchUniversalAction(lost.packs,lost.s,
  activate(lost.packs,lost.s,loser.uid,'discardGrant'));
 losing=dispatchUniversalAction(lost.packs,losing,{type:'chooseDiscardGate',uid:lostPay.uid});
 const wall=put(losing,1,'BLC-1-009','front',0,true);
 wall.buffs=[{bp:2000,untilTurn:losing.turn}];
 assert.ok(universalBp(lost.packs,losing,wall)>universalBp(lost.packs,losing,live(losing,0,loser.uid)));
 const lostHand=losing.players[0].hand.length;
 const lostLife=losing.players[1].life.length;
 losing=dispatchUniversalAction(lost.packs,losing,{type:'next'});
 losing=dispatchUniversalAction(lost.packs,losing,{type:'attack',uid:loser.uid});
 losing=dispatchUniversalAction(lost.packs,losing,{type:'chooseBlock',uid:wall.uid});
 assert.equal(losing.pending,null);
 assert.equal(losing.players[0].hand.length,lostHand);
 assert.equal(losing.players[1].life.length,lostLife);
 assert.equal(live(losing,0,loser.uid),null);
 assert.equal(losing.players[0].outside.some(c=>c.uid===loser.uid),true);
 assert.ok(live(losing,1,wall.uid));

 const direct=main(yellow,294014);
 const shooter=put(direct.s,0,'BLC-1-011','front',0,true);
 const directPay=direct.s.players[0].hand[0];
 quietLife(direct.s,1,['BLC-1-001','BLC-1-017','BLC-1-010','BLC-1-009']);
 let shot=dispatchUniversalAction(direct.packs,direct.s,
  activate(direct.packs,direct.s,shooter.uid,'discardGrant'));
 shot=dispatchUniversalAction(direct.packs,shot,{type:'chooseDiscardGate',uid:directPay.uid});
 const foe=put(shot,1,'BLC-1-002','front',1,true);
 grantContinuousState(shot,{kind:'originalEffectsDisabled',controller:1,sourceUid:foe.uid,
  targetUid:shooter.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalAttackDamage(direct.packs,shot,live(shot,0,shooter.uid)),2);
 const directHand=shot.players[0].hand.length;
 shot=dispatchUniversalAction(direct.packs,shot,{type:'next'});
 shot=dispatchUniversalAction(direct.packs,shot,{type:'attack',uid:shooter.uid});
 shot=dispatchUniversalAction(direct.packs,shot,{type:'chooseBlock',uid:null});
 shot=finishLife(direct.packs,shot);
 assert.equal(shot.players[1].life.length,5);
 assert.equal(shot.players[0].hand.length,directHand);
 assert.equal(shot.pending,null);

 const later=main(yellow,294015);
 const staying=put(later.s,0,'BLC-1-011','front',0,true);
 const laterPay=later.s.players[0].hand[0];
 let faded=dispatchUniversalAction(later.packs,later.s,
  activate(later.packs,later.s,staying.uid,'discardGrant'));
 faded=dispatchUniversalAction(later.packs,faded,{type:'chooseDiscardGate',uid:laterPay.uid});
 assert.equal(universalAttackDamage(later.packs,faded,live(faded,0,staying.uid)),2);
 faded=advance(later.packs,faded,s=>s.turn!==faded.turn);
 assert.equal(universalAttackDamage(later.packs,faded,live(faded,0,staying.uid)),1);
 aiOk(battle.packs,won);
 assert.equal(assertUniversalMatch(opened.packs,repeat),true);
 assert.equal(assertUniversalMatch(battle.packs,won),true);
 assert.equal(assertUniversalMatch(lost.packs,losing),true);
 assert.equal(assertUniversalMatch(direct.packs,shot),true);
 assert.equal(assertUniversalMatch(later.packs,faded),true);
});
