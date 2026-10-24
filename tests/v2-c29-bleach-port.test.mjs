import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// Official iframes fetched 2026-10-24.
// BLC-1-080 UA08BT: このキャラはBPをマイナスする効果を受けない。
//   自分のターン中 このキャラはBP+1000。 ACTIVE is the generic sentence.
//   Generated energy alt is 緑. Printed BP is 4000+.
// BLC-1-091 UA08BT: このカードは〈山本 元柳斎 重國〉としても扱う。
//   自分のフロントLに他のキャラがない場合、このキャラはBP+1000。 GET is generic.
//   No 自分のターン中 icon. Energy-line cards are not front characters.
// BLC-2-041 EX07BT: 自分のターン中 このターン中に自分の場の他のキャラが退場している場合、
//   このキャラはBP+1000。 ACTIVE is generic. Trait is the single token 破面／涅骸部隊.
// BLC-1-062 UA08ST: 自分の場のキャラを1枚選び、このターン中、BP+1000。
//   自分のAPカードを1枚まで選び、アクティブにする。 ACTIVE is generic.
//   The character choice is mandatory. The AP choice is up to one.
// BLC-1-087 UA08BT: [登場時]自分の場の［特徴：護廷十三隊］を1枚まで選び、このターン中、
//   [インパクト（+1）]を与える。 The parenthetical gives Impact 1 when the
//   target has none. The sentence does not say 他の, so this character is legal.
//   ACTIVE is the generic sentence. Generated energy alt is 緑.
// BLC-2-026 EX07BT: [登場時]自分の場の元々の消費APが2以上のキャラを1枚まで選び、
//   このターン中、[インパクト（+1）]を与える。 DRAW is generic. Gen alt is 青.
//   This card's own printed AP is 1, so it is not its own target.
// BLC-2-027 EX07BT: [自分のターン中]自分のフロントLの元々の消費APが2以上のキャラ
//   1枚につき、このキャラはBP+500。 ACTIVE is generic. Energy-line cards do not count.
// BLC-4-046 EX15BT: [登場時]自分の場の紫の〈黒崎 一護〉を1枚まで選び、このターン中、BP+1500。
//   ACTIVE is generic. Required energy is 紫- (0). Traits are empty.
// BLC-3-007 UA04NC: [登場時]自分の山札の上から3枚見る。その中から［特徴：護廷十三隊］を
//   1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、
//   自分の手札を1枚場外に置く。 DRAW is generic. Gen alt is 緑.
// BLC-3-002 UA04NC: the same sentence with 〈黒崎 一護〉か〈阿散井 恋次〉か
//   〈朽木 ルキア〉か〈朽木 白哉〉. DRAW is generic. Gen alt is 青.
// BLC-4-001 EX15BT: このカードは〈バズビー〉としても扱う。 The on-play sentence is the
//   same look-3 with 〈バズビー〉か〈ユーグラム・ハッシュヴァルト〉. DRAW is generic. Gen alt is 黄.

const bleach=registeredV2TitlePack('bleach');
const ADDED=['BLC-1-080','BLC-1-091','BLC-2-041','BLC-1-062','BLC-1-032','BLC-1-078','BLC-1-087','BLC-2-026','BLC-2-027','BLC-4-046','BLC-4-028','BLC-4-052','BLC-3-007','BLC-3-002','BLC-4-001','BLC-2-072','BLC-2-032'];
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const green=realDeck(['BLC-1-080','BLC-1-091','BLC-1-078','BLC-1-070','BLC-4-062','BLC-1-087','BLC-2-067','BLC-3-007','BLC-4-060','BLC-4-061','BLC-2-072','BLC-1-083'],'green');
const blue=realDeck(['BLC-2-041','BLC-2-031','BLC-4-036','BLC-2-026','BLC-2-027','BLC-4-022','BLC-4-028','BLC-3-002','BLC-2-016','BLC-2-029','BLC-2-032'],'blue');
const purple=realDeck(['BLC-1-062','BLC-1-035','BLC-1-103','BLC-4-046','BLC-1-039','BLC-4-052'],'purple');
const yellow=realDeck(['BLC-1-032','BLC-1-023','BLC-1-006','BLC-4-001','BLC-2-003','BLC-1-018'],'yellow');
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
 return {packs,s};
}
function setTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function orderBottom(packs,s){
 while(s.pending?.kind==='effect-top-order'){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder');
  assert.ok(action);
  s=dispatchUniversalAction(packs,s,action);
 }
 return s;
}
function live(s,p,uid){
 for(const line of ['front','energy']){
  const c=s.players[p][line].find(x=>x?.uid===uid);
  if(c)return c;
 }
 return s.players[p].outside.find(x=>x.uid===uid)||null;
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function plainId(deck,bp,not){
 const id=Object.keys(deck).find(id=>{
  if(not.includes(id))return false;
  const c=bleach.cards[id];
  return c.type==='character'&&c.bp===bp&&c.maxCopies===4&&
   !c.printedImpact&&!c.impactNull&&!c.mainAbility&&!c.passiveBonuses?.length&&
   !Object.keys(c.effects||{}).length;
 });
 assert.ok(id,'plain '+bp);
 return id;
}

test('C29 registers seventeen whole BLEACH prints and keeps the independent census',()=>{
 assert.equal(EXPECTED_V2_TOTAL,453);
 assert.equal(EXPECTED_V2_COUNTS.bleach,177);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],125);
 for(const id of ADDED)assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
 assert.equal(Object.keys(bleach.cards).length,177);
});

test('BLC-1-080 ignores BP reductions and gains 1000 only on its own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-080');
 assert.equal(printed.effect,'此角色不受降低 BP 的效果影響。己方回合中，此角色 BP +1000。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-080'];
 assert.equal(card.bpDownImmune,true);
 assert.equal(card.ownTurnBp,1000);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 const {packs,s}=main(green,29080);
 const self=put(s,0,'BLC-1-080','front',0);
 assert.equal(universalBp(packs,s,self),5000);
 self.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),5000);
 self.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),5500);
 let opp=s;
 for(let n=0;n<12&&opp.active===0;n++)
  opp=dispatchUniversalAction(packs,opp,{type:'next'});
 assert.equal(opp.active,1);
 const there=live(opp,0,self.uid);
 assert.equal(universalBp(packs,opp,there),4000);
 there.buffs.push({bp:-2000,untilTurn:opp.turn});
 assert.equal(universalBp(packs,opp,there),4000);
 there.buffs.push({bp:500,untilTurn:opp.turn});
 assert.equal(universalBp(packs,opp,there),4500);
 aiOk(packs,opp);
 assert.equal(assertUniversalMatch(packs,opp),true);
});

test('BLC-1-091 is the printed Yamamoto alias and gains 1000 with no other front character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-091');
 assert.equal(printed.effect,'此卡亦視為〈山本元柳齋重國〉。己方前線沒有其他角色時，此角色 BP +1000。');
 const card=bleach.cards['BLC-1-091'];
 assert.equal(card.trigger,'get');
 assert.equal(card.triggerEffect,null);
 assert.equal(cardHasName(card,'山本 重國'),true);
 assert.equal(cardHasName(card,'山本 元柳斎 重國'),true);
 assert.equal(cardHasName(card,'山本 元柳斎 重國',true),false);
 assert.deepEqual(card.passiveBonuses,[{
  condition:{kind:'ownFrontNoOtherCharacter',turn:'any'},bp:1000}]);
 const {packs,s}=main(green,29091);
 const self=put(s,0,'BLC-1-091','front',0);
 assert.equal(universalBp(packs,s,self),3000);
 const energyMate=put(s,0,'BLC-1-080','energy',0);
 assert.equal(universalBp(packs,s,self),3000);
 const mateId=Object.keys(green).find(id=>id!=='BLC-1-080'&&id!=='BLC-1-091'&&
  bleach.cards[id].type==='character');
 const frontMate=put(s,0,mateId,'front',1);
 assert.equal(universalBp(packs,s,self),2000);
 s.players[0].front[1]=null;
 s.players[0].hand.push(frontMate);
 assert.equal(universalBp(packs,s,self),3000);
 s.players[0].front[0]=null;
 s.players[0].energy[1]=self;
 assert.equal(universalBp(packs,s,self),3000);
 const held=s.players[0].hand.findIndex(c=>c.uid===frontMate.uid);
 s.players[0].front[0]=s.players[0].hand.splice(held,1)[0];
 assert.equal(universalBp(packs,s,self),2000);
 assert.equal(universalBp(packs,s,energyMate),5000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-2-041 gains 1000 only after another own character retires this own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-041');
 assert.equal(printed.effect,'己方回合中，若本回合已有其他己方場上角色退場，此角色 BP +1000。');
 assert.equal(printed.traits,'破面／涅骸部隊');
 const card=bleach.cards['BLC-2-041'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['破面／涅骸部隊']);
 assert.equal(card.traitComponents,undefined);
 assert.deepEqual(card.passiveBonuses[0].condition,{kind:'retireCountThisTurn',turn:'own',
  controller:'own',cardType:'character',min:1,excludeSelf:true});
 const low=plainId(blue,1500,['BLC-2-041']);
 const wall=plainId(blue,4000,['BLC-2-041']);
 const {packs,s}=main(blue,29041);
 const self=put(s,0,'BLC-2-041','energy',0);
 assert.equal(universalBp(packs,s,self),2000);
 const mine=put(s,0,low,'front',0);
 const theirWall=put(s,1,wall,'front',0);
 let battle=s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(packs,battle,{type:'next'});
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:mine.uid});
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:theirWall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===mine.uid),false);
 assert.equal(battle.active,0);
 const stayed=live(battle,0,self.uid);
 assert.equal(universalBp(packs,battle,stayed),3000);
 let later=battle;
 for(let n=0;n<12&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,self.uid)),2000);
 const foe=main(blue,29042);
 const watcher=put(foe.s,0,'BLC-2-041','energy',0);
 const big=put(foe.s,0,wall,'front',0);
 const small=put(foe.s,1,low,'front',0);
 let oppLoss=foe.s;
 for(let n=0;n<6&&oppLoss.phase!=='attack';n++)
  oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'next'});
 oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'attack',uid:big.uid});
 oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'chooseBlock',uid:small.uid},{actor:1});
 assert.equal(oppLoss.players[1].front.some(c=>c?.uid===small.uid),false);
 assert.equal(universalBp(packs,oppLoss,live(oppLoss,0,watcher.uid)),2000);
 const again=main(blue,29043);
 const ken=put(again.s,0,'BLC-2-041','front',0);
 const blocker=put(again.s,1,wall,'front',0);
 let lost=again.s;
 for(let n=0;n<6&&lost.phase!=='attack';n++)
  lost=dispatchUniversalAction(packs,lost,{type:'next'});
 lost=dispatchUniversalAction(packs,lost,{type:'attack',uid:ken.uid});
 lost=dispatchUniversalAction(packs,lost,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(lost.players[0].front.some(c=>c?.uid===ken.uid),false);
 const returned=lost.players[0].outside.find(c=>c.uid===ken.uid);
 assert.ok(returned);
 const index=lost.players[0].outside.findIndex(c=>c.uid===ken.uid);
 lost.players[0].outside.splice(index,1);
 returned.ready=true;returned.fieldEntryStamp=lost.nextFieldEntryStamp++;
 lost.players[0].energy[1]=returned;
 assert.equal(universalBp(packs,lost,returned),2000);
 assert.equal(assertUniversalMatch(packs,lost),true);
});

test('BLC-1-062 must buff one own character, then may ready one rested AP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-062');
 assert.equal(printed.effect,'一個己方角色本回合 BP +1000，可回復 1 AP。');
 assert.equal(printed.type,'event');
 assert.equal(printed.traits,'無');
 const card=bleach.cards['BLC-1-062'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[
  {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false},
  {op:'recoverAp',count:1}]);
 const {packs,s}=main(purple,29062);
 const bread=take(s,0,'BLC-1-062');
 s.players[0].hand.push(bread);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===bread.uid),false);
 const fuel=put(s,0,'BLC-1-035','energy',0);
 const front=put(s,0,'BLC-1-103','front',0);
 const foe=put(s,1,'BLC-1-103','front',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===bread.uid),true);
 let played=dispatchUniversalAction(packs,s,{type:'event',uid:bread.uid});
 assert.equal(played.pending.kind,'effect-buff-own');
 assert.equal(played.pending.optional,false);
 const choices=legalUniversalActions(packs,played);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),false);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===fuel.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===front.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===foe.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:null}),
  /not currently legal/);
 played=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:front.uid});
 assert.equal(universalBp(packs,played,live(played,0,front.uid)),4000);
 assert.equal(universalBp(packs,played,live(played,0,fuel.uid)),1500);
 assert.equal(played.pending.kind,'effect-recover-ap');
 const rested=played.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
 assert.equal(rested.length,1);
 const recoveries=legalUniversalActions(packs,played);
 assert.equal(recoveries.some(a=>a.type==='chooseApRecovery'&&a.uid===null),true);
 assert.equal(recoveries.some(a=>a.type==='chooseApRecovery'&&a.uid===rested[0].uid),true);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseApRecovery',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].apCards.some(c=>c.uid===rested[0].uid&&!c.ready),true);
 const readied=dispatchUniversalAction(packs,played,{type:'chooseApRecovery',uid:rested[0].uid});
 assert.equal(readied.pending,null);
 assert.equal(readied.players[0].apCards.find(c=>c.uid===rested[0].uid).ready,true);
 aiOk(packs,readied);
 assert.equal(assertUniversalMatch(packs,readied),true);
});

test('BLC-1-032 chooses one optional buff or one optional front BP reduction',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-032');
 assert.equal(printed.effect,'選一項：①可使最多 1 個己方場上角色本回合 BP +1000；②可使最多 1 個敵方前線角色本回合 BP −1000。');
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-1-032'];
 assert.equal(card.triggerEffect,null);
 assert.equal(card.effects.onPlay[0].op,'chooseOne');
 assert.equal(card.effects.onPlay[0].optional,false);
 const {packs,s}=main(yellow,29032);
 const event=take(s,0,'BLC-1-032');
 s.players[0].hand.push(event);
 const fuel=put(s,0,'BLC-1-023','energy',0);
 const front=put(s,0,'BLC-1-006','front',0);
 const foeFront=put(s,1,'BLC-1-023','front',0);
 const foeEnergy=put(s,1,'BLC-1-006','energy',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 let played=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(packs,played);
 assert.deepEqual(modes.map(a=>a.mode).sort(),['buff','down']);
 let buffed=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'buff'});
 assert.equal(buffed.pending.kind,'effect-buff-own');
 assert.equal(buffed.pending.optional,true);
 const buffChoices=legalUniversalActions(packs,buffed);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===fuel.uid),true);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===front.uid),true);
 assert.equal(buffChoices.some(a=>a.uid===foeFront.uid),false);
 const skipped=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,live(skipped,0,front.uid)),4000);
 buffed=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:fuel.uid});
 assert.equal(universalBp(packs,buffed,live(buffed,0,fuel.uid)),5000);
 let down=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'down'});
 assert.equal(down.pending.kind,'effect-target');
 assert.equal(down.pending.optional,true);
 const downChoices=legalUniversalActions(packs,down);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===foeFront.uid),true);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===foeEnergy.uid),false);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===null),true);
 down=dispatchUniversalAction(packs,down,{type:'chooseTarget',uid:foeFront.uid});
 assert.equal(universalBp(packs,down,live(down,1,foeFront.uid)),3000);
 assert.equal(universalBp(packs,down,live(down,1,foeEnergy.uid)),4000);
 assert.equal(assertUniversalMatch(packs,down),true);
});

test('BLC-1-078 steps to energy and may buff one Gotei character on attack',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-078');
 assert.equal(printed.effect,'Step：己方移動階段可由前線移至能源線。攻擊時：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合 BP +500。');
 assert.equal(printed.gen,2);
 const card=bleach.cards['BLC-1-078'];
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onAttack,[{op:'buffOwnField',filter:{field:'trait',value:'護廷十三隊'},
  bp:500,optional:true,excludeSelf:false}]);
 const packs=[bleach,bleach];
 let moving=newUniversalMatch(packs,{decks:[green,green],seed:29078,first:0});
 for(let n=0;n<6&&moving.phase!=='move';n++)
  moving=dispatchUniversalAction(packs,moving,{type:'next'});
 assert.equal(moving.phase,'move');
 const stepper=put(moving,0,'BLC-1-078','front',0);
 assert.equal(legalUniversalActions(packs,moving).some(a=>a.type==='step'&&a.uid===stepper.uid),true);
 moving=dispatchUniversalAction(packs,moving,{type:'step',uid:stepper.uid,slot:0});
 assert.equal(moving.players[0].energy[0]?.uid,stepper.uid);
 assert.equal(moving.players[0].front[0],null);
 const {s}=main(green,29079);
 const self=put(s,0,'BLC-1-078','front',0);
 const ally=put(s,0,'BLC-1-070','energy',0);
 const other=put(s,0,'BLC-4-062','front',1);
 put(s,1,'BLC-1-070','front',0);
 let battle=s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(packs,battle,{type:'next'});
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:self.uid});
 assert.equal(battle.pending.kind,'effect-buff-own');
 assert.equal(battle.pending.optional,true);
 const choices=legalUniversalActions(packs,battle);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===self.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid),false);
 const skipped=dispatchUniversalAction(packs,battle,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,0,self.uid)),3000);
 battle=dispatchUniversalAction(packs,battle,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,battle,live(battle,0,ally.uid)),bleach.cards['BLC-1-070'].bp+500);
 assert.equal(universalBp(packs,battle,live(battle,0,other.uid)),bleach.cards['BLC-4-062'].bp);
 assert.equal(assertUniversalMatch(packs,moving),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('BLC-1-087 adds one Impact to at most one own Gotei character, including itself',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-087');
 assert.equal(printed.effect,'登場：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-087'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.printedImpact||0,0);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'grantOtherImpactThisTurn',trait:'護廷十三隊',
  amount:1,optional:true,plus:true,includeSelf:true}]);
 const {packs,s}=main(green,29087);
 put(s,0,'BLC-1-080','energy',0);
 put(s,0,'BLC-1-091','energy',1);
 const other=put(s,0,'BLC-4-062','energy',2);
 const ken=put(s,0,'BLC-2-067','front',0);
 const plain=put(s,0,'BLC-1-070','front',1);
 const foe=put(s,1,'BLC-1-080','front',0);
 const self=take(s,0,'BLC-1-087');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 let played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-grant-impact');
 assert.equal(played.pending.plus,true);
 assert.equal(played.pending.includeSelf,true);
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseGrantImpact'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(self.uid),true);
 assert.equal(chosen(ken.uid),true);
 assert.equal(chosen(plain.uid),true);
 assert.equal(chosen(other.uid),false);
 assert.equal(chosen(foe.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,self.uid)),0);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,ken.uid)),1);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,plain.uid)),0);
 let added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:ken.uid});
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),2);
 assert.equal(universalImpact(packs,added,live(added,0,self.uid)),0);
 assert.equal(universalImpact(packs,added,live(added,0,plain.uid)),0);
 added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:plain.uid});
 assert.equal(universalImpact(packs,added,live(added,0,plain.uid)),1);
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),1);
 added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:self.uid});
 assert.equal(universalImpact(packs,added,live(added,0,self.uid)),1);
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),1);
 let later=added;
 for(let n=0;n<16&&later.turn===added.turn;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.notEqual(later.turn,added.turn);
 assert.equal(universalImpact(packs,later,live(later,0,self.uid)),0);
 assert.equal(universalImpact(packs,later,live(later,0,ken.uid)),1);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,added),true);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-2-026 adds Impact 1 only to an own character with printed AP 2 or more',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-026');
 assert.equal(printed.effect,'登場：可使最多 1 個己方場上原始 AP 消耗 2 以上的角色，本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-026'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.ap,1);
 assert.deepEqual(card.effects.onPlay,[{op:'grantOtherImpactThisTurn',minPrintedAp:2,
  amount:1,optional:true,plus:true,includeSelf:true}]);
 const {packs,s}=main(blue,29026);
 put(s,0,'BLC-2-027','energy',0);
 const heavy=put(s,0,'BLC-4-022','energy',1);
 const light=put(s,0,'BLC-2-031','front',0);
 const foe=put(s,1,'BLC-4-022','front',0);
 const self=take(s,0,'BLC-2-026');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===1);
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-grant-impact');
 assert.equal(played.pending.minPrintedAp,2);
 assert.equal(played.pending.plus,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseGrantImpact'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(heavy.uid),true);
 assert.equal(chosen(self.uid),false);
 assert.equal(chosen(light.uid),false);
 assert.equal(chosen(foe.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:null});
 assert.equal(universalImpact(packs,skipped,live(skipped,0,heavy.uid)),0);
 const granted=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:heavy.uid});
 assert.equal(universalImpact(packs,granted,live(granted,0,heavy.uid)),1);
 assert.equal(universalImpact(packs,granted,live(granted,0,self.uid)),0);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,granted),true);
});

test('BLC-2-027 gains 500 on its own turn for each own front character with printed AP 2 or more',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-027');
 assert.equal(printed.effect,'己方回合中，己方前線每有 1 個原始 AP 消耗 2 以上的角色，此角色 BP +500。');
 const card=bleach.cards['BLC-2-027'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownPrintedApAtLeast',turn:'own',
  zone:'front',excludeSelf:false,minAp:2},bpEach:500}]);
 const {packs,s}=main(blue,29027);
 const self=put(s,0,'BLC-2-027','front',0);
 const heavy=put(s,0,'BLC-4-022','front',1);
 put(s,0,'BLC-2-031','front',2);
 assert.equal(universalBp(packs,s,self),3000);
 const moved=live(s,0,heavy.uid);
 s.players[0].front[1]=null;
 s.players[0].energy[0]=moved;
 assert.equal(universalBp(packs,s,self),2500);
 s.players[0].energy[0]=null;
 s.players[0].front[1]=moved;
 const foe=put(s,1,'BLC-4-022','front',0);
 assert.equal(universalBp(packs,s,self),3000);
 assert.equal(foe.cardId,'BLC-4-022');
 let later=s;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,self.uid)),2500);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-4-046 may buff one own purple Ichigo',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-046');
 assert.equal(printed.effect,'登場時：最多選自己場上1個紫色《黑崎一護》，本回合BP+1500。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-046'];
 assert.equal(card.energy,0);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'buffOwnField',filter:{field:'color',value:'purple'},
  also:{field:'name',value:'黒崎 一護'},bp:1500,optional:true,excludeSelf:false}]);
 const {packs,s}=main(purple,29046);
 const self=take(s,0,'BLC-4-046');
 s.players[0].hand.push(self);
 const front=put(s,0,'BLC-1-103','front',0);
 const energy=put(s,0,'BLC-1-039','energy',0);
 const other=put(s,0,'BLC-1-035','front',1);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-buff-own');
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(front.uid),true);
 assert.equal(chosen(energy.uid),true);
 assert.equal(chosen(other.uid),false);
 assert.equal(chosen(self.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,0,front.uid)),3000);
 const buffed=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:energy.uid});
 assert.equal(universalBp(packs,buffed,live(buffed,0,energy.uid)),3000);
 assert.equal(universalBp(packs,buffed,live(buffed,0,front.uid)),3000);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,buffed),true);
});

test('BLC-4-028 rests once and keeps BP+1000 until its next own turn starts',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-028');
 assert.equal(printed.effect,'啟動・主要〔改為Rest／每回合1次〕：此角色到自己下次回合開始前BP+1000。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-028'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.mainAbility,{op:'restOnceBuffSelfUntilNextOwnStart',oncePerTurn:true,bp:1000});
 const {packs,s}=main(blue,29028);
 const energy=put(s,0,'BLC-4-028','energy',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===energy.uid&&a.mode==='restOnceSelfBuff'),true);
 let used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===energy.uid));
 assert.equal(live(used,0,energy.uid).ready,false);
 assert.equal(universalBp(packs,used,live(used,0,energy.uid)),5000);
 live(used,0,energy.uid).ready=true;
 assert.equal(legalUniversalActions(packs,used).some(a=>a.type==='activate'&&a.uid===energy.uid),false);
 let later=used;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,energy.uid)),5000);
 for(let n=0;n<16&&later.active===1;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,0);
 assert.equal(universalBp(packs,later,live(later,0,energy.uid)),4000);
 assert.equal(assertUniversalMatch(packs,later),true);
 const fresh=main(blue,29029);
 const front=put(fresh.s,0,'BLC-4-028','front',0);
 assert.equal(legalUniversalActions(fresh.packs,fresh.s).some(a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='restOnceSelfBuff'),true);
 const fromFront=dispatchUniversalAction(fresh.packs,fresh.s,legalUniversalActions(fresh.packs,fresh.s).find(a=>a.type==='activate'&&a.uid===front.uid));
 assert.equal(live(fromFront,0,front.uid).ready,false);
 assert.equal(universalBp(fresh.packs,fromFront,live(fromFront,0,front.uid)),5000);
 assert.equal(assertUniversalMatch(fresh.packs,fromFront),true);
});

test('BLC-4-052 gains 1500 while an opposing front character is below its printed BP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-052');
 assert.equal(printed.effect,'若對方前線有BP低於印刷BP的角色，此角色BP+1500。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-052'];
 assert.equal(card.energy,0);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'oppFrontLiveBpBelowPrinted',turn:'any'},bp:1500}]);
 const {packs,s}=main(purple,29052);
 const self=put(s,0,'BLC-4-052','front',0);
 const foe=put(s,1,'BLC-1-039','front',0);
 const side=put(s,1,'BLC-1-035','energy',0);
 assert.equal(universalBp(packs,s,self),1500);
 foe.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),3000);
 foe.buffs.length=0;
 side.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),1500);
 side.buffs.length=0;
 foe.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),1500);
 foe.buffs.length=0;
 let later=s;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 const there=live(later,0,self.uid);
 const reduced=live(later,1,foe.uid);
 reduced.buffs.push({bp:-500,untilTurn:later.turn});
 assert.equal(universalBp(packs,later,there),3000);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-3-007 may reveal one Gotei card from the top three, then discards only if it took one',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-007');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張【特徵：護廷十三隊】的卡片，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-3-007'];
 assert.equal(card.energy,2);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'trait',value:'護廷十三隊'}}]);
 const {packs,s}=main(green,29007);
 put(s,0,'BLC-1-070','energy',0);
 put(s,0,'BLC-1-078','energy',1);
 const [gotei,visor,other]=setTop(s,0,['BLC-1-080','BLC-4-062','BLC-4-060']);
 const self=take(s,0,'BLC-3-007');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(gotei.uid),true);
 assert.equal(chosen(visor.uid),false);
 assert.equal(chosen(other.uid),false);
 const missed=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:null}));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>[gotei.uid,visor.uid,other.uid].includes(c.uid)),false);
 assert.deepEqual(missed.players[0].deck.slice(-3).map(c=>c.uid).sort(),[gotei.uid,visor.uid,other.uid].sort());
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:gotei.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-1-080');
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,true);
 const ordered=orderBottom(packs,taken);
 assert.equal(ordered.pending.kind,'effect-discard');
 const spare=ordered.players[0].hand.find(c=>c.uid!==gotei.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.some(c=>c.uid===gotei.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-2).map(c=>c.uid).sort(),[visor.uid,other.uid].sort());
 const empty=main(green,29008);
 put(empty.s,0,'BLC-1-070','energy',0);
 put(empty.s,0,'BLC-1-078','energy',1);
 const none=setTop(empty.s,0,['BLC-4-062','BLC-4-061','BLC-4-060']);
 const again=take(empty.s,0,'BLC-3-007');
 empty.s.players[0].hand.push(again);
 const replay=legalUniversalActions(empty.packs,empty.s).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='front');
 const opened=dispatchUniversalAction(empty.packs,empty.s,replay);
 assert.equal(opened.pending.kind,'effect-top-order');
 const closed=orderBottom(empty.packs,opened);
 assert.equal(closed.pending,null);
 assert.equal(closed.players[0].hand.some(c=>none.some(x=>x.uid===c.uid)),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-002 may reveal one of four printed names from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-002');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張〈黑崎一護〉、〈阿散井戀次〉、〈朽木露琪亞〉或〈朽木白哉〉，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。');
 const card=bleach.cards['BLC-3-002'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'黒崎 一護'},{field:'name',value:'阿散井 恋次'},
  {field:'name',value:'朽木 ルキア'},{field:'name',value:'朽木 白哉'}]}]);
 const {packs,s}=main(blue,29002);
 put(s,0,'BLC-2-027','energy',0);
 const [ichigo,other,byakuya]=setTop(s,0,['BLC-2-016','BLC-2-041','BLC-2-029']);
 const self=take(s,0,'BLC-3-002');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(ichigo.uid),true);
 assert.equal(chosen(byakuya.uid),true);
 assert.equal(chosen(other.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:byakuya.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-2-029');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==byakuya.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===byakuya.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].deck.some(c=>c.uid===other.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-4-001 is also Bazz-B and may reveal Bazz-B or Jugram from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-001');
 assert.equal(printed.effect,'此卡也視為《巴茲比》。登場時：查看牌庫頂3張，最多公開1張《巴茲比》或《雨葛蘭・哈斯沃德》加入手牌，其餘依任意順序放回牌庫底；若有加入手牌，將1張手牌送至場外。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-001'];
 assert.equal(card.energy,1);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(cardHasName(card,'バズ'),true);
 assert.equal(cardHasName(card,'バズビー'),true);
 assert.equal(cardHasName(card,'バズビー',true),false);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'バズビー'},{field:'name',value:'ユーグラム・ハッシュヴァルト'}]}]);
 const {packs,s}=main(yellow,29001);
 put(s,0,'BLC-1-023','energy',0);
 const self=take(s,0,'BLC-4-001');
 const [alias,jugram,other]=setTop(s,0,['BLC-4-001','BLC-1-018','BLC-1-006']);
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(alias.uid),true);
 assert.equal(chosen(jugram.uid),true);
 assert.equal(chosen(other.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:alias.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-001');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==alias.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===alias.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].hand.some(c=>c.uid===other.uid),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-2-072 rests a cheap green character from hand only while Hitsugaya is on the own field',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-072');
 assert.equal(printed.effect,'登場：己方場上有〈日番谷冬獅郎〉時，可從手牌將最多 1 張需求能源 2 以下、AP 消耗 1 的綠色角色卡，以 REST 登場於己方場上。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-072'];
 assert.equal(card.energy,3);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'deployOwnHandRest',type:'character',color:'green',
  energy:2,ap:1,max:1,when:{kind:'ownNameExists',turn:'any',zone:'field',
  excludeSelf:false,name:'日番谷 冬獅郎'}}]);
 const closed=main(green,29072);
 put(closed.s,0,'BLC-1-078','energy',0);
 put(closed.s,0,'BLC-1-080','energy',1);
 put(closed.s,1,'BLC-1-083','front',0);
 const lone=take(closed.s,0,'BLC-2-072');
 closed.s.players[0].hand.push(lone);
 const blocked=legalUniversalActions(closed.packs,closed.s).find(a=>a.type==='play'&&a.uid===lone.uid&&a.line==='front');
 assert.ok(blocked);
 const quiet=dispatchUniversalAction(closed.packs,closed.s,blocked);
 assert.equal(quiet.pending,null);
 const {packs,s}=main(green,29073);
 put(s,0,'BLC-1-078','energy',0);
 put(s,0,'BLC-1-080','energy',1);
 const gate=put(s,0,'BLC-1-083','energy',2);
 const cheap=take(s,0,'BLC-4-062');
 const heavy=take(s,0,'BLC-1-070');
 s.players[0].hand.push(cheap,heavy);
 const self=take(s,0,'BLC-2-072');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-hand-rest');
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseHandRest'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(cheap.uid),true);
 assert.equal(chosen(heavy.uid),false);
 assert.equal(chosen(gate.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseHandRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===cheap.uid),true);
 const enter=choices.find(a=>a.type==='chooseHandRest'&&a.uid===cheap.uid&&a.line==='front');
 assert.ok(enter);
 const entered=dispatchUniversalAction(packs,played,enter);
 assert.equal(entered.pending,null);
 const arrived=live(entered,0,cheap.uid);
 assert.equal(arrived.ready,false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,entered),true);
});

test('BLC-2-032 reveals one printed-AP-2 card from the top five and does not discard',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-032');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 5 張，可公開其中最多 1 張原始 AP 消耗 2 以上的卡並加入手牌，其餘以任意順序放至牌堆底。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-032'];
 assert.equal(card.energy,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopUpToTwoBottom',count:5,max:1,rest:'bottom',
  logic:'all',filters:[{field:'printedApAtLeast',value:2}]}]);
 const {packs,s}=main(blue,29032);
 put(s,0,'BLC-2-026','energy',0);
 put(s,0,'BLC-4-028','energy',1);
 const [heavy,light,a,b,c]=setTop(s,0,['BLC-4-022','BLC-2-031','BLC-2-027','BLC-2-041','BLC-4-036']);
 const self=take(s,0,'BLC-2-032');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-many-choice');
 assert.equal(played.pending.max,1);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFilteredMany'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(heavy.uid),true);
 assert.equal(chosen(light.uid),false);
 const skipped=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFilteredMany',uid:null}));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(x=>x.uid===heavy.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFilteredMany',uid:heavy.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-022');
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,undefined);
 const done=orderBottom(packs,taken);
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.some(x=>x.uid===heavy.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-4).map(x=>x.uid).sort(),[light.uid,a.uid,b.uid,c.uid].sort());
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});
