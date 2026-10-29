import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalAttackDamage,effectiveHandRequiredEnergy,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL}
 from './fixtures/v2-integrated-id-manifest.mjs';

// Scenario coverage for ten whole SAO prints on the shared engine.
// Passing these tests is not official FAQ acceptance. FAQ certified stays 0.
// Japanese text is the pinned official effectJa already checked by verifiedSaoV2Cards.

const TEN=['SAO-2-002','SAO-1-037','SAO-1-081','SAO-2-044','SAO-1-053',
 'SAO-2-024','SAO-2-049','SAO-2-053','SAO-1-048','SAO-1-013'];
const sao=registeredV2TitlePack('sword-art-online');

function deck(required){
 const rest=Object.values(sao.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,card,line,slot,ready=false){
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function body(s,p,uid){
 for(const line of ['front','energy']){
  const c=s.players[p][line].find(x=>x?.uid===uid);
  if(c)return c;
 }
 throw Error('Missing body '+uid);
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1+(c.stack||[]).length+(c.under||[]).length;
 return n;
}
function conserved(s){
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),
   difficulty+':'+(s.pending?.kind||s.phase));
 }
}
function reach(packs,s,pred){
 for(let n=0;n<40&&!pred(s);n++){
  if(s.pending)throw Error('pending '+s.pending.kind+' at '+s.phase+' active '+s.active);
  const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(step,s.phase+':'+s.active);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(pred(s),true,(s.pending&&s.pending.kind)+' '+s.phase+' '+s.active+' turn '+s.turn);
 return s;
}
function fresh(ids,seed,first=0,who=0,phase='main'){
 const counts=deck(ids);
 const packs=[sao,sao];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first});
 s=reach(packs,s,x=>x.active===who&&x.phase===phase);
 return {packs,s};
}
function energize(s,p,ids){
 return ids.map((id,i)=>place(s,p,take(s,p,id),'energy',i,true));
}
function find(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,s.pending?.kind||s.phase);
 return action;
}
function use(packs,s,pred){
 return dispatchUniversalAction(packs,s,find(packs,s,pred));
}
function playFront(packs,s,uid){
 return use(packs,s,a=>a.type==='play'&&a.uid===uid&&a.line==='front');
}
function orderTops(packs,s){
 while(s.pending?.kind==='effect-top-order')
  s=use(packs,s,a=>a.type==='chooseTopOrder');
 return s;
}
function stackTop(s,p,cards){
 s.players[p].deck.unshift(...cards);
}
function park(s,p){s.players[p].deck.push(...s.players[p].hand.splice(0));}
function quietLife(s,p,n){
 for(let i=0;i<n;i++)s.players[p].life.unshift(take(s,p,'SAO-1-001'));
}
function finishUnblocked(packs,s){
 assert.equal(s.pending.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 while(s.pending?.kind==='life-batch-order'){
  const uid=s.pending.choices[0];
  s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid});
 }
 assert.equal(s.pending,null,s.pending&&s.pending.kind);
 return s;
}
function lineMove(packs,s,uid){
 s=use(packs,s,a=>a.type==='chooseLineMove'&&a.uid===uid);
 assert.equal(s.pending.kind,'effect-line-slot');
 aiOk(packs,s);
 return use(packs,s,a=>a.type==='chooseLineSlot'&&a.replaceUid===undefined);
}

test('ten SAO prints join the shared pilot without counting as FAQ acceptance',()=>{
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],167);
 assert.equal(EXPECTED_V2_TOTAL,664);
 assert.equal(Object.keys(sao.cards).length,167);
 for(const id of TEN){
  assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes(id),true);
  assert.equal(sao.cards[id].implementation,'dsl');
 }
 const kirito=sao.cards['SAO-2-002'];
 assert.equal(kirito.raidName,'キリト');
 assert.equal(kirito.triggerEffect??null,null);
 assert.deepEqual(kirito.blockBpRestriction,{relation:'atMost',bp:2000,condition:null});
 const asuna=sao.cards['SAO-1-037'];
 assert.equal(asuna.raidName,'アスナ');
 assert.equal(asuna.lineShiftOutsideMove.grant,'attackDraw');
 assert.equal(asuna.triggerEffect??null,null);
 const yuuki=sao.cards['SAO-1-081'];
 assert.equal(yuuki.enterAlwaysActive,true);
 assert.deepEqual(yuuki.triggerEffect,{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
 assert.equal(sao.cards['SAO-2-044'].triggerEffect.color,'purple');
 assert.equal(sao.cards['SAO-1-053'].triggerEffect??null,null);
 assert.equal(sao.cards['SAO-2-024'].otherHandEnergyDiscount.amount,1);
 assert.equal(sao.cards['SAO-2-024'].triggerEffect.color,'blue');
 assert.equal(sao.cards['SAO-2-049'].printedAttackDamage,2);
 assert.equal(sao.cards['SAO-2-049'].triggerEffect??null,null);
 assert.equal(sao.cards['SAO-2-053'].triggerEffect??null,null);
 assert.equal(sao.cards['SAO-1-048'].anyLineShiftOutsideMove.then,'mayDrawDiscard');
 assert.equal(sao.cards['SAO-1-048'].triggerEffect??null,null);
 assert.deepEqual(sao.cards['SAO-1-013'].nameAliases,['アリス']);
 assert.equal(sao.cards['SAO-1-013'].raidName,'アリス');
 assert.equal(sao.cards['SAO-1-013'].triggerEffect??null,null);
});

test('SAO-2-002 replaces draw-discard only when Alice and Eugeo are both on the front',()=>{
 function open(seed,frontIds){
  const {packs,s}=fresh(['SAO-2-002','SAO-1-003','SAO-1-011','SAO-1-005','SAO-1-001'],seed);
  energize(s,0,['SAO-1-003','SAO-1-003']);
  frontIds.forEach((id,i)=>place(s,0,take(s,0,id),'front',i,true));
  const actor=take(s,0,'SAO-2-002');
  s.players[0].hand.push(actor);
  const hand=s.players[0].hand.length,deckBefore=s.players[0].deck.length;
  const played=playFront(packs,s,actor.uid);
  return {packs,played,actor,hand,deckBefore};
 }
 const both=open(2002,['SAO-1-011','SAO-1-005']);
 assert.equal(both.played.pending.kind,'effect-draw-instead');
 assert.equal(both.played.players[0].deck.length,both.deckBefore);
 aiOk(both.packs,both.played);
 const drew=use(both.packs,structuredClone(both.played),a=>a.type==='chooseDrawInstead'&&a.mode==='draw');
 assert.equal(drew.pending,null);
 assert.equal(drew.players[0].hand.length,both.hand+1);
 assert.equal(drew.players[0].deck.length,both.deckBefore-2);
 const tossed=use(both.packs,structuredClone(both.played),a=>a.type==='chooseDrawInstead'&&a.mode==='discard');
 assert.equal(tossed.pending.kind,'effect-discard');
 const gone=tossed.players[0].hand[0];
 const after=use(both.packs,tossed,a=>a.type==='chooseDiscard'&&a.uid===gone.uid);
 assert.equal(after.players[0].outside.some(c=>c.uid===gone.uid),true);
 assert.equal(after.players[0].deck.length,both.deckBefore-2);
 assert.equal(after.players[0].hand.length,both.hand);
 conserved(after);
 const onlyEugeo=open(2003,['SAO-1-005','SAO-1-005']);
 assert.equal(onlyEugeo.played.pending.kind,'effect-discard');
 assert.equal(onlyEugeo.played.players[0].deck.length,onlyEugeo.deckBefore-2);
 const none=open(2004,[]);
 assert.equal(none.played.pending.kind,'effect-discard');
 const {packs,s}=fresh(['SAO-2-002','SAO-1-001','SAO-1-003'],2005);
 const attacker=place(s,0,take(s,0,'SAO-2-002'),'front',0,true);
 const low=place(s,1,take(s,1,'SAO-1-001'),'front',0,true);
 const high=place(s,1,take(s,1,'SAO-1-003'),'front',1,true);
 const battle=reach(packs,s,x=>x.active===0&&x.phase==='attack');
 const swinging=use(packs,battle,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(swinging.pending.kind,'block');
 const blocks=legalUniversalActions(packs,swinging);
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===high.uid),true);
 assert.equal(blocks.some(a=>a.type==='chooseBlock'&&a.uid===null),true);
 aiOk(packs,swinging);
 conserved(swinging);
 assert.equal(assertUniversalMatch(packs,swinging),true);
});

test('SAO-1-037 gains Impact from Kirito and attack-draw only after a non-move line shift',()=>{
 const ids=['SAO-1-037','SAO-1-048','SAO-1-103','SAO-1-102','SAO-1-052','SAO-1-001'];
 const opened=fresh(ids,1037,1,0,'move');
 energize(opened.s,0,['SAO-1-102']);
 const kirito=place(opened.s,0,take(opened.s,0,'SAO-1-052'),'energy',1,true);
 const asuna=place(opened.s,0,take(opened.s,0,'SAO-1-037'),'energy',2,true);
 const liz=place(opened.s,0,take(opened.s,0,'SAO-1-048'),'front',0,true);
 assert.equal(universalImpact(opened.packs,opened.s,asuna),1);
 opened.s.players[0].energy[1]=null;
 kirito.fieldEntryStamp=null;
 opened.s.players[0].outside.push(kirito);
 assert.equal(universalImpact(opened.packs,opened.s,asuna),0);
 let moved=use(opened.packs,opened.s,a=>a.type==='move'&&a.uid===asuna.uid);
 assert.equal(moved.pending,null);
 assert.equal(asuna.attackDrawGranted,undefined);
 assert.equal(moved.onceEffectUses[0].includes(asuna.uid+'|lineShiftAttackDraw'),false);
 assert.equal(moved.onceEffectUses[0].includes(liz.uid+'|anyLineShiftDraw'),false);
 moved=reach(opened.packs,moved,x=>x.phase==='main'&&x.active===0);
 const first=take(moved,0,'SAO-1-103');
 moved.players[0].hand.push(first);
 moved=playFront(opened.packs,moved,first.uid);
 assert.equal(moved.pending.kind,'effect-line-move');
 moved=lineMove(opened.packs,moved,asuna.uid);
 assert.equal(moved.pending.kind,'effect-may-draw-discard');
 const granted=body(moved,0,asuna.uid);
 assert.equal(granted.attackDrawGranted.turn,moved.turn);
 assert.equal(granted.attackDrawGranted.stamp,granted.fieldEntryStamp);
 assert.equal(moved.onceEffectUses[0].includes(liz.uid+'|anyLineShiftDraw'),true);
 aiOk(opened.packs,moved);
 const declined=use(opened.packs,structuredClone(moved),a=>a.type==='chooseMayDrawDiscard'&&a.mode==='skip');
 assert.equal(declined.pending,null);
 const second=take(declined,0,'SAO-1-103');
 declined.players[0].hand.push(second);
 let again=playFront(opened.packs,declined,second.uid);
 again=lineMove(opened.packs,again,asuna.uid);
 assert.equal(again.pending,null);
 assert.equal(body(again,0,asuna.uid).ready,true);
 const before=again.players[0].deck.length;
 const swinging=use(opened.packs,reach(opened.packs,again,x=>x.phase==='attack'),
  a=>a.type==='attack'&&a.uid===asuna.uid);
 assert.equal(swinging.pending.kind,'block');
 assert.equal(swinging.players[0].deck.length,before-1);
 assert.equal(assertUniversalMatch(opened.packs,swinging),true);
 conserved(swinging);

 const empty=fresh(ids,1048,1,0,'main');
 energize(empty.s,0,['SAO-1-102']);
 const mover=place(empty.s,0,take(empty.s,0,'SAO-1-037'),'front',0,true);
 const watcher=place(empty.s,0,take(empty.s,0,'SAO-1-048'),'front',1,true);
 empty.s.players[0].outside.push(...empty.s.players[0].deck.splice(0));
 const opener=take(empty.s,0,'SAO-1-103');
 empty.s.players[0].hand.push(opener);
 let quiet=playFront(empty.packs,empty.s,opener.uid);
 quiet=lineMove(empty.packs,quiet,mover.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.onceEffectUses[0].includes(watcher.uid+'|anyLineShiftDraw'),false);
 const shifted=body(quiet,0,mover.uid);
 assert.equal(shifted.attackDrawGranted.stamp,shifted.fieldEntryStamp);
 const returned=quiet.players[0].outside.pop();
 quiet.players[0].deck.unshift(returned);
 const closer=take(quiet,0,'SAO-1-103');
 quiet.players[0].hand.push(closer);
 quiet=playFront(empty.packs,quiet,closer.uid);
 quiet=lineMove(empty.packs,quiet,mover.uid);
 assert.equal(quiet.pending.kind,'effect-may-draw-discard');
 assert.equal(quiet.onceEffectUses[0].filter(k=>k===watcher.uid+'|anyLineShiftDraw').length,1);
 const drew=use(empty.packs,quiet,a=>a.type==='chooseMayDrawDiscard'&&a.mode==='draw');
 assert.equal(drew.pending.kind,'effect-discard');
 assert.equal(drew.players[0].deck.length,0);
 assert.equal(assertUniversalMatch(empty.packs,drew),true);
});

test('SAO-1-081 enters ready, ignores BP 2000 blockers, and retires at the next own start',()=>{
 const ids=['SAO-1-081','SAO-1-073','SAO-1-092','SAO-1-001','SAO-1-003'];
 const {packs,s}=fresh(ids,1081,1,0,'main');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
 energize(s,0,['SAO-1-073','SAO-1-092']);
 const actor=take(s,0,'SAO-1-081');
 s.players[0].hand.push(actor);
 const deckBefore=s.players[0].deck.length;
 let played=playFront(packs,s,actor.uid);
 const live=played.players[0].front.find(c=>c?.uid===actor.uid);
 assert.equal(live.ready,true);
 assert.equal(played.pending.kind,'effect-discard');
 assert.equal(played.players[0].deck.length,deckBefore-2);
 aiOk(packs,played);
 const discarded=played.players[0].hand.find(c=>c.cardId!=='SAO-1-081');
 played=use(packs,played,a=>a.type==='chooseDiscard'&&a.uid===discarded.uid);
 assert.equal(played.pending,null);
 const low=place(played,1,take(played,1,'SAO-1-001'),'front',0,true);
 const high=place(played,1,take(played,1,'SAO-1-003'),'front',1,true);
 let battle=reach(packs,played,x=>x.phase==='attack'&&x.active===0);
 battle=use(packs,battle,a=>a.type==='attack'&&a.uid===actor.uid);
 const blocks=legalUniversalActions(packs,battle);
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===high.uid),true);
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:high.uid});
 assert.equal(battle.pending,null);
 assert.ok(battle.players[0].front.some(c=>c?.uid===actor.uid));
 assert.ok(battle.players[1].outside.some(c=>c.uid===high.uid));
 const victim=place(battle,1,take(battle,1,'SAO-1-003'),'front',1,true);
 park(battle,0);park(battle,1);
 const resting=reach(packs,battle,x=>x.pending?.kind==='effect-rest-bp');
 assert.equal(resting.players[0].front.some(c=>c?.uid===actor.uid),false);
 assert.ok(resting.players[0].outside.some(c=>c.uid===actor.uid));
 assert.equal(resting.pending.choices.includes(victim.uid),true);
 aiOk(packs,resting);
 const skipped=dispatchUniversalAction(packs,structuredClone(resting),{type:'chooseRestBp',uid:null});
 assert.equal(skipped.players[1].front.find(c=>c?.uid===victim.uid).ready,true);
 const rested=dispatchUniversalAction(packs,resting,{type:'chooseRestBp',uid:victim.uid});
 assert.equal(rested.players[1].front.find(c=>c?.uid===victim.uid).ready,false);
 conserved(rested);
 assert.equal(assertUniversalMatch(packs,rested),true);
});

test('SAO-2-044 searches a Progressive card and pays two hand cards to ignore BP 4000 blockers',()=>{
 const ids=['SAO-2-044','SAO-2-048','SAO-2-040','SAO-1-001','SAO-1-037','SAO-1-050'];
 const {packs,s}=fresh(ids,2044);
 energize(s,0,['SAO-2-048']);
 const progressive=take(s,0,'SAO-2-040');
 const plainA=take(s,0,'SAO-1-001');
 const plainB=take(s,0,'SAO-1-001');
 stackTop(s,0,[progressive,plainA,plainB]);
 const actor=take(s,0,'SAO-2-044');
 s.players[0].hand.push(actor);
 let played=playFront(packs,s,actor.uid);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 assert.equal(played.pending.choices.includes(progressive.uid),true);
 assert.equal(played.pending.choices.includes(plainA.uid),false);
 aiOk(packs,played);
 const skipped=orderTops(packs,use(packs,structuredClone(played),a=>a.type==='chooseTopFiltered'&&a.uid===null));
 assert.equal(skipped.pending,null);
 const bottom=skipped.players[0].deck.slice(-3).map(c=>c.uid);
 assert.deepEqual(bottom.sort(),[progressive.uid,plainA.uid,plainB.uid].sort());
 assert.equal(skipped.players[0].hand.some(c=>c.uid===progressive.uid),false);
 let added=use(packs,played,a=>a.type==='chooseTopFiltered'&&a.uid===progressive.uid);
 added=orderTops(packs,added);
 assert.equal(added.pending.kind,'effect-discard');
 added=use(packs,added,a=>a.type==='chooseDiscard'&&a.uid===progressive.uid);
 assert.equal(added.players[0].outside.some(c=>c.uid===progressive.uid),true);
 const ready=place(added,0,take(added,0,'SAO-2-044'),'front',1,true);
 const held=added.players[0].hand.splice(0);
 added.players[0].deck.push(...held);
 const one=take(added,0,'SAO-1-001');
 added.players[0].hand.push(one);
 assert.equal(legalUniversalActions(packs,added).some(a=>a.mode==='oncePay'&&a.uid===ready.uid),false);
 const two=take(added,0,'SAO-1-050');
 added.players[0].hand.push(two);
 const act=find(packs,added,a=>a.type==='activate'&&a.uid===ready.uid&&a.mode==='oncePay');
 let paying=dispatchUniversalAction(packs,added,act);
 assert.equal(paying.pending.kind,'effect-discard-gate');
 aiOk(packs,paying);
 paying=use(packs,paying,a=>a.type==='chooseDiscardGate'&&a.uids?.includes(one.uid)&&a.uids?.includes(two.uid));
 assert.equal(paying.pending,null);
 const granted=body(paying,0,ready.uid);
 assert.equal(granted.blockAtLeastGranted.bp,4000);
 assert.equal(granted.blockAtLeastGranted.stamp,granted.fieldEntryStamp);
 assert.equal(legalUniversalActions(packs,paying).some(a=>a.mode==='oncePay'&&a.uid===ready.uid),false);
 const tall=place(paying,1,take(paying,1,'SAO-1-037'),'front',0,true);
 const mid=place(paying,1,take(paying,1,'SAO-1-050'),'front',1,true);
 const short=place(paying,1,take(paying,1,'SAO-1-001'),'front',2,true);
 let battle=reach(packs,paying,x=>x.phase==='attack');
 battle=use(packs,battle,a=>a.type==='attack'&&a.uid===ready.uid);
 const blocks=legalUniversalActions(packs,battle);
 assert.equal(blocks.some(a=>a.uid===tall.uid),false);
 assert.equal(blocks.some(a=>a.uid===mid.uid),true);
 assert.equal(blocks.some(a=>a.uid===short.uid),true);
 conserved(battle);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('SAO-1-053 raises the rested ALO hand cap only while five cards remain',()=>{
 const ids=['SAO-1-053','SAO-1-102','SAO-1-058','SAO-1-051','SAO-1-052','SAO-1-050','SAO-1-038','SAO-1-009'];
 function open(seed,handIds){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-102','SAO-1-058']);
  const actor=take(s,0,'SAO-1-053');
  const cards=[actor,...handIds.map(id=>take(s,0,id))];
  s.players[0].deck.push(...s.players[0].hand.splice(0));
  s.players[0].hand.push(...cards);
  const played=playFront(packs,s,actor.uid);
  return {packs,played,cards};
 }
 const wide=open(1053,['SAO-1-051','SAO-1-052','SAO-1-050','SAO-1-038','SAO-1-009']);
 assert.equal(wide.played.pending.kind,'effect-hand-rest');
 assert.equal(wide.played.pending.energy,3);
 assert.equal(wide.played.pending.line,'front');
 const choices=legalUniversalActions(wide.packs,wide.played);
 const chosen=id=>choices.some(a=>a.type==='chooseHandRest'&&a.uid===wide.cards.find(c=>c.cardId===id).uid);
 assert.equal(chosen('SAO-1-051'),true);
 assert.equal(chosen('SAO-1-052'),true);
 assert.equal(chosen('SAO-1-050'),true);
 assert.equal(chosen('SAO-1-038'),false);
 assert.equal(chosen('SAO-1-009'),false);
 assert.equal(choices.some(a=>a.type==='chooseHandRest'&&a.line==='energy'),false);
 aiOk(wide.packs,wide.played);
 const declined=dispatchUniversalAction(wide.packs,structuredClone(wide.played),{type:'chooseHandRest',uid:null});
 assert.equal(declined.pending,null);
 const cheap=wide.cards.find(c=>c.cardId==='SAO-1-051');
 const entered=use(wide.packs,wide.played,a=>a.type==='chooseHandRest'&&a.uid===cheap.uid&&a.line==='front');
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].front.find(c=>c?.uid===cheap.uid).ready,false);
 const narrow=open(1054,['SAO-1-051','SAO-1-052','SAO-1-038']);
 assert.equal(narrow.played.pending.energy,1);
 const narrowChoices=legalUniversalActions(narrow.packs,narrow.played);
 const narrowHas=id=>narrowChoices.some(a=>a.uid===narrow.cards.find(c=>c.cardId===id).uid);
 assert.equal(narrowHas('SAO-1-051'),true);
 assert.equal(narrowHas('SAO-1-052'),false);
 assert.equal(narrowHas('SAO-1-038'),false);
 conserved(entered);
 assert.equal(assertUniversalMatch(wide.packs,entered),true);
 assert.equal(assertUniversalMatch(narrow.packs,narrow.played),true);
});

test('SAO-2-024 discounts required energy for four other hand cards and may bounce',()=>{
 const ids=['SAO-2-024','SAO-1-102','SAO-1-058','SAO-1-037','SAO-2-026','SAO-1-001'];
 const {packs,s}=fresh(ids,2024,1,0,'main');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
 energize(s,0,['SAO-1-102']);
 const leafa=take(s,0,'SAO-2-024');
 const fillers=[];
 for(let i=0;i<4;i++)fillers.push(take(s,0,'SAO-1-001'));
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(leafa,...fillers);
 const printed=sao.cards['SAO-2-024'];
 assert.equal(effectiveHandRequiredEnergy(sao,s,0,printed,leafa),3);
 const away=s.players[0].hand.pop();
 s.players[0].deck.push(away);
 assert.equal(effectiveHandRequiredEnergy(sao,s,0,printed,leafa),4);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===leafa.uid),false);
 const extra=place(s,0,take(s,0,'SAO-1-058'),'energy',1,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===leafa.uid&&a.line==='front'),true);
 s.players[0].energy[1]=null;
 extra.fieldEntryStamp=null;
 s.players[0].outside.push(extra);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===leafa.uid),false);
 s.players[0].hand.push(s.players[0].deck.pop());
 assert.equal(effectiveHandRequiredEnergy(sao,s,0,printed,leafa),3);
 const aside=s.players[0].hand.pop();
 aside.fieldEntryStamp=null;
 assert.equal(effectiveHandRequiredEnergy(sao,s,0,printed,aside),4);
 s.players[0].hand.push(aside);
 const front=place(s,1,take(s,1,'SAO-1-037'),'front',0,true);
 const energy=place(s,1,take(s,1,'SAO-2-026'),'energy',0,true);
 let played=playFront(packs,s,leafa.uid);
 assert.equal(played.pending.kind,'effect-optional-pay-ap');
 aiOk(packs,played);
 const skipped=dispatchUniversalAction(packs,structuredClone(played),{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.pending,null);
 played=use(packs,played,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(played.pending.kind,'effect-bounce-bp');
 assert.equal(played.pending.choices.includes(front.uid),true);
 assert.equal(played.pending.choices.includes(energy.uid),false);
 aiOk(packs,played);
 const declined=dispatchUniversalAction(packs,structuredClone(played),{type:'chooseBounceBp',uid:null});
 assert.equal(declined.pending,null);
 assert.ok(declined.players[1].front.some(c=>c?.uid===front.uid));
 const bounced=use(packs,played,a=>a.type==='chooseBounceBp'&&a.uid===front.uid);
 assert.equal(bounced.pending,null);
 assert.equal(bounced.players[1].front.some(c=>c?.uid===front.uid),false);
 assert.ok(bounced.players[1].hand.some(c=>c.uid===front.uid));
 conserved(bounced);
 assert.equal(assertUniversalMatch(packs,bounced),true);
});

test('SAO-2-049 deals two damage, deploys a purple Asuna, and lowers one front BP',()=>{
 const ids=['SAO-2-049','SAO-2-048','SAO-2-026','SAO-2-041','SAO-1-037','SAO-1-038','SAO-1-008','SAO-1-001'];
 const {packs,s}=fresh(ids,2049,1,0,'main');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
 energize(s,0,['SAO-2-048','SAO-2-026']);
 const legalAsuna=take(s,0,'SAO-2-041');
 const wrongAsuna=take(s,0,'SAO-1-037');
 s.players[0].outside.push(legalAsuna,wrongAsuna);
 const low=place(s,1,take(s,1,'SAO-1-008'),'front',0,true);
 const mid=place(s,1,take(s,1,'SAO-1-038'),'front',1,true);
 place(s,1,take(s,1,'SAO-1-001'),'energy',0,true);
 const swinger=place(s,0,take(s,0,'SAO-2-049'),'front',0,true);
 assert.equal(universalAttackDamage(packs,s,swinger),2);
 assert.equal(universalAttackDamage(packs,s,s.players[0].energy[0]),1);
 const actor=take(s,0,'SAO-2-049');
 s.players[0].hand.push(actor);
 let played=playFront(packs,s,actor.uid);
 assert.equal(played.pending.kind,'effect-named-zone-entry');
 const names=legalUniversalActions(packs,played).filter(a=>a.type==='chooseNamedZoneDeploy'&&a.uid);
 assert.equal(names.some(a=>a.uid===legalAsuna.uid),true);
 assert.equal(names.some(a=>a.uid===wrongAsuna.uid),false);
 const skipped=dispatchUniversalAction(packs,structuredClone(played),{type:'chooseNamedZoneDeploy',uid:null});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].outside.some(c=>c.uid===legalAsuna.uid));
 const seat=find(packs,played,a=>a.type==='chooseNamedZoneDeploy'&&a.uid===legalAsuna.uid&&a.line==='front');
 played=dispatchUniversalAction(packs,played,seat);
 assert.equal(played.pending,null);
 const entered=body(played,0,legalAsuna.uid);
 assert.equal(entered.ready,false);
 assert.equal(played.players[0].deck.length<50,true);
 const sidelined=place(played,0,take(played,0,'SAO-2-049'),'energy',2,true);
 assert.equal(legalUniversalActions(packs,played).some(a=>a.mode==='frontOnce'&&a.uid===sidelined.uid),false);
 const act=find(packs,played,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='frontOnce');
 let aimed=dispatchUniversalAction(packs,played,act);
 assert.equal(aimed.pending.kind,'effect-target');
 assert.equal(aimed.pending.choices.includes(mid.uid),true);
 assert.equal(aimed.pending.choices.includes(low.uid),false);
 assert.equal(aimed.pending.choices.includes(played.players[1].energy[0].uid),false);
 aiOk(packs,aimed);
 aimed=use(packs,aimed,a=>a.type==='chooseTarget'&&a.uid===mid.uid);
 assert.equal(universalBp(packs,aimed,body(aimed,1,mid.uid)),1500);
 assert.equal(legalUniversalActions(packs,aimed).some(a=>a.mode==='frontOnce'&&a.uid===actor.uid),false);
 quietLife(aimed,1,2);
 const lives=aimed.players[1].life.length;
 let battle=reach(packs,aimed,x=>x.phase==='attack'&&x.active===0);
 battle=use(packs,battle,a=>a.type==='attack'&&a.uid===swinger.uid);
 assert.equal(universalAttackDamage(packs,battle,body(battle,0,swinger.uid)),2);
 battle=finishUnblocked(packs,battle);
 assert.equal(battle.players[1].life.length,lives-2);
 conserved(battle);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('SAO-2-053 stops a character from blocking only while its BP is below printed',()=>{
 const ids=['SAO-2-053','SAO-2-052','SAO-2-048','SAO-1-038','SAO-1-003','SAO-2-026','SAO-1-001'];
 function setup(seed){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-2-048']);
  const mito=take(s,0,'SAO-2-053');
  s.players[0].hand.push(mito);
  const cutter=place(s,0,take(s,0,'SAO-2-052'),'front',0,true);
  const target=place(s,1,take(s,1,'SAO-1-038'),'front',0,true);
  const other=place(s,1,take(s,1,'SAO-1-003'),'front',1,true);
  const bench=place(s,1,take(s,1,'SAO-2-026'),'energy',0,true);
  let played=playFront(packs,s,mito.uid);
  assert.equal(played.pending.kind,'effect-grant-below-printed');
  assert.equal(played.pending.choices.includes(target.uid),true);
  assert.equal(played.pending.choices.includes(bench.uid),true);
  aiOk(packs,played);
  return {packs,played,mito,cutter,target,other};
 }
 const full=setup(2053);
 const skipped=dispatchUniversalAction(full.packs,structuredClone(full.played),{type:'chooseGrantBelowPrinted',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(body(skipped,1,full.target.uid).belowPrintedBlock,undefined);
 let granted=use(full.packs,full.played,a=>a.type==='chooseGrantBelowPrinted'&&a.uid===full.target.uid);
 const marked=body(granted,1,full.target.uid);
 assert.equal(marked.belowPrintedBlock.turn,granted.turn);
 assert.equal(marked.belowPrintedBlock.stamp,marked.fieldEntryStamp);
 let open=reach(full.packs,granted,x=>x.phase==='attack');
 open=use(full.packs,open,a=>a.type==='attack'&&a.uid===full.cutter.uid);
 const openBlocks=legalUniversalActions(full.packs,open);
 assert.equal(openBlocks.some(a=>a.uid===full.target.uid),true);
 assert.equal(openBlocks.some(a=>a.uid===full.other.uid),true);
 assert.equal(assertUniversalMatch(full.packs,open),true);

 const cut=setup(2054);
 let lowered=use(cut.packs,cut.played,a=>a.type==='chooseGrantBelowPrinted'&&a.uid===cut.target.uid);
 const down=find(cut.packs,lowered,a=>a.type==='activate'&&a.uid===cut.cutter.uid&&a.mode==='frontOnce');
 lowered=dispatchUniversalAction(cut.packs,lowered,down);
 assert.equal(lowered.pending.kind,'effect-target');
 lowered=use(cut.packs,lowered,a=>a.type==='chooseTarget'&&a.uid===cut.target.uid);
 assert.equal(universalBp(cut.packs,lowered,body(lowered,1,cut.target.uid)),1500);
 quietLife(lowered,1,1);
 const lives=lowered.players[1].life.length;
 let battle=reach(cut.packs,lowered,x=>x.phase==='attack');
 battle=use(cut.packs,battle,a=>a.type==='attack'&&a.uid===cut.cutter.uid);
 const blocked=legalUniversalActions(cut.packs,battle);
 assert.equal(blocked.some(a=>a.uid===cut.target.uid),false);
 assert.equal(blocked.some(a=>a.uid===cut.other.uid),true);
 battle=finishUnblocked(cut.packs,battle);
 assert.equal(battle.players[1].life.length,lives-1);
 park(battle,0);park(battle,1);
 const later=reach(cut.packs,battle,x=>x.active===0&&x.players[0].ownTurns>=2&&x.phase==='attack');
 assert.equal(body(later,1,cut.target.uid).belowPrintedBlock,undefined);
 assert.equal(universalBp(cut.packs,later,body(later,1,cut.target.uid)),2500);
 const again=use(cut.packs,later,a=>a.type==='attack'&&a.uid===cut.cutter.uid);
 const restored=legalUniversalActions(cut.packs,again);
 assert.equal(restored.some(a=>a.uid===cut.target.uid),true);
 conserved(again);
 assert.equal(assertUniversalMatch(cut.packs,again),true);
});

test('SAO-1-013 retires by distinct front names, and an Alice alias is not Kirito',()=>{
 const ids=['SAO-1-013','SAO-1-003','SAO-1-001','SAO-1-005','SAO-1-011','SAO-2-007','SAO-2-044','SAO-1-037'];
 function ladder(seed,frontIds,limit,yesId,noId,noLine='front'){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-003','SAO-1-003']);
  frontIds.forEach((id,i)=>place(s,0,take(s,0,id),'front',i,true));
  const yes=place(s,1,take(s,1,yesId),'front',0,true);
  const no=place(s,1,take(s,1,noId),noLine,noLine==='front'?1:0,true);
  const actor=take(s,0,'SAO-1-013');
  s.players[0].hand.push(actor);
  const played=playFront(packs,s,actor.uid);
  assert.equal(played.pending.kind,'effect-retire-bp');
  assert.equal(played.pending.limit,limit);
  assert.equal(played.pending.choices.includes(yes.uid),true);
  assert.equal(played.pending.choices.includes(no.uid),false);
  aiOk(packs,played);
  return {packs,played,yes};
 }
 const none=ladder(1013,[],2000,'SAO-1-001','SAO-1-003');
 const oneName=ladder(1014,['SAO-1-001','SAO-1-001'],3000,'SAO-2-044','SAO-1-037');
 const alias=ladder(1015,['SAO-1-011'],2000,'SAO-1-001','SAO-1-003');
 const both=ladder(1016,['SAO-1-001','SAO-1-005'],4000,'SAO-1-037','SAO-2-044','energy');
 const aliasedEugeo=ladder(1017,['SAO-1-001','SAO-2-007'],4000,'SAO-1-037','SAO-2-044','energy');
 assert.equal(none.played.pending.limit,2000);
 assert.equal(oneName.played.pending.limit,3000);
 assert.equal(alias.played.pending.limit,2000);
 assert.equal(both.played.pending.limit,4000);
 assert.equal(aliasedEugeo.played.pending.limit,4000);
 const kept=dispatchUniversalAction(both.packs,structuredClone(both.played),{type:'chooseRetireBp',uid:null});
 assert.equal(kept.pending,null);
 assert.ok(kept.players[1].front.some(c=>c?.uid===both.yes.uid));
 const removed=use(both.packs,both.played,a=>a.type==='chooseRetireBp'&&a.uid===both.yes.uid);
 assert.equal(removed.pending,null);
 assert.equal(removed.players[1].front.some(c=>c?.uid===both.yes.uid),false);
 assert.ok(removed.players[1].outside.some(c=>c.uid===both.yes.uid));
 conserved(removed);
 assert.equal(assertUniversalMatch(both.packs,removed),true);
 assert.equal(assertUniversalMatch(alias.packs,alias.played),true);
});
