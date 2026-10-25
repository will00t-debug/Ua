import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices,universalBp}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// Official image checked 2026-10-25. Catalogue Chinese is the fingerprint.
// fullyAccepted stays 0.
// EX07BT/BLC-2-017 黒崎 一護
//   起動メイン 手札を1枚場外に置く ターン1
//   このキャラはこのターン中、「このキャラはBP4000以上のキャラにブロックされない。」を得る。
// ターン1 is this physical card, not every copy of the printed name.

const bleach=registeredV2TitlePack('bleach');
function realDeck(required){
 const rest=Object.values(bleach.cards).filter(c=>c.color==='blue'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const blue=realDeck(['BLC-2-017','BLC-2-016','BLC-2-025']);
function takeFrom(s,p,id,zones){
 for(const zone of zones){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function take(s,p,id){
 return takeFrom(s,p,id,['hand','deck','life','outside','removed']);
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
function parkHand(s,p){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}
function setBp(s,c,target){
 const printed=bleach.cards[c.cardId].bp;
 c.buffs=[{bp:target-printed,untilTurn:s.turn}];
}
function main(seed){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[blue,blue],seed,first:0});
 for(let n=0;n<8&&!(s.phase==='main'&&s.active===0);n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return {packs,s};
}
function shell(extra){
 return {id:'BAD',name:'BAD',color:'blue',energy:2,ap:1,bp:3000,gen:1,traits:[],
  trigger:null,implementation:'dsl',type:'character',effects:{},...extra};
}
const printedMain={op:'discardOnceSelfBlockAtLeast',oncePerTurn:true,discardCount:1,bp:4000};

test('BLC-2-017 pays one hand card once and cannot be blocked at BP 4000',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-017');
 assert.equal(printed.nameJa,'黒崎 一護');
 assert.equal(printed.effect,'主要階段・每回合 1 次：將 1 張手牌送至場外，使此角色本回合不能被 BP 4000 以上角色阻擋。');
 const card=bleach.cards['BLC-2-017'];
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.equal(card.step,false);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.mainAbility,printedMain);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({mainAbility:{...printedMain,bp:3000}})]}),
  /invalid once discard block ceiling/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'event',bp:0,gen:0,trigger:'special',
  triggerEffect:{op:'retireOppFront'},mainAbility:printedMain})]}),
  /unsupported main action ability/);

 const openedMatch=main(292017);
 parkHand(openedMatch.s,0);
 const self=put(openedMatch.s,0,'BLC-2-017','front',0,false);
 const otherName=put(openedMatch.s,0,'BLC-2-016','front',1,true);
 assert.equal(legalUniversalActions(openedMatch.packs,openedMatch.s)
  .some(a=>a.type==='activate'&&a.mode==='discardBlockCeiling'),false);
 const pay=hold(openedMatch.s,0,'BLC-2-025');
 const rested=legalUniversalActions(openedMatch.packs,openedMatch.s)
  .filter(a=>a.type==='activate'&&a.mode==='discardBlockCeiling');
 assert.deepEqual(rested.map(a=>a.uid),[self.uid]);
 assert.equal(rested.some(a=>a.uid===otherName.uid),false);

 const energyMatch=main(292018);
 parkHand(energyMatch.s,0);
 const energy=put(energyMatch.s,0,'BLC-2-017','energy',0,true);
 hold(energyMatch.s,0,'BLC-2-025');
 assert.equal(legalUniversalActions(energyMatch.packs,energyMatch.s)
  .some(a=>a.type==='activate'&&a.uid===energy.uid&&a.mode==='discardBlockCeiling'),true);
 grantContinuousState(energyMatch.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:energy.uid,targetUid:energy.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(energyMatch.packs,energyMatch.s)
  .some(a=>a.uid===energy.uid&&a.mode==='discardBlockCeiling'),false);

 let paying=dispatchUniversalAction(openedMatch.packs,openedMatch.s,
  legalUniversalActions(openedMatch.packs,openedMatch.s)
   .find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='discardBlockCeiling'));
 assert.equal(paying.pending.kind,'main-discard-block-ceiling');
 assert.deepEqual(paying.pending.choices,[pay.uid]);
 assert.equal(universalPrivateChoices(openedMatch.packs,paying,1),null);
 assert.equal(universalPublicView(openedMatch.packs,paying,1).pending.kind,'main-discard-block-ceiling');
 for(const difficulty of ['easy','normal','hard']){
  const chosen=chooseUniversalAiAction(openedMatch.packs,paying,{difficulty});
  assert.equal(legalUniversalActions(openedMatch.packs,paying).some(a=>
   JSON.stringify(a)===JSON.stringify(chosen)),true);
 }
 assert.throws(()=>dispatchUniversalAction(openedMatch.packs,paying,{type:'chooseMainDiscard',uid:self.uid}),
  /not currently legal/);
 paying=dispatchUniversalAction(openedMatch.packs,paying,{type:'chooseMainDiscard',uid:pay.uid});
 assert.equal(paying.pending,null);
 assert.equal(paying.players[0].outside.some(c=>c.uid===pay.uid),true);
 const lived=paying.players[0].front.find(c=>c?.uid===self.uid);
 assert.deepEqual(lived.blockAtLeastGranted,{turn:paying.turn,stamp:lived.fieldEntryStamp,bp:4000});
 assert.equal(paying.mainAbilityUsedUids.includes(self.uid),true);
 hold(paying,0,'BLC-2-016');
 assert.equal(legalUniversalActions(openedMatch.packs,paying)
  .some(a=>a.uid===self.uid&&a.mode==='discardBlockCeiling'),false);
 const copy=put(paying,0,'BLC-2-017','energy',0,true);
 assert.equal(legalUniversalActions(openedMatch.packs,paying)
  .some(a=>a.uid===copy.uid&&a.mode==='discardBlockCeiling'),true);
 lived.blockAtLeastGranted.forged=true;
 assert.throws(()=>assertUniversalMatch(openedMatch.packs,paying),/Forged blocker ceiling/);
 delete lived.blockAtLeastGranted.forged;
 assertUniversalMatch(openedMatch.packs,paying);

 const battle=main(292019);
 parkHand(battle.s,0);
 const attacker=put(battle.s,0,'BLC-2-017','front',0,true);
 const cost=hold(battle.s,0,'BLC-2-025');
 const low=put(battle.s,1,'BLC-2-016','front',0,true);
 const exact=put(battle.s,1,'BLC-2-025','front',1,true);
 const high=put(battle.s,1,'BLC-2-016','front',2,true);
 setBp(battle.s,low,3500);
 setBp(battle.s,exact,4000);
 setBp(battle.s,high,4500);
 let fought=dispatchUniversalAction(battle.packs,battle.s,
  legalUniversalActions(battle.packs,battle.s)
   .find(a=>a.type==='activate'&&a.uid===attacker.uid&&a.mode==='discardBlockCeiling'));
 fought=dispatchUniversalAction(battle.packs,fought,{type:'chooseMainDiscard',uid:cost.uid});
 fought=dispatchUniversalAction(battle.packs,fought,{type:'next'});
 fought=dispatchUniversalAction(battle.packs,fought,
  legalUniversalActions(battle.packs,fought).find(a=>a.type==='attack'&&a.uid===attacker.uid));
 const blocks=legalUniversalActions(battle.packs,fought).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocks.includes(null),true);
 assert.equal(blocks.includes(low.uid),true);
 assert.equal(blocks.includes(exact.uid),false);
 assert.equal(blocks.includes(high.uid),false);
 assert.equal(universalBp(battle.packs,fought,low),3500);
 assert.equal(universalBp(battle.packs,fought,exact),4000);
});
