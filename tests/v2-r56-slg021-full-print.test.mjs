import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck,createUniversalPack} from '../dist/universal-v2/pack.mjs';

const pack=registeredV2TitlePack('solo-leveling'),both=[pack,pack];
const ids=['SLG-1-021','SLG-1-015','SLG-1-030','SLG-1-028',
 'SLG-1-008','SLG-1-009','SLG-1-010','SLG-1-012','SLG-1-016',
 'SLG-1-014','SLG-1-037','SLG-1-045','SLG-1-052'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing owned printed '+id);
}
function scene(n=10){
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:562100+n});
 const actor=take(s,0,'SLG-1-021');actor.ready=true;
 actor.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=actor;
 const outsideIds=['SLG-1-030','SLG-1-012','SLG-1-045',
  'SLG-1-052','SLG-1-009','SLG-1-014'];
 const moved=[];
 for(const id of outsideIds)for(let i=0;i<(id==='SLG-1-052'?2:4);i++){
  if(moved.length>=n)break;
  moved.push(take(s,0,id));
 }
 assert.equal(moved.length,n);
 s.players[0].outside.push(...moved);
 const defender=take(s,1,'SLG-1-021');
 defender.ready=true;defender.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=defender;
 return {s,actor,defender};
}
test('R56 official SLG-1-021 all-print and Q2028 proof; dynamic BP and original-BP recovery',()=>{
 const original=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-021');
 assert.equal(original.nameJa,'水篠 旬');
 assert.deepEqual([original.color,original.energy,original.ap,original.bp,original.gen,original.trigger],
  ['purple',5,1,4000,1,'raid']);
 for(const t of ['BP達6000','場外每5張','戰鬥獲勝','必須阻擋'])assert.ok(original.effect.includes(t));
 const c=pack.cards[original.id];
 assert.equal(c.raidName,'水篠 旬');
 assert.equal(c.conditionalImpactBpAtLeast,6000);
 assert.deepEqual(c.attackWinRecover,{basePrintedBp:2000,unit:5,
  bpPerGroup:500,excludeName:'水篠 旬'});
 assert.deepEqual(c.effects.onPlay,[{op:'grantSelfMustBlockThisTurn'}]);
 assert.deepEqual(c.effects.onAttack,[{op:'buffSelfPerOwnOutsideGroups',unit:5,bpPerGroup:500}]);
});
test('R56 9/10/19/20 outside physical counts: 5-card BP step and live IMPACT threshold',()=>{
 for(const n of [9,10,19,20]){
  let {s,actor}=scene(n);
  assert.equal(universalBp(both,s,actor),4000);
  assert.equal(universalImpact(both,s,actor),0);
  s=use(s,{type:'next'});s=use(s,{type:'next'});s=use(s,{type:'next'});
  s=use(s,{type:'attack',uid:actor.uid});
  assert.equal(s.pending?.kind,'block');
  assert.equal(universalBp(both,s,s.players[0].front[0]),4000+Math.floor(n/5)*500);
  assert.equal(universalImpact(both,s,s.players[0].front[0]),n>=20?1:0);
 }
});
test('R56 real battle victory: original BP scaling, own-zone UID, excluded printed name',()=>{
 let {s,actor,defender}=scene(10);
 s=use(s,{type:'next'});s=use(s,{type:'next'});s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:actor.uid});
 s=use(s,{type:'chooseBlock',uid:defender.uid});
 assert.equal(s.pending?.kind,'effect-recover-outside');
 assert.equal(s.pending.printedBpLimit,3000);
 const actions=legalUniversalActions(both,s);
 assert.ok(actions.some(a=>a.type==='chooseOutsideRecovery'&&a.uid===null));
 const selected=s.players[0].outside.find(c=>c.cardId==='SLG-1-012');
 assert.ok(actions.some(a=>a.uid===selected.uid));
 assert.ok(!actions.some(a=>a.uid===s.players[0].outside.find(c=>c.cardId==='SLG-1-030')?.uid&&a.type!=='chooseOutsideRecovery'));
 const before=s.players[0].hand.length;
 s=use(s,{type:'chooseOutsideRecovery',uid:selected.uid});
 assert.equal(s.players[0].hand.length,before+1);
 assert.ok(s.players[0].hand.some(c=>c.uid===selected.uid));
 assert.equal(assertUniversalMatch(both,structuredClone(s)),true);
});
test('R56 direct LIFE is never an attacking character battle victory recovery',()=>{
 let {s,actor}=scene(10);s.players[1].front[0].ready=false;
 s=use(s,{type:'next'});s=use(s,{type:'next'});s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:actor.uid});
 s=use(s,{type:'chooseBlock',uid:null});
 assert.ok(s.pending?.kind!=='effect-recover-outside');
});
test('R56 true paid RAID entry earns the printed unconditional must BLOCK grant',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:562188});
 const base=take(s,0,'SLG-1-015');base.ready=true;
 base.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=base;
 for(const [i,id] of ['SLG-1-012','SLG-1-016','SLG-1-015'].entries()){
  const card=take(s,0,id);card.ready=true;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=card;
 }
 const boss=take(s,0,'SLG-1-021');s.players[0].hand.push(boss);
 const blocker=take(s,1,'SLG-1-015');blocker.ready=true;
 blocker.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].front[0]=blocker;
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 const act=legalUniversalActions(both,s).find(a=>
  a.type==='raid'&&a.uid===boss.uid&&a.baseUid===base.uid);
 assert.ok(act,'paid legal Raid was selectable');
 s=use(s,act);
 const top=s.players[0].front.find(c=>c?.uid===boss.uid);
 assert.deepEqual(top.mustBlockGranted,{turn:s.turn,stamp:top.fieldEntryStamp});
 assert.equal(top.ready,true);
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:boss.uid});
 assert.deepEqual(legalUniversalActions(both,s),[{type:'chooseBlock',uid:blocker.uid}]);
});
test('R56 invalid shared threshold/recovery schema fails closed',()=>{

 const d=pack.cards['SLG-1-021'];
 for(const bad of [
  {...d,conditionalImpactBpAtLeast:-1},
  {...d,attackWinRecover:{basePrintedBp:2000,unit:0,bpPerGroup:500,excludeName:'水篠 旬'}},
  {...d,attackWinRecover:{basePrintedBp:2000,unit:5,bpPerGroup:500,excludeName:'水篠 旬',fake:true}}
 ])assert.throws(()=>createUniversalPack({id:'bad',cards:[bad]}));
});
