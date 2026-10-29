// Official Mushoku Tensei card FAQ, fetched 2026-10-29.
// UA54BT Q2145–Q2165, Q2205, Q2208, Q2220, Q2228:
// https://www.unionarena-tcg.com/jp/faq/list.php?series=UA54BT
// These twenty-five rulings are not a certification of all 80 prints.
// Q2162's question quotes 「相手のキャラの効果」; the print says 「相手の効果」.
// No erratum was found, so selection stays the printed scope and is not certified.
import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {v2InventoryForTitle} from '../dist/universal-v2/title-packs/inventory.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,originalEffectsDisabled} from '../dist/universal-v2/continuous-states.mjs';
import {handPlayApPlan} from '../dist/universal-v2/ap-discounts.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const ttg=registeredV2TitlePack('gurren-lagann');
const counts={
 'MST-1-005':1,'MST-1-006':1,'MST-1-007':2,'MST-1-008':2,'MST-1-009':2,
 'MST-1-010':2,'MST-1-013':3,'MST-1-020':4,'MST-1-022':2,'MST-1-025':2,
 'MST-1-031':2,'MST-1-032':2,'MST-1-033':4,'MST-1-034':2,'MST-1-036':2,
 'MST-1-038':2,'MST-1-040':1,'MST-1-042':2,'MST-1-048':2,'MST-1-054':2,
 'MST-1-062':1,'MST-1-067':1,'MST-1-068':2,'MST-1-073':2,'MST-1-075':2
};
assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
assert.deepEqual(validateUniversalDeck(mst,counts),[]);
const packs=[mst,mst];
const fresh=seed=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});

function take(s,p,id,except=null){
 for(const zone of ['deck','hand','life','outside','removed']){
  const cards=s.players[p][zone];
  const index=cards.findIndex(c=>c.cardId===id&&c.uid!==except);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function stamp(s,card,ready=true){
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 if(mst.cards[card.cardId]?.ownEffectActiveOnly)card.ownEffectActiveOnly=true;
 return card;
}
function put(s,p,id,line,slot,ready=true){
 assert.equal(s.players[p][line][slot],null);
 const card=stamp(s,take(s,p,id),ready);
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=s.players[p].hand.find(c=>c.cardId===id)||take(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function outside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function act(s,type,extra,set=packs){
 const action=legalUniversalActions(set,s).find(a=>a.type===type&&
  Object.entries(extra||{}).every(([k,v])=>a[k]===v));
 assert.ok(action,(s.pending?.kind||s.phase)+' '+type+' '+JSON.stringify(extra||{}));
 return dispatchUniversalAction(set,s,action);
}
function handLimit(s,set=packs){
 while(s.pending?.kind==='end-hand-limit'){
  const hand=s.players[s.pending.player].hand[0];
  s=dispatchUniversalAction(set,s,{type:'chooseHandLimit',uid:hand.uid});
 }
 return s;
}
function walk(s,done,set=packs){
 let guard=0;
 while(!done(s)){
  s=handLimit(s,set);
  if(done(s))return s;
  if(s.pending)throw Error('unexpected pending '+s.pending.kind+' '+s.phase);
  const next=legalUniversalActions(set,s).find(a=>a.type==='next');
  assert.ok(next,'stuck '+s.phase);
  s=dispatchUniversalAction(set,s,next);
  assert.ok(++guard<80,'walk exceeded');
 }
 return s;
}
function main(s,owner=0,turn=1,set=packs){
 return walk(s,x=>x.active===owner&&x.players[owner].ownTurns>=turn&&
  x.phase==='main'&&!x.pending,set);
}
function attackPhase(s,owner=0,set=packs){
 return walk(s,x=>x.active===owner&&x.phase==='attack'&&!x.pending,set);
}
function decline(s,set=packs){
 const legal=legalUniversalActions(set,s);
 const choice=legal.find(a=>a.uid===null||a.mode==='skip'||a.mode==='decline');
 assert.ok(choice,'no decline for '+(s.pending&&s.pending.kind));
 return dispatchUniversalAction(set,s,choice);
}
function clearLife(s,set=packs){
 for(let n=0;n<8&&s.pending&&['life-batch-order','life-trigger'].includes(s.pending.kind);n++){
  const legal=legalUniversalActions(set,s);
  const choice=s.pending.kind==='life-batch-order'
   ?legal.find(a=>a.type==='chooseLifeOrder')||legal[0]
   :legal.find(a=>a.type==='chooseTrigger'&&a.mode==='skip')||legal[0];
  assert.ok(choice,s.pending.kind);
  s=dispatchUniversalAction(set,s,choice);
 }
 return s;
}
function skipOn(s,uid){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===uid);
}
function fuel(s,p,ids){
 ids.forEach((id,i)=>put(s,p,id,'energy',i));
}

test('the UA54BT list does not mark the Mushoku Tensei catalogue accepted',()=>{
 const row=v2InventoryForTitle('mushoku-tensei');
 assert.equal(row.total,80);
 assert.equal(row.pilotImplemented,80);
 assert.equal(row.unportedIds.length,0);
 assert.equal(row.fullyAccepted,0);
});

test('Q2145 choosing Eris deploy spends that choice for the name; draw stays open',()=>{
 let s=main(fresh(2145),0,2);
 fuel(s,0,['MST-1-010','MST-1-010','MST-1-020']);
 const first=hold(s,0,'MST-1-007');
 const second=take(s,0,'MST-1-007',first.uid);
 s.players[0].hand.push(second);
 const eris=hold(s,0,'MST-1-006');
 s=act(s,'play',{uid:eris.uid,line:'front'});
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=act(s,'chooseOptionalPayAp',{mode:'pay'});
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 s=act(s,'chooseHandRestOrRaid',{uid:first.uid,mode:'enter',line:'energy'});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.ok(s.pending.options.some(o=>o.id==='deploy'));
 s=act(s,'chooseEffectMode',{mode:'deploy'});
 assert.ok(s.onceEffectUses[0].includes('name:エリス'));
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 s=act(s,'chooseHandRestOrRaid',{uid:second.uid,mode:'enter',line:'front'});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['draw']);
 s=act(s,'chooseEffectMode',{mode:'draw'});
 assert.equal(s.pending.kind,'effect-discard');
 s=act(s,'chooseDiscard',{uid:s.players[0].hand[0].uid});
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2146 the unblocked draw opens after the block decision and before life damage',()=>{
 let open=attackPhase(fresh(2146));
 const eris=put(open,0,'MST-1-008','front',0);
 const wall=put(open,1,'MST-1-025','front',0);
 assert.ok(mst.cards[wall.cardId].bp>mst.cards[eris.cardId].bp);
 const life=open.players[1].life.length,hand=open.players[0].hand.length;
 open=act(open,'attack',{uid:eris.uid});
 assert.equal(open.pending.kind,'block');
 open=act(open,'chooseBlock',{uid:null});
 assert.equal(open.pending.kind,'effect-may-then');
 assert.equal(open.players[1].life.length,life);
 open=act(open,'chooseMayThen',{mode:'do'});
 assert.equal(open.players[0].hand.length,hand+1);
 assert.ok(open.players[1].life.length<life||open.pending?.kind==='life-trigger');
 assert.equal(assertUniversalMatch(packs,open),true);

 let blocked=attackPhase(fresh(21461));
 const attacker=put(blocked,0,'MST-1-008','front',0);
 put(blocked,1,'MST-1-073','front',0);
 const before=blocked.players[0].hand.length;
 blocked=act(blocked,'attack',{uid:attacker.uid});
 blocked=act(blocked,'chooseBlock',{uid:blocked.players[1].front[0].uid});
 assert.notEqual(blocked.pending?.kind,'effect-may-then');
 assert.equal(blocked.players[0].hand.length,before);
 assert.ok(blocked.players[0].front.some(c=>c?.uid===attacker.uid));
 assert.equal(assertUniversalMatch(packs,blocked),true);
});

test('Q2147 attack-end swap waits until the battle or the life trigger is finished',()=>{
 let s=main(fresh(2147),0,2);
 fuel(s,0,['MST-1-010','MST-1-068','MST-1-020']);
 const roxy=put(s,0,'MST-1-032','front',0);
 const field=put(s,0,'MST-1-033','energy',3);
 const event=hold(s,0,'MST-1-034');
 const eris=hold(s,0,'MST-1-009');
 s=act(s,'event',{uid:event.uid});
 while(s.pending?.kind==='effect-recover-ap')s=decline(s);
 s=act(s,'activate',{uid:field.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 s=act(s,'chooseHandRestOrRaid',{uid:eris.uid,mode:'enter',line:'front'});
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=act(s,'chooseEffectMode',{mode:'swap'});
 const swapWith=put(s,0,'MST-1-022','energy',3);
 const entered=s.players[0].front.find(c=>c?.uid===eris.uid);
 assert.equal(entered.ready,false);
 assert.ok(entered.attackEndSwapGranted);
 s=act(s,'activate',{uid:roxy.uid,mode:'active'});
 assert.equal(s.pending.kind,'effect-active-character');
 s=act(s,'chooseActiveCharacter',{uid:eris.uid});
 assert.equal(s.players[0].front.find(c=>c?.uid===eris.uid).ready,true);
 const blocker=put(s,1,'MST-1-013','front',0);
 s=attackPhase(s);
 const lifeCard=take(s,1,'MST-1-020');
 s.players[1].life.unshift(lifeCard);
 const life=s.players[1].life.length;
 s=act(s,'attack',{uid:eris.uid});
 s=act(s,'chooseBlock',{uid:blocker.uid});
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.players[1].life.length,life-1);
 s=clearLife(s);
 assert.equal(s.pending.kind,'attack-end-swap');
 s=act(s,'chooseAttackEndSwap',{uid:swapWith.uid});
 assert.equal(s.players[0].energy.find(c=>c?.uid===eris.uid)?.uid,eris.uid);
 assert.equal(assertUniversalMatch(packs,s),true);

 let direct=main(fresh(21471),0,2);
 fuel(direct,0,['MST-1-010','MST-1-068','MST-1-020']);
 const roxy2=put(direct,0,'MST-1-032','front',0);
 const field2=put(direct,0,'MST-1-033','energy',3);
 const event2=hold(direct,0,'MST-1-034');
 const eris2=hold(direct,0,'MST-1-009');
 put(direct,0,'MST-1-022','front',1);
 direct=act(direct,'event',{uid:event2.uid});
 while(direct.pending?.kind==='effect-recover-ap')direct=decline(direct);
 direct=act(direct,'activate',{uid:field2.uid,mode:'fieldRestTrueRetireDeploy'});
 direct=act(direct,'chooseHandRestOrRaid',{uid:eris2.uid,mode:'enter',line:'front'});
 direct=act(direct,'chooseEffectMode',{mode:'swap'});
 direct=act(direct,'activate',{uid:roxy2.uid,mode:'active'});
 direct=act(direct,'chooseActiveCharacter',{uid:eris2.uid});
 direct=attackPhase(direct);
 direct=act(direct,'attack',{uid:eris2.uid});
 direct=act(direct,'chooseBlock',{uid:null});
 while(direct.pending&&direct.pending.kind!=='attack-end-swap'){
  direct=clearLife(direct);
  if(direct.pending?.kind==='attack-end-swap')break;
  direct=decline(direct);
 }
 assert.equal(direct.pending.kind,'attack-end-swap');
 assert.equal(assertUniversalMatch(packs,direct),true);
});

test('Q2148-Q2151 stripping a raided top leaves the base without entry or borrowed effects',()=>{
 let rested=main(fresh(2148),0,2);
 fuel(rested,0,['MST-1-010','MST-1-020','MST-1-005','MST-1-013']);
 const erisBase=put(rested,0,'MST-1-007','front',0);
 const rudeusBase=put(rested,0,'MST-1-022','front',1);
 const eris=hold(rested,0,'MST-1-008');
 rested=act(rested,'raid',{uid:eris.uid,baseUid:erisBase.uid});
 if(rested.pending)rested=decline(rested);
 const rudeus=hold(rested,0,'MST-1-025');
 rested=act(rested,'raid',{uid:rudeus.uid,baseUid:rudeusBase.uid});
 if(rested.pending)rested=decline(rested);
 const top=rested.players[0].front.find(c=>c?.uid===rudeus.uid);
 top.ready=false;
 top.buffs.push({bp:1000,untilTurn:rested.turn});
 const hand=rested.players[0].hand.length;
 const oldStamp=rested.players[0].front.find(c=>c?.stack?.[0]?.uid===rudeusBase.uid).stack[0].fieldEntryStamp;
 rested=act(rested,'activate',{uid:rudeus.uid,mode:'frontChoose'});
 assert.equal(rested.pending.kind,'effect-choice-mode');
 rested=act(rested,'chooseEffectMode',{mode:'strip'});
 assert.equal(rested.pending.kind,'effect-grant-named');
 rested=act(rested,'chooseGrantNamed',{uid:eris.uid});
 assert.equal(rested.pending,null);
 assert.ok(rested.players[0].outside.some(c=>c.uid===rudeus.uid));
 const base=rested.players[0].front.find(c=>c?.uid===rudeusBase.uid);
 assert.ok(base);
 assert.equal(base.ready,false);
 assert.deepEqual(base.buffs,[]);
 assert.notEqual(base.fieldEntryStamp,oldStamp);
 assert.equal(rested.players[0].hand.length,hand);
 assert.equal(assertUniversalMatch(packs,rested),true);

 let active=main(fresh(2150),0,2);
 fuel(active,0,['MST-1-010','MST-1-020','MST-1-005','MST-1-013']);
 const baseCard=put(active,0,'MST-1-007','front',0);
 const other=put(active,0,'MST-1-022','front',1);
 const topCard=hold(active,0,'MST-1-008');
 active=act(active,'raid',{uid:topCard.uid,baseUid:baseCard.uid});
 if(active.pending)active=decline(active);
 const source=hold(active,0,'MST-1-025');
 active=act(active,'raid',{uid:source.uid,baseUid:other.uid});
 if(active.pending)active=decline(active);
 assert.equal(active.players[0].front.find(c=>c?.uid===source.uid).ready,true);
 active=act(active,'activate',{uid:source.uid,mode:'frontChoose'});
 active=act(active,'chooseEffectMode',{mode:'strip'});
 active=act(active,'chooseGrantNamed',{uid:topCard.uid});
 const kept=active.players[0].front.find(c=>c?.uid===other.uid);
 assert.equal(kept.ready,true);
 assert.deepEqual(kept.buffs,[]);
 assert.equal(assertUniversalMatch(packs,active),true);
});

test('Q2152 and Q2161 a non-matching hand play does not spend the next discount',()=>{
 let event=main(fresh(2152),0,2);
 fuel(event,0,['MST-1-010','MST-1-010','MST-1-068','MST-1-020']);
 const roxy=hold(event,0,'MST-1-031');
 event=act(event,'play',{uid:roxy.uid,line:'front'});
 const discount=event.continuousStates.find(e=>e.kind==='nextEligibleHandPlayApDiscount');
 assert.ok(discount);
 const plain=hold(event,0,'MST-1-022');
 assert.equal(handPlayApPlan(event,0,mst.cards[plain.cardId]).cost,1);
 event=act(event,'play',{uid:plain.uid,line:'energy'});
 if(event.pending?.kind==='effect-discard'){
  const dumped=event.players[0].hand[0];
  event=act(event,'chooseDiscard',{uid:dumped.uid});
 }
 assert.equal(event.continuousStates.some(e=>e.id===discount.id),true);
 const matching=hold(event,0,'MST-1-034');
 assert.equal(handPlayApPlan(event,0,mst.cards[matching.cardId]).cost,0);
 event=act(event,'event',{uid:matching.uid});
 assert.equal(event.continuousStates.some(e=>e.id===discount.id),false);
 while(event.pending)event=decline(event);
 assert.equal(assertUniversalMatch(packs,event),true);

 let character=main(fresh(2161),0,2);
 fuel(character,0,['MST-1-068','MST-1-068','MST-1-020']);
 const nana=hold(character,0,'MST-1-062');
 const bounce=put(character,0,'MST-1-020','front',0);
 character=act(character,'play',{uid:nana.uid,line:'front'});
 character=act(character,'chooseEffectMode',{mode:'bounce'});
 character=act(character,'chooseOwnBounce',{uid:bounce.uid});
 const cut=character.continuousStates.find(e=>e.kind==='nextEligibleHandPlayApDiscount');
 assert.ok(cut);
 const low=hold(character,0,'MST-1-013');
 assert.equal(mst.cards[low.cardId].gen,1);
 assert.equal(handPlayApPlan(character,0,mst.cards[low.cardId]).cost,1);
 character=act(character,'play',{uid:low.uid,line:'energy'});
 assert.equal(character.continuousStates.some(e=>e.id===cut.id),true);
 const high=hold(character,0,'MST-1-073');
 assert.ok(mst.cards[high.cardId].gen>=2);
 assert.equal(handPlayApPlan(character,0,mst.cards[high.cardId]).cost,0);
 character=act(character,'play',{uid:high.uid,line:'front'});
 assert.equal(character.continuousStates.some(e=>e.id===cut.id),false);
 assert.equal(assertUniversalMatch(packs,character),true);
});

test('Q2153, Q2155 and Q2163 a full destination removes one card, then the move happens',()=>{
 let own=main(fresh(2153),0,2);
 const roxy=put(own,0,'MST-1-032','front',0);
 const rudeus=put(own,0,'MST-1-022','front',1);
 const occupants=['MST-1-020','MST-1-013','MST-1-005','MST-1-010'].map((id,i)=>
  put(own,0,id,'energy',i));
 own=act(own,'activate',{uid:roxy.uid,mode:'move'});
 assert.equal(own.pending.kind,'effect-line-move');
 own=act(own,'chooseLineMove',{uid:rudeus.uid});
 assert.equal(own.pending.kind,'effect-line-slot');
 const slot=legalUniversalActions(packs,own).find(a=>a.replaceUid===occupants[0].uid);
 assert.ok(slot);
 own=dispatchUniversalAction(packs,own,slot);
 assert.ok(own.players[0].removed.some(c=>c.uid===occupants[0].uid));
 assert.equal(own.players[0].energy.some(c=>c?.uid===rudeus.uid),true);
 assert.ok(own.zoneMoveEvents.some(e=>e.uid===occupants[0].uid&&e.to==='removed'&&e.reason==='rule'));
 assert.equal(assertUniversalMatch(packs,own),true);

 let played=main(fresh(2155),0,2);
 put(played,0,'MST-1-032','front',0);
 const mover=put(played,0,'MST-1-025','front',1);
 const filled=['MST-1-013','MST-1-022','MST-1-068','MST-1-005'].map((id,i)=>
  put(played,0,id,'energy',i));
 const gift=hold(played,0,'MST-1-040');
 played=act(played,'event',{uid:gift.uid});
 while(played.pending&&played.pending.kind!=='effect-line-move')played=decline(played);
 assert.equal(played.pending.kind,'effect-line-move');
 played=act(played,'chooseLineMove',{uid:mover.uid});
 const replace=legalUniversalActions(packs,played).find(a=>a.replaceUid===filled[0].uid);
 played=dispatchUniversalAction(packs,played,replace);
 assert.ok(played.players[0].removed.some(c=>c.uid===filled[0].uid));
 assert.equal(played.players[0].energy.some(c=>c?.uid===mover.uid),true);
 assert.equal(assertUniversalMatch(packs,played),true);

 let opp=main(fresh(2163),0,2);
 fuel(opp,0,['MST-1-068','MST-1-042','MST-1-048','MST-1-075']);
 const victim=put(opp,1,'MST-1-022','front',0);
 const energy=['MST-1-020','MST-1-013','MST-1-008','MST-1-025'].map((id,i)=>
  put(opp,1,id,'energy',i));
 const fitz=hold(opp,0,'MST-1-068');
 opp=act(opp,'play',{uid:fitz.uid,line:'front'});
 assert.equal(opp.pending.kind,'effect-choice-mode');
 opp=act(opp,'chooseEffectMode',{mode:'move'});
 assert.equal(opp.pending.kind,'effect-move-opp-front');
 const move=legalUniversalActions(packs,opp).find(a=>a.type==='chooseMoveOppFront'&&
  a.uid===victim.uid&&a.replaceUid===energy[0].uid);
 assert.ok(move);
 opp=dispatchUniversalAction(packs,opp,move);
 assert.ok(opp.players[1].removed.some(c=>c.uid===energy[0].uid));
 assert.equal(opp.players[1].energy.some(c=>c?.uid===victim.uid),true);
 assert.ok(opp.zoneMoveEvents.some(e=>e.uid===energy[0].uid&&e.to==='removed'&&e.reason==='rule'));
 assert.equal(assertUniversalMatch(packs,opp),true);
});

test('Q2154 two outside copies of the gift can return only once this turn',()=>{
 let s=main(fresh(2154),0,2);
 fuel(s,0,['MST-1-010','MST-1-068','MST-1-020','MST-1-005']);
 const base=put(s,0,'MST-1-022','front',0);
 const gifts=[outside(s,0,'MST-1-038'),outside(s,0,'MST-1-038')];
 const top=hold(s,0,'MST-1-025');
 s=act(s,'raid',{uid:top.uid,baseUid:base.uid});
 if(s.pending)s=decline(s);
 assert.ok(s.raidNamesThisTurn[0].includes('ルーデウス'));
 const first=legalUniversalActions(packs,s).find(a=>a.mode==='outsideRaidReturn'&&a.uid===gifts[0].uid);
 assert.ok(first);
 s=dispatchUniversalAction(packs,s,first);
 s=act(s,'chooseDiscard',{uid:s.players[0].hand[0].uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===gifts[0].uid));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='outsideRaidReturn'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2156 two Elinalise copies ready only once after a field retires',()=>{
 let s=main(fresh(2156));
 const field=put(s,0,'MST-1-033','energy',0);
 const first=put(s,0,'MST-1-042','front',0,false);
 const second=put(s,0,'MST-1-042','front',1,false);
 hold(s,0,'MST-1-020');
 s=act(s,'activate',{uid:field.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.ok(s.players[0].outside.some(c=>c.uid===field.uid));
 s=act(s,'chooseHandRestOrRaid',{uid:s.players[0].hand.find(c=>c.cardId==='MST-1-020').uid,
  mode:'enter',line:'front'});
 const ready=legalUniversalActions(packs,s).filter(a=>a.mode==='retireReady');
 assert.equal(ready.length,2);
 s=dispatchUniversalAction(packs,s,ready.find(a=>a.uid===first.uid));
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='retireReady'),false);
 assert.equal(s.players[0].front.find(c=>c?.uid===second.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2157 two Paulo attacks open the outside-field discard only once',()=>{
 let s=attackPhase(fresh(2157));
 const first=put(s,0,'MST-1-048','front',0);
 const second=put(s,0,'MST-1-048','front',1);
 for(const id of ['MST-1-033','MST-1-033','MST-1-033','MST-1-033','MST-1-075','MST-1-075'])
  outside(s,0,id);
 assert.equal(s.players[0].outside.filter(c=>mst.cards[c.cardId].type==='field').length,6);
 assert.ok(s.players[0].hand.length);
 s=act(s,'attack',{uid:first.uid});
 assert.equal(s.pending.kind,'effect-attack-discard-active');
 s=decline(s);
 assert.equal(s.pending.kind,'block');
 s=act(s,'chooseBlock',{uid:null});
 const turn=s.turn;
 s=clearLife(s);
 assert.equal(s.turn,turn);
 assert.equal(s.phase,'attack');
 s=walk(s,x=>x.phase==='attack'&&!x.pending&&x.active===0);
 s=act(s,'attack',{uid:second.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2158 Q2159 and Q2228 silence removes printed text, keeps raid state and earned buffs',()=>{
 let s=main(fresh(2158));
 s=main(s,1);
 fuel(s,1,['MST-1-010','MST-1-068','MST-1-020']);
 const raided=put(s,1,'MST-1-007','front',0);
 const cover=hold(s,1,'MST-1-009');
 s=act(s,'raid',{uid:cover.uid,baseUid:raided.uid});
 if(s.pending)s=decline(s);
 const live=s.players[1].front.find(c=>c?.uid===cover.uid);
 live.buffs.push({bp:1000,untilOwnTurnStart:s.players[1].ownTurns+1});
 const saved=s.active;
 s.active=1;
 const withPrinted=universalBp(packs,s,live);
 s.active=saved;
 assert.equal(withPrinted,mst.cards['MST-1-009'].bp+500+1000);
 assert.equal(universalImpact(packs,s,live),1);
 s=main(s,0,2);
 outside(s,0,'MST-1-033');
 fuel(s,0,['MST-1-068','MST-1-042','MST-1-048','MST-1-075']);
 const roxy=hold(s,0,'MST-1-054');
 s=act(s,'play',{uid:roxy.uid,line:'front'});
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.ok(s.pending.choices.includes(cover.uid));
 s=act(s,'chooseRestBp',{uid:cover.uid});
 const silenced=s.players[1].front.find(c=>c?.uid===cover.uid);
 assert.equal(silenced.stack.length,1);
 assert.equal(silenced.stack[0].uid,raided.uid);
 assert.equal(silenced.ready,false);
 assert.equal(originalEffectsDisabled(s,silenced),true);
 assert.equal(universalBp(packs,s,silenced),mst.cards['MST-1-009'].bp+1000);
 assert.equal(universalImpact(packs,s,silenced),0);
 s.active=1;
 assert.equal(universalBp(packs,s,silenced),mst.cards['MST-1-009'].bp+1000);
 s.active=0;
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2160 a double block earned from another card survives original-effect silence',()=>{
 const ttgDeck=Object.fromEntries(['002','005','006','009','014','019','042','043','047','051','064','065']
  .map(n=>['TTG-1-'+n,4]));
 ttgDeck['TTG-1-048']=2;
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
 const both=[mst,ttg];
 let s=newUniversalMatch(both,{decks:[counts,ttgDeck],first:1,seed:2160});
 const kitan=(()=>{
  for(const zone of ['deck','hand','life','outside']){
   const cards=s.players[1][zone],index=cards.findIndex(c=>c.cardId==='TTG-1-048');
   if(index>=0)return cards.splice(index,1)[0];
  }
  throw Error('Missing Kitan');
 })();
 kitan.ready=true;kitan.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=kitan;
 s=walk(s,x=>x.active===1&&x.phase==='attack'&&!x.pending,both);
 const before=universalBp(both,s,s.players[1].front[0]);
 s=dispatchUniversalAction(both,s,{type:'attack',uid:kitan.uid});
 assert.ok(s.players[1].front[0].doubleBlockGranted);
 assert.ok(universalBp(both,s,s.players[1].front[0])>before);
 s=dispatchUniversalAction(both,s,{type:'chooseBlock',uid:null});
 s=clearLife(s,both);
 s=walk(s,x=>x.active===0&&x.phase==='main'&&x.players[0].ownTurns>=1&&!x.pending,both);
 assert.ok(s.players[1].front.find(c=>c?.uid===kitan.uid).doubleBlockGranted);
 outside(s,0,'MST-1-033');
 fuel(s,0,['MST-1-068','MST-1-042','MST-1-048','MST-1-075']);
 const roxy=hold(s,0,'MST-1-054');
 const play=legalUniversalActions(both,s).find(a=>a.type==='play'&&a.uid===roxy.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(both,s,play);
 assert.equal(s.pending.kind,'effect-rest-bp');
 s=dispatchUniversalAction(both,s,{type:'chooseRestBp',uid:kitan.uid});
 const silenced=s.players[1].front.find(c=>c?.uid===kitan.uid);
 assert.equal(originalEffectsDisabled(s,silenced),true);
 assert.ok(silenced.doubleBlockGranted);
 assert.equal(silenced.doubleBlockGranted.sourceUid,kitan.uid);
 assert.ok(universalBp(both,s,silenced)>=before);
 assert.equal(assertUniversalMatch(both,s),true);
 const legal=legalUniversalActions(both,s);
 for(const difficulty of ['normal','hard']){
  const chosen=chooseUniversalAiAction(both,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(chosen)));
 }
});

test('Q2162 a choose-and-retire cannot select the protected character; battle still can',()=>{
 let s=main(fresh(2162),0,2);
 fuel(s,0,['MST-1-068','MST-1-068','MST-1-042','MST-1-048']);
 const guarded=put(s,0,'MST-1-073','front',0);
 const open=put(s,0,'MST-1-022','front',1);
 const fitz=hold(s,0,'MST-1-067');
 s=act(s,'play',{uid:fitz.uid,line:'energy'});
 assert.equal(s.pending.kind,'effect-protect-gen');
 s=act(s,'chooseProtectGen',{uid:guarded.uid});
 const protection=s.continuousStates.find(e=>e.kind==='cannotBeChosenByOppEffect');
 assert.equal(protection.targetUid,guarded.uid);
 assert.equal(protection.selectionScope,'any');
 s=main(s,1,2);
 fuel(s,1,['MST-1-010','MST-1-010','MST-1-068','MST-1-020']);
 put(s,1,'MST-1-032','front',0);
 const storm=hold(s,1,'MST-1-036');
 s=act(s,'event',{uid:storm.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.choices.includes(guarded.uid),false);
 assert.ok(s.pending.choices.includes(open.uid));
 s=act(s,'chooseRetireBp',{uid:open.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===open.uid));
 assert.ok(s.players[0].front.some(c=>c?.uid===guarded.uid));
 assert.equal(assertUniversalMatch(packs,s),true);

 let battle=main(fresh(21621),0,2);
 fuel(battle,0,['MST-1-068','MST-1-068','MST-1-042','MST-1-048']);
 const shield=put(battle,0,'MST-1-073','front',0);
 put(battle,0,'MST-1-022','front',1);
 const source=hold(battle,0,'MST-1-067');
 battle=act(battle,'play',{uid:source.uid,line:'front'});
 battle=act(battle,'chooseProtectGen',{uid:shield.uid});
 battle=attackPhase(battle,1);
 const attacker=put(battle,1,'MST-1-025','front',0);
 battle=act(battle,'attack',{uid:attacker.uid});
 assert.equal(battle.pending.kind,'block');
 assert.ok(legalUniversalActions(packs,battle).some(a=>a.type==='chooseBlock'&&a.uid===shield.uid));
 battle=act(battle,'chooseBlock',{uid:shield.uid});
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('Q2164 and Q2165 the Rudeus main is one named effect, and a second copy cannot use it',()=>{
 let s=main(fresh(2164),0,2);
 fuel(s,0,['MST-1-010','MST-1-010','MST-1-068','MST-1-068']);
 const first=put(s,0,'MST-1-073','front',0,true);
 const second=put(s,0,'MST-1-073','front',1,true);
 assert.ok(legalUniversalActions(packs,s).filter(a=>a.mode==='energyNamedSuite').length>=1);
 const hand=s.players[0].hand.length;
 s=act(s,'activate',{uid:first.uid,mode:'energyNamedSuite'});
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).ready,true);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).attackEndActive.turn,s.turn);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=act(s,'chooseOwnBuff',{uid:first.uid});
 assert.ok((s.players[0].front.find(c=>c?.uid===first.uid).buffs||[]).some(b=>b.bp===2000));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='energyNamedSuite'&&a.uid===second.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2208 an already active Rudeus still resolves the rest of the main',()=>{
 let s=main(fresh(2208),0,2);
 fuel(s,0,['MST-1-010','MST-1-010','MST-1-068','MST-1-068']);
 const rudeus=put(s,0,'MST-1-073','front',0,true);
 const hand=s.players[0].hand.length;
 s=act(s,'activate',{uid:rudeus.uid,mode:'energyNamedSuite'});
 assert.equal(s.players[0].front.find(c=>c?.uid===rudeus.uid).ready,true);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2205 start and end refresh spend the next-active skip without activating Rudeus',()=>{
 let end=main(fresh(2205));
 const rudeus=put(end,0,'MST-1-073','front',0,false);
 grantContinuousState(end,{kind:'skipNextActive',controller:0,sourceUid:rudeus.uid,
  targetUid:rudeus.uid,sourceLinked:false});
 assert.equal(skipOn(end,rudeus.uid),true);
 end=walk(end,x=>x.active===1&&x.phase==='start'&&!x.pending);
 const rested=end.players[0].front.find(c=>c?.uid===rudeus.uid);
 assert.equal(rested.ready,false);
 assert.equal(skipOn(end,rudeus.uid),false);
 assert.equal(assertUniversalMatch(packs,end),true);

 let start=main(fresh(22051),1);
 const locked=put(start,0,'MST-1-073','front',0,false);
 grantContinuousState(start,{kind:'skipNextActive',controller:1,sourceUid:locked.uid,
  targetUid:locked.uid,sourceLinked:false});
 start=walk(start,x=>x.active===0&&x.players[0].ownTurns>=2&&x.phase==='start'&&!x.pending);
 assert.equal(start.players[0].front.find(c=>c?.uid===locked.uid).ready,false);
 assert.equal(skipOn(start,locked.uid),false);
 assert.equal(assertUniversalMatch(packs,start),true);
});

test('Q2220 printed leave text is lost; a gained leave draw still resolves',()=>{
 let printed=main(fresh(2220),0,2);
 fuel(printed,0,['MST-1-068','MST-1-068','MST-1-010','MST-1-020']);
 outside(printed,0,'MST-1-033');
 for(const id of ['MST-1-034','MST-1-034','MST-1-038','MST-1-038','MST-1-040','MST-1-036'])
  outside(printed,0,id);
 const sylph=put(printed,1,'MST-1-013','front',0);
 const roxy=hold(printed,0,'MST-1-054');
 printed=act(printed,'play',{uid:roxy.uid,line:'front'});
 printed=act(printed,'chooseRestBp',{uid:sylph.uid});
 assert.equal(originalEffectsDisabled(printed,printed.players[1].front[0]),true);
 const storm=hold(printed,0,'MST-1-036');
 const deck=printed.players[1].deck.length;
 printed=act(printed,'event',{uid:storm.uid});
 assert.equal(printed.pending.kind,'effect-retire-bp');
 assert.ok(printed.pending.choices.includes(sylph.uid));
 printed=act(printed,'chooseRetireBp',{uid:sylph.uid});
 assert.ok(printed.players[1].outside.some(c=>c.uid===sylph.uid));
 assert.equal(printed.players[1].deck.length,deck);
 assert.equal(assertUniversalMatch(packs,printed),true);

 const vanilla=(id,bp=1000)=>({id,name:id,color:'green',type:'character',energy:0,ap:1,bp,
  gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const grant={op:'grantOnRetire',target:'ownCharacter',optional:true,until:'endOfTurn',
  then:[{op:'draw',count:1}]};
 const retireOne={op:'retireOwnCharacterOne',optional:true,after:[{op:'draw',count:1}]};
 const event={id:'LAB-RETIRE',name:'Grant',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[grant,retireOne]}};
 assert.throws(()=>createUniversalPack({id:'bad-retire',cards:[
  {...event,effects:{onPlay:[{...grant,optional:false}]}}]}),/invalid granted retire/);
 const cards=[event,{...vanilla('LAB-VICTIM',1000),implementation:'dsl',
  effects:{onRetire:[{op:'draw',count:1}]}},vanilla('LAB-WALL',4000),
  ...Array.from({length:10},(_,i)=>vanilla('LAB-'+i))];
 const fixture=createUniversalPack({id:'q2220-retire-lab',cards});
 const deckCounts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(fixture,deckCounts),[]);
 const fp=[fixture,fixture];
 const pull=(s,p,id)=>{
  for(const zone of ['deck','hand','life','outside']){
   const list=s.players[p][zone],index=list.findIndex(c=>c.cardId===id);
   if(index>=0)return list.splice(index,1)[0];
  }
  throw Error('Missing '+id);
 };
 const step=(s,type,extra)=>{
  const action=legalUniversalActions(fp,s).find(a=>a.type===type&&
   Object.entries(extra||{}).every(([k,v])=>a[k]===v));
  assert.ok(action,type);
  return dispatchUniversalAction(fp,s,action);
 };
 let gained=newUniversalMatch(fp,{decks:[deckCounts,deckCounts],first:0,seed:2220});
 const victim=pull(gained,0,'LAB-VICTIM');
 victim.ready=true;victim.fieldEntryStamp=gained.nextFieldEntryStamp++;
 gained.players[0].front[0]=victim;
 gained=walk(gained,x=>x.active===0&&x.phase==='main'&&!x.pending,fp);
 const giver=pull(gained,0,'LAB-RETIRE');
 gained.players[0].hand.push(giver);
 gained=step(gained,'event',{uid:giver.uid});
 assert.equal(gained.pending.kind,'effect-grant-retire');
 assert.equal(chooseUniversalAiAction(fp,gained).type,'chooseGrantRetire');
 gained=step(gained,'chooseGrantRetire',{uid:victim.uid});
 assert.ok(gained.continuousStates.some(e=>e.kind==='grantedOnRetire'&&e.targetUid===victim.uid));
 assert.equal(gained.pending.kind,'effect-retire-own-character');
 grantContinuousState(gained,{kind:'originalEffectsDisabled',controller:1,sourceUid:giver.uid,
  targetUid:victim.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(originalEffectsDisabled(gained,gained.players[0].front[0]),true);
 const deckBefore=gained.players[0].deck.length;
 gained=step(gained,'chooseOwnCharacterRetire',{uid:victim.uid});
 assert.equal(gained.pending.kind,'granted-retire-draw');
 assert.equal(gained.players[0].deck.length,deckBefore);
 gained=step(gained,'chooseGrantedRetireDraw',{mode:'draw'});
 assert.equal(gained.players[0].deck.length,deckBefore-2);
 assert.ok(gained.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(assertUniversalMatch(fp,gained),true);
});
