import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalAttackDamage,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// Synthetic cards. They lock the shared keywords; they are not registry cards.
// 【インパクト（1）】 deals 1 life only when the attack wins a battle.
// 【ダメージ（2）】 replaces direct, unblocked attack damage and does not
// deal life damage when the attack is blocked.
const cards=Array.from({length:13},(_,i)=>({
 id:'K'+i,name:'K'+i,color:'red',type:'character',energy:0,ap:1,
 bp:i===0?3000:i===1?2000:1000,gen:1,implementation:'vanilla'
}));
cards[0]={...cards[0],implementation:'dsl',effects:{},printedImpact:1};
cards[1]={...cards[1],implementation:'dsl',effects:{},printedAttackDamage:2};
cards[2]={...cards[2],implementation:'dsl',effects:{},impactNull:true};
cards[3]={...cards[3],trigger:'draw'};
cards[4]={...cards[4],trigger:'get'};
const pack=createUniversalPack({id:'printed-keywords-r12',cards});
const packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function ready(s){
 for(let n=0;n<4&&s.phase!=='attack';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'attack');
 return s;
}
function board(seed){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
 const impact=take(s,0,'K0'),damage=take(s,0,'K1'),wall=take(s,1,'K2'),weak=take(s,1,'K5');
 impact.ready=true;damage.ready=true;wall.ready=true;weak.ready=true;
 s.players[0].front[0]=impact;s.players[0].front[1]=damage;
 s.players[1].front[0]=wall;s.players[1].front[1]=weak;
 const first=take(s,1,'K3'),second=take(s,1,'K4');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.unshift(first,second);
 s=ready(s);
 return {s,impact,damage,wall,weak,first,second};
}

test('printed impact deals one life only after winning the battle',()=>{
 let {s,impact,weak,first}=board(1209);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:impact.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.ok(s.players[1].outside.some(c=>c.uid===weak.uid));
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,first.uid);
 assert.equal(s.players[1].life.length,lives-1);
 assert.equal(s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].life.length,lives-1);
 assert.equal(s.publicReveals.length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('printed impact is one direct damage when unblocked and zero against impact null',()=>{
 let {s,impact,wall,first}=board(1210);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:impact.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.uid,first.uid);
 assert.equal(s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.players[1].life.length,lives-1);
 let blocked=board(1211);
 const before=blocked.s.players[1].life.length;
 blocked.s=dispatchUniversalAction(packs,blocked.s,{type:'attack',uid:blocked.impact.uid});
 blocked.s=dispatchUniversalAction(packs,blocked.s,{type:'chooseBlock',uid:blocked.wall.uid},{actor:1});
 assert.ok(blocked.s.players[1].outside.some(c=>c.uid===blocked.wall.uid));
 assert.equal(blocked.s.pending,null);
 assert.equal(blocked.s.players[1].life.length,before);
 assert.equal(blocked.s.publicReveals.length,0);
 assert.equal(assertUniversalMatch(packs,blocked.s),true);
});

test('printed damage 2 reveals both LIFE together then orders actual physical triggers',()=>{
 let {s,damage,first,second}=board(1202);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[1]),2);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:damage.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-batch-order');
 assert.deepEqual(s.publicReveals.map(e=>e.uid),[first.uid,second.uid]);
 assert.deepEqual(s.players[1].lifeRevealed.map(c=>c.uid),[first.uid,second.uid]);
 assert.equal(s.players[1].life.length,lives-2);
 assert.equal(s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:first.uid},{actor:1});
 assert.equal(s.pending?.uid,first.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,second.uid);
 assert.equal(s.players[1].life.length,lives-2);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.publicReveals.length,2);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(s.lifeRevealBatch,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('printed damage 2 does not deal life damage when the attack is blocked',()=>{
 let {s,damage,weak}=board(1203);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:damage.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.ok(s.players[1].outside.some(c=>c.uid===weak.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[1].life.length,lives);
 assert.equal(s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('losing original effects removes printed impact and damage 2',()=>{
 let {s,impact,damage,weak}=board(1204);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:impact.uid,targetUid:impact.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:damage.uid,targetUid:damage.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalAttackDamage(packs,s,damage),1);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:impact.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].life.length,lives);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('printed keyword schema rejects un-audited values and vanilla claims',()=>{
 const base={id:'Z',name:'Z',color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-impact',cards:[{...base,printedImpact:2}]}),/invalid printed impact/);
 assert.throws(()=>createUniversalPack({id:'bad-damage',cards:[{...base,printedAttackDamage:3}]}),/invalid printed attack damage/);
 assert.throws(()=>createUniversalPack({id:'bad-event',cards:[{...base,type:'event',bp:0,gen:0,printedImpact:1}]}),/invalid printed impact/);
 assert.throws(()=>createUniversalPack({id:'bad-stack',cards:[{...base,raidName:'Z',printedImpact:1,
  conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:5000}}]}),/invalid printed impact/);
 assert.throws(()=>createUniversalPack({id:'bad-vanilla',cards:[{...base,implementation:'vanilla',printedAttackDamage:2}]}),/vanilla/);
});
