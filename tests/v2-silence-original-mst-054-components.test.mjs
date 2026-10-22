import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {grantContinuousState,pruneContinuousStates,stampFieldInstance,originalEffectsDisabled,
 attemptFieldActive} from '../dist/universal-v2/continuous-states.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalPublicView,
 universalBp,universalCardEnergy,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const base=Array.from({length:13},(_,i)=>({id:'S'+i,name:'Test '+i,color:'green',
 type:'character',energy:0,ap:1,bp:2000,gen:i===0?4:1,implementation:'vanilla'}));
base[1]={...base[1],implementation:'dsl',energy:2,
 templateEffects:{onPlay:[{template:'restSilenceOppFrontIfOwnOutsideField',optional:true}]}};
base[2]={...base[2],implementation:'dsl',type:'event',bp:0,gen:0,
 templateEffects:{onPlay:[{template:'restOrRetireEnemyFrontByOwnLife',bp:5000,lifeAtMost:4,optional:false}]}};
base[3]={...base[3],name:'Field',type:'field',bp:0,gen:1};
base[5]={...base[5],opponentTurnBp:1000,implementation:'dsl',
 effects:{onRetire:[{op:'draw',count:1}]}};
base[6]={...base[6],activeExtraEnergy:1,implementation:'dsl',energy:1,
 mainAbility:{op:'discardHandBuffSelf',discardCount:1,bp:1000,oncePerTurn:true}};
base[9]={...base[9],name:'Raider',raidName:'Test 5',trigger:'raid'};
const packs=['silence-left','silence-right'].map(id=>createUniversalPack({id,cards:base}));
const counts=Object.fromEntries(base.slice(0,12).map(c=>[c.id,4]));counts.S12=2;
function match(){return newUniversalMatch(packs,{decks:[counts,counts],seed:480,first:0});}
function take(s,p,id){
 for(const z of ['deck','hand','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Card missing: '+id);
}
function place(s,p,id,line='front',slot=0,ready=true){
 const c=take(s,p,id);c.ready=ready;stampFieldInstance(s,c);s.players[p][line][slot]=c;return c;
}
function resolveSilence({hasField=true,decline=false}={}){
 let s=match();
 place(s,0,'S0','energy',0,false);
 const source=take(s,0,'S1');s.players[0].hand.push(source);
 const target=place(s,1,'S5','front',0,true);
 target.buffs.push({bp:500,untilTurn:s.turn});
 if(hasField)s.players[0].outside.push(take(s,0,'S3'));
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 if(!hasField)return {s,target:s.players[1].front[0],source:s.players[0].front[0]};
 assert.equal(s.pending?.kind,'effect-rest-bp');
 const opts=legalUniversalActions(packs,s);
 assert.deepEqual(opts,[{type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:target.uid}]);
 assert.ok(opts.some(x=>JSON.stringify(x)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty:'normal'}))));
 assert.ok(opts.some(x=>JSON.stringify(x)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty:'hard'}))));
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:decline?null:target.uid});
 return {s,target:s.players[1].front[0],source:s.players[0].front[0]};
}
test('source-gated original ability loss is optional and only reads own OUTSIDE FIELD cards',()=>{
 for(const [hasField,decline,expected] of [[false,false,0],[true,true,0],[true,false,2]]){
  const {s,target}=resolveSilence({hasField,decline});
  assert.equal(s.continuousStates.length,expected);
  assert.equal(originalEffectsDisabled(s,target),expected===2);
  assert.equal(s.players[1].front[0].ready,expected===0);
  assert.equal(universalBp(packs,s,target),expected?2500:3500);
  if(expected){
   assert.deepEqual(universalPublicView(packs,s,0).players[1].front[0].restrictions.map(x=>x.kind),
    ['cannotActive','originalEffectsDisabled']);
  }
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('until next opponent ATTACK end, preserve external buffs until normal expiry and prohibit ACTIVE',()=>{
 let {s,target}=resolveSilence();
 assert.equal(attemptFieldActive(s,1,target),false);
 assert.equal(target.buffs[0].bp,500,'original silence never clears granted buff');
 s=dispatchUniversalAction(packs,s,{type:'next'}); // controller MAIN -> ATTACK
 s=dispatchUniversalAction(packs,s,{type:'next'}); // controller ATTACK -> opponent START
 assert.equal(s.active,1);
 assert.equal(s.players[1].front[0].ready,false,'own start refresh prohibited');
 assert.equal(s.continuousStates.length,2);
 for(let i=0;i<4;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);assert.equal(s.continuousStates.length,0);
 assert.equal(s.players[1].front[0].ready,false,'expiring lock is NOT itself an ACTIVE attempt');
 assert.equal(universalBp(packs,s,s.players[1].front[0]),3000,'printed opponent BP returns after expiry');
 assert.equal(s.players[1].front[0].buffs.length,0,'one-turn granted buff expired by normal turn progression');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('silenced printed onRetire does not queue a draw (official Q2220)',()=>{
 for(const disabled of [true,false]){
  let s=match(),source=place(s,0,'S0','energy',0,false);
  const victim=place(s,1,'S5','front',0,true),hand=s.players[1].hand.length;
  const e=take(s,0,'S2');s.players[0].hand.push(e);
  s.players[0].outside.push(...s.players[0].life.splice(4));
  if(disabled)grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
   sourceUid:source.uid,targetUid:victim.uid,until:{player:1,phase:'attack',edge:'end'}});
  s=dispatchUniversalAction(packs,s,{type:'next'});
  s=dispatchUniversalAction(packs,s,{type:'next'});
  const evt=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===e.uid);
  assert.ok(evt);s=dispatchUniversalAction(packs,s,evt);
  s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:victim.uid});
  assert.equal(s.players[1].front[0],null);
  assert.equal(s.players[1].hand.length,hand+(disabled?0:1));
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('Raid transformation discards target incarnation statuses, no inherited lock/false onRetire',()=>{
 let {s,target}=resolveSilence();
 const oldStamp=target.fieldEntryStamp,uid=target.uid;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'}); // P1 start, target REST
 const top=take(s,1,'S9');s.players[1].hand.push(top);
 place(s,1,'S0','energy',0,false);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===uid);
 assert.ok(raid);
 s=dispatchUniversalAction(packs,s,raid);
 assert.equal(s.players[1].front[0].uid,top.uid);
 assert.equal(s.players[1].front[0].ready,true);
 assert.notEqual(s.players[1].front[0].fieldEntryStamp,oldStamp);
 assert.equal(s.players[1].front[0].stack[0].uid,uid);
 assert.equal(s.continuousStates.length,0,'old top field incarnation no longer targeted');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('status follows physical field entry not same UID replay; source exit does not clear an unlinked status',()=>{
 let {s,target,source}=resolveSilence();
 s.players[0].front[0]=null;s.players[0].outside.push(source);
 pruneContinuousStates(s);assert.equal(s.continuousStates.length,2);
 const old=target.fieldEntryStamp;
 s.players[1].front[0]=null;target.fieldEntryStamp=null;s.players[1].hand.push(target);
 pruneContinuousStates(s);assert.equal(s.continuousStates.length,0);
 s.players[1].hand.pop();stampFieldInstance(s,target);s.players[1].front[0]=target;
 assert.notEqual(target.fieldEntryStamp,old);
 assert.equal(originalEffectsDisabled(s,target),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('suppressed printed active energy and MAIN effect are not treated as externally granted',()=>{
 let s=match(),src=place(s,0,'S0'),victim=place(s,1,'S6','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,1,victim),2);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:src.uid,
  targetUid:victim.uid,until:{player:1,phase:'attack',edge:'end'}});
 assert.equal(universalCardEnergy(packs,s,1,victim),1);
 s.active=1;s.phase='main';
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===victim.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('invalid printed-silence arguments fail closed',()=>{
 for(const bad of [
  {template:'restSilenceOppFrontIfOwnOutsideField',optional:false},
  {template:'restSilenceOppFrontIfOwnOutsideField',optional:true,scope:'both'},
 ])assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base[1],
  templateEffects:{onPlay:[bad]}}]}),/invalid|arguments/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base[1],
  templateEffects:undefined,effects:{onPlay:[{op:'restSilenceOppFrontIfOwnOutsideField',optional:false}]}
 }]}),/invalid conditional printed silence/);
});
