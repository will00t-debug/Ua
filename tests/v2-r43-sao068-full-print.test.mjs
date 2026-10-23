import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const pack=registeredV2TitlePack('sword-art-online'),packs=[pack,pack];
const original=SAO_OFFICIAL_CARDS.find(x=>x.id==='SAO-2-068');
const ids=['SAO-1-001','SAO-1-005','SAO-2-035','SAO-2-047','SAO-1-004',
 'SAO-1-019','SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-068',
 'SAO-1-073','SAO-2-016','SAO-2-068'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,id){for(const z of ['hand','deck','life','outside']){
 const arr=s.players[0][z],i=arr.findIndex(c=>c.cardId===id);if(i>=0)return arr.splice(i,1)[0];
 }throw Error('missing '+id)}
function scene(eligible=true){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:43068,first:0});
 const src=take(s,'SAO-2-068'),target=take(s,'SAO-1-068'),payment=take(s,'SAO-2-047');
 src.ready=true;src.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=src;
 s.players[0].hand.push(payment);
 if(eligible)s.players[0].hand.push(target);else s.players[0].outside.push(target);
 for(let i=0;i<4&&s.phase!=='main';i++)s=use(s,{type:'next'});
 return {s,src,target,payment};
}
test('R43 SAO-2-068 source whole main and ACTIVE LIFE pinned',()=>{
 assert.equal(original.number,'EX08BT/SAO-2-068');
 assert.deepEqual([original.energy,original.ap,original.bp,original.gen,original.color,original.trigger],
 [2,1,2000,1,'green','active']);
 for(const piece of ['【レストにする】','【手札を1枚場外に置く】','【このカードを退場させる】',
  '必要エナジーが3以下','消費APが1の緑の〈アスナ〉','BP+1000'])assert.ok(original.effectJa.includes(piece),piece);
 assert.deepEqual(pack.cards['SAO-2-068'].effects,{});
 assert.deepEqual(pack.cards['SAO-2-068'].mainAbility,{
  op:'restDiscardRetireThen',lines:'field',discardCount:1,
  then:[{op:'deployNamedFromZones',name:'アスナ',zones:['hand'],line:'any',
   ready:true,optional:true,color:'green',ap:1,maxEnergy:3,grantBp:1000}]});
});
test('R43 normal MAIN REST+hand discard+retire, then Asuna free ACTIVE and BP1000; UID safe',()=>{
 let {s,src,target,payment}=scene();
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===src.uid&&a.mode==='restDiscardRetire');
 assert.ok(act);s=use(s,act);assert.equal(s.pending?.kind,'main-discard-self-retire');
 assert.equal(s.players[0].energy[0].ready,false);
 const before=structuredClone(s);
 assert.throws(()=>use(s,{type:'chooseMainDiscardRetire',uid:'fake'}),/not currently legal/);
 assert.deepEqual(s,before);
 s=use(s,{type:'chooseMainDiscardRetire',uid:payment.uid});
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 assert.ok(s.players[0].outside.some(c=>c.uid===src.uid));
 assert.ok(s.zoneMoveEvents.some(x=>x.uid===src.uid&&x.reason==='retirement'));
 assert.ok(s.zoneMoveEvents.some(x=>x.uid===payment.uid&&x.reason==='payment'&&x.sourceUid===src.uid));
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseNamedZoneDeploy'&&x.uid===target.uid&&x.line==='front');
 assert.ok(a);const paid=s.players[0].apCards.filter(c=>c.ready).length;
 s=use(s,a);assert.equal(s.players[0].apCards.filter(c=>c.ready).length,paid);
 const live=s.players[0].front[a.slot];assert.equal(live.uid,target.uid);assert.equal(live.ready,true);
 assert.ok(live.buffs.some(x=>x.bp===1000&&x.untilTurn===s.turn));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R43 no eligible hand Asuna still completes true retirement with no free bonus',()=>{
 let {s,src,payment}=scene(false);
 s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===src.uid));
 s=use(s,{type:'chooseMainDiscardRetire',uid:payment.uid});
 assert.equal(s.pending,null);assert.ok(s.players[0].outside.some(c=>c.uid===src.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R43 human/normal/hard share safe MAIN decision, saved pending and hidden hand',()=>{
 let {s,src}=scene();s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===src.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 for(const difficulty of ['easy','normal','hard']){
  const a=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(b=>JSON.stringify(a)===JSON.stringify(b)));
 }
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});

test('R43 printed ACTIVE LIFE remains separate from MAIN payment, acts on own field',()=>{
 let {s,src}=scene();
 // A second physical copy leaves LIFE as the trigger source; it never
 // activates or pays the printed MAIN cost.
 const lifeCopy=take(s,'SAO-2-068');s.players[0].outside.push(lifeCopy);
 src.ready=false;
 s.pending={kind:'life-trigger',player:0,uid:lifeCopy.uid,trigger:'active'};
 const a=legalUniversalActions(packs,s).find(x=>x.type==='chooseTrigger'&&
  x.mode==='active'&&x.uid===src.uid);
 assert.ok(a,'ACTIVE LIFE must offer a real own field target');
 const outside=s.players[0].outside.length;
 s=use(s,a);
 const current=s.players[0].energy[0];
 assert.equal(current.uid,src.uid);assert.equal(current.ready,true);
 assert.ok(current.buffs.some(x=>x.bp===3000&&x.untilTurn===s.turn));
 assert.equal(s.players[0].outside.length,outside);
 assert.equal(assertUniversalMatch(packs,s),true);
});
