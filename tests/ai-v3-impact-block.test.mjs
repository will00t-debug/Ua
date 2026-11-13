import test from 'node:test';
import assert from 'node:assert/strict';
import {designatedBattleDecks,mainDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {chooseHybridStartHardAction,lastHybridRoute} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {chooseAiV3Action,lastAiV3Trace,resetAiV3Report} from '../dist/universal-v2/ai-v3/search.mjs';
import {battleWindowAction} from '../dist/universal-v2/ai-v3/eval.mjs';
import {normalizeFactors} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {buildAiV3Request,handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalAttackDamage,universalBp,universalImpact,universalImpactNull
} from '../dist/universal-v2/engine.mjs';

const sword=designatedBattleDecks().find(item=>item.id==='white-sword');
const practice=mainDecks().find(item=>item.title==='bleach');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const frozen={nodes:48,ms:40,seed:1,now:()=>0};

function take(state,player,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=state.players[player][zone];
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw new Error('missing '+id+' for player '+player);
}
function reach(deck){
 const packs=[deck.pack,deck.pack];
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:7,first:0});
 for(let guard=0;guard<16&&!(state.active===1&&state.phase==='attack');guard++){
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw');
  state=dispatchUniversalAction(packs,state,action);
 }
 return {packs,state};
}
function enter(card,state){
 card.ready=true;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 card.stack=[];
 card.under=[];
 return card;
}
function setBp(packs,state,card,bp){
 const delta=bp-universalBp(packs,state,card);
 card.buffs=delta?[{bp:delta,untilTurn:state.turn}]:[];
}
function open(deck,spec){
 const {packs,state}=reach(deck);
 const blocker=enter(take(state,0,spec.blockerId),state);
 const attacker=enter(take(state,1,spec.attackerId),state);
 state.players[0].front=[blocker,null,null,null];
 state.players[1].front=[attacker,null,null,null];
 if(spec.raidBaseId){
  const base=take(state,1,spec.raidBaseId);
  base.faceDown=false;
  attacker.stack=[base];
 }
 if(spec.secondId){
  const second=enter(take(state,1,spec.secondId),state);
  if(spec.secondBaseId){
   const base=take(state,1,spec.secondBaseId);
   base.faceDown=false;
   second.stack=[base];
  }
  state.players[1].front[1]=second;
  if(spec.secondBp)setBp(packs,state,second,spec.secondBp);
 }
 if(spec.allyId){
  const ally=enter(take(state,0,spec.allyId),state);
  state.players[0].front[1]=ally;
  if(spec.allyBp)setBp(packs,state,ally,spec.allyBp);
 }
 while(state.players[0].life.length>spec.life)state.players[0].deck.push(state.players[0].life.pop());
 setBp(packs,state,blocker,spec.blockerBp);
 setBp(packs,state,attacker,spec.attackerBp);
 if(spec.damage===2)attacker.attackDamageGranted={turn:state.turn,stamp:attacker.fieldEntryStamp,amount:2};
 if(spec.impact===1&&!spec.raidBaseId)attacker.impactGranted={turn:state.turn,stamp:attacker.fieldEntryStamp,amount:1};
 const swing=legalUniversalActions(packs,state).find(action=>action.type==='attack'&&action.uid===attacker.uid);
 const opened=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(assertUniversalMatch(packs,opened),true);
 return {packs,state:opened,blocker,attacker};
}
function blocks(packs,state){
 return legalUniversalActions(packs,state).filter(action=>action.type==='chooseBlock');
}
function settle(packs,state,choice){
 let cursor=dispatchUniversalAction(packs,state,choice,{actor:0});
 for(let guard=0;guard<8&&cursor.pending&&cursor.status==='playing';guard++){
  if(cursor.pending.kind==='block')break;
  const actor=cursor.pending.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const step=legal.find(action=>action.type==='chooseAttackLife')||legal.find(action=>action.uid==null)||legal[0];
  if(!step)break;
  cursor=dispatchUniversalAction(packs,cursor,step,{actor});
 }
 return {
  life:cursor.players[0].life.length,
  bodies:cursor.players[0].front.filter(Boolean).map(card=>card.cardId),
  hand:cursor.players[0].hand.length,
  status:cursor.status,
  winner:cursor.winner??null
 };
}
function ask(spot,extra={}){
 resetAiV3Report();
 const action=chooseHybridStartHardAction(spot.packs,spot.state,{actor:0,...frozen,...extra});
 return {action,trace:lastAiV3Trace(),route:lastHybridRoute()};
}
function cutNow(limit){
 let calls=0;
 return ()=>{calls+=1;return calls<=limit?0:1e12;};
}
function playWave(spot,extra={}){
 let cursor=spot.state;
 for(let guard=0;guard<16&&cursor.status==='playing';guard++){
  if(!cursor.pending&&cursor.phase==='start')break;
  const actor=cursor.pending?.player??cursor.active;
  let action;
  if(cursor.pending?.kind==='block'&&actor===0){
   resetAiV3Report();
   action=chooseHybridStartHardAction(spot.packs,cursor,{actor:0,...frozen,...extra});
  }else{
   const legal=legalUniversalActions(spot.packs,cursor);
   action=legal.find(item=>item.type==='attack')||legal.find(item=>item.type==='chooseAttackLife')||
    legal.find(item=>item.uid==null)||legal[0];
  }
  if(!action)break;
  cursor=dispatchUniversalAction(spot.packs,cursor,action,{actor});
 }
 return {life:cursor.players[0].life.length,bodies:cursor.players[0].front.filter(Boolean).map(card=>card.cardId),pending:cursor.pending?.kind||null};
}

const kenpachi={attackerId:'BLC-2-067',attackerBp:4000,raidBaseId:'BLC-3-008',blockerId:'BLC-1-085'};

test('publicBlock stays off unless this call asks for it',()=>{
 assert.equal(normalizeFactors(null),null);
 assert.equal(normalizeFactors({publicBlock:true}).publicBlock,true);
 assert.equal(normalizeFactors({publicBlock:true}).settleLife,undefined);
 assert.equal(normalizeFactors({publicBlock:true}).paidFront,undefined);
 assert.equal(normalizeFactors({settleLife:true}).publicBlock,undefined);
});

test('an equal 4000 does not spend itself on Impact 1',()=>{
 for(const life of [3,7]){
  const spot=open(sword,{...kenpachi,blockerBp:4000,life});
  assert.equal(universalImpact(spot.packs,spot.state,spot.attacker),1);
  assert.equal(universalAttackDamage(spot.packs,spot.state,spot.attacker),1);
  assert.equal(universalImpactNull(spot.packs,spot.state,spot.blocker),false);
  const legal=blocks(spot.packs,spot.state);
  assert.equal(legal.some(action=>!action.uid),true);
  const passed=settle(spot.packs,spot.state,legal.find(action=>!action.uid));
  const blocked=settle(spot.packs,spot.state,legal.find(action=>action.uid===spot.blocker.uid));
  assert.equal(passed.life,life-1);
  assert.deepEqual(passed.bodies,['BLC-1-085']);
  assert.equal(blocked.life,life-1);
  assert.deepEqual(blocked.bodies,[]);
  const choice=ask(spot);
  assert.equal(choice.route.policy,'hybrid-start-hard-v1');
  assert.equal(choice.route.lane,'pending');
  assert.equal(choice.route.source,'v3');
  assert.equal(choice.action.uid??null,null);
  assert.equal(choice.trace.factors.publicBlock,undefined);
  const rows=choice.trace.candidates.filter(row=>row.executed!==false);
  const pass=rows.find(row=>row.action.uid==null);
  const block=rows.find(row=>row.action.uid===spot.blocker.uid);
  assert.ok(pass.battleScore>block.battleScore);
 }
});

test('a higher body stops Impact 1 and stays',()=>{
 const spot=open(sword,{...kenpachi,blockerBp:5000,life:3});
 const legal=blocks(spot.packs,spot.state);
 const blocked=settle(spot.packs,spot.state,legal.find(action=>action.uid===spot.blocker.uid));
 const passed=settle(spot.packs,spot.state,legal.find(action=>!action.uid));
 assert.equal(blocked.life,3);
 assert.deepEqual(blocked.bodies,['BLC-1-085']);
 assert.equal(passed.life,2);
 const choice=ask(spot);
 assert.equal(choice.action.uid,spot.blocker.uid);
});

test('Impact null is scored, and a printed must-block cannot pass',()=>{
 const voluntary=open(practice,{life:3,blockerId:'BLC-1-043',blockerBp:4000,attackerId:'BLC-1-042',attackerBp:4000,impact:1});
 assert.equal(universalImpactNull(voluntary.packs,voluntary.state,voluntary.blocker),true);
 const stopped=settle(voluntary.packs,voluntary.state,blocks(voluntary.packs,voluntary.state).find(action=>action.uid));
 const leaked=settle(voluntary.packs,voluntary.state,blocks(voluntary.packs,voluntary.state).find(action=>!action.uid));
 assert.equal(stopped.life,3);
 assert.deepEqual(stopped.bodies,[]);
 assert.equal(leaked.life,2);
 assert.equal(ask(voluntary).action.uid,voluntary.blocker.uid);
 const spare=open(practice,{life:7,blockerId:'BLC-1-043',blockerBp:4000,attackerId:'BLC-1-042',attackerBp:4000,impact:1});
 assert.equal(ask(spare).action.uid??null,null);
 const cheap=open(practice,{life:7,blockerId:'BLC-1-043',blockerBp:2000,attackerId:'BLC-1-042',attackerBp:4000,impact:1});
 assert.equal(ask(cheap).action.uid,cheap.blocker.uid);
 const forced=open(sword,{...kenpachi,blockerId:'BLC-4-070',blockerBp:4000,life:3});
 const legal=blocks(forced.packs,forced.state);
 assert.equal(universalImpactNull(forced.packs,forced.state,forced.blocker),true);
 assert.deepEqual(legal.map(action=>action.uid),[forced.blocker.uid]);
 const choice=ask(forced);
 assert.equal(choice.trace.reason,'forced');
 assert.equal(choice.action.uid,forced.blocker.uid);
 const after=settle(forced.packs,forced.state,choice.action);
 assert.equal(after.life,3);
 assert.deepEqual(after.bodies,[]);
});

test('one life spends a body only when that block avoids the loss',()=>{
 const winning=open(sword,{...kenpachi,blockerBp:5000,life:1});
 assert.equal(ask(winning).action.uid,winning.blocker.uid);
 assert.equal(settle(winning.packs,winning.state,blocks(winning.packs,winning.state).find(action=>action.uid)).life,1);
 assert.equal(settle(winning.packs,winning.state,blocks(winning.packs,winning.state).find(action=>!action.uid)).status,'finished');
 const plain=open(sword,{life:1,blockerId:'BLC-1-085',blockerBp:4000,attackerId:'BLC-1-070',attackerBp:4000});
 assert.equal(universalImpact(plain.packs,plain.state,plain.attacker),0);
 assert.equal(ask(plain).action.uid,plain.blocker.uid);
 assert.equal(settle(plain.packs,plain.state,blocks(plain.packs,plain.state).find(action=>action.uid)).life,1);
 const doomed=open(sword,{...kenpachi,blockerBp:4000,life:1});
 const either=blocks(doomed.packs,doomed.state);
 assert.equal(settle(doomed.packs,doomed.state,either.find(action=>!action.uid)).status,'finished');
 assert.equal(settle(doomed.packs,doomed.state,either.find(action=>action.uid)).status,'finished');
 const choice=ask(doomed);
 assert.equal(choice.trace.candidates.filter(row=>row.executed!==false).every(row=>row.search<=-90000),true);
});

test('a later attack keeps the body that can still answer it',()=>{
 const wave=open(sword,{...kenpachi,blockerBp:5000,life:3,secondId:'BLC-2-067',secondBp:4000,secondBaseId:'BLC-4-070'});
 const followed=playWave(wave);
 assert.equal(followed.life,2);
 assert.deepEqual(followed.bodies,['BLC-1-085']);
 assert.equal(followed.pending,null);
 const saved=open(sword,{...kenpachi,blockerBp:4000,life:4,secondId:'BLC-1-083',secondBp:3000});
 const held=playWave(saved);
 assert.equal(held.life,3);
 assert.deepEqual(held.bodies,['BLC-1-085']);
 const spent=settle(saved.packs,saved.state,blocks(saved.packs,saved.state).find(action=>action.uid));
 assert.equal(spent.life,3);
 assert.deepEqual(spent.bodies,[]);
});

test('Damage 2, a losing Impact trade, retirement and a block ban stay on the engine result',()=>{
 const doubled=open(sword,{life:7,blockerId:'BLC-1-085',blockerBp:4000,attackerId:'BLC-1-070',attackerBp:4000,damage:2});
 assert.equal(universalAttackDamage(doubled.packs,doubled.state,doubled.attacker),2);
 assert.equal(ask(doubled).action.uid,doubled.blocker.uid);
 assert.equal(settle(doubled.packs,doubled.state,blocks(doubled.packs,doubled.state).find(action=>action.uid)).life,7);
 const both=open(sword,{...kenpachi,blockerBp:4000,life:7,damage:2});
 assert.equal(universalImpact(both.packs,both.state,both.attacker),1);
 assert.equal(universalAttackDamage(both.packs,both.state,both.attacker),2);
 const passed=settle(both.packs,both.state,blocks(both.packs,both.state).find(action=>!action.uid));
 const traded=settle(both.packs,both.state,blocks(both.packs,both.state).find(action=>action.uid));
 assert.equal(passed.life,5);
 assert.deepEqual(passed.bodies,['BLC-1-085']);
 assert.equal(traded.life,6);
 assert.deepEqual(traded.bodies,[]);
 assert.equal(ask(both).action.uid??null,null);
 const counts={...practice.counts};
 counts['BLC-1-001']-=4;
 delete counts['BLC-1-001'];
 counts['BLC-2-040']=4;
 counts['BLC-1-042']-=4;
 delete counts['BLC-1-042'];
 counts['BLC-4-029']=4;
 assert.deepEqual(validateUniversalDeck(practice.pack,counts),[]);
 const side={...practice,counts};
 const retired=open(side,{life:7,blockerId:'BLC-2-040',blockerBp:1000,attackerId:'BLC-1-045',attackerBp:4000,damage:2});
 const drawn=settle(retired.packs,retired.state,blocks(retired.packs,retired.state).find(action=>action.uid));
 assert.equal(drawn.life,7);
 assert.equal(drawn.bodies.length,0);
 assert.equal(drawn.hand,retired.state.players[0].hand.length+1);
 assert.equal(ask(retired).action.uid,retired.blocker.uid);
 const banned=open(side,{life:3,blockerId:'BLC-2-040',blockerBp:2000,attackerId:'BLC-4-029',attackerBp:4000,impact:1,allyId:'BLC-1-045',allyBp:4000});
 const legal=blocks(banned.packs,banned.state);
 assert.equal(legal.some(action=>action.uid===banned.blocker.uid),false);
 assert.equal(legal.some(action=>action.uid&&banned.state.players[0].front.some(card=>card?.uid===action.uid&&card.cardId==='BLC-1-045')),true);
 assert.equal(ask(banned).action.uid??null,null);
});

test('a cut block search spends the body unless publicBlock is asked',()=>{
 const spot=open(sword,{...kenpachi,blockerBp:4000,life:3});
 const partial=ask(spot,{now:cutNow(15)});
 assert.equal(partial.trace.candidates.filter(row=>row.executed!==false).length,1);
 assert.equal(partial.action.uid,spot.blocker.uid);
 assert.equal(partial.trace.blockLedger,undefined);
 const empty=ask(spot,{now:cutNow(5)});
 assert.equal(empty.trace.nodesUsed,0);
 assert.equal(empty.action.uid,spot.blocker.uid);
 const sealedEmpty=ask(spot,{now:cutNow(5),factors:{publicBlock:true}});
 assert.equal(sealedEmpty.trace.blockLedger,true);
 assert.equal(sealedEmpty.action.uid??null,null);
 const sealed=ask(spot,{now:cutNow(15),factors:{publicBlock:true,settleLife:true}});
 assert.equal(sealed.trace.factors.publicBlock,true);
 assert.equal(sealed.trace.factors.settleLife,undefined);
 assert.equal(sealed.trace.blockLedger,true);
 assert.equal(sealed.action.uid??null,null);
 assert.equal(same(sealed.action,battleWindowAction(spot.packs,spot.state,0)),true);
 const untouched=ask(spot,{now:cutNow(15),factors:{settleLife:true}});
 assert.equal(untouched.action.uid,spot.blocker.uid);
 const finished=ask(spot,{factors:{publicBlock:true}});
 assert.equal(finished.action.uid??null,null);
 assert.equal(finished.trace.blockLedger,undefined);
 const higher=open(sword,{...kenpachi,blockerBp:5000,life:3});
 const kept=ask(higher,{now:cutNow(15),factors:{publicBlock:true}});
 assert.equal(kept.action.uid,higher.blocker.uid);
 const request=buildAiV3Request(spot.packs,spot.state,0,{requestId:3,stateVersion:1,seed:1,nodes:48,ms:1e9,policy:'hybrid-start-hard-v1'});
 const clean=handleAiV3Request({...request,now:()=>0});
 const dirty=handleAiV3Request({...request,requestId:4,now:()=>0,factors:{publicBlock:true,settleLife:true}});
 assert.equal(lastAiV3Trace().factors.publicBlock,undefined);
 assert.equal(same(clean.action,dirty.action),true);
});
