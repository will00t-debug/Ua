import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// UA15BT/SAO-1-038 and UA15BT/SAO-1-072 checked 2026-10-22.
// Both print 【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）.
// 038: 青1 / AP1 / BP2500 / アインクラッド / 発生青 / no trigger.
// 072: 緑3 / AP1 / BP3500 / ALO / 発生緑 / DRAW 「カードを1枚引く。」
// Q79: designate the blocker, rest it, then set it ACTIVE.
// Q80: if the first battle is lost, ACTIVE happens before the battle, so it leaves ACTIVE.
// https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AD%E3%83%BC%E3%83%AF%E3%83%BC%E3%83%89%E5%8A%B9%E6%9E%9C&sub_category=2%E5%9B%9E%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF
// No FAQ was found that clears the count when the same UID leaves and re-enters.
// The printed 「このキャラがこのターン」 keeps that UID's block count.
// Outside storage normalizes ready to false; Q80's ACTIVE state is observed
// while a protected leave is still on the field.

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const packs=[mst,sao];
function deck(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const foreign=deck(mst,['MST-1-016','MST-1-001','MST-1-002','MST-1-010']);
const home=deck(sao,['SAO-1-038','SAO-1-072']);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index){
 const c=take(s,p,id);c.ready=true;s.players[p][line][index]=c;return c;
}
function toPhase(s,phase){
 for(let n=0;n<8&&s.phase!==phase;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,phase);
 return s;
}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy,...s.players[1].front,...s.players[1].energy]
  .find(c=>c?.uid===uid);
}
function advance(s){
 const legal=legalUniversalActions(packs,s);
 const next=legal.find(a=>a.type==='next');
 if(next)return dispatchUniversalAction(packs,s,next);
 const actor=s.pending?.player;
 const choice=legal.find(a=>a.type==='chooseHandLimit')
  ||legal.find(a=>a.type==='chooseTrigger'&&a.mode==='skip')
  ||legal.find(a=>a.type==='chooseBlock'&&a.uid===null)
  ||legal[0];
 return dispatchUniversalAction(packs,s,choice,actor===undefined?{}:{actor});
}
function open(seed=1038){
 let s=newUniversalMatch(packs,{decks:[foreign,home],seed,first:0});
 const a=put(s,1,'SAO-1-038','front',0);
 const b=put(s,1,'SAO-1-038','front',1);
 const small=put(s,0,'MST-1-016','front',0);
 const mid=put(s,0,'MST-1-001','front',1);
 const taller=put(s,0,'MST-1-002','front',2);
 s=toPhase(s,'attack');
 return {s,a:a.uid,b:b.uid,small:small.uid,mid:mid.uid,taller:taller.uid};
}
function attack(s,uid){
 s=dispatchUniversalAction(packs,s,{type:'attack',uid});
 assert.equal(s.pending.kind,'block');
 return s;
}

test('SAO-1-038 and SAO-1-072 are the printed first-block ACTIVE keyword',()=>{
 for(const [id,name,color,energy,bp,trait,trigger,effect] of [
  ['SAO-1-038','エギル','blue',1,2500,'アインクラッド',null,
   '【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）'],
  ['SAO-1-072','クライン','green',3,3500,'ALO','draw',
   '【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）']
 ]){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id&&c.number.startsWith(id==='SAO-1-038'?'UA15BT':'UA15BT'));
  assert.equal(source.nameJa,name);
  assert.equal(source.effectJa,effect);
  assert.equal(source.gen,1);
  const card=sao.cards[id];
  assert.equal(card.readyOnBlockCount,1);
  assert.equal(card.readyOnAttackCount,0);
  assert.deepEqual(card.effects,{});
  assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.traits],
   [color,energy,1,bp,1,trigger,[trait]]);
  assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes(id));
 }
 assert.throws(()=>createUniversalPack({id:'bad-block',cards:[{
  id:'C',name:'C',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',readyOnBlockCount:2}]}),/invalid ready-on-block count/);
});

test('each physical blocker readies once, a second block stays rested, and AI cannot select it again',()=>{
 let {s,a,b,small,mid,taller}=open();
 s=attack(s,small);
 assert.ok(legalUniversalActions(packs,s).some(x=>x.type==='chooseBlock'&&x.uid===a));
 const ai=chooseUniversalAiAction(packs,s,'hard');
 assert.equal(ai.type,'chooseBlock');
 assert.ok(ai.uid===null||[a,b].includes(ai.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:a},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(live(s,a).ready,true,'Q79 sets ACTIVE after the block rest and before battle');
 assert.equal(s.blocksByUid[a],1);
 assert.equal(s.attacksByUid[a],undefined);
 assert.equal(s.blocksByUid[small],undefined);
 s=attack(s,mid);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:a},{actor:1});
 assert.equal(live(s,a).ready,false);
 assert.equal(s.blocksByUid[a],2);
 s=attack(s,taller);
 assert.equal(legalUniversalActions(packs,s).some(x=>x.uid===a),false);
 const blocked=chooseUniversalAiAction(packs,s,'normal');
 assert.notEqual(blocked.uid,a);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:b},{actor:1});
 assert.equal(live(s,b).ready,true);
 assert.equal(s.blocksByUid[b],1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('silence, skip-next-active and cannot-active suppress the printed block recovery',()=>{
 let {s,a,small}=open(1039);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:small,
  targetUid:a,until:{player:1,phase:'attack',edge:'end'}});
 s=attack(s,small);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:a},{actor:1});
 assert.equal(live(s,a).ready,false);

 let skipped=open(1040);
 grantContinuousState(skipped.s,{kind:'skipNextActive',controller:0,sourceUid:skipped.small,
  targetUid:skipped.a});
 skipped.s=attack(skipped.s,skipped.small);
 skipped.s=dispatchUniversalAction(packs,skipped.s,{type:'chooseBlock',uid:skipped.a},{actor:1});
 assert.equal(live(skipped.s,skipped.a).ready,false);

 let locked=open(1041);
 grantContinuousState(locked.s,{kind:'cannotActive',controller:0,sourceUid:locked.small,
  targetUid:locked.a,until:{player:1,phase:'attack',edge:'end'}});
 locked.s=attack(locked.s,locked.small);
 locked.s=dispatchUniversalAction(packs,locked.s,{type:'chooseBlock',uid:locked.a},{actor:1});
 assert.equal(live(locked.s,locked.a).ready,false);
});

test('the next turn clears block counts, and the same UID keeps its count after re-entry',()=>{
 let {s,a,small,mid}=open(1042);
 s=attack(s,small);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:a},{actor:1});
 assert.equal(s.blocksByUid[a],1);
 const played=s.turn;
 for(let n=0;n<24&&!(s.active===0&&s.phase==='attack'&&s.turn>played);n++)s=advance(s);
 assert.equal(s.blocksByUid[a],undefined);
 assert.equal(live(s,a).ready,true);
 s=attack(s,mid);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:a},{actor:1});
 assert.equal(live(s,a).ready,true);
 assert.equal(s.blocksByUid[a],1);

 let again=open(1043);
 again.s=attack(again.s,again.small);
 again.s=dispatchUniversalAction(packs,again.s,{type:'chooseBlock',uid:again.a},{actor:1});
 const card=live(again.s,again.a);
 const slot=again.s.players[1].front.findIndex(c=>c?.uid===again.a);
 again.s.players[1].front[slot]=null;
 card.fieldEntryStamp=(again.s.nextFieldEntryStamp++);
 again.s.players[1].front[slot]=card;
 again.s=attack(again.s,again.mid);
 again.s=dispatchUniversalAction(packs,again.s,{type:'chooseBlock',uid:again.a},{actor:1});
 assert.equal(again.s.blocksByUid[again.a],2);
 assert.equal(live(again.s,again.a).ready,false);
});

test('SAO-1-072 DRAW life trigger draws one and does not change the block keyword',()=>{
 let s=newUniversalMatch(packs,{decks:[foreign,home],seed:1072,first:0});
 const attacker=put(s,0,'MST-1-010','front',0);
 const life=take(s,1,'SAO-1-072');
 s.players[1].life.unshift(life);
 const before=s.players[1].hand.length;
 s=toPhase(s,'attack');
 s=attack(s,attacker.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'draw');
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.players[1].hand.length,before+1);
 assert.ok(s.players[1].outside.some(c=>c.uid===life.uid));
 assert.equal(sao.cards['SAO-1-072'].readyOnBlockCount,1);
});

function unit(id,extra){
 return {id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,
  implementation:'dsl',effects:{},readyOnBlockCount:1,...extra};
}
const lab=createUniversalPack({id:'block-lab',cards:[
 unit('RIDER',{name:'Rider',raidName:'Base',bp:5000}),
 unit('BASE',{name:'Base',implementation:'vanilla',readyOnBlockCount:undefined,bp:1000}),
 unit('WEAK',{bp:500,conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:100},
  raidName:'Base'}),
 unit('BIG',{implementation:'vanilla',readyOnBlockCount:undefined,bp:4000}),
 ...['F1','F2','F3','F4','F5','F6','F7','F8','F9'].map(id=>
  unit(id,{implementation:'vanilla',readyOnBlockCount:undefined}))
]});
const labIds=['RIDER','BASE','WEAK','BIG','F1','F2','F3','F4','F5','F6','F7','F8','F9'];
const labDeck=Object.fromEntries(labIds.map((id,i)=>[id,i===12?2:4]));
function labTake(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error(id);
}

test('a raid top counts separately, and a lost first block is ACTIVE before the protected leave',()=>{
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed:80,first:0});
 s=dispatchUniversalAction(lab,s,{type:'next'});
 s=dispatchUniversalAction(lab,s,{type:'next'});
 const base=labTake(s,1,'BASE');
 const rider=labTake(s,1,'RIDER');
 rider.ready=true;rider.stack=[base];s.players[1].front[0]=rider;
 const big=labTake(s,0,'BIG');big.ready=true;s.players[0].front[0]=big;
 const big2=labTake(s,0,'BIG');big2.ready=true;s.players[0].front[1]=big2;
 s=dispatchUniversalAction(lab,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(lab,s,{type:'attack',uid:big.uid});
 s=dispatchUniversalAction(lab,s,{type:'chooseBlock',uid:rider.uid},{actor:1});
 assert.equal(s.players[1].front[0].ready,true);
 assert.equal(s.blocksByUid[rider.uid],1);
 assert.equal(s.blocksByUid[base.uid],undefined);
 s=dispatchUniversalAction(lab,s,{type:'attack',uid:big2.uid});
 assert.equal(legalUniversalActions(lab,s).some(a=>a.uid===rider.uid),true,'the first block left it ACTIVE');
 s=dispatchUniversalAction(lab,s,{type:'chooseBlock',uid:rider.uid},{actor:1});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.blocksByUid[base.uid],undefined);

 let lost=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed:81,first:0});
 lost=dispatchUniversalAction(lab,lost,{type:'next'});
 lost=dispatchUniversalAction(lab,lost,{type:'next'});
 const weak=labTake(lost,1,'WEAK');weak.ready=true;
 const hidden=labTake(lost,1,'F1');hidden.faceDown=true;weak.under=[hidden];
 lost.players[1].front[0]=weak;
 const hammer=labTake(lost,0,'BIG');hammer.ready=true;lost.players[0].front[0]=hammer;
 lost=dispatchUniversalAction(lab,lost,{type:'next'});
 lost=dispatchUniversalAction(lab,lost,{type:'attack',uid:hammer.uid});
 lost=dispatchUniversalAction(lab,lost,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.equal(lost.pending.kind,'leave-replacement');
 assert.equal(lost.players[1].front[0].uid,weak.uid);
 assert.equal(lost.players[1].front[0].ready,true,'Q80 sets ACTIVE before the losing battle');
 assert.equal(assertUniversalMatch(lab,lost),true);
});
