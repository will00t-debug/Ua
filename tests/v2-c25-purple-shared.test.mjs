import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {handPlayApPlan} from '../dist/universal-v2/ap-discounts.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalAttackDamage,universalImpact,
 effectiveHandRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const purple=summarizeDesignatedDecks(id=>!!pack.cards[id]).find(r=>r.key==='renruki');
const counts=designatedPlayableCounts(purple);
const fresh=(seed=2501)=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function uids(s){
 const out=[],walk=c=>{out.push(c.uid);for(const x of c.stack||[])walk(x);for(const x of c.under||[])walk(x);};
 for(const p of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed'])
   for(const c of p[zone])walk(c);
  for(const c of [...p.front,...p.energy])if(c)walk(c);
 }
 return out.sort();
}
function actorOf(s){return s.pending?.player??s.active;}
function play(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,'missing legal action');
 const next=dispatchUniversalAction(packs,s,action,{actor:actorOf(s)});
 assert.deepEqual(uids(next),uids(s));
 assert.equal(assertUniversalMatch(packs,next),true);
 return next;
}
function phase(s,target){
 for(let i=0;i<8&&s.phase!==target;i++)s=play(s,a=>a.type==='next');
 assert.equal(s.phase,target);return s;
}
function sit(s,card,ready=true){
 card.ready=ready;card.fieldEntryStamp=s.nextFieldEntryStamp++;return card;
}
function place(s,p,id,line,slot,ready=true){
 const card=sit(s,take(s,p,id),ready);
 s.players[p][line][slot]=card;return card;
}
function hold(s,p,id){
 const card=take(s,p,id);s.players[p].hand.push(card);return card;
}
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function readyAp(s,p,n){
 for(let i=0;i<3;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function apLeft(s,p){return s.players[p].apCards.filter(c=>c.ready).length;}
function fuel(s,p=0,n=4){
 for(let i=0;i<n;i++)place(s,p,'BLC-1-039','energy',i);
}
function outside(s,p,id){
 const card=take(s,p,id);s.players[p].outside.push(card);return card;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function find(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}

test('the purple list is the 50-card UA08BT print and stays out of the seven presets',()=>{
 assert.equal(Object.keys(pack.cards).length,160);
 assert.equal(EXPECTED_V2_COUNTS.bleach,160);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.equal(purple.playable,true);
 assert.equal(purple.registeredKinds,13);
 assert.deepEqual(purple.missing,[]);
 assert.equal(purple.entries[0].source,'UA08BT/BLC-1-039');
 assert.equal(pack.cards['BLC-1-039'].implementation,'vanilla');
 assert.equal(pack.cards['BLC-1-039'].ap,1);
 assert.equal(pack.cards['BLC-1-039'].bp,1500);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(Object.keys(createAllV2PreviewRealDecks()).includes('renruki'),false);
 assert.equal(Object.keys(createAllV2PreviewRealDecks()).includes('reject-blue'),false);
});

test('BLC-1-047 pays effect AP for Damage 2, and four outside cards are required for the debuff',()=>{
 let s=phase(fresh(2547),'main');
 fuel(s);
 readyAp(s,0,2);
 const renji=place(s,0,'BLC-1-047','front',0,false);
 const boosted=place(s,0,'BLC-4-049','front',1);
 assert.equal(universalBp(packs,s,boosted),2000);
 const played=hold(s,0,'BLC-4-049');
 s=play(s,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front'&&a.slot===2);
 assert.deepEqual(s.effectApPaidColors[0],[]);
 assert.equal(universalBp(packs,s,boosted),2000);
 s=play(s,a=>a.type==='activate'&&a.uid===renji.uid&&a.mode==='oncePay');
 const lived=find(s,0,renji.uid),livedBoost=find(s,0,boosted.uid);
 assert.deepEqual(s.effectApPaidColors[0],['purple']);
 assert.equal(universalAttackDamage(packs,s,lived),2);
 assert.equal(universalBp(packs,s,livedBoost),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,livedBoost),4000);
 assert.equal(assertUniversalMatch(packs,s),true);
 s.active=0;
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:lived.uid,targetUid:lived.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalAttackDamage(packs,s,lived),2);
 assert.equal(universalBp(packs,s,livedBoost),4000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:livedBoost.uid,targetUid:livedBoost.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalAttackDamage(packs,s,lived),2);
 assert.equal(universalBp(packs,s,livedBoost),2000);
 let later=phase(fresh(2548),'main');
 const laterRenji=place(later,0,'BLC-4-049','front',0);
 later.effectApPaidColors[0].push('purple');
 assert.equal(universalBp(packs,later,laterRenji),4000);
 later=phase(later,'attack');
 later=play(later,a=>a.type==='next');
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,find(later,0,laterRenji.uid)),2000);
 let short=phase(fresh(2549),'main');
 fuel(short);
 readyAp(short,0,1);
 const foe=place(short,1,'BLC-4-050','front',0);
 const three=[0,1,2].map(()=>outside(short,0,'BLC-4-048'));
 const payer=hold(short,0,'BLC-1-047');
 short=play(short,a=>a.type==='play'&&a.uid===payer.uid&&a.line==='front'&&a.slot===0);
 assert.equal(short.pending.kind,'effect-remove-outside');
 assert.equal(short.pending.short,true);
 aiOk(short);
 short=play(short,a=>a.type==='chooseRemoveOutside'&&a.mode==='all');
 assert.equal(short.pending,null);
 assert.equal(universalBp(packs,short,find(short,1,foe.uid)),4000);
 for(const card of three)assert.equal(short.players[0].removed.some(c=>c.uid===card.uid),true);
 let full=phase(fresh(2550),'main');
 fuel(full);
 readyAp(full,0,1);
 const victim=place(full,1,'BLC-4-050','front',0);
 const four=[0,1,2,3].map(()=>outside(full,0,'BLC-4-048'));
 const source=hold(full,0,'BLC-1-047');
 full=play(full,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 for(const card of four)
  full=play(full,a=>a.type==='chooseRemoveOutside'&&a.mode==='pick'&&a.uid===card.uid);
 assert.equal(full.pending.kind,'effect-target');
 full=play(full,a=>a.type==='chooseTarget'&&a.uid===victim.uid);
 assert.equal(universalBp(packs,full,find(full,1,victim.uid)),1000);
});

test('BLC-4-049 needs a field Rukia, and the two modes are draw or Active plus a BP cut',()=>{
 let closed=phase(fresh(2549),'main');
 readyAp(closed,0,1);
 const alone=place(closed,0,'BLC-4-049','front',0);
 assert.equal(legalUniversalActions(packs,closed).some(a=>a.type==='activate'&&a.uid===alone.uid),false);
 let draw=phase(fresh(2551),'main');
 readyAp(draw,0,1);
 place(draw,0,'BLC-4-083','energy',0);
 const renji=place(draw,0,'BLC-4-049','front',0,false);
 const hand=draw.players[0].hand.length;
 draw=play(draw,a=>a.type==='activate'&&a.uid===renji.uid&&a.mode==='oncePay');
 assert.equal(draw.pending.kind,'effect-choice-mode');
 aiOk(draw);
 draw=play(draw,a=>a.type==='chooseEffectMode'&&a.mode==='draw');
 assert.equal(draw.players[0].hand.length,hand+1);
 assert.equal(draw.players[0].front[0].ready,false);
 assert.equal(legalUniversalActions(packs,draw).some(a=>a.type==='activate'&&a.uid===renji.uid),false);
 let active=phase(fresh(2552),'main');
 readyAp(active,0,1);
 place(active,0,'BLC-4-083','front',1);
 const self=place(active,0,'BLC-4-049','front',0,false);
 const foe=place(active,1,'BLC-4-050','front',0);
 active=play(active,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='oncePay');
 active=play(active,a=>a.type==='chooseEffectMode'&&a.mode==='active');
 assert.equal(active.pending.kind,'effect-target');
 assert.equal(find(active,0,self.uid).ready,true);
 active=play(active,a=>a.type==='chooseTarget'&&a.uid===foe.uid);
 assert.equal(universalBp(packs,active,find(active,1,foe.uid)),3000);
});

test('BLC-4-050 cuts Raid AP after purple effect AP, and a zero-AP hand Renji voids the next one',()=>{
 let s=phase(fresh(2553),'main');
 fuel(s);
 readyAp(s,0,0);
 const payer=place(s,0,'BLC-1-047','front',1);
 const base=place(s,0,'BLC-4-048','front',0);
 const naked=place(s,0,'BLC-4-050','front',3);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===naked.uid&&a.mode==='oncePay'),false);
 const top=hold(s,0,'BLC-4-050');
 assert.equal(handPlayApPlan(s,0,pack.cards['BLC-4-050'],{raid:true,uid:top.uid}).cost,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===top.uid),false);
 readyAp(s,0,1);
 s=play(s,a=>a.type==='activate'&&a.uid===payer.uid&&a.mode==='oncePay');
 assert.equal(apLeft(s,0),0);
 assert.equal(handPlayApPlan(s,0,pack.cards['BLC-4-050'],{raid:true,uid:top.uid}).cost,0);
 s=play(s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 assert.equal(apLeft(s,0),0);
 assert.equal(s.handZeroApUses.some(e=>e.uid===top.uid),true);
 assert.equal(s.players[0].front[0].uid,top.uid);
 const second=hold(s,0,'BLC-4-050');
 const other=place(s,0,'BLC-4-049','front',2);
 assert.equal(handPlayApPlan(s,0,pack.cards['BLC-4-050'],{raid:true,uid:second.uid}).cost,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===second.uid),false);
 readyAp(s,0,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='oncePay'),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===other.uid),true);
 s=play(s,a=>a.type==='raid'&&a.uid===second.uid&&a.baseUid===other.uid);
 assert.equal(apLeft(s,0),0);
 const raided=s.players[0].front[2];
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===raided.uid&&a.mode==='oncePay'),true);
 s=play(s,a=>a.type==='activate'&&a.uid===raided.uid&&a.mode==='oncePay');
 s=play(s,a=>a.type==='chooseEffectMode'&&a.mode==='impact');
 const lived=find(s,0,raided.uid);
 assert.equal(universalImpact(packs,s,lived),1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:lived.uid,targetUid:lived.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalImpact(packs,s,lived),1);
});

test('Q2399: an effect putting Renji on the field does not void the Raid AP cut',()=>{
 let s=phase(fresh(2554),'main');
 fuel(s);
 readyAp(s,0,3);
 const payer=place(s,0,'BLC-1-047','front',0);
 const base=place(s,0,'BLC-4-048','front',1);
 const deployed=hold(s,0,'BLC-4-049');
 const costly=hold(s,0,'BLC-1-041');
 const rukia=hold(s,0,'BLC-4-054');
 s=play(s,a=>a.type==='activate'&&a.uid===payer.uid&&a.mode==='oncePay');
 s=play(s,a=>a.type==='play'&&a.uid===rukia.uid&&a.line==='front'&&a.slot===2);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=play(s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 assert.equal(s.pending.choices.includes(deployed.uid),true);
 assert.equal(s.pending.choices.includes(costly.uid),false);
 s=play(s,a=>a.type==='chooseHandRestOrRaid'&&a.mode==='enter'&&a.uid===deployed.uid&&a.line==='front');
 assert.equal(s.handZeroApUses.some(e=>e.uid===deployed.uid),false);
 assert.equal(apLeft(s,0),0);
 const top=hold(s,0,'BLC-4-050');
 assert.equal(handPlayApPlan(s,0,pack.cards['BLC-4-050'],{raid:true,uid:top.uid}).cost,0);
 s=play(s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===top.uid),true);
 let unpaid=phase(fresh(2555),'main');
 fuel(unpaid,0,3);
 readyAp(unpaid,0,1);
 place(unpaid,0,'BLC-4-048','front',0);
 const lonely=hold(unpaid,0,'BLC-4-054');
 const deck=unpaid.players[0].deck.length;
 unpaid=play(unpaid,a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'&&a.slot===1);
 assert.equal(unpaid.pending,null);
 assert.equal(unpaid.players[0].deck.length,deck);
});

test('BLC-1-041 mills before the scaled removal, including a one-card deck',()=>{
 let s=phase(fresh(2541),'main');
 fuel(s,0,3);
 place(s,0,'BLC-4-082','energy',3);
 readyAp(s,0,1);
 const foe=place(s,1,'BLC-4-050','front',0);
 const [first,second]=crown(s,0,['BLC-4-048','BLC-4-049']);
 const ichigo=hold(s,0,'BLC-1-041');
 s=play(s,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending.kind,'effect-remove-outside');
 assert.equal(s.pending.any,true);
 assert.equal(s.players[0].outside.some(c=>c.uid===first.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===second.uid),true);
 aiOk(s);
 s=play(s,a=>a.type==='chooseRemoveOutside'&&a.mode==='pick'&&a.uid===first.uid);
 s=play(s,a=>a.type==='chooseRemoveOutside'&&a.mode==='pick'&&a.uid===second.uid);
 s=play(s,a=>a.type==='chooseRemoveOutside'&&a.mode==='done');
 s=play(s,a=>a.type==='chooseTarget'&&a.uid===foe.uid);
 assert.equal(universalBp(packs,s,find(s,1,foe.uid)),3000);
 let skipped=phase(fresh(2542),'main');
 fuel(skipped,0,3);
 place(skipped,0,'BLC-4-082','energy',3);
 readyAp(skipped,0,1);
 const untouched=place(skipped,1,'BLC-4-050','front',0);
 const parked=outside(skipped,0,'BLC-4-048');
 const plain=hold(skipped,0,'BLC-1-041');
 skipped=play(skipped,a=>a.type==='play'&&a.uid===plain.uid&&a.line==='front'&&a.slot===0);
 skipped=play(skipped,a=>a.type==='chooseRemoveOutside'&&a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,find(skipped,1,untouched.uid)),4000);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===parked.uid),true);
 let short=phase(fresh(2543),'main');
 fuel(short,0,3);
 place(short,0,'BLC-4-082','energy',3);
 readyAp(short,0,1);
 const kept=short.players[0].deck[0];
 place(short,1,'BLC-4-050','front',0);
 short.players[0].outside.push(...short.players[0].deck.splice(1));
 const hitter=hold(short,0,'BLC-1-041');
 short=play(short,a=>a.type==='play'&&a.uid===hitter.uid&&a.line==='front'&&a.slot===0);
 assert.equal(short.players[0].deck.includes(kept),false);
 assert.equal(short.players[0].outside.some(c=>c.uid===kept.uid),true);
 short=play(short,a=>a.type==='chooseRemoveOutside'&&a.mode==='pick'&&a.uid===kept.uid);
 short=play(short,a=>a.type==='chooseRemoveOutside'&&a.mode==='done');
 assert.equal(short.pending.kind,'effect-target');
 assert.equal(short.pending.bp,500);
});

test('BLC-4-048 sends only a purple Renji or Rukia from the top two',()=>{
 let s=phase(fresh(2548),'main');
 readyAp(s,0,1);
 const played=hold(s,0,'BLC-4-048');
 const aside=s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===played.uid),1);
 const [ichigo,renji]=crown(s,0,['BLC-1-039','BLC-4-048']);
 s.players[0].hand.push(...aside);
 s=play(s,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 assert.deepEqual(s.pending.choices,[renji.uid]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseTopTraitOutside'&&a.uid===ichigo.uid),false);
 s=play(s,a=>a.type==='chooseTopTraitOutside'&&a.uid===renji.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===renji.uid),true);
 s=play(s,a=>a.type==='chooseTopOrder'&&a.uid===ichigo.uid);
 assert.equal(s.players[0].deck[0].uid,ichigo.uid);
 let declined=phase(fresh(2544),'main');
 readyAp(declined,0,1);
 const opener=hold(declined,0,'BLC-4-048');
 const [left,right]=crown(declined,0,['BLC-4-049','BLC-4-054']);
 declined=play(declined,a=>a.type==='play'&&a.uid===opener.uid&&a.line==='energy'&&a.slot===0);
 declined=play(declined,a=>a.type==='chooseTopTraitOutside'&&a.uid===null);
 declined=play(declined,a=>a.type==='chooseTopOrder'&&a.uid===right.uid);
 declined=play(declined,a=>a.type==='chooseTopOrder'&&a.uid===left.uid);
 assert.equal(declined.players[0].deck[0].uid,right.uid);
 assert.equal(declined.players[0].deck[1].uid,left.uid);
 assert.equal(declined.players[0].outside.some(c=>c.uid===left.uid||c.uid===right.uid),false);
});

test('BLC-1-053 draws three and discards two, then its main discards for BP',()=>{
 let s=phase(fresh(2553),'main');
 fuel(s);
 readyAp(s,0,1);
 const rukia=hold(s,0,'BLC-1-053');
 const before=s.players[0].hand.length;
 s=play(s,a=>a.type==='play'&&a.uid===rukia.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.pending.remaining,2);
 assert.equal(s.players[0].hand.length,before-1+3);
 const dumped=[s.players[0].hand[0],s.players[0].hand[1]];
 s=play(s,a=>a.type==='chooseDiscard'&&a.uid===dumped[0].uid);
 s=play(s,a=>a.type==='chooseDiscard'&&a.uid===dumped[1].uid);
 assert.equal(s.pending,null);
 const ally=place(s,0,'BLC-4-049','front',1);
 const payment=s.players[0].hand[0];
 s=play(s,a=>a.type==='activate'&&a.uid===rukia.uid&&a.mode==='oncePay');
 s=play(s,a=>a.type==='chooseDiscardGate'&&a.uid===payment.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=play(s,a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid);
 assert.equal(universalBp(packs,s,find(s,0,ally.uid)),2500);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===rukia.uid),false);
});

test('BLC-4-082 draws from under the window only after a high-energy card goes outside',()=>{
 let s=phase(fresh(2582),'main');
 fuel(s,0,3);
 readyAp(s,0,1);
 const [high,low,marker]=crown(s,0,['BLC-1-041','BLC-4-048','BLC-4-049']);
 const ichigo=hold(s,0,'BLC-4-082');
 const hand=s.players[0].hand.length;
 s=play(s,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 s=play(s,a=>a.type==='chooseInspectedOutside'&&a.uid===high.uid);
 s=play(s,a=>a.type==='chooseInspectedOutside'&&a.uid===null);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.players[0].outside.some(c=>c.uid===high.uid),true);
 s=play(s,a=>a.type==='chooseTopOrder'&&a.uid===low.uid);
 assert.equal(s.players[0].deck[0].uid,low.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===marker.uid),true);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].hand.some(c=>c.uid===high.uid||c.uid===low.uid),false);
 let quiet=phase(fresh(2583),'main');
 fuel(quiet,0,3);
 readyAp(quiet,0,1);
 const [small,other]=crown(quiet,0,['BLC-4-048','BLC-4-049']);
 const played=hold(quiet,0,'BLC-4-082');
 const quietHand=quiet.players[0].hand.length;
 quiet=play(quiet,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front'&&a.slot===0);
 quiet=play(quiet,a=>a.type==='chooseInspectedOutside'&&a.uid===small.uid);
 quiet=play(quiet,a=>a.type==='chooseInspectedOutside'&&a.uid===null);
 quiet=play(quiet,a=>a.type==='chooseTopOrder'&&a.uid===other.uid);
 assert.equal(quiet.players[0].hand.length,quietHand-1);
 assert.equal(quiet.players[0].deck[0].uid,other.uid);
});

test('BLC-4-083 discounts an empty field by 2 and can stop a BP 4000 block',()=>{
 let s=phase(fresh(2583),'main');
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['BLC-4-083']),0);
 place(s,0,'BLC-1-039','energy',0);
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,pack.cards['BLC-4-083']),2);
 let peek=phase(fresh(2584),'main');
 readyAp(peek,0,1);
 const entering=hold(peek,0,'BLC-4-083');
 peek=play(peek,a=>a.type==='play'&&a.uid===entering.uid&&a.line==='front'&&a.slot===0);
 assert.equal(peek.pending.kind,'private-top-choice');
 const top=peek.players[0].deck[0];
 peek=play(peek,a=>a.type==='chooseTopCard'&&a.mode==='outside');
 assert.equal(peek.players[0].outside.some(c=>c.uid===top.uid),true);
 let raid=phase(fresh(2585),'main');
 fuel(raid);
 readyAp(raid,0,1);
 const base=place(raid,0,'BLC-4-083','front',0);
 const topCard=hold(raid,0,'BLC-1-053');
 raid=play(raid,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid);
 assert.equal(raid.pending.kind,'raid-effect-order');
 raid=play(raid,a=>a.type==='chooseRaidOrder'&&a.mode==='baseFirst');
 assert.equal(raid.pending.kind,'effect-choice-mode');
 raid=play(raid,a=>a.type==='chooseEffectMode'&&a.mode==='block');
 const granted=raid.players[0].front[0];
 raid=play(raid,a=>a.type==='chooseGrantBlockAtLeast'&&a.uid===granted.uid);
 assert.equal(raid.pending.kind,'effect-discard');
 const dumped=[raid.players[0].hand[0],raid.players[0].hand[1]];
 raid=play(raid,a=>a.type==='chooseDiscard'&&a.uid===dumped[0].uid);
 raid=play(raid,a=>a.type==='chooseDiscard'&&a.uid===dumped[1].uid);
 const wall=place(raid,1,'BLC-4-050','front',0);
 const small=place(raid,1,'BLC-4-048','front',1);
 raid=phase(raid,'attack');
 granted.ready=true;
 raid=play(raid,a=>a.type==='attack'&&a.uid===granted.uid);
 const blocks=legalUniversalActions(packs,raid).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocks.includes(wall.uid),false);
 assert.equal(blocks.includes(small.uid),true);
 assert.equal(blocks.includes(null),true);
});

test('BLC-1-053 entry-first raid keeps BLC-4-083 choose-one behind the discard',()=>{
 let raid=phase(fresh(2586),'main');
 fuel(raid);
 readyAp(raid,0,1);
 const base=place(raid,0,'BLC-4-083','front',0);
 const topCard=hold(raid,0,'BLC-1-053');
 raid=play(raid,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid);
 assert.equal(raid.pending.kind,'raid-effect-order');
 raid=play(raid,a=>a.type==='chooseRaidOrder'&&a.mode==='entryFirst');
 assert.equal(raid.pending.kind,'effect-discard');
 assert.equal(raid.pending.remaining,2);
 assert.equal(raid.effectQueue.some(e=>e.op==='chooseOne'&&e.sourceUid===base.uid),true);
 const forged=structuredClone(raid);
 const job=forged.effectQueue.find(e=>e.op==='chooseOne');
 job.options=[{id:'forged',label:'forged',turn:'any',then:[{op:'draw',count:1}]}];
 assert.throws(()=>assertUniversalMatch(packs,forged),/Unproven queued choose-one/);
 const dumped=[raid.players[0].hand[0],raid.players[0].hand[1]];
 raid=play(raid,a=>a.type==='chooseDiscard'&&a.uid===dumped[0].uid);
 raid=play(raid,a=>a.type==='chooseDiscard'&&a.uid===dumped[1].uid);
 assert.equal(raid.pending.kind,'effect-choice-mode');
 assert.equal(raid.pending.options.some(o=>o.id==='block'),true);
 assert.equal(raid.effectQueue.some(e=>e.op==='chooseOne'),false);
});

test('BLC-4-058 needs Renji and BP 5000, then draws only after purple effect AP',()=>{
 let closed=phase(fresh(2558),'main');
 fuel(closed);
 readyAp(closed,0,1);
 place(closed,1,'BLC-4-050','front',0);
 const event=hold(closed,0,'BLC-4-058');
 assert.equal(legalUniversalActions(packs,closed).some(a=>a.type==='event'&&a.uid===event.uid),false);
 place(closed,0,'BLC-4-048','front',0);
 const huge=place(closed,1,'BLC-1-041','front',1);
 huge.buffs=[{bp:2000,untilTurn:closed.turn}];
 assert.equal(universalBp(packs,closed,huge),6000);
 assert.equal(legalUniversalActions(packs,closed).some(a=>a.type==='event'&&a.uid===event.uid),true);
 closed=play(closed,a=>a.type==='event'&&a.uid===event.uid);
 const legal=legalUniversalActions(packs,closed).filter(a=>a.type==='chooseRetireBp').map(a=>a.uid);
 assert.equal(legal.includes(huge.uid),false);
 assert.equal(legal.includes(closed.players[1].front[0].uid),true);
 closed=play(closed,a=>a.type==='chooseRetireBp'&&a.uid===closed.players[1].front[0].uid);
 assert.equal(closed.pending,null);
 let paid=phase(fresh(2559),'main');
 fuel(paid);
 readyAp(paid,0,2);
 const renji=place(paid,0,'BLC-1-047','front',0);
 const target=place(paid,1,'BLC-4-050','front',0);
 paid=play(paid,a=>a.type==='activate'&&a.uid===renji.uid&&a.mode==='oncePay');
 const sword=hold(paid,0,'BLC-4-058');
 const deck=paid.players[0].deck.length;
 paid=play(paid,a=>a.type==='event'&&a.uid===sword.uid);
 paid=play(paid,a=>a.type==='chooseRetireBp'&&a.uid===target.uid);
 assert.equal(paid.pending.kind,'effect-may-draw-discard');
 paid=play(paid,a=>a.type==='chooseMayDrawDiscard'&&a.mode==='draw');
 assert.equal(paid.pending.kind,'effect-discard');
 assert.equal(paid.players[0].deck.length,deck-1);
 const dumped=paid.players[0].hand[0];
 paid=play(paid,a=>a.type==='chooseDiscard'&&a.uid===dumped.uid);
 assert.equal(paid.pending,null);
});

test('BLC-4-054 COLOR deploys an outside purple AP 1 character of energy 2 or less, and BLC-4-058 SPECIAL ignores the event BP cap',()=>{
 assert.deepEqual(pack.cards['BLC-4-054'].triggerEffect,{
  op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true});
 assert.equal(pack.cards['BLC-4-083'].emptyOwnFieldHandEnergyDiscount,2);
 let s=phase(fresh(2554),'attack');
 const attacker=place(s,0,'BLC-4-050','front',0);
 const life=take(s,1,'BLC-4-054');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.push(life);
 const legalOutside=outside(s,1,'BLC-4-048');
 const costly=outside(s,1,'BLC-4-082');
 s=play(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 s=play(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'color');
 const modes=legalUniversalActions(packs,s).filter(a=>a.type==='chooseTrigger');
 assert.equal(modes.some(a=>a.mode==='colorOutside'&&a.uid===legalOutside.uid),true);
 assert.equal(modes.some(a=>a.uid===costly.uid),false);
 s=play(s,a=>a.type==='chooseTrigger'&&a.mode==='colorOutside'&&a.uid===legalOutside.uid);
 assert.equal(s.players[1].front.some(c=>c?.uid===legalOutside.uid&&c.ready),true);
 let special=phase(fresh(2556),'attack');
 const big=place(special,0,'BLC-1-041','front',0);
 big.buffs=[{bp:2000,untilTurn:special.turn}];
 const revealed=take(special,1,'BLC-4-058');
 special.players[1].deck.push(...special.players[1].life.splice(0));
 special.players[1].life.push(revealed);
 special=play(special,a=>a.type==='attack'&&a.uid===big.uid);
 special=play(special,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(special.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,special).some(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===big.uid),true);
 special=play(special,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===big.uid);
 assert.equal(special.players[0].front[0],null);
 assert.equal(special.players[0].outside.some(c=>c.uid===big.uid),true);
});
