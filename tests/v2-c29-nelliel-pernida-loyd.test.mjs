import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// Card images checked 2026-10-25.
// EX15BT/BLC-4-037 ネリエル・トゥ・オーデルシュヴァンク
//   青3 / AP1 / キャラ / BP2000 / 破面 / 発生青青 / DRAW
//   Catalogue gen 3 is the sprite index. The print shows two blue symbols.
//   [登場時] BP1500以上の相手のフロントLのキャラを1枚まで選び、このターン中、BP-1000。
//   [起動メイン][APを1支払う][ターン1] このキャラの[登場時]を発動する。
//   ターン1 is this physical card. Another copy can pay on the same turn.
//   「1枚まで」 may be declined, and a miss still lets the paid activation resolve.
// EX15BT/BLC-4-010 ペルニダ・パルンカジャス
//   黄4 / AP1 / キャラ / BP4000 / 星十字騎士団 / 発生黄 / DRAW
//   [起動メイン][フロントLにある場合][手札を1枚場外に置く][ターン1]
//   自分の場に〈ユーハバッハ〉がある場合のみ発動できる。
//   BP1500以上の相手の場のキャラを1枚選び、このターン中、BP-1000。
//   「1枚選び」 is mandatory. 場 is front and energy. The Yhwach check is
//   before the once-per-turn lock, so a miss does not spend it.
// UA08BT/BLC-1-026 ロイド・ロイド（R）
//   黄1 / AP1 / キャラ / BP2000 / 星十字騎士団 / 発生黄 / no trigger
//   自分のレイドを持つキャラカードはこのキャラにレイドできる。
//   The visible Loyd accepts any Raid character. A buried Loyd does not
//   make the Raid top an open base. Silence removes the permission.
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
const blue=realDeck(['BLC-4-037','BLC-2-025','BLC-2-031','BLC-2-016','BLC-4-023','BLC-2-029'],'blue');
const yellow=realDeck(['BLC-4-010','BLC-1-021','BLC-1-002','BLC-4-009','BLC-1-012','BLC-1-016'],'yellow');
const loydDeck=realDeck(['BLC-1-026','BLC-1-004','BLC-1-021','BLC-1-002','BLC-4-009','BLC-1-016','BLC-1-001'],'yellow');
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
function readyAp(s,p){return s.players[p].apCards.filter(c=>c.ready).length;}
function oncePay(packs,s,uid){
 return legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode==='oncePay');
}
function frontOnce(packs,s,uid){
 return legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode==='frontOnce');
}

test('BLC-4-037 lowers one front BP 1500+ on entry and may decline',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-037');
 assert.equal(printed.effect,'登場時：最多選1個對方前線BP1500以上的角色，本回合BP−1000。啟動・主要〔支付1 AP／每回合1次〕：發動此角色的登場時效果。');
 assert.equal(printed.gen,3);
 assert.deepEqual(printed.traits,['破面']);
 const card=bleach.cards['BLC-4-037'];
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500}]);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,
  raidOnly:false,payAp:1,requiresOwnName:null,
  then:[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500}]});

 const opened=main(blue,294037);
 put(opened.s,0,'BLC-2-025','energy',0);
 put(opened.s,0,'BLC-2-031','energy',1);
 put(opened.s,0,'BLC-2-016','energy',2);
 assert.equal(universalEnergyByColor(opened.packs,opened.s,0).blue,3);
 const high=put(opened.s,1,'BLC-2-029','front',0,true);
 const low=put(opened.s,1,'BLC-4-023','front',1,true);
 const bench=put(opened.s,1,'BLC-2-016','energy',0,true);
 const self=take(opened.s,0,'BLC-4-037');
 opened.s.players[0].hand.push(self);
 const play=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 assert.equal(readyAp(opened.s,0),1);
 const played=dispatchUniversalAction(opened.packs,opened.s,play);
 assert.equal(live(played,0,self.uid).ready,false);
 assert.equal(readyAp(played,0),0);
 assert.equal(played.pending.kind,'effect-target');
 assert.equal(played.pending.zone,'front');
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(opened.packs,played).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(choices.includes(high.uid),true);
 assert.equal(choices.includes(low.uid),false);
 assert.equal(choices.includes(bench.uid),false);
 assert.equal(choices.includes(null),true);
 assert.throws(()=>dispatchUniversalAction(opened.packs,played,{type:'chooseTarget',uid:'0-nope'}),
  /not currently legal/);
 const skipped=dispatchUniversalAction(opened.packs,played,{type:'chooseTarget',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(opened.packs,skipped,live(skipped,1,high.uid)),2500);
 const chosen=dispatchUniversalAction(opened.packs,played,{type:'chooseTarget',uid:high.uid});
 assert.equal(chosen.pending,null);
 assert.equal(universalBp(opened.packs,chosen,live(chosen,1,high.uid)),1500);
 assert.equal(universalBp(opened.packs,chosen,live(chosen,1,low.uid)),500);
 assert.equal(universalBp(opened.packs,chosen,live(chosen,1,bench.uid)),1500);
 let later=advance(opened.packs,chosen,s=>s.turn!==chosen.turn);
 assert.equal(universalBp(opened.packs,later,live(later,1,high.uid)),2500);
 aiOk(opened.packs,played);
 assert.equal(assertUniversalMatch(opened.packs,played),true);
 assert.equal(assertUniversalMatch(opened.packs,skipped),true);
 assert.equal(assertUniversalMatch(opened.packs,chosen),true);
 assert.equal(assertUniversalMatch(opened.packs,later),true);
});

test('BLC-4-037 pays 1 AP once per physical card from either line, including REST',()=>{
 const paid=main(blue,294038);
 const self=put(paid.s,0,'BLC-4-037','front',0,false);
 const other=put(paid.s,0,'BLC-4-037','energy',0,false);
 const high=put(paid.s,1,'BLC-2-029','front',0,true);
 assert.equal(readyAp(paid.s,0),1);
 const act=oncePay(paid.packs,paid.s,self.uid);
 assert.ok(act);
 assert.ok(oncePay(paid.packs,paid.s,other.uid));
 let used=dispatchUniversalAction(paid.packs,paid.s,act);
 assert.equal(readyAp(used,0),0);
 assert.equal(used.pending.kind,'effect-target');
 assert.equal(used.effectApPaidColors[0].includes('blue'),true);
 used=dispatchUniversalAction(paid.packs,used,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(paid.packs,used,live(used,1,high.uid)),1500);
 assert.equal(oncePay(paid.packs,used,self.uid),undefined);
 assert.equal(oncePay(paid.packs,used,other.uid),undefined);
 assert.throws(()=>dispatchUniversalAction(paid.packs,used,{type:'activate',uid:self.uid,mode:'oncePay'}),
  /not currently legal/);
 const spent=used.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 spent.ready=true;
 assert.equal(oncePay(paid.packs,used,self.uid),undefined);
 const again=oncePay(paid.packs,used,other.uid);
 assert.ok(again);
 let replay=dispatchUniversalAction(paid.packs,used,again);
 assert.equal(readyAp(replay,0),0);
 replay=dispatchUniversalAction(paid.packs,replay,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(paid.packs,replay,live(replay,1,high.uid)),500);

 const empty=main(blue,294039);
 const lone=put(empty.s,0,'BLC-4-037','energy',1,false);
 put(empty.s,1,'BLC-4-023','front',0,true);
 assert.equal(readyAp(empty.s,0),1);
 const miss=oncePay(empty.packs,empty.s,lone.uid);
 assert.ok(miss);
 const quiet=dispatchUniversalAction(empty.packs,empty.s,miss);
 assert.equal(quiet.pending,null);
 assert.equal(readyAp(quiet,0),0);
 assert.equal(quiet.mainAbilityUsedUids.includes(lone.uid),true);
 assert.equal(oncePay(empty.packs,quiet,lone.uid),undefined);
 aiOk(paid.packs,paid.s);
 assert.equal(assertUniversalMatch(paid.packs,used),true);
 assert.equal(assertUniversalMatch(paid.packs,replay),true);
 assert.equal(assertUniversalMatch(empty.packs,quiet),true);
});

test('BLC-4-010 discards only while Yhwach is on the field, then must lower a field BP 1500+',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-010');
 assert.equal(printed.effect,'啟動・主要〔前線／每回合1次／將1張手牌送至場外〕：僅在自己場上有《友哈巴赫》時可發動；選1個對方場上BP1500以上的角色，本回合BP−1000。');
 assert.equal(printed.gen,1);
 assert.deepEqual(printed.traits,['星十字騎士團']);
 const card=bleach.cards['BLC-4-010'];
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.op,'frontOnceProgram');
 assert.equal(card.mainAbility.frontOnly,true);
 assert.deepEqual(card.mainAbility.then[0].when,{kind:'ownNameExists',turn:'any',zone:'field',
  excludeSelf:false,name:'ユーハバッハ'});
 assert.deepEqual(card.mainAbility.then[0].then,[{op:'enemyBpDown',bp:1000,optional:false,
  minBp:1500,zone:'field'}]);

 const opened=main(yellow,294010);
 const self=put(opened.s,0,'BLC-4-010','front',0,false);
 const bench=put(opened.s,0,'BLC-4-010','energy',1,true);
 const yhwach=put(opened.s,0,'BLC-1-021','energy',0,true);
 const high=put(opened.s,1,'BLC-1-002','front',0,true);
 const exact=put(opened.s,1,'BLC-1-012','energy',0,true);
 const low=put(opened.s,1,'BLC-4-009','front',1,true);
 const tiny=put(opened.s,1,'BLC-1-016','energy',1,true);
 const pay=take(opened.s,0,'BLC-1-016');
 opened.s.players[0].hand.push(pay);
 const absent=opened.s.players[0].energy[0];
 opened.s.players[0].energy[0]=null;
 opened.s.players[0].outside.push(yhwach);
 assert.equal(frontOnce(opened.packs,opened.s,self.uid),undefined);
 opened.s.players[0].outside.pop();
 opened.s.players[0].hand.push(yhwach);
 assert.equal(frontOnce(opened.packs,opened.s,self.uid),undefined);
 const handIndex=opened.s.players[0].hand.findIndex(c=>c.uid===yhwach.uid);
 opened.s.players[0].hand.splice(handIndex,1);
 opened.s.players[0].energy[0]=absent;
 assert.ok(frontOnce(opened.packs,opened.s,self.uid));
 assert.equal(frontOnce(opened.packs,opened.s,bench.uid),undefined);
 const held=opened.s.players[0].hand.splice(0);
 opened.s.players[0].deck.push(...held);
 assert.equal(frontOnce(opened.packs,opened.s,self.uid),undefined);
 for(const c of held){
  const i=opened.s.players[0].deck.findIndex(x=>x.uid===c.uid);
  opened.s.players[0].deck.splice(i,1);
 }
 opened.s.players[0].hand.push(...held);
 const parkedHigh=opened.s.players[1].front[0];
 const parkedExact=opened.s.players[1].energy[0];
 opened.s.players[1].front[0]=null;
 opened.s.players[1].energy[0]=null;
 opened.s.players[1].deck.push(parkedHigh,parkedExact);
 assert.equal(frontOnce(opened.packs,opened.s,self.uid),undefined);
 assert.equal(opened.s.players[0].hand.some(c=>c.uid===pay.uid),true);
 for(const c of [parkedHigh,parkedExact]){
  const i=opened.s.players[1].deck.findIndex(x=>x.uid===c.uid);
  opened.s.players[1].deck.splice(i,1);
 }
 opened.s.players[1].front[0]=parkedHigh;
 opened.s.players[1].energy[0]=parkedExact;
 const act=frontOnce(opened.packs,opened.s,self.uid);
 assert.ok(act);
 aiOk(opened.packs,opened.s);
 let used=dispatchUniversalAction(opened.packs,opened.s,act);
 assert.equal(used.mainAbilityUsedUids.includes(self.uid),true);
 assert.equal(used.pending.kind,'effect-discard-gate');
 assert.equal(used.pending.optional,false);
 assert.throws(()=>dispatchUniversalAction(opened.packs,used,{type:'chooseDiscardGate',uid:null}),
  /not currently legal/);
 used=dispatchUniversalAction(opened.packs,used,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(used.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.equal(used.pending.kind,'effect-target');
 assert.equal(used.pending.zone,'field');
 assert.equal(used.pending.optional,false);
 const choices=legalUniversalActions(opened.packs,used).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(choices.includes(high.uid),true);
 assert.equal(choices.includes(exact.uid),true);
 assert.equal(choices.includes(low.uid),false);
 assert.equal(choices.includes(tiny.uid),false);
 assert.equal(choices.includes(null),false);
 assert.throws(()=>dispatchUniversalAction(opened.packs,used,{type:'chooseTarget',uid:null}),
  /not currently legal/);
 const chosen=dispatchUniversalAction(opened.packs,used,{type:'chooseTarget',uid:exact.uid});
 assert.equal(chosen.pending,null);
 assert.equal(universalBp(opened.packs,chosen,live(chosen,1,exact.uid)),500);
 assert.equal(universalBp(opened.packs,chosen,live(chosen,1,high.uid)),2000);
 assert.equal(frontOnce(opened.packs,chosen,self.uid),undefined);
 const copy=put(chosen,0,'BLC-4-010','front',1,false);
 const secondPay=take(chosen,0,'BLC-4-009');
 chosen.players[0].hand.push(secondPay);
 assert.ok(frontOnce(opened.packs,chosen,copy.uid));
 grantContinuousState(chosen,{kind:'originalEffectsDisabled',controller:1,sourceUid:high.uid,
  targetUid:copy.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(frontOnce(opened.packs,chosen,copy.uid),undefined);
 let later=advance(opened.packs,chosen,s=>s.turn!==chosen.turn);
 assert.equal(universalBp(opened.packs,later,live(later,1,exact.uid)),1500);
 assert.equal(assertUniversalMatch(opened.packs,used),true);
 assert.equal(assertUniversalMatch(opened.packs,chosen),true);
 assert.equal(assertUniversalMatch(opened.packs,later),true);
});

test('BLC-1-026 accepts any Raid character and does not open a chain or a silenced base',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-026');
 assert.equal(printed.effect,'己方具有 Raid 的角色卡可在此角色上 Raid。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-1-026'];
 assert.equal(card.raidAcceptsAny,true);
 assert.equal(card.raidName,null);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects,{});
 const bad={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:1,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',raidName:'エス・ノト',raidAcceptsAny:true,effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-open-raid',cards:[bad]}),/invalid open Raid base/);

 const opened=main(loydDeck,294026);
 put(opened.s,0,'BLC-1-021','energy',0);
 put(opened.s,0,'BLC-1-002','energy',1);
 put(opened.s,0,'BLC-4-009','energy',2);
 put(opened.s,0,'BLC-1-001','energy',3);
 const loyd=put(opened.s,0,'BLC-1-026','front',0,true);
 const plain=put(opened.s,0,'BLC-1-016','front',1,true);
 const named=opened.s.players[0].energy[1];
 const raider=take(opened.s,0,'BLC-1-004');
 const bystander=take(opened.s,0,'BLC-1-016');
 opened.s.players[0].hand.push(raider,bystander);
 assert.equal(universalEnergyByColor(opened.packs,opened.s,0).yellow,4);
 const raids=()=>legalUniversalActions(opened.packs,opened.s).filter(a=>a.type==='raid');
 assert.equal(raids().some(a=>a.uid===bystander.uid),false);
 assert.equal(raids().some(a=>a.uid===raider.uid&&a.baseUid===plain.uid),false);
 assert.equal(raids().some(a=>a.uid===raider.uid&&a.baseUid===named.uid),true);
 const onto=raids().find(a=>a.uid===raider.uid&&a.baseUid===loyd.uid&&a.slot===0);
 assert.ok(onto);
 aiOk(opened.packs,opened.s);
 let stacked=dispatchUniversalAction(opened.packs,opened.s,onto);
 const top=live(stacked,0,raider.uid);
 assert.ok(top);
 assert.equal(top.stack[0].uid,loyd.uid);
 assert.equal(live(stacked,0,loyd.uid),null);
 assert.equal(stacked.players[0].front.some(c=>c?.uid===plain.uid),true);
 const second=take(stacked,0,'BLC-1-004');
 stacked.players[0].hand.push(second);
 const spent=stacked.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 spent.ready=true;
 const follow=legalUniversalActions(opened.packs,stacked).filter(a=>a.type==='raid'&&a.uid===second.uid);
 assert.equal(follow.some(a=>a.baseUid===top.uid),false);
 assert.equal(follow.some(a=>a.baseUid===named.uid),true);

 const quiet=main(loydDeck,294027);
 put(quiet.s,0,'BLC-1-021','energy',0);
 put(quiet.s,0,'BLC-4-009','energy',1);
 put(quiet.s,0,'BLC-1-001','energy',2);
 const base=put(quiet.s,0,'BLC-1-026','energy',3,true);
 const topCard=take(quiet.s,0,'BLC-1-004');
 quiet.s.players[0].hand.push(topCard);
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:topCard.uid,
  targetUid:base.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.type==='raid'&&a.baseUid===base.uid),false);
 quiet.s.continuousStates=[];
 const energyRaid=legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='raid'&&
  a.uid===topCard.uid&&a.baseUid===base.uid);
 assert.ok(energyRaid);
 const moved=dispatchUniversalAction(quiet.packs,quiet.s,energyRaid);
 assert.equal(moved.players[0].front.find(c=>c?.uid===topCard.uid).stack[0].uid,base.uid);
 assert.equal(assertUniversalMatch(opened.packs,stacked),true);
 assert.equal(assertUniversalMatch(quiet.packs,moved),true);
});
