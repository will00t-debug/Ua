import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {V2_PENDING_LABELS,inspectedPendingChoiceCards} from '../dist/universal-v2/preview-actions.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL}
 from './fixtures/v2-integrated-id-manifest.mjs';

// Ten whole SAO prints from the sixteen that were still outside the shared engine.
// Passing these tests is not official FAQ acceptance. FAQ certified stays 0.

const TEN=['SAO-1-025','SAO-1-041','SAO-1-049','SAO-1-060','SAO-1-062',
 'SAO-1-091','SAO-2-001','SAO-2-020','SAO-2-032','SAO-2-061'];
const sao=registeredV2TitlePack('sword-art-online');

function deck(required,copies={}){
 const rest=Object.values(sao.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts={};
 let total=0;
 ids.forEach((id,i)=>{
  const n=copies[id]??(i===12?2:4);
  counts[id]=n;
  total+=n;
 });
 for(const id of rest){
  if(total>=50)break;
  const have=counts[id]||0;
  if(have>=4)continue;
  const add=Math.min(4-have,50-total);
  counts[id]=have+add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
function take(s,p,id,zones=['hand','deck','life','outside','removed']){
 for(const zone of zones){
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
function reach(packs,s,pred,discardHand=false){
 for(let n=0;n<80&&!pred(s);n++){
  if(discardHand&&s.pending?.kind==='end-hand-limit'){
   const uid=s.players[s.pending.player].hand[0].uid;
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid});
   continue;
  }
  if(s.pending)throw Error('pending '+s.pending.kind+' at '+s.phase+' active '+s.active);
  const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(step,s.phase+':'+s.active);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(pred(s),true,(s.pending&&s.pending.kind)+' '+s.phase+' '+s.active+' turn '+s.turn);
 return s;
}
function fresh(ids,seed,first=0,who=0,phase='main',copies){
 const counts=deck(ids,copies);
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
 assert.ok(action,JSON.stringify(s.pending?.kind||s.phase));
 return action;
}
function use(packs,s,pred){
 return dispatchUniversalAction(packs,s,find(packs,s,pred));
}
function playFront(packs,s,uid){
 return use(packs,s,a=>a.type==='play'&&a.uid===uid&&a.line==='front'&&a.replaceUid===undefined);
}
function playEnergy(packs,s,uid){
 return use(packs,s,a=>a.type==='play'&&a.uid===uid&&a.line==='energy'&&a.replaceUid===undefined);
}
function playEvent(packs,s,uid){
 return use(packs,s,a=>a.type==='event'&&a.uid===uid);
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function putOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function setLife(s,p,n){
 while(s.players[p].life.length>n)s.players[p].outside.push(s.players[p].life.pop());
 assert.equal(s.players[p].life.length,n);
}
function setHand(s,p,n){
 const hand=s.players[p].hand;
 while(hand.length>n)s.players[p].outside.push(hand.pop());
 while(hand.length<n){
  const card=s.players[p].deck.pop();
  assert.ok(card);
  hand.push(card);
 }
}
function stackTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id,['deck','life','outside','removed','hand']));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function cardOf(s,p,uid){
 for(const zone of ['hand','deck','life','outside','removed']){
  const found=s.players[p][zone].find(c=>c.uid===uid);
  if(found)return found;
 }
 for(const line of ['front','energy']){
  const found=s.players[p][line].find(c=>c?.uid===uid);
  if(found)return found;
 }
 return null;
}
function orderBottom(packs,s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'&&s.pending.split!==true){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=use(packs,s,a=>a.type==='chooseTopOrder'&&a.uid===uid);
  assert.ok(++guard<=12);
 }
 return s;
}
function orderSplit(packs,s,place='bottom'){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'&&s.pending.split===true){
  const uid=s.pending.uids.find(id=>!s.pending.order.some(x=>x.uid===id));
  s=use(packs,s,a=>a.type==='chooseTopOrder'&&a.uid===uid&&a.place===place);
  assert.ok(++guard<=8);
 }
 return s;
}
function discardAll(packs,s){
 let guard=0;
 while(s.pending?.kind==='effect-discard'){
  const uid=s.players[s.pending.player].hand[0].uid;
  s=use(packs,s,a=>a.type==='chooseDiscard'&&a.uid===uid);
  assert.ok(++guard<=6);
 }
 return s;
}
function liveSniper(s,unit){
 return !!unit?.sniperGranted&&unit.sniperGranted.turn===s.turn&&
  unit.sniperGranted.stamp===unit.fieldEntryStamp;
}

test('ten of the remaining sixteen SAO prints join the shared pilot',()=>{
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],183);
 assert.equal(EXPECTED_V2_TOTAL,700);
 assert.equal(Object.keys(sao.cards).length,183);
 for(const id of TEN){
  assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes(id),true);
  assert.equal(sao.cards[id].implementation,'dsl');
 }
 const sun=sao.cards['SAO-1-025'];
 assert.equal(sun.raidName,'シノン（太陽神ソルス）');
 assert.equal(sun.effects.onPlay[0].then[0].op,'grantSelfSniperThisTurn');
 assert.equal(sun.passiveBonuses[0].bp,500);
 assert.equal(sun.passiveBonuses[1].impact,1);
 assert.equal(sao.cards['SAO-2-032'].raidName,'ユナ');
 assert.equal(sao.cards['SAO-2-032'].mainAbility.op,'restIfTraitUsedBuffUnion');
 assert.equal(sao.cards['SAO-1-060'].blockBpRestriction.relation,'atLeast');
 assert.equal(sao.cards['SAO-1-060'].blockBpRestriction.condition.min,5);
 assert.equal(sao.cards['SAO-1-062'].enterAlwaysActive,true);
 assert.equal(sao.cards['SAO-1-062'].type,'field');
 assert.equal(sao.cards['SAO-1-049'].frontForbidden,true);
 assert.equal(sao.cards['SAO-2-020'].effects.onPlay[0].options[1].then[0].op,
  'mayRemoveOutsideDiscardGrantDouble');
 assert.equal(sao.cards['SAO-2-061'].type,'event');
 assert.equal(sao.cards['SAO-2-001'].effects.onPlay[1].discard,false);
 assert.deepEqual(sao.cards['SAO-1-091'].attackWinLookBuff,{count:2,bp:1000});
 assert.equal(sao.cards['SAO-1-041'].frontAttackEndNamedSwap,'アスナ');
 assert.equal(sao.cards['SAO-1-041'].mainAbility.op,'onceMandatorySwapLines');
 assert.equal(V2_PENDING_LABELS['effect-top-deploy'].includes('ACTIVE'),true);
 assert.equal(V2_PENDING_LABELS['effect-top-take-ready'].includes('手牌'),true);
 assert.equal(V2_PENDING_LABELS['effect-attack-end-named'].includes('交換'),true);
});

test('SAO-1-025 grants sniper on play only at 4 life, and own-turn BP and impact below that',()=>{
 const ids=['SAO-1-025','SAO-1-003','SAO-1-001'];
 function cast(seed,life){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-003','SAO-1-003']);
  setLife(s,0,life);
  const card=hold(s,0,'SAO-1-025');
  const played=playFront(packs,s,card.uid);
  assert.equal(played.pending,null);
  const body=played.players[0].front.find(c=>c?.uid===card.uid);
  return {packs,played,body};
 }
 const full=cast(1025,7);
 assert.equal(liveSniper(full.played,full.body),false);
 assert.equal(universalBp(full.packs,full.played,full.body),3500);
 assert.equal(universalImpact(full.packs,full.played,full.body),0);
 const four=cast(1026,4);
 assert.equal(liveSniper(four.played,four.body),true);
 assert.equal(universalBp(four.packs,four.played,four.body),3500);
 assert.equal(universalImpact(four.packs,four.played,four.body),0);
 four.body.ready=true;
 place(four.played,1,take(four.played,1,'SAO-1-001'),'front',0,true);
 assert.equal(legalUniversalActions(four.packs,reach(four.packs,four.played,
  x=>x.phase==='attack')).some(a=>a.type==='attack'&&a.targetUid),true);
 const three=cast(1027,3);
 assert.equal(liveSniper(three.played,three.body),true);
 assert.equal(universalBp(three.packs,three.played,three.body),4000);
 assert.equal(universalImpact(three.packs,three.played,three.body),0);
 const later=reach(three.packs,three.played,x=>x.active===1&&x.phase==='main',true);
 const faded=later.players[0].front.find(c=>c?.uid===three.body.uid);
 assert.equal(liveSniper(later,faded),false);
 assert.equal(universalBp(three.packs,later,faded),3500);
 assert.equal(universalImpact(three.packs,later,faded),0);
 const two=cast(1028,2);
 assert.equal(universalBp(two.packs,two.played,two.body),4000);
 assert.equal(universalImpact(two.packs,two.played,two.body),1);
 const parked=fresh(ids,1029);
 setLife(parked.s,0,2);
 const sitting=place(parked.s,0,take(parked.s,0,'SAO-1-025'),'front',0,true);
 assert.equal(sitting.sniperGranted,undefined);
 assert.equal(universalBp(parked.packs,parked.s,sitting),4000);
 conserved(two.played);
});

test('SAO-2-032 recovers a song, buffs another character, then rests only after a song is used',()=>{
 const ids=['SAO-2-032','SAO-2-028','SAO-2-033','SAO-2-060','SAO-2-062','SAO-1-001'];
 const {packs,s}=fresh(ids,2032,1);
 energize(s,0,['SAO-2-028','SAO-2-028','SAO-2-028']);
 const other=place(s,0,take(s,0,'SAO-2-028'),'front',1,true);
 const survivor=place(s,0,take(s,0,'SAO-2-033'),'front',2,true);
 const stranger=place(s,0,take(s,0,'SAO-1-001'),'front',3,true);
 const song=putOutside(s,0,'SAO-2-060');
 const yuna=hold(s,0,'SAO-2-032');
 const longing=hold(s,0,'SAO-2-062');
 let played=playFront(packs,s,yuna.uid);
 assert.equal(played.pending.kind,'effect-recover-outside');
 assertUniversalMatch(packs,played);
 aiOk(packs,played);
 assert.equal(played.pending.choices.includes(song.uid),true);
 const skipped=use(packs,structuredClone(played),a=>a.type==='chooseOutsideRecovery'&&a.uid===null);
 assert.equal(skipped.pending.kind,'effect-buff-own');
 assert.equal(skipped.pending.choices.includes(other.uid),true);
 assert.equal(skipped.pending.choices.includes(yuna.uid),false);
 const buffed=use(packs,structuredClone(skipped),a=>a.type==='chooseOwnBuff'&&a.uid===other.uid);
 assert.equal(buffed.pending,null);
 assert.equal(universalBp(packs,buffed,buffed.players[0].front.find(c=>c?.uid===other.uid)),2500);
 assert.equal(legalUniversalActions(packs,buffed).some(a=>a.mode==='songRestBuff'),false);
 let opened=use(packs,played,a=>a.type==='chooseOutsideRecovery'&&a.uid===song.uid);
 opened=use(packs,opened,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(opened.players[0].hand.some(c=>c.uid===song.uid),true);
 assert.equal(legalUniversalActions(packs,opened).some(a=>a.mode==='songRestBuff'),false);
 let sung=playEvent(packs,opened,longing.uid);
 sung=discardAll(packs,sung);
 if(sung.pending?.kind==='effect-recover-ap')
  sung=use(packs,sung,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(sung.pending,null);
 sung.players[0].front.find(c=>c?.uid===yuna.uid).ready=true;
 assert.equal(legalUniversalActions(packs,sung).some(a=>a.uid===yuna.uid&&a.mode==='songRestBuff'),true);
 const rested=use(packs,sung,a=>a.type==='activate'&&a.uid===yuna.uid&&a.mode==='songRestBuff');
 assert.equal(rested.players[0].front.find(c=>c?.uid===yuna.uid).ready,false);
 assert.equal(universalBp(packs,rested,rested.players[0].front.find(c=>c?.uid===yuna.uid)),4000);
 assert.equal(universalBp(packs,rested,rested.players[0].front.find(c=>c?.uid===other.uid)),2500);
 assert.equal(universalBp(packs,rested,rested.players[0].front.find(c=>c?.uid===survivor.uid)),5000);
 assert.equal(universalBp(packs,rested,rested.players[0].front.find(c=>c?.uid===stranger.uid)),2000);
 conserved(rested);
});

test('SAO-1-060 blocks only below 4000 with five cards in hand, then may return and active an ALO',()=>{
 const ids=['SAO-1-060','SAO-1-046','SAO-1-001','SAO-2-033'];
 function board(seed,hand){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-046']);
  const leafa=hold(s,0,'SAO-1-060');
  let played=playFront(packs,s,leafa.uid);
  const body=played.players[0].front.find(c=>c?.uid===leafa.uid);
  body.ready=true;
  const low=place(played,1,take(played,1,'SAO-1-001'),'front',0,true);
  const high=place(played,1,take(played,1,'SAO-2-033'),'front',1,true);
  setHand(played,0,hand);
  played=reach(packs,played,x=>x.phase==='attack');
  played=use(packs,played,a=>a.type==='attack'&&a.uid===leafa.uid&&!a.targetUid);
  assert.equal(played.pending.kind,'block');
  aiOk(packs,played);
  const blocks=legalUniversalActions(packs,played);
  return {packs,played,low,high,blocks,leafa};
 }
 const few=board(1060,4);
 assert.equal(few.blocks.some(a=>a.uid===few.low.uid),true);
 assert.equal(few.blocks.some(a=>a.uid===few.high.uid),true);
 const many=board(1061,5);
 assert.equal(many.blocks.some(a=>a.uid===many.low.uid),true);
 assert.equal(many.blocks.some(a=>a.uid===many.high.uid),false);
 const {packs,s}=fresh(ids,1062);
 energize(s,0,['SAO-1-046']);
 const leafa=hold(s,0,'SAO-1-060');
 let alone=playFront(packs,s,leafa.uid);
 const genSlot=alone.players[0].energy.findIndex(Boolean);
 alone.players[0].outside.push(alone.players[0].energy[genSlot]);
 alone.players[0].energy[genSlot]=null;
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.mode==='returnThenActive'),false);
 const ally=place(alone,0,take(alone,0,'SAO-1-001'),'front',1,true);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.uid===leafa.uid&&a.mode==='returnThenActive'),true);
 const asked=use(packs,structuredClone(alone),a=>a.type==='activate'&&a.uid===leafa.uid&&a.mode==='returnThenActive');
 assert.equal(asked.pending.kind,'effect-return-then');
 assertUniversalMatch(packs,asked);
 aiOk(packs,asked);
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===null),true);
 const declined=use(packs,structuredClone(asked),a=>a.type==='chooseReturnThen'&&a.uid===null);
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].front.some(c=>c?.uid===ally.uid),true);
 assert.equal(legalUniversalActions(packs,declined).some(a=>a.mode==='returnThenActive'),false);
 let returned=use(packs,asked,a=>a.type==='chooseReturnThen'&&a.uid===ally.uid);
 assert.equal(returned.players[0].hand.some(c=>c.uid===ally.uid),true);
 assert.equal(returned.pending.kind,'effect-active-trait-buff');
 assert.equal(returned.pending.choices.includes(leafa.uid),true);
 const skipped=use(packs,structuredClone(returned),a=>a.type==='chooseActiveTraitBuff'&&a.uid===null);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front.find(c=>c?.uid===leafa.uid)),3500);
 returned=use(packs,returned,a=>a.type==='chooseActiveTraitBuff'&&a.uid===leafa.uid);
 const body=returned.players[0].front.find(c=>c?.uid===leafa.uid);
 assert.equal(body.ready,true);
 assert.equal(universalBp(packs,returned,body),4500);
 conserved(returned);
});

test('SAO-1-062 enters active and must return an ALO before an optional either-side buff',()=>{
 const ids=['SAO-1-062','SAO-1-046','SAO-1-054','SAO-1-001'];
 const {packs,s}=fresh(ids,1062);
 energize(s,0,['SAO-1-046']);
 const tree=hold(s,0,'SAO-1-062');
 let played=playEnergy(packs,s,tree.uid);
 assert.equal(played.pending,null);
 const field=played.players[0].energy.find(c=>c?.uid===tree.uid);
 assert.equal(field.ready,true);
 assert.equal(legalUniversalActions(packs,played).some(a=>a.mode==='returnTraitEither'),false);
 const alo=place(played,0,take(played,0,'SAO-1-054'),'front',0,false);
 const foe=place(played,1,take(played,1,'SAO-1-001'),'front',0,true);
 const asked=use(packs,played,a=>a.type==='activate'&&a.uid===tree.uid&&a.mode==='returnTraitEither');
 assert.equal(asked.players[0].energy.find(c=>c?.uid===tree.uid).ready,false);
 assert.equal(asked.pending.kind,'effect-return-trait');
 assertUniversalMatch(packs,asked);
 aiOk(packs,asked);
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===null),false);
 let bounced=use(packs,asked,a=>a.type==='chooseReturnTrait'&&a.uid===alo.uid);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===alo.uid),true);
 assert.equal(bounced.pending.kind,'effect-buff-either');
 assert.equal(bounced.pending.choices.includes(foe.uid),true);
 const skipped=use(packs,structuredClone(bounced),a=>a.type==='chooseEitherBuff'&&a.uid===null);
 assert.equal(universalBp(packs,skipped,skipped.players[1].front.find(c=>c?.uid===foe.uid)),2000);
 bounced=use(packs,bounced,a=>a.type==='chooseEitherBuff'&&a.uid===foe.uid);
 assert.equal(universalBp(packs,bounced,bounced.players[1].front.find(c=>c?.uid===foe.uid)),3000);
 conserved(bounced);
});

test('SAO-1-049 cannot enter the front and deploys one affordable AP1 ALO from the top four',()=>{
 const ids=['SAO-1-049','SAO-1-046','SAO-1-080','SAO-1-083','SAO-1-001','SAO-1-054'];
 const {packs,s}=fresh(ids,1049,1);
 energize(s,0,['SAO-1-046']);
 const asuna=hold(s,0,'SAO-1-049');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===asuna.uid&&a.line==='front'),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===asuna.uid&&a.line==='energy'),true);
 const window=stackTop(s,0,['SAO-1-080','SAO-1-083','SAO-1-001','SAO-1-054']);
 let played=playEnergy(packs,s,asuna.uid);
 assert.equal(played.pending.kind,'effect-top-deploy');
 assertUniversalMatch(packs,played);
 aiOk(packs,played);
 assert.deepEqual(played.pending.choices,[window[3].uid]);
 const privateLook=universalPrivateChoices(packs,played,0);
 assert.deepEqual(privateLook.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,played,1),null);
 const shown=inspectedPendingChoiceCards(privateLook,legalUniversalActions(packs,played));
 assert.deepEqual(shown.map(c=>c.uid),window.map(c=>c.uid));
 assert.ok(shown.filter(c=>c.uid!==window[3].uid).every(c=>c.action===null&&c.keepLegal===false));
 const hit=shown.find(c=>c.uid===window[3].uid);
 assert.equal(hit.keepLegal,true);
 assert.equal(hit.action,null);
 const foe=JSON.stringify(universalPublicView(packs,played,1));
 assert.ok(window.slice(0,3).every(c=>!foe.includes(c.uid)));
 const skipped=orderBottom(packs,use(packs,structuredClone(played),a=>a.type==='chooseTopDeploy'&&a.uid===null));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front.some(c=>c?.cardId==='SAO-1-054'),false);
 assert.deepEqual(skipped.players[0].deck.slice(-4).map(c=>c.uid),window.map(c=>c.uid));
 const slot=legalUniversalActions(packs,played).find(a=>a.type==='chooseTopDeploy'&&a.uid===window[3].uid);
 let deployed=use(packs,played,a=>a.type==='chooseTopDeploy'&&a.uid===window[3].uid&&a.slot===slot.slot);
 assert.equal(deployed.pending.kind,'effect-top-order');
 const body=deployed.players[0].front.find(c=>c?.uid===window[3].uid);
 assert.equal(body.ready,true);
 deployed=orderBottom(packs,deployed);
 assert.equal(deployed.pending,null);
 assert.deepEqual(deployed.players[0].deck.slice(-3).map(c=>c.uid),window.slice(0,3).map(c=>c.uid));
 conserved(deployed);
});

test('SAO-2-020 draws and discards, or may remove an ingot to grant double attack',()=>{
 const ids=['SAO-2-020','SAO-1-050','SAO-2-025','SAO-1-039','SAO-1-051'];
 function cast(seed){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-050']);
  const ingot=putOutside(s,0,'SAO-2-025');
  const kirito=place(s,0,take(s,0,'SAO-1-039'),'front',0,true);
  const other=place(s,0,take(s,0,'SAO-1-051'),'front',1,true);
  const liz=hold(s,0,'SAO-2-020');
  const played=playFront(packs,s,liz.uid);
  assert.equal(played.pending.kind,'effect-choice-mode');
  aiOk(packs,played);
  assert.deepEqual(legalUniversalActions(packs,played).map(a=>a.mode).sort(),['draw','ingot']);
  return {packs,played,ingot,kirito,other};
 }
 const drawn=cast(2020);
 const deck=drawn.played.players[0].deck.length;
 let took=use(drawn.packs,structuredClone(drawn.played),a=>a.type==='chooseEffectMode'&&a.mode==='draw');
 assert.equal(took.pending.kind,'effect-discard');
 took=discardAll(drawn.packs,took);
 assert.equal(took.pending,null);
 assert.equal(took.players[0].deck.length,deck-1);
 assert.equal(took.players[0].front.find(c=>c?.uid===drawn.kirito.uid).readyOnAttackGranted,undefined);
 const declined=use(drawn.packs,structuredClone(drawn.played),a=>a.type==='chooseEffectMode'&&a.mode==='ingot');
 assert.equal(declined.pending.kind,'effect-ingot-double');
 assertUniversalMatch(drawn.packs,declined);
 const passed=use(drawn.packs,structuredClone(declined),a=>a.type==='chooseIngotDouble'&&a.uid===null);
 assert.equal(passed.pending,null);
 assert.equal(passed.players[0].outside.some(c=>c.uid===drawn.ingot.uid),true);
 let paid=use(drawn.packs,declined,a=>a.type==='chooseIngotDouble'&&a.uid===drawn.ingot.uid);
 assert.equal(paid.players[0].removed.some(c=>c.uid===drawn.ingot.uid),true);
 assert.equal(paid.pending.kind,'effect-discard');
 paid=discardAll(drawn.packs,paid);
 assert.equal(paid.pending.kind,'effect-grant-double');
 assert.equal(paid.pending.choices.includes(drawn.kirito.uid),true);
 assert.equal(paid.pending.choices.includes(drawn.other.uid),false);
 const skipped=use(drawn.packs,structuredClone(paid),a=>a.type==='chooseGrantDouble'&&a.uid===null);
 assert.equal(skipped.players[0].front.find(c=>c?.uid===drawn.kirito.uid).readyOnAttackGranted,undefined);
 paid=use(drawn.packs,paid,a=>a.type==='chooseGrantDouble'&&a.uid===drawn.kirito.uid);
 const armed=paid.players[0].front.find(c=>c?.uid===drawn.kirito.uid);
 assert.equal(armed.readyOnAttackGranted.turn,paid.turn);
 const bare=cast(2021);
 bare.played.players[0].outside=bare.played.players[0].outside.filter(c=>c.uid!==bare.ingot.uid);
 bare.played.players[0].deck.push(bare.ingot);
 const missed=use(bare.packs,bare.played,a=>a.type==='chooseEffectMode'&&a.mode==='ingot');
 assert.equal(missed.pending,null);
 const empty=fresh(ids,2022);
 energize(empty.s,0,['SAO-1-050']);
 putOutside(empty.s,0,'SAO-2-025');
 setHand(empty.s,0,0);
 const only=hold(empty.s,0,'SAO-2-020');
 let quiet=playFront(empty.packs,empty.s,only.uid);
 quiet=use(empty.packs,quiet,a=>a.type==='chooseEffectMode'&&a.mode==='ingot');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].removed.some(c=>c.cardId==='SAO-2-025'),false);
 conserved(paid);
});

test('SAO-2-061 takes exactly one of five and readies AP only for another song or Yuna',()=>{
 const ids=['SAO-2-061','SAO-2-028','SAO-2-062','SAO-1-001','SAO-2-030'];
 function cast(seed){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-2-028','SAO-2-028']);
  const event=hold(s,0,'SAO-2-061');
  const window=stackTop(s,0,['SAO-2-062','SAO-2-028','SAO-2-061','SAO-1-001','SAO-2-030']);
  const played=playEvent(packs,s,event.uid);
  assert.equal(played.pending.kind,'effect-top-take-ready');
  assertUniversalMatch(packs,played);
  aiOk(packs,played);
  assert.equal(legalUniversalActions(packs,played).some(a=>a.uid===null),false);
  assert.deepEqual(played.pending.uids,window.map(c=>c.uid));
  return {packs,played,window};
 }
 function takeOne(seed,index){
  const {packs,played,window}=cast(seed);
  let next=use(packs,played,a=>a.type==='chooseTopTake'&&a.uid===window[index].uid);
  assert.equal(next.players[0].hand.some(c=>c.uid===window[index].uid),true);
  return {packs,next,window};
 }
 const song=takeOne(2061,0);
 assert.equal(song.next.pending.kind,'effect-top-order');
 assert.equal(song.next.pending.recoverApAfter,true);
 let ready=orderBottom(song.packs,song.next);
 assert.equal(ready.pending.kind,'effect-recover-ap');
 ready=use(song.packs,ready,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(ready.pending,null);
 const yuna=takeOne(2062,1);
 assert.equal(yuna.next.pending.recoverApAfter,true);
 const self=takeOne(2063,2);
 assert.equal(self.next.pending.recoverApAfter,undefined);
 const plain=orderBottom(self.packs,self.next);
 assert.equal(plain.pending,null);
 const other=takeOne(2064,3);
 assert.equal(other.next.pending.recoverApAfter,undefined);
 conserved(plain);
});

test('SAO-2-001 rests an affordable yellow Integrity Knight, then takes one named art without discarding',()=>{
 const ids=['SAO-2-001','SAO-1-003','SAO-1-010','SAO-1-018','SAO-1-001','SAO-2-012','SAO-2-013'];
 const {packs,s}=fresh(ids,2001,1,0,'main',{'SAO-2-013':1});
 energize(s,0,['SAO-1-003','SAO-1-003']);
 const knight=putOutside(s,0,'SAO-1-010');
 const costly=putOutside(s,0,'SAO-1-018');
 const plain=putOutside(s,0,'SAO-1-001');
 const arts=stackTop(s,0,['SAO-2-012','SAO-1-001','SAO-1-003','SAO-2-013','SAO-1-010','SAO-1-001','SAO-1-003']);
 const admin=hold(s,0,'SAO-2-001');
 let played=playFront(packs,s,admin.uid);
 assert.equal(played.pending.kind,'effect-outside-color-rest');
 assertUniversalMatch(packs,played);
 aiOk(packs,played);
 assert.deepEqual(played.pending.choices,[knight.uid]);
 assert.equal(played.pending.choices.includes(costly.uid),false);
 assert.equal(played.pending.choices.includes(plain.uid),false);
 const skipped=use(packs,structuredClone(played),a=>a.type==='chooseOutsideColorRest'&&a.uid===null);
 assert.equal(skipped.pending.kind,'effect-top-filter-choice');
 assert.equal(skipped.pending.discard,false);
 const names=skipped.pending.choices.map(uid=>cardOf(skipped,0,uid).cardId).sort();
 assert.deepEqual(names,['SAO-2-012','SAO-2-013']);
 const hand=skipped.players[0].hand.length;
 let none=use(packs,structuredClone(skipped),a=>a.type==='chooseTopFiltered'&&a.uid===null);
 none=orderBottom(packs,none);
 assert.equal(none.pending,null);
 assert.equal(none.players[0].hand.length,hand);
 const beforeArts=skipped.players[0].hand.filter(c=>c.cardId==='SAO-2-012').length;
 const taken=skipped.pending.choices.find(uid=>cardOf(skipped,0,uid).cardId==='SAO-2-012');
 let got=use(packs,skipped,a=>a.type==='chooseTopFiltered'&&a.uid===taken);
 assert.equal(got.pending.kind,'effect-top-order');
 assert.equal(got.pending.discardAfter,undefined);
 assert.equal(got.players[0].hand.some(c=>c.uid===taken),true);
 got=orderBottom(packs,got);
 assert.equal(got.pending,null);
 assert.equal(got.players[0].hand.filter(c=>c.cardId==='SAO-2-012').length,beforeArts+1);
 const slot=legalUniversalActions(packs,played).find(a=>a.uid===knight.uid&&a.line==='energy');
 let entered=use(packs,played,a=>a.type==='chooseOutsideColorRest'&&a.uid===knight.uid&&a.line==='energy'&&a.slot===slot.slot);
 assert.equal(entered.pending.kind,'effect-top-filter-choice');
 const body=entered.players[0].energy.find(c=>c?.uid===knight.uid);
 assert.equal(body.ready,false);
 assert.deepEqual(arts.map(c=>c.uid).filter(uid=>entered.pending.uids.includes(uid)).length,7);
 conserved(got);
});

test('SAO-1-091 looks at two cards only after an attacking battle win, then may buff another',()=>{
 const ids=['SAO-1-091','SAO-1-073','SAO-1-001','SAO-1-087'];
 function cast(seed){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-073','SAO-1-073','SAO-1-073']);
  const sinon=hold(s,0,'SAO-1-091');
  return {packs,s,sinon};
 }
 const parked=cast(1091);
 const sitting=place(parked.s,0,take(parked.s,0,'SAO-1-091'),'front',0,true);
 const weak=place(parked.s,1,take(parked.s,1,'SAO-1-001'),'front',0,true);
 let quiet=reach(parked.packs,parked.s,x=>x.phase==='attack');
 quiet=use(parked.packs,quiet,a=>a.type==='attack'&&a.uid===sitting.uid);
 assert.equal(quiet.pending.kind,'block');
 quiet=dispatchUniversalAction(parked.packs,quiet,{type:'chooseBlock',uid:weak.uid});
 assert.equal(quiet.pending.kind,'effect-top-order');
 assert.equal(quiet.pending.split,true);
 const live=cast(1092);
 let played=playFront(live.packs,live.s,live.sinon.uid);
 const shooter=played.players[0].front.find(c=>c?.uid===live.sinon.uid);
 assert.equal(liveSniper(played,shooter),true);
 shooter.ready=true;
 const victim=place(played,1,take(played,1,'SAO-1-001'),'front',0,true);
 const look=stackTop(played,0,['SAO-1-073','SAO-1-001']);
 played=reach(live.packs,played,x=>x.phase==='attack');
 const ally=played.players[0].energy.find(c=>c?.cardId==='SAO-1-073');
 let won=use(live.packs,played,a=>a.type==='attack'&&a.uid===shooter.uid&&a.targetUid===victim.uid);
 assert.equal(won.pending.kind,'effect-top-order');
 assert.equal(won.pending.split,true);
 assert.deepEqual(won.pending.uids,look.map(c=>c.uid));
 assertUniversalMatch(live.packs,won);
 aiOk(live.packs,won);
 assert.equal(universalBp(live.packs,won,won.players[0].energy.find(c=>c?.uid===ally.uid)),2500);
 won=orderSplit(live.packs,won,'top');
 assert.equal(won.pending.kind,'effect-buff-own');
 assert.equal(won.pending.choices.includes(shooter.uid),false);
 assert.equal(won.pending.choices.includes(ally.uid),true);
 const passed=use(live.packs,structuredClone(won),a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(universalBp(live.packs,passed,passed.players[0].energy.find(c=>c?.uid===ally.uid)),2500);
 won=use(live.packs,won,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(live.packs,won,won.players[0].energy.find(c=>c?.uid===ally.uid)),3500);
 const direct=cast(1093);
 let open=playFront(direct.packs,direct.s,direct.sinon.uid);
 open.players[0].front.find(c=>c?.uid===direct.sinon.uid).ready=true;
 quietLife(open,1);
 open=reach(direct.packs,open,x=>x.phase==='attack');
 open=use(direct.packs,open,a=>a.type==='attack'&&a.uid===direct.sinon.uid&&!a.targetUid);
 assert.equal(open.pending.kind,'block');
 open=dispatchUniversalAction(direct.packs,open,{type:'chooseBlock',uid:null});
 assert.notEqual(open.pending?.kind,'effect-top-order');
 assert.notEqual(open.pending?.kind,'effect-buff-own');
 const loss=cast(1094);
 let beaten=playFront(loss.packs,loss.s,loss.sinon.uid);
 const loser=beaten.players[0].front.find(c=>c?.uid===loss.sinon.uid);
 loser.ready=true;
 const wall=place(beaten,1,take(beaten,1,'SAO-1-087'),'front',0,true);
 beaten=reach(loss.packs,beaten,x=>x.phase==='attack');
 beaten=use(loss.packs,beaten,a=>a.type==='attack'&&a.uid===loser.uid&&a.targetUid===wall.uid);
 assert.notEqual(beaten.pending?.kind,'effect-top-order');
 assert.equal(beaten.players[0].outside.some(c=>c.uid===loser.uid),true);
 const silenced=cast(1095);
 let muted=playFront(silenced.packs,silenced.s,silenced.sinon.uid);
 const body=muted.players[0].front.find(c=>c?.uid===silenced.sinon.uid);
 body.ready=true;
 grantContinuousState(muted,{kind:'originalEffectsDisabled',controller:1,sourceUid:body.uid,
  targetUid:body.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 const pawn=place(muted,1,take(muted,1,'SAO-1-001'),'front',0,true);
 muted=reach(silenced.packs,muted,x=>x.phase==='attack');
 assert.equal(legalUniversalActions(silenced.packs,muted).some(a=>a.targetUid),false);
 muted=use(silenced.packs,muted,a=>a.type==='attack'&&a.uid===body.uid);
 muted=dispatchUniversalAction(silenced.packs,muted,{type:'chooseBlock',uid:pawn.uid});
 assert.notEqual(muted.pending?.kind,'effect-top-order');
 assert.notEqual(muted.pending?.kind,'effect-buff-own');
 conserved(won);
});

function quietLife(s,p){
 s.players[p].life.unshift(take(s,p,'SAO-1-001'));
}

test('SAO-1-041 may swap with an energy Asuna at attack end, and must swap once from the main',()=>{
 const ids=['SAO-1-041','SAO-1-046','SAO-1-035','SAO-1-001','SAO-1-087','SAO-1-049'];
 function cast(seed){
  const {packs,s}=fresh(ids,seed);
  energize(s,0,['SAO-1-046','SAO-1-035','SAO-1-035']);
  const kirito=hold(s,0,'SAO-1-041');
  let played=playFront(packs,s,kirito.uid);
  const body=played.players[0].front.find(c=>c?.uid===kirito.uid);
  body.ready=true;
  return {packs,played,kirito,body};
 }
 const win=cast(1041);
 const low=place(win.played,1,take(win.played,1,'SAO-1-001'),'front',0,true);
 let fought=reach(win.packs,win.played,x=>x.phase==='attack');
 fought=use(win.packs,fought,a=>a.type==='attack'&&a.uid===win.kirito.uid);
 assert.equal(fought.pending.kind,'block');
 fought=dispatchUniversalAction(win.packs,fought,{type:'chooseBlock',uid:low.uid});
 assert.equal(fought.pending.kind,'effect-attack-end-named');
 assertUniversalMatch(win.packs,fought);
 aiOk(win.packs,fought);
 const asuna=fought.players[0].energy.find(c=>c?.cardId==='SAO-1-035');
 const stayed=use(win.packs,structuredClone(fought),a=>a.type==='chooseAttackEndNamed'&&a.uid===null);
 assert.equal(stayed.players[0].front.some(c=>c?.uid===win.kirito.uid),true);
 assert.equal(stayed.players[0].energy.some(c=>c?.uid===asuna.uid),true);
 const swapped=use(win.packs,fought,a=>a.type==='chooseAttackEndNamed'&&a.uid===asuna.uid);
 assert.equal(swapped.players[0].energy.some(c=>c?.uid===win.kirito.uid),true);
 assert.equal(swapped.players[0].front.some(c=>c?.uid===asuna.uid),true);
 const none=cast(1042);
 for(const card of none.played.players[0].energy){
  if(card?.cardId==='SAO-1-035'){
   const slot=none.played.players[0].energy.indexOf(card);
   none.played.players[0].energy[slot]=null;
   none.played.players[0].deck.push(card);
  }
 }
 const pawn=place(none.played,1,take(none.played,1,'SAO-1-001'),'front',0,true);
 let bare=reach(none.packs,none.played,x=>x.phase==='attack');
 bare=use(none.packs,bare,a=>a.type==='attack'&&a.uid===none.kirito.uid);
 bare=dispatchUniversalAction(none.packs,bare,{type:'chooseBlock',uid:pawn.uid});
 assert.notEqual(bare.pending?.kind,'effect-attack-end-named');
 const loss=cast(1043);
 const wall=place(loss.played,1,take(loss.played,1,'SAO-1-087'),'front',0,true);
 let beaten=reach(loss.packs,loss.played,x=>x.phase==='attack');
 beaten=use(loss.packs,beaten,a=>a.type==='attack'&&a.uid===loss.kirito.uid);
 beaten=dispatchUniversalAction(loss.packs,beaten,{type:'chooseBlock',uid:wall.uid});
 // Q34: a higher-BP blocker wins and neither character leaves. The attack
 // still ends, so the printed energy Asuna swap is offered.
 assert.equal(beaten.pending.kind,'effect-attack-end-named');
 assert.equal(beaten.players[0].front.some(c=>c?.uid===loss.kirito.uid),true);
 assert.equal(beaten.players[0].front.find(c=>c?.uid===loss.kirito.uid).ready,false);
 assert.equal(beaten.players[0].outside.some(c=>c.uid===loss.kirito.uid),false);
 assert.equal(beaten.players[1].front.some(c=>c?.uid===wall.uid),true);
 const declined=use(loss.packs,beaten,a=>a.type==='chooseAttackEndNamed'&&a.uid===null);
 assert.equal(declined.players[0].front.some(c=>c?.uid===loss.kirito.uid),true);
 const {packs,s}=fresh(ids,1044);
 const kirito=place(s,0,take(s,0,'SAO-1-041'),'front',0,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='onceSwapLines'),false);
 const energy=place(s,0,take(s,0,'SAO-1-035'),'energy',0,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===kirito.uid&&a.mode==='onceSwapLines'),true);
 let asked=use(packs,s,a=>a.type==='activate'&&a.uid===kirito.uid&&a.mode==='onceSwapLines');
 assert.equal(asked.pending.kind,'effect-swap-lines');
 assert.equal(asked.pending.optional,false);
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===null),false);
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.uid===kirito.uid),true);
 asked=use(packs,asked,a=>a.type==='chooseSwapLines'&&a.uid===kirito.uid);
 asked=use(packs,asked,a=>a.type==='chooseSwapLines'&&a.uid===energy.uid);
 assert.equal(asked.pending,null);
 assert.equal(asked.players[0].energy.some(c=>c?.uid===kirito.uid),true);
 assert.equal(asked.players[0].front.some(c=>c?.uid===energy.uid),true);
 assert.equal(legalUniversalActions(packs,asked).some(a=>a.mode==='onceSwapLines'),false);
 const banned=fresh(ids,1045);
 place(banned.s,0,take(banned.s,0,'SAO-1-041'),'front',0,true);
 place(banned.s,0,take(banned.s,0,'SAO-1-049'),'energy',0,true);
 assert.equal(legalUniversalActions(banned.packs,banned.s).some(a=>a.mode==='onceSwapLines'),false);
 conserved(swapped);
});
