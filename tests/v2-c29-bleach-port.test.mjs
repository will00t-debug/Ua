import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
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

const bleach=registeredV2TitlePack('bleach');
const ADDED=['BLC-1-080','BLC-1-091','BLC-2-041','BLC-1-062','BLC-1-032','BLC-1-078'];
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const green=realDeck(['BLC-1-080','BLC-1-091','BLC-1-078','BLC-1-070','BLC-4-062'],'green');
const blue=realDeck(['BLC-2-041','BLC-2-031','BLC-4-036'],'blue');
const purple=realDeck(['BLC-1-062','BLC-1-035','BLC-1-103'],'purple');
const yellow=realDeck(['BLC-1-032','BLC-1-023','BLC-1-006'],'yellow');
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

test('C29 registers six whole BLEACH prints and keeps the independent census',()=>{
 assert.equal(EXPECTED_V2_TOTAL,442);
 assert.equal(EXPECTED_V2_COUNTS.bleach,166);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],125);
 for(const id of ADDED)assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
 assert.equal(Object.keys(bleach.cards).length,166);
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
