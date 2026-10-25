import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalEnergyByColor,
 effectiveHandRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Card images checked 2026-10-25: dist/assets/cards/EX15BT_BLC-4-003.png
// and EX15BT_BLC-4-071.png. Official iframe text drops timing icons.
// EX15BT/BLC-4-003 アスキン・ナックルヴァール
//   黄2 / AP1 / キャラ / BP2000 / 星十字騎士団 / 発生黄 / ACTIVE
//   自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを黄2減らす。
//   ステップ。 [退場時]自分のターン中の場合、BP1500以上の相手のフロントLのキャラを
//   1枚まで選び、このターン中、BP-1000。
//   A miss on the opponent's turn opens no target. 「1枚まで」 may be declined.
// EX15BT/BLC-4-071 砕蜂
//   緑4 / AP1 / キャラ / BP2000 / 護廷十三隊 / 発生緑緑 / DRAW
//   Catalogue gen 3 is the sprite index. The print shows two green symbols.
//   ステップ。 [登場時]カードを1枚引き、自分の手札を1枚場外に置く。
//   [起動メイン]このキャラをアクティブにする。〈砕蜂〉のこの効果は1ターンに1回のみ発動できる。
//   Q2340 (2026-09-04): two copies on the field share that one activation.
//   ACTIVE and DRAW life triggers stay the generic sentences.

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
const yellow=realDeck(['BLC-4-003','BLC-1-023','BLC-1-012','BLC-1-002','BLC-1-021'],'yellow');
const green=realDeck(['BLC-4-071','BLC-1-071','BLC-1-083'],'green');
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

test('BLC-4-003 discounts only an empty own field, steps, and lowers BP 1500+ on its own retirement',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-003');
 assert.equal(printed.effect,'自己場上沒有任何卡片時，手牌中的此卡所需黃色能量減少2。Step：移動階段可從前線移至能量線。退場時：若為自己的回合，最多選1個對方前線BP1500以上的角色，本回合BP−1000。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 const card=bleach.cards['BLC-4-003'];
 assert.equal(card.emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(card.step,true);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects.onRetire,[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,ownTurnOnly:true}]);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{onRetire:[{op:'enemyBpDown',bp:1000,
   optional:true,minBp:1500,ownTurnOnly:'own'}]}};
 assert.throws(()=>createUniversalPack({id:'bad-own-turn',cards:[bare]}),/invalid optional targeting flag/);

 const first=main(yellow,294003);
 assert.equal(universalEnergyByColor(first.packs,first.s,0).yellow||0,0);
 const self=take(first.s,0,'BLC-4-003');
 first.s.players[0].hand.push(self);
 assert.equal(effectiveHandRequiredEnergy(bleach,first.s,0,card),0);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 let played=dispatchUniversalAction(first.packs,first.s,play);
 const body=played.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(body.ready,false);
 assert.equal(played.pending,null);
 const second=take(played,0,'BLC-4-003');
 played.players[0].hand.push(second);
 assert.equal(effectiveHandRequiredEnergy(bleach,played,0,card),2);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.type==='play'&&a.uid===second.uid),false);

 const occupied=main(yellow,294004);
 put(occupied.s,0,'BLC-1-021','energy',0);
 const held=take(occupied.s,0,'BLC-4-003');
 occupied.s.players[0].hand.push(held);
 assert.equal(universalEnergyByColor(occupied.packs,occupied.s,0).yellow,1);
 assert.equal(effectiveHandRequiredEnergy(bleach,occupied.s,0,card),2);
 assert.equal(legalUniversalActions(occupied.packs,occupied.s).some(a=>a.type==='play'&&a.uid===held.uid),false);
 put(occupied.s,0,'BLC-1-002','energy',1);
 assert.equal(universalEnergyByColor(occupied.packs,occupied.s,0).yellow,2);
 assert.ok(legalUniversalActions(occupied.packs,occupied.s).some(a=>a.type==='play'&&a.uid===held.uid&&a.line==='front'));

 let stepped=advance(first.packs,played,s=>s.active===0&&s.phase==='move'&&s.players[0].ownTurns===2);
 const shift=legalUniversalActions(first.packs,stepped).find(a=>a.type==='step'&&a.uid===self.uid);
 assert.ok(shift);
 stepped=dispatchUniversalAction(first.packs,stepped,shift);
 assert.equal(stepped.players[0].energy.some(c=>c?.uid===self.uid),true);
 assert.equal(stepped.players[0].front.some(c=>c?.uid===self.uid),false);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(occupied.packs,occupied.s),true);
 assert.equal(assertUniversalMatch(first.packs,stepped),true);
});

test('BLC-4-003 ignores retirement on the opponent turn and chooses a live front BP on its own turn',()=>{
 const missed=main(yellow,294005);
 const askin=put(missed.s,0,'BLC-4-003','front',0,true);
 const attacker=put(missed.s,1,'BLC-1-023','front',0,true);
 const bystander=put(missed.s,1,'BLC-1-012','front',1,true);
 let quiet=advance(missed.packs,missed.s,s=>s.active===1&&s.phase==='attack');
 quiet=dispatchUniversalAction(missed.packs,quiet,{type:'attack',uid:attacker.uid});
 assert.equal(quiet.pending.kind,'block');
 quiet=dispatchUniversalAction(missed.packs,quiet,{type:'chooseBlock',uid:askin.uid});
 assert.equal(quiet.pending,null);
 assert.ok(quiet.players[0].outside.some(c=>c.uid===askin.uid));
 assert.equal(universalBp(missed.packs,quiet,live(quiet,1,attacker.uid)),4000);
 assert.equal(universalBp(missed.packs,quiet,live(quiet,1,bystander.uid)),1500);

 const own=main(yellow,294006);
 const striker=put(own.s,0,'BLC-4-003','front',0,true);
 const wall=put(own.s,1,'BLC-1-023','front',0,true);
 const exact=put(own.s,1,'BLC-1-012','front',1,true);
 const lowered=put(own.s,1,'BLC-1-002','front',2,true);
 const bench=put(own.s,1,'BLC-1-021','energy',0,true);
 let battle=advance(own.packs,own.s,s=>s.active===0&&s.phase==='attack');
 const lowNow=live(battle,1,lowered.uid);
 lowNow.buffs=[{bp:-1000,untilTurn:battle.turn}];
 assert.equal(universalBp(own.packs,battle,lowNow),1000);
 battle=dispatchUniversalAction(own.packs,battle,{type:'attack',uid:striker.uid});
 assert.equal(battle.pending.kind,'block');
 battle=dispatchUniversalAction(own.packs,battle,{type:'chooseBlock',uid:wall.uid});
 assert.ok(battle.players[0].outside.some(c=>c.uid===striker.uid));
 assert.equal(battle.pending.kind,'effect-target');
 assert.equal(battle.pending.player,0);
 assert.equal(battle.pending.optional,true);
 const choices=legalUniversalActions(own.packs,battle).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(choices.includes(wall.uid),true);
 assert.equal(choices.includes(exact.uid),true);
 assert.equal(choices.includes(lowered.uid),false);
 assert.equal(choices.includes(bench.uid),false);
 assert.equal(choices.includes(null),true);
 assert.throws(()=>dispatchUniversalAction(own.packs,battle,{type:'chooseTarget',uid:'0-nope'}),
  /not currently legal/);
 const skipped=dispatchUniversalAction(own.packs,battle,{type:'chooseTarget',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(own.packs,skipped,live(skipped,1,wall.uid)),4000);
 const chosen=dispatchUniversalAction(own.packs,battle,{type:'chooseTarget',uid:wall.uid});
 assert.equal(chosen.pending,null);
 assert.equal(universalBp(own.packs,chosen,live(chosen,1,wall.uid)),3000);
 assert.equal(universalBp(own.packs,chosen,live(chosen,1,exact.uid)),1500);
 let later=advance(own.packs,chosen,s=>s.turn!==chosen.turn);
 assert.equal(universalBp(own.packs,later,live(later,1,wall.uid)),4000);
 aiOk(own.packs,battle);
 assert.equal(assertUniversalMatch(missed.packs,quiet),true);
 assert.equal(assertUniversalMatch(own.packs,battle),true);
 assert.equal(assertUniversalMatch(own.packs,skipped),true);
 assert.equal(assertUniversalMatch(own.packs,chosen),true);
 assert.equal(assertUniversalMatch(own.packs,later),true);
});

test('BLC-4-071 draws and discards, steps, and shares one ACTIVE across every 砕蜂',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-071');
 assert.equal(printed.effect,'Step：移動階段可從前線移至能量線。登場時：抽1張牌，再將1張手牌送至場外。啟動・主要：將此角色改為Active；所有《碎蜂》的此效果合計每回合僅限1次。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-4-071'];
 assert.equal(card.gen,2);
 assert.equal(card.step,true);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.name,'砕蜂');
 assert.deepEqual(card.mainAbility,{op:'readyOncePerName'});
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1,discardCount:1}]);
 const bare={id:'BAD',name:'砕蜂',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'dsl',effects:{},mainAbility:{op:'readyOncePerName',oncePerTurn:true}};
 assert.throws(()=>createUniversalPack({id:'bad-name-ready',cards:[bare]}),/unsupported main action ability/);

 const first=main(green,294071);
 for(let i=0;i<4;i++)put(first.s,0,'BLC-1-071','energy',i);
 assert.equal(universalEnergyByColor(first.packs,first.s,0).green,4);
 const self=take(first.s,0,'BLC-4-071');
 first.s.players[0].hand.push(self);
 if(first.s.players[0].hand.length<2)first.s.players[0].hand.push(take(first.s,0,'BLC-1-083'));
 const deckBefore=first.s.players[0].deck.length;
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 let played=dispatchUniversalAction(first.packs,first.s,play);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(played.players[0].deck.length,deckBefore-1);
 assert.equal(played.pending.kind,'effect-discard');
 assert.equal(played.pending.player,0);
 const dumped=played.players[0].hand[0];
 played=dispatchUniversalAction(first.packs,played,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(played.pending,null);
 assert.ok(played.players[0].outside.some(c=>c.uid===dumped.uid));
 const other=put(played,0,'BLC-4-071','front',1,false);
 assert.ok(legalUniversalActions(first.packs,played).some(a=>a.type==='activate'&&a.mode==='readyOncePerName'&&a.uid===self.uid));
 assert.ok(legalUniversalActions(first.packs,played).some(a=>a.type==='activate'&&a.mode==='readyOncePerName'&&a.uid===other.uid));
 played=dispatchUniversalAction(first.packs,played,{type:'activate',uid:self.uid,mode:'readyOncePerName'});
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='readyOncePerName'),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,played,{type:'activate',uid:other.uid,mode:'readyOncePerName'}),
  /not currently legal/);

 let moved=advance(first.packs,played,s=>s.active===0&&s.phase==='move'&&s.players[0].ownTurns===2);
 const shift=legalUniversalActions(first.packs,moved).find(a=>a.type==='step'&&a.uid===self.uid);
 assert.ok(shift);
 moved=dispatchUniversalAction(first.packs,moved,shift);
 assert.equal(moved.players[0].energy.some(c=>c?.uid===self.uid),true);
 let again=advance(first.packs,moved,s=>s.active===0&&s.phase==='main');
 assert.equal(again.players[0].ownTurns,2);
 const activeCopy=again.players[0].energy.find(c=>c?.uid===self.uid);
 assert.equal(activeCopy.ready,true);
 assert.equal(again.players[0].front.find(c=>c?.uid===other.uid).ready,true);
 assert.ok(legalUniversalActions(first.packs,again).some(a=>a.mode==='readyOncePerName'&&a.uid===self.uid));
 assert.ok(legalUniversalActions(first.packs,again).some(a=>a.mode==='readyOncePerName'&&a.uid===other.uid));
 again=dispatchUniversalAction(first.packs,again,{type:'activate',uid:self.uid,mode:'readyOncePerName'});
 assert.equal(again.players[0].energy.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(again.players[0].front.find(c=>c?.uid===other.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,again).some(a=>a.mode==='readyOncePerName'&&a.uid===other.uid),false);

 const side=main(green,294072);
 const bench=put(side.s,0,'BLC-4-071','energy',0,false);
 side.s=dispatchUniversalAction(side.packs,side.s,{type:'activate',uid:bench.uid,mode:'readyOncePerName'});
 assert.equal(side.s.players[0].energy.find(c=>c?.uid===bench.uid).ready,true);
 const locked=put(side.s,0,'BLC-4-071','front',0,false);
 assert.equal(legalUniversalActions(side.packs,side.s).some(a=>a.mode==='readyOncePerName'),false);
 aiOk(first.packs,played);
 aiOk(side.packs,side.s);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(first.packs,again),true);
 assert.equal(assertUniversalMatch(side.packs,side.s),true);
 assert.equal(locked.ready,false);
});
