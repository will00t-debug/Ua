import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {effectChoiceProtected,expireContinuousStates} from '../dist/universal-v2/continuous-states.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const print=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-060');
const pack=registeredV2TitlePack('sword-art-online'),packs=[pack,pack];
const profile=[
 {op:'recoverOutsideOne',filter:{field:'type',value:'character'},optional:true},
 {op:'deployOwnHandSpecial',type:'character',color:'purple',ap:1,
  trait:'SAOサバイバー',maxEnergy:null,ready:true,max:1,protectionScope:'character'}];
const independent=createUniversalPack({id:'sao-audit',cards:[{
 id:'SAO-2-060',name:'smile for you',type:'event',color:'purple',
 energy:4,ap:1,bp:0,gen:0,traits:['歌'],trigger:'special',
 implementation:'dsl',effects:{onPlay:profile},triggerEffect:{op:'retireOppFront'} }]});
assert.deepEqual(pack.cards['SAO-2-060'].effects.onPlay,independent.cards['SAO-2-060'].effects.onPlay);
assert.deepEqual(pack.cards['SAO-2-060'].triggerEffect,{op:'retireOppFront'});
const ids=['SAO-1-001','SAO-1-005','SAO-2-035','SAO-2-047','SAO-1-004',
 'SAO-1-019','SAO-1-020','SAO-1-051','SAO-2-034','SAO-1-068',
 'SAO-1-073','SAO-2-016','SAO-2-060'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
const foe={...deck};delete foe['SAO-2-060'];foe['SAO-1-077']=2;
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
assert.deepEqual(validateUniversalDeck(pack,foe),[]);
const run=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const i=s.players[p][zone].findIndex(x=>x.cardId===id);
  if(i>=0)return s.players[p][zone].splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function scene({withAnyRecoveries=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,foe],seed:41060,first:0});
 const event=take(s,0,'SAO-2-060'),rec=take(s,0,'SAO-2-035'),hand=take(s,0,'SAO-2-034');
 s.players[0].hand.push(event,hand);s.players[0].outside.push(rec);
 if(withAnyRecoveries)s.players[0].outside.push(take(s,0,'SAO-2-047'),take(s,0,'SAO-1-068'));

 place(s,0,'SAO-2-035','energy',0);
 place(s,0,'SAO-2-035','energy',1);
 place(s,0,'SAO-2-047','energy',2);
 place(s,0,'SAO-2-047','energy',3);
 s=run(s,{type:'next'});s=run(s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play,'printed energy 4/AP1 EVENT is legally paid');
 const paid=s.players[0].apCards.filter(c=>c.ready).length;
 s=run(s,play);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,paid-1);
 assert.equal(s.pending?.kind,'effect-recover-outside');
 return {s,event,rec,hand};
}
test('R41 SAO-2-060 official complete Japanese print/Q1207 and typed SPECIAL',()=>{
 assert.equal(print.number,'EX08BT/SAO-2-060');
 assert.deepEqual([print.type,print.color,print.energy,print.ap,print.trigger],['event','purple',4,1,'special']);
 assert.deepEqual(print.traits,['歌']);
 for(const part of ['場外からキャラカードを1枚まで','SAOサバイバー','相手のキャラの効果で選ばれない'])
  assert.ok(print.effectJa.includes(part));
});
test('R41 recovers and freely ACTIVE deploys the identical physical UID; only one AP paid',()=>{
 let {s,event,rec}=scene();
 s=run(s,{type:'chooseOutsideRecovery',uid:rec.uid});
 const act=legalUniversalActions(packs,s).find(a=>a.type==='chooseHandRest'&&a.uid===rec.uid&&a.line==='front');
 assert.ok(act);
 const paid=s.players[0].apCards.filter(x=>x.ready).length;
 s=run(s,act);
 assert.ok(s.players[0].front.some(c=>c?.uid===rec.uid&&c.ready));
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,paid);
 assert.equal(s.pending,null);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===rec.uid&&e.sourceUid===event.uid&&e.from==='outside'&&e.to==='hand'));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===rec.uid&&e.sourceUid===event.uid&&e.from==='hand'&&e.to==='front'));
 assert.ok(s.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'&&e.targetUid===rec.uid&&e.selectionScope==='character'));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R41 declining recovery does not disable independent optional deploy, and both may decline',()=>{
 let {s,hand}=scene();s=run(s,{type:'chooseOutsideRecovery',uid:null});
 assert.equal(s.pending?.kind,'effect-hand-rest');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseHandRest'&&a.uid===hand.uid));
 s=run(s,{type:'chooseHandRest',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.continuousStates.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R41 recovers A, ACTIVE deploys already-in-hand B; source-linked actual UID grant',()=>{
 let {s,rec,hand}=scene();s=run(s,{type:'chooseOutsideRecovery',uid:rec.uid});
 const act=legalUniversalActions(packs,s).find(a=>a.type==='chooseHandRest'&&a.uid===hand.uid&&a.line==='front');
 assert.ok(act);
 s=run(s,act);
 assert.ok(s.players[0].hand.some(c=>c.uid===rec.uid));
 assert.ok(s.players[0].front.some(c=>c?.uid===hand.uid&&c.ready));
 assert.ok(s.continuousStates.some(e=>e.targetUid===hand.uid&&e.selectionScope==='character'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R41 first recovery has no unprinted trait/color restriction; second enforces printed trait',()=>{
 let {s,hand}=scene({withAnyRecoveries:true});
 const wrongTrait=s.players[0].outside.find(c=>c.cardId==='SAO-2-047');
 const green=s.players[0].outside.find(c=>c.cardId==='SAO-1-068');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseOutsideRecovery'&&a.uid===wrongTrait.uid));
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseOutsideRecovery'&&a.uid===green.uid));
 s=run(s,{type:'chooseOutsideRecovery',uid:wrongTrait.uid});
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='chooseHandRest'&&a.uid===wrongTrait.uid));
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseHandRest'&&a.uid===hand.uid));
 const saved=structuredClone(s);
 assert.throws(()=>run(s,{type:'chooseHandRest',uid:wrongTrait.uid,line:'front',slot:0}),/not currently legal/);
 assert.deepEqual(s,saved);
});
test('R41 Q1207 only opponent CHARACTER choices, own and EVENT still legal; expiry stamp',()=>{
 let {s,rec}=scene();s=run(s,{type:'chooseOutsideRecovery',uid:rec.uid});
 const act=legalUniversalActions(packs,s).find(a=>a.type==='chooseHandRest'&&a.uid===rec.uid&&a.line==='front');
 s=run(s,act);
 assert.equal(effectChoiceProtected(s,1,rec.uid,'character'),true);
 assert.equal(effectChoiceProtected(s,1,rec.uid,'event'),false);
 assert.equal(effectChoiceProtected(s,1,rec.uid,'trigger'),false);
 assert.equal(effectChoiceProtected(s,0,rec.uid,'character'),false);
 assert.equal(s.continuousStates.find(e=>e.targetUid===rec.uid).targetStamp,
  s.players[0].front[act.slot].fieldEntryStamp);
 expireContinuousStates(s,{player:1,phase:'start',edge:'start'});
 assert.equal(effectChoiceProtected(s,1,rec.uid,'character'),true);
 expireContinuousStates(s,{player:0,phase:'start',edge:'start'});
 assert.equal(effectChoiceProtected(s,1,rec.uid,'character'),false);
});
test('R41 independent SPECIAL LIFE genuinely retires one opponent FRONT target',()=>{
 let {s,event}=scene();
 s=run(s,{type:'chooseOutsideRecovery',uid:null});
 s=run(s,{type:'chooseHandRest',uid:null});
 const target=place(s,1,'SAO-1-001','front',0);
 s.pending={kind:'life-trigger',player:0,uid:event.uid,trigger:'special'};
 const act=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===target.uid);
 assert.ok(act);
 s=run(s,act);
 assert.ok(s.players[1].outside.some(c=>c.uid===target.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R41 AI shared legal actions, owner-private hand and invalid UID atomicity',()=>{
 let {s,rec}=scene();s=run(s,{type:'chooseOutsideRecovery',uid:rec.uid});
 const before=structuredClone(s);
 assert.throws(()=>run(s,{type:'chooseHandRest',uid:'0-forged',line:'front',slot:0}),/not currently legal/);
 assert.deepEqual(s,before);
 for(const difficulty of ['easy','normal','hard']){
  const action=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 }
 assert.ok(universalPrivateChoices(packs,s,0).options.some(x=>x.action.uid===rec.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
