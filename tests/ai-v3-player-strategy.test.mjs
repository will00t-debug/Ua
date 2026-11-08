import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,effectiveHandRequiredEnergy,universalBp,universalEnergyByColor,universalImpact,universalImpactNull,universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {chooseAiV3Action,lastAiV3Trace,MATCH_LIMITS,resetAiV3Report,comparedLines} from '../dist/universal-v2/ai-v3/search.mjs';
import {scoreLine,rankLegal,selectCandidates,selectionTrace} from '../dist/universal-v2/ai-v3/beam.mjs';
import {battleActionValue,battleWindowAction,battleWindowDelta,blankSwingAdjustment,provenRebuild,raidStranded,keepScore,sequencedFilter,lineSwitchBody,recoversActionPoints} from '../dist/universal-v2/ai-v3/eval.mjs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {bindProbeBudget,bindVariant,energyPlayNet,evidencedChoice,frontCoverageScore,frontEvidenceChoice,moveDevelopment,preferConfirmedChoices,watchEngineDispatch} from '../dist/universal-v2/ai-v3/strategy.mjs';

// Player strategy, stated as situations rather than card lists.
// 1. Both sides 4000, no Impact, the opponent's last swing, and no proven
//    four-body refill: 7, 6, 5 and 4 life take the hit and keep the main.
//    At 3 life that hold lifts and the block comes first. Other damage,
//    other bodies, and a real Impact result are not the same hold.
// 2. A refill is four front characters, each at least 4000, each able to
//    attack that turn, paid from the known hand without touching the energy
//    line. An empty slot is not a filled slot. The deck is not assumed.
// 3. A block that keeps the character and the life is allowed. A block that
//    removes the character and still loses life is not, unless it is the
//    only legal way to stay alive. Impact null is checked, not assumed.
// 4. Two affordable plays in one main are both made.
// 5. An attack that removes nothing and deals nothing stays back unless a
//    declaration effect can actually be paid.

const pack=officialV2Pack('bleach');
function deck(extra){
 const counts={...extra};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(pack.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
const counts=deck({
 'BLC-4-036':4,'BLC-4-005':2,'BLC-4-022':1,'BLC-4-070':2,'BLC-1-083':4,
 'BLC-4-068':2,'BLC-4-062':2,'BLC-1-082':2,'BLC-1-050':2,'BLC-2-040':4,
 'BLC-1-009':1,'BLC-1-043':2
});
function take(state,player,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=state.players[player][zone];
  if(!list)continue;
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function place(state,player,card,line,slot){
 card.ready=true;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[player][line][slot]=card;
}
function setBp(state,card,bp){
 const delta=bp-universalBp([pack,pack],state,card);
 card.buffs=delta?[{bp:delta,untilTurn:state.turn}]:[];
}
function setLife(state,player,n){
 while(state.players[player].life.length>n)state.players[player].deck.push(state.players[player].life.pop());
}
function fillGetLife(state,player){
 const life=state.players[player].life;
 const deck=state.players[player].deck;
 for(let i=0;i<life.length;i++){
  if(pack.cards[life[i].cardId]?.trigger==='get')continue;
  const index=deck.findIndex(card=>pack.cards[card.cardId]?.trigger==='get');
  if(index<0)throw Error('no get trigger in deck');
  const got=deck.splice(index,1)[0];
  deck.push(life[i]);
  life[i]=got;
 }
}
function clearHand(state,player){
 for(const card of [...state.players[player].hand])state.players[player].deck.push(card);
 state.players[player].hand.length=0;
}
function boot(phase,active,first=0){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:11,first});
 for(let guard=0;guard<40&&state.status==='playing';guard++){
  if(state.active===active&&state.phase===phase&&!state.pending)break;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
  if(!action)break;
  state=dispatchUniversalAction(packs,state,action);
 }
 return {packs,state};
}
function askedVariant(explicit){
 if(explicit==='a'||explicit==='b'||explicit==='ab'||explicit==='ab-front')return explicit;
 const env=process.env.AI_V3_TEST_VARIANT;
 return env==='a'||env==='b'||env==='ab'||env==='ab-front'?env:null;
}
function ask(packs,state,variant){
 const actor=state.pending?.player??state.active;
 resetAiV3Report();
 const selected=askedVariant(variant);
 const action=chooseAiV3Action(packs,state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true,
  ...(selected?{variant:selected}:{})
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 if(trace.reason!=='forced')assert.ok(trace.nodesUsed<=48,trace.reason+' nodes '+trace.nodesUsed);
 return {action,trace};
}
function blockWindow(life,{hand,blockerId='BLC-4-005',attackerId='BLC-4-005',blockerBp=4000,attackerBp=4000,damage=1,secondBp=0,secondId='BLC-4-062',secondDamage=1,secondImpact=0,thirdBp=0,thirdId='BLC-4-036',thirdDamage=1,thirdImpact=0,getLife=false}={}){
 const {packs,state}=boot('attack',1,0);
 clearHand(state,0);
 const mine=take(state,0,blockerId);
 const foe=take(state,1,attackerId);
 place(state,0,mine,'front',0);
 place(state,1,foe,'front',0);
 setBp(state,mine,blockerBp);
 setBp(state,foe,attackerBp);
 if(damage===2)foe.attackDamageGranted={turn:state.turn,stamp:foe.fieldEntryStamp,amount:2};
 let second=null;
 if(secondBp){
  second=take(state,1,secondId);
  place(state,1,second,'front',1);
  setBp(state,second,secondBp);
  if(secondDamage===2)second.attackDamageGranted={turn:state.turn,stamp:second.fieldEntryStamp,amount:2};
  if(secondImpact)second.impactGranted={turn:state.turn,stamp:second.fieldEntryStamp,amount:1};
 }
 let third=null;
 if(thirdBp){
  third=take(state,1,thirdId);
  place(state,1,third,'front',2);
  setBp(state,third,thirdBp);
  if(thirdDamage===2)third.attackDamageGranted={turn:state.turn,stamp:third.fieldEntryStamp,amount:2};
  if(thirdImpact)third.impactGranted={turn:state.turn,stamp:third.fieldEntryStamp,amount:1};
 }
 setLife(state,0,life);
 if(getLife)fillGetLife(state,0);
 for(const card of hand||[])state.players[0].hand.push(card(state));
 const swing=legalUniversalActions(packs,state).find(item=>item.type==='attack'&&item.uid===foe.uid);
 const opened=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(assertUniversalMatch(packs,opened),true);
 assert.equal(opened.pending.kind,'block');
 return {packs,state:opened,mine,foe,second,third};
}
function settle(packs,state,action){
 const actor=state.pending?.player??state.active;
 const after=dispatchUniversalAction(packs,state,action,{actor});
 assert.equal(assertUniversalMatch(packs,after),true);
 return after;
}
function march(packs,cursor,pick){
 const started=cursor.players[0].ownTurns;
 for(let guard=0;guard<40;guard++){
  if(cursor.active===0&&cursor.phase==='start'&&!cursor.pending&&cursor.players[0].ownTurns>started)return cursor;
  const legal=legalUniversalActions(packs,cursor);
  const actor=cursor.pending?.player??cursor.active;
  const action=pick(cursor,legal);
  if(!action)throw Error('stuck '+(cursor.pending?.kind||cursor.phase));
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 throw Error('our turn did not start');
}

test('a block line that got home does not outrank a life window on a different score',()=>{
 const home={action:{type:'chooseBlock',uid:'body'},search:-1,boundary:'returned',settled:true,battleScore:-30,damageOpen:false};
 const open={action:{type:'chooseBlock',uid:null},search:40,boundary:'pending',settled:false,damageOpen:true,battleScore:-12,
  stopPending:'attack-life-target'};
 const ranked=comparedLines([home,open]);
 assert.equal(ranked.horizon,'battle');
 assert.equal(ranked.rows.length,2);
 assert.equal(ranked.rows.find(row=>row.action.uid==null).search,-12);
 assert.ok(ranked.rows.find(row=>row.action.uid==null).search>ranked.rows.find(row=>row.action.uid==='body').search);
 assert.equal(home.boundary,'returned');
 assert.equal(open.boundary,'pending');
 assert.equal(open.damageOpen,true);
 const bare=comparedLines([
  {action:{type:'play',uid:'x',line:'front'},search:100,boundary:'returned',settled:true,damageOpen:false},
  {action:{type:'raid',uid:'y'},search:500,boundary:'pending',damageOpen:true,settled:false,stopPending:'attack-life-target'}
 ]);
 assert.equal(bare.rows.length,1);
 assert.equal(bare.rows[0].action.type,'play');
});

test('four or more life keeps the 4000 on the last clean hit, and three spends it',()=>{
 for(const life of [7,6,5,4]){
  const opened=blockWindow(life);
  assert.equal(universalImpact(opened.packs,opened.state,opened.foe),0);
  const choice=ask(opened.packs,opened.state);
  assert.equal(choice.action.type,'chooseBlock');
  assert.equal(choice.action.uid??null,null);
  const rows=choice.trace.candidates.filter(row=>row.action?.type==='chooseBlock');
  for(const row of rows)if(row.damageOpen)assert.notEqual(row.boundary,'returned');
  const after=settle(opened.packs,opened.state,choice.action);
  assert.equal(after.players[0].front.some(card=>card?.uid===opened.mine.uid),true);
  assert.ok(after.players[0].life.length===life-1||after.pending);
 }
 const low=blockWindow(3);
 const lowChoice=ask(low.packs,low.state);
 assert.equal(lowChoice.action.uid,low.mine.uid);
 const spent=settle(low.packs,low.state,lowChoice.action);
 assert.equal(spent.players[0].front.some(card=>card?.uid===low.mine.uid),false);
 assert.equal(spent.players[0].life.length,3);
 const danger=blockWindow(1);
 const dangerChoice=ask(danger.packs,danger.state);
 assert.equal(dangerChoice.action.uid,danger.mine.uid);
 const lived=settle(danger.packs,danger.state,dangerChoice.action);
 assert.equal(lived.players[0].life.length,1);
 const heavy=blockWindow(4,{attackerBp:5000,damage:2});
 assert.equal(universalAttackDamage(heavy.packs,heavy.state,heavy.foe),2);
 const heavyChoice=ask(heavy.packs,heavy.state);
 assert.equal(heavyChoice.action.uid,heavy.mine.uid);
 const held=settle(heavy.packs,heavy.state,heavyChoice.action);
 assert.equal(held.players[0].life.length,4);
});

test('a higher attacking BP still loses to keeping the 4000 until three life',()=>{
 for(const attackerBp of [5000,6000]){
  for(const life of [5,4]){
   const opened=blockWindow(life,{attackerBp});
   assert.equal(universalAttackDamage(opened.packs,opened.state,opened.foe),1);
   assert.equal(universalImpact(opened.packs,opened.state,opened.foe),0);
   const choice=ask(opened.packs,opened.state);
   assert.equal(choice.action.uid??null,null,attackerBp+' at '+life);
   const after=settle(opened.packs,opened.state,choice.action);
   assert.equal(after.players[0].front.some(card=>card?.uid===opened.mine.uid),true);
   assert.ok(after.players[0].life.length===life-1||after.pending);
  }
  const low=blockWindow(3,{attackerBp});
  const spent=ask(low.packs,low.state);
  assert.equal(spent.action.uid,low.mine.uid);
  const after=settle(low.packs,low.state,spent.action);
  assert.equal(after.players[0].front.some(card=>card?.uid===low.mine.uid),false);
  assert.equal(after.players[0].life.length,3);
 }
});

test('a refill counts only when four attacking 4000s are already paid for',()=>{
 const ready=blockWindow(7,{blockerId:'BLC-4-036'});
 for(let slot=1;slot<4;slot++)place(ready.state,0,take(ready.state,0,'BLC-4-036'),'front',slot);
 for(let slot=0;slot<4;slot++)place(ready.state,0,take(ready.state,0,'BLC-2-040'),'energy',slot);
 const refill=take(ready.state,0,'BLC-4-022');
 ready.state.players[0].hand.push(refill);
 assert.equal(universalEnergyByColor(ready.packs,ready.state,0).blue>=4,true);
 assert.equal(provenRebuild(ready.packs,ready.state,0,ready.mine.uid).ok,true);
 const fresh=structuredClone(ready.state);
 const starved=bindProbeBudget({pool:{n:1},deadline:Infinity,now:()=>0},()=>provenRebuild(ready.packs,fresh,0,ready.mine.uid));
 assert.equal(starved.ok,false);
 assert.equal(starved.reason,'budget');
 assert.equal(assertUniversalMatch(ready.packs,ready.state),true);
 const fronts=ready.state.players[0].front.filter(Boolean).map(card=>card.uid);
 const choice=ask(ready.packs,ready.state);
 assert.equal(fronts.includes(choice.action.uid),true);
 let cursor=settle(ready.packs,ready.state,choice.action);
 assert.equal(cursor.players[0].front.filter(Boolean).length,3);
 for(let guard=0;guard<40&&!(cursor.active===0&&cursor.phase==='main'&&!cursor.pending);guard++){
  const legal=legalUniversalActions(ready.packs,cursor);
  const actor=cursor.pending?.player??cursor.active;
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
  cursor=dispatchUniversalAction(ready.packs,cursor,action,{actor});
 }
 const play=legalUniversalActions(ready.packs,cursor).find(item=>item.type==='play'&&item.line==='front'&&item.uid===refill.uid);
 assert.ok(play);
 cursor=dispatchUniversalAction(ready.packs,cursor,play,{actor:0});
 for(let guard=0;guard<8&&cursor.pending;guard++){
  const legal=legalUniversalActions(ready.packs,cursor);
  const actor=cursor.pending.player??cursor.active;
  const action=legal.find(item=>item.optional===true&&(item.mode==='pass'||item.mode==='decline'||item.uid==null))||legal[0];
  cursor=dispatchUniversalAction(ready.packs,cursor,action,{actor});
 }
 for(let guard=0;guard<12&&!(cursor.active===0&&cursor.phase==='attack'&&!cursor.pending);guard++){
  const legal=legalUniversalActions(ready.packs,cursor);
  const actor=cursor.pending?.player??cursor.active;
  const action=legal.find(item=>item.type==='next')||legal[0];
  cursor=dispatchUniversalAction(ready.packs,cursor,action,{actor});
 }
 const bodies=cursor.players[0].front.filter(Boolean);
 assert.equal(bodies.length,4);
 assert.ok(bodies.every(card=>universalBp(ready.packs,cursor,card)>=4000));
 const attacks=legalUniversalActions(ready.packs,cursor).filter(item=>item.type==='attack');
 for(const card of bodies)assert.equal(attacks.some(item=>item.uid===card.uid),true);
 const energy=(cursor.players[0].energy||[]).filter(card=>card?.cardId==='BLC-2-040').length;
 assert.equal(energy,4);
 const one=blockWindow(7);
 one.state.players[0].hand.push(take(one.state,0,'BLC-4-022'));
 for(let slot=0;slot<4;slot++)place(one.state,0,take(one.state,0,'BLC-4-036'),'energy',slot);
 assert.equal(provenRebuild(one.packs,one.state,0,one.mine.uid).ok,false);
 assert.equal(ask(one.packs,one.state).action.uid??null,null);
 const rested=blockWindow(7);
 place(rested.state,0,take(rested.state,0,'BLC-1-083'),'energy',0);
 rested.state.players[0].hand.push(take(rested.state,0,'BLC-4-070'));
 assert.equal(provenRebuild(rested.packs,rested.state,0,rested.mine.uid).ok,false);
 assert.equal(ask(rested.packs,rested.state).action.uid??null,null);
 const crowded=blockWindow(7);
 place(crowded.state,0,take(crowded.state,0,'BLC-1-083'),'front',1);
 for(let slot=2;slot<4;slot++)place(crowded.state,0,take(crowded.state,0,'BLC-4-036'),'front',slot);
 for(let slot=0;slot<4;slot++)place(crowded.state,0,take(crowded.state,0,'BLC-2-040'),'energy',slot);
 crowded.state.players[0].hand.push(take(crowded.state,0,'BLC-4-022'));
 assert.equal(provenRebuild(crowded.packs,crowded.state,0,crowded.mine.uid).ok,false);
 assert.notEqual(ask(crowded.packs,crowded.state).action.uid,crowded.mine.uid);
 const parked=blockWindow(7);
 for(let slot=0;slot<4;slot++)place(parked.state,0,take(parked.state,0,'BLC-4-036'),'energy',slot);
 parked.state.players[0].hand.push(take(parked.state,0,'BLC-1-050'));
 assert.equal(provenRebuild(parked.packs,parked.state,0,parked.mine.uid).ok,false);
 assert.equal(ask(parked.packs,parked.state).action.uid??null,null);
 const locked=blockWindow(7,{blockerId:'BLC-4-036'});
 const lockedBodies=[locked.mine];
 for(let slot=1;slot<4;slot++){
  const card=take(locked.state,0,'BLC-4-036');
  place(locked.state,0,card,'front',slot);
  lockedBodies.push(card);
 }
 for(let slot=0;slot<4;slot++)place(locked.state,0,take(locked.state,0,'BLC-2-040'),'energy',slot);
 const lockedRefill=take(locked.state,0,'BLC-4-022');
 locked.state.players[0].hand.push(lockedRefill);
 const banned=lockedBodies[1];
 const until={player:1,phase:'start',edge:'start'};
 grantContinuousState(locked.state,{kind:'cannotAttack',controller:1,sourceUid:locked.foe.uid,targetUid:banned.uid,until,sourceLinked:false});
 grantContinuousState(locked.state,{kind:'cannotBlock',controller:1,sourceUid:locked.foe.uid,targetUid:banned.uid,until,sourceLinked:false});
 assert.equal(assertUniversalMatch(locked.packs,locked.state),true);
 const healthy=lockedBodies.find(card=>card.uid!==banned.uid);
 assert.equal(provenRebuild(locked.packs,locked.state,0,healthy.uid).ok,false);
 const lockedChoice=ask(locked.packs,locked.state);
 assert.equal(lockedChoice.action.uid??null,null);
 let shown=settle(locked.packs,structuredClone(locked.state),{type:'chooseBlock',uid:healthy.uid});
 for(let guard=0;guard<20&&!(shown.active===0&&shown.phase==='main'&&!shown.pending);guard++){
  const legal=legalUniversalActions(locked.packs,shown);
  const actor=shown.pending?.player??shown.active;
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
  shown=dispatchUniversalAction(locked.packs,shown,action,{actor});
 }
 const replay=legalUniversalActions(locked.packs,shown).find(action=>action.type==='play'&&action.line==='front'&&action.uid===lockedRefill.uid);
 assert.ok(replay);
 shown=dispatchUniversalAction(locked.packs,shown,replay,{actor:0});
 for(let guard=0;guard<8&&shown.pending;guard++){
  const legal=legalUniversalActions(locked.packs,shown);
  const actor=shown.pending.player??shown.active;
  const action=legal.find(item=>item.type==='chooseDiscardGate'&&(item.uid??null)===null)||
   legal.find(item=>item.optional===true&&(item.mode==='pass'||item.mode==='decline'||item.uid==null))||legal[0];
  shown=dispatchUniversalAction(locked.packs,shown,action,{actor});
 }
 for(let guard=0;guard<12&&!(shown.active===0&&shown.phase==='attack'&&!shown.pending);guard++){
  const legal=legalUniversalActions(locked.packs,shown);
  const actor=shown.pending?.player??shown.active;
  const action=legal.find(item=>item.type==='next')||legal[0];
  shown=dispatchUniversalAction(locked.packs,shown,action,{actor});
 }
 const stood=shown.players[0].front.filter(Boolean);
 assert.equal(stood.length,4);
 assert.ok(stood.every(card=>universalBp(locked.packs,shown,card)>=4000));
 assert.equal((shown.players[0].energy||[]).filter(card=>card?.cardId==='BLC-2-040').length,4);
 const swings=legalUniversalActions(locked.packs,shown).filter(action=>action.type==='attack');
 assert.equal(swings.filter(action=>stood.some(card=>card.uid===action.uid)).length,3);
 assert.equal(swings.some(action=>action.uid===banned.uid),false);
});

test('impact follows the engine result, and a safe block is not spent on the first of two swings',()=>{
 const safe=blockWindow(7,{blockerBp:5000,attackerId:'BLC-1-009',attackerBp:4000});
 assert.equal(universalImpact(safe.packs,safe.state,safe.foe),1);
 assert.equal(universalImpactNull(safe.packs,safe.state,safe.mine),false);
 assert.ok(universalBp(safe.packs,safe.state,safe.mine)>universalBp(safe.packs,safe.state,safe.foe));
 const safeChoice=ask(safe.packs,safe.state);
 assert.equal(safeChoice.action.uid,safe.mine.uid);
 const kept=settle(safe.packs,safe.state,safeChoice.action);
 assert.equal(kept.players[0].life.length,7);
 assert.equal(kept.players[0].front.some(card=>card?.uid===safe.mine.uid),true);
 const leaked=blockWindow(7,{attackerId:'BLC-1-009'});
 assert.equal(universalImpactNull(leaked.packs,leaked.state,leaked.mine),false);
 const leakChoice=ask(leaked.packs,leaked.state);
 assert.equal(leakChoice.action.uid??null,null);
 const stayed=settle(leaked.packs,leaked.state,leakChoice.action);
 assert.equal(stayed.players[0].front.some(card=>card?.uid===leaked.mine.uid),true);
 const wasted=legalUniversalActions(leaked.packs,leaked.state).find(action=>action.uid===leaked.mine.uid);
 const lost=settle(leaked.packs,leaked.state,wasted);
 assert.equal(lost.players[0].front.some(card=>card?.uid===leaked.mine.uid),false);
 assert.ok(lost.players[0].life.length<7||lost.pending);
 const nulled=blockWindow(7,{blockerId:'BLC-1-043',blockerBp:2000,attackerId:'BLC-1-009',attackerBp:4000});
 assert.equal(universalImpactNull(nulled.packs,nulled.state,nulled.mine),true);
 const nullChoice=ask(nulled.packs,nulled.state);
 assert.equal(nullChoice.action.uid,nulled.mine.uid);
 const stopped=settle(nulled.packs,nulled.state,nullChoice.action);
 assert.equal(stopped.players[0].life.length,7);
 assert.equal(stopped.players[0].front.some(card=>card?.uid===nulled.mine.uid),false);
 const valued=blockWindow(7,{blockerId:'BLC-1-043',blockerBp:4000,attackerId:'BLC-1-009',attackerBp:4000});
 assert.equal(ask(valued.packs,valued.state).action.uid??null,null);
 const lowNull=blockWindow(3,{blockerId:'BLC-1-043',blockerBp:4000,attackerId:'BLC-1-009',attackerBp:4000});
 assert.equal(ask(lowNull.packs,lowNull.state).action.uid,lowNull.mine.uid);
 const first=blockWindow(7,{blockerBp:5000,attackerId:'BLC-1-009',attackerBp:4000,secondBp:4000,secondDamage:2});
 const firstChoice=ask(first.packs,first.state);
 assert.equal(firstChoice.action.uid??null,null);
 const saved=settle(first.packs,first.state,firstChoice.action);
 assert.equal(saved.players[0].front.find(card=>card?.uid===first.mine.uid)?.ready,true);
 const unclean=blockWindow(7,{blockerId:'BLC-4-036',blockerBp:5000,attackerId:'BLC-1-009',attackerBp:4000,secondBp:6000,secondId:'BLC-4-036',secondDamage:2,secondImpact:1,getLife:true});
 assert.equal(universalImpact(unclean.packs,unclean.state,unclean.foe),1);
 assert.equal(universalImpact(unclean.packs,unclean.state,unclean.second),1);
 assert.equal(universalAttackDamage(unclean.packs,unclean.state,unclean.second),2);
 assert.equal(universalImpactNull(unclean.packs,unclean.state,unclean.mine),false);
 const front=legalUniversalActions(unclean.packs,unclean.state).filter(action=>action.type==='chooseBlock'&&action.uid);
 assert.equal(front.length,1);
 const uncleanChoice=ask(unclean.packs,unclean.state);
 assert.equal(uncleanChoice.action.uid,unclean.mine.uid);
 const lines=structuredClone(unclean.state);
 const playLine=(firstUid,secondUid)=>{
  let cursor=settle(unclean.packs,structuredClone(lines),{type:'chooseBlock',uid:firstUid});
  return march(unclean.packs,cursor,(cursor,legal)=>{
   if(cursor.pending?.kind==='block')
    return legal.find(action=>action.type==='chooseBlock'&&(action.uid??null)===(secondUid??null));
   if(cursor.pending?.kind==='life-trigger')
    return legal.find(action=>action.mode==='get')||legal.find(action=>action.mode==='skip');
   if(cursor.pending?.kind==='life-batch-order')return legal.find(action=>action.type==='chooseLifeOrder');
   if(!cursor.pending&&cursor.active===1&&cursor.phase==='attack')
    return legal.find(action=>action.type==='attack'&&action.uid===unclean.second.uid)||legal.find(action=>action.type==='next');
   return legal.find(action=>action.type==='next')||legal.find(action=>action.type==='extraDraw');
  });
 };
 const blockedFirst=playLine(unclean.mine.uid,null);
 assert.equal(blockedFirst.players[0].life.length,5);
 assert.equal(blockedFirst.players[0].front.find(card=>card?.uid===unclean.mine.uid)?.ready,true);
 const blockedSecond=playLine(null,unclean.mine.uid);
 assert.equal(blockedSecond.players[0].life.length,5);
 assert.equal(blockedSecond.players[0].front.some(card=>card?.uid===unclean.mine.uid),false);
 const blockedNone=playLine(null,null);
 assert.equal(blockedNone.players[0].life.length,4);
 assert.equal(blockedNone.players[0].front.find(card=>card?.uid===unclean.mine.uid)?.ready,true);
 const chosen=settle(unclean.packs,unclean.state,uncleanChoice.action);
 const arrived=march(unclean.packs,chosen,(cursor,legal)=>{
  if(cursor.pending?.kind==='block')return legal.find(action=>action.type==='chooseBlock'&&(action.uid??null)===null);
  if(cursor.pending?.kind==='life-trigger')return legal.find(action=>action.mode==='get')||legal.find(action=>action.mode==='skip');
  if(cursor.pending?.kind==='life-batch-order')return legal.find(action=>action.type==='chooseLifeOrder');
  if(!cursor.pending&&cursor.active===1&&cursor.phase==='attack')
   return legal.find(action=>action.type==='attack'&&action.uid===unclean.second.uid)||legal.find(action=>action.type==='next');
  return legal.find(action=>action.type==='next')||legal.find(action=>action.type==='extraDraw');
 });
 assert.equal(arrived.players[0].life.length,5);
 assert.equal(arrived.players[0].front.find(card=>card?.uid===unclean.mine.uid)?.ready,true);
 const small=blockWindow(7,{blockerId:'BLC-1-083',blockerBp:1500});
 assert.equal(ask(small.packs,small.state).action.uid,small.mine.uid);
 const forced=blockWindow(7,{blockerId:'BLC-4-070'});
 assert.equal(legalUniversalActions(forced.packs,forced.state).some(action=>action.type==='chooseBlock'&&!action.uid),false);
 assert.equal(ask(forced.packs,forced.state).action.uid,forced.mine.uid);
});

test('one main spends both affordable cards and leaves the card that cannot be paid',()=>{
 const {packs,state}=boot('main',0,1);
 clearHand(state,0);
 place(state,0,take(state,0,'BLC-1-083'),'energy',0);
 const generator=take(state,0,'BLC-1-083');
 const body=take(state,0,'BLC-4-070');
 const heavy=take(state,0,'BLC-4-068');
 state.players[0].hand.push(generator,body,heavy);
 const left=take(state,1,'BLC-4-005');
 const right=take(state,1,'BLC-4-005');
 place(state,1,left,'front',0);
 place(state,1,right,'front',1);
 setLife(state,0,4);
 for(let index=0;index<state.players[0].front.length;index++)state.players[0].front[index]=null;
 let ready=0;
 for(const card of state.players[0].apCards)if(card.inPlay&&card.ready)ready++;
 assert.equal(ready,2);
 assert.equal(assertUniversalMatch(packs,state),true);
 let cursor=state;
 const played=[];
 for(let step=0;step<4&&cursor.phase==='main'&&cursor.active===0&&!cursor.pending;step++){
  const choice=ask(packs,cursor);
  const card=cursor.players[0].hand.find(item=>item?.uid===choice.action.uid);
  played.push(choice.action.type+':'+(choice.action.line||'')+':'+(card?.cardId||''));
  if(choice.action.type==='next')break;
  cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor:0});
 }
 assert.equal(cursor.players[0].front.some(card=>card?.cardId==='BLC-4-070'),true);
 assert.equal(cursor.players[0].energy.filter(card=>card?.cardId==='BLC-1-083').length,2,played.join(' || '));
 assert.equal(cursor.players[0].hand.some(card=>card.cardId==='BLC-4-068'),true);
 assert.equal(played.includes('next'),false);
});

function attackSpot(attackerId,{wall=5000,small=3000,outside=false}={}){
 const {packs,state}=boot('attack',0,0);
 clearHand(state,0);
 const mine=take(state,0,attackerId);
 const tall=take(state,1,'BLC-4-005');
 const short=small?take(state,1,'BLC-4-062'):null;
 place(state,0,mine,'front',0);
 place(state,1,tall,'front',0);
 if(short)place(state,1,short,'front',1);
 setBp(state,mine,4000);
 setBp(state,tall,wall);
 if(short)setBp(state,short,small);
 setLife(state,0,4);
 setLife(state,1,4);
 if(outside)state.players[0].outside.push(take(state,0,'BLC-1-083'));
 assert.equal(assertUniversalMatch(packs,state),true);
 return {packs,state,mine};
}

test('a blank attack stays back, and a payable attack effect or a real trade does not',()=>{
 const blank=attackSpot('BLC-4-036');
 const swing=legalUniversalActions(blank.packs,blank.state).find(action=>action.type==='attack'&&action.uid===blank.mine.uid);
 assert.ok(blankSwingAdjustment(blank.packs,blank.state,0,swing)<0);
 assert.equal(ask(blank.packs,blank.state).action.type,'next');
 const filtered=attackSpot('BLC-1-082');
 const filterSwing=legalUniversalActions(filtered.packs,filtered.state).find(action=>action.type==='attack'&&action.uid===filtered.mine.uid);
 assert.equal(blankSwingAdjustment(filtered.packs,filtered.state,0,filterSwing),1);
 assert.equal(ask(filtered.packs,filtered.state).action.uid,filtered.mine.uid);
 const unpaid=attackSpot('BLC-1-050');
 const unpaidSwing=legalUniversalActions(unpaid.packs,unpaid.state).find(action=>action.type==='attack'&&action.uid===unpaid.mine.uid);
 assert.ok(blankSwingAdjustment(unpaid.packs,unpaid.state,0,unpaidSwing)<0);
 assert.equal(ask(unpaid.packs,unpaid.state).action.type,'next');
 const paid=attackSpot('BLC-1-050',{outside:true});
 const paidSwing=legalUniversalActions(paid.packs,paid.state).find(action=>action.type==='attack'&&action.uid===paid.mine.uid);
 assert.equal(blankSwingAdjustment(paid.packs,paid.state,0,paidSwing),1);
 assert.equal(ask(paid.packs,paid.state).action.uid,paid.mine.uid);
 const trade=attackSpot('BLC-4-036',{wall:3000,small:0});
 const tradeSwing=legalUniversalActions(trade.packs,trade.state).find(action=>action.type==='attack'&&action.uid===trade.mine.uid);
 assert.equal(blankSwingAdjustment(trade.packs,trade.state,0,tradeSwing),0);
 assert.equal(ask(trade.packs,trade.state).action.type,'attack');
});

function resume(secondUid,blockUid){
 return (cursor,legal)=>{
  if(cursor.pending?.kind==='block')
   return legal.find(action=>action.type==='chooseBlock'&&(action.uid??null)===(blockUid??null));
  if(cursor.pending?.kind==='life-trigger')
   return legal.find(action=>action.mode==='get')||legal.find(action=>action.mode==='skip');
  if(cursor.pending?.kind==='life-batch-order')return legal.find(action=>action.type==='chooseLifeOrder');
  if(!cursor.pending&&cursor.active===1&&cursor.phase==='attack')
   return legal.find(action=>action.type==='attack'&&action.uid===secondUid)||legal.find(action=>action.type==='next');
  return legal.find(action=>action.type==='next')||legal.find(action=>action.type==='extraDraw');
 };
}
test('a character that cannot block is not kept as a backup blocker',()=>{
 const opened=blockWindow(7,{blockerId:'BLC-4-036',blockerBp:5000,attackerId:'BLC-1-009',attackerBp:4000,secondBp:4000,secondId:'BLC-4-036',secondDamage:2,getLife:true});
 const banned=take(opened.state,0,'BLC-4-036');
 place(opened.state,0,banned,'front',1);
 setBp(opened.state,banned,5000);
 const until={player:1,phase:'start',edge:'start'};
 grantContinuousState(opened.state,{kind:'cannotBlock',controller:1,sourceUid:opened.foe.uid,targetUid:banned.uid,until,sourceLinked:false});
 assert.equal(assertUniversalMatch(opened.packs,opened.state),true);
 const blockers=legalUniversalActions(opened.packs,opened.state).filter(action=>action.type==='chooseBlock'&&action.uid);
 assert.deepEqual(blockers.map(action=>action.uid),[opened.mine.uid]);
 const choice=ask(opened.packs,opened.state);
 assert.equal(choice.action.uid??null,null);
 const lines=structuredClone(opened.state);
 const playLine=(firstUid,secondUid)=>march(opened.packs,settle(opened.packs,structuredClone(lines),{type:'chooseBlock',uid:firstUid}),resume(opened.second.uid,secondUid));
 const blockedFirst=playLine(opened.mine.uid,null);
 assert.equal(blockedFirst.players[0].life.length,5);
 assert.equal(blockedFirst.players[0].front.filter(Boolean).length,2);
 assert.ok(blockedFirst.players[0].front.filter(Boolean).every(card=>card.ready));
 const blockedSecond=playLine(null,opened.mine.uid);
 assert.equal(blockedSecond.players[0].life.length,6);
 assert.equal(blockedSecond.players[0].front.filter(Boolean).length,2);
 assert.ok(blockedSecond.players[0].front.filter(Boolean).every(card=>card.ready));
 const arrived=march(opened.packs,settle(opened.packs,opened.state,choice.action),resume(opened.second.uid,opened.mine.uid));
 assert.equal(arrived.players[0].life.length,6);
 assert.equal(arrived.players[0].front.filter(Boolean).length,2);
 assert.ok(arrived.players[0].front.filter(Boolean).every(card=>card.ready));
 const quiet=blockWindow(7,{blockerBp:5000,attackerId:'BLC-1-009',attackerBp:4000,secondBp:4000,secondDamage:2,getLife:true});
 grantContinuousState(quiet.state,{kind:'cannotAttack',controller:1,sourceUid:quiet.foe.uid,targetUid:quiet.second.uid,until,sourceLinked:false});
 assert.equal(assertUniversalMatch(quiet.packs,quiet.state),true);
 const rested=structuredClone(quiet.state);
 rested.pending=null;
 assert.equal(legalUniversalActions(quiet.packs,rested).some(action=>action.type==='attack'&&action.uid===quiet.second.uid),false);
 assert.equal(ask(quiet.packs,quiet.state).action.uid,quiet.mine.uid);
});

test('both seats expect the defender to keep the body for the smaller later swing',()=>{
 const opened=blockWindow(4,{blockerId:'BLC-4-036',blockerBp:4000,attackerBp:6000,secondBp:3000,secondId:'BLC-4-036',secondDamage:1,getLife:true});
 clearHand(opened.state,1);
 assert.equal(opened.state.players[0].hand.length,0);
 assert.equal(provenRebuild(opened.packs,opened.state,0,opened.mine.uid).ok,false);
 assert.equal(assertUniversalMatch(opened.packs,opened.state),true);
 const defender=battleWindowAction(opened.packs,opened.state,0);
 const attacker=battleWindowAction(opened.packs,opened.state,1);
 assert.equal(defender.type,'chooseBlock');
 assert.equal(defender.uid??null,null);
 assert.equal(attacker.uid??null,null);
 assert.equal(JSON.stringify(defender),JSON.stringify(attacker));
 const ours=battleWindowDelta(opened.packs,opened.state,0);
 const theirs=battleWindowDelta(opened.packs,opened.state,1);
 assert.equal(ours,-45);
 assert.equal(theirs,-ours);
 const held=blockWindow(4,{attackerBp:6000});
 assert.equal(battleWindowAction(held.packs,held.state,0).uid??null,null);
 assert.equal(battleWindowAction(held.packs,held.state,1).uid??null,null);
 assert.equal(battleWindowDelta(held.packs,held.state,1),-battleWindowDelta(held.packs,held.state,0));
 const choice=ask(opened.packs,opened.state);
 assert.equal(choice.action.uid??null,null);
 const arrived=march(opened.packs,settle(opened.packs,opened.state,choice.action),resume(opened.second.uid,opened.mine.uid));
 assert.equal(arrived.players[0].life.length,3);
 assert.equal(arrived.players[0].front.find(card=>card?.uid===opened.mine.uid)?.ready,true);
 const spent=march(opened.packs,settle(opened.packs,structuredClone(opened.state),{type:'chooseBlock',uid:opened.mine.uid}),resume(opened.second.uid,null));
 assert.equal(spent.players[0].life.length,3);
 assert.equal(spent.players[0].front.some(card=>card?.uid===opened.mine.uid),false);
});

function paidRebuild(){
 const ready=blockWindow(7,{blockerId:'BLC-4-036'});
 for(let slot=1;slot<4;slot++)place(ready.state,0,take(ready.state,0,'BLC-4-036'),'front',slot);
 for(let slot=0;slot<4;slot++)place(ready.state,0,take(ready.state,0,'BLC-2-040'),'energy',slot);
 ready.state.players[0].hand.push(take(ready.state,0,'BLC-4-022'));
 assert.equal(assertUniversalMatch(ready.packs,ready.state),true);
 return ready;
}
function withoutRefill(state){
 const copy=structuredClone(state);
 const held=copy.players[0].hand.find(card=>card.cardId==='BLC-4-022');
 copy.players[0].hand=copy.players[0].hand.filter(card=>card.uid!==held.uid);
 copy.players[0].deck.push(held);
 return copy;
}
function scoreBlock(packs,state,uid,pool){
 const limits={nodes:24,pool,deadline:Infinity,now:()=>0,plan:'tree',beam:1,actorDecisions:1,opponentDecisions:0};
 const block={type:'chooseBlock',uid};
 const pass={type:'chooseBlock',uid:null};
 const blocked=scoreLine(packs,state,0,block,limits);
 const passed=scoreLine(packs,state,0,pass,limits);
 assert.equal(Number.isFinite(blocked?.battleScore),true);
 assert.equal(Number.isFinite(passed?.battleScore),true);
 const blockValue=battleActionValue(packs,state,0,block);
 const passValue=battleActionValue(packs,state,0,pass);
 return {blocked,passed,blockValue,passValue};
}
test('a rebuild proof stays on the position that produced it',()=>{
 const ready=paidRebuild();
 const uid=ready.mine.uid;
 const missing=withoutRefill(ready.state);
 const restricted=structuredClone(ready.state);
 const other=restricted.players[0].front.find(card=>card&&card.uid!==uid);
 const until={player:1,phase:'start',edge:'start'};
 grantContinuousState(restricted,{kind:'cannotAttack',controller:1,sourceUid:ready.foe.uid,targetUid:other.uid,until,sourceLinked:false});
 assert.equal(assertUniversalMatch(ready.packs,missing),true);
 assert.equal(assertUniversalMatch(ready.packs,restricted),true);
 const forward={n:400};
 const proved=scoreBlock(ready.packs,ready.state,uid,forward);
 const empty=scoreBlock(ready.packs,missing,uid,forward);
 assert.ok(proved.blockValue>proved.passValue);
 assert.ok(empty.passValue>empty.blockValue);
 assert.notEqual(battleWindowAction(ready.packs,ready.state,0).uid??null,null);
 assert.equal(battleWindowAction(ready.packs,missing,0).uid??null,null);
 const reverse={n:400};
 const emptyFirst=scoreBlock(ready.packs,withoutRefill(ready.state),uid,reverse);
 const provedLater=scoreBlock(ready.packs,structuredClone(ready.state),uid,reverse);
 assert.ok(emptyFirst.passValue>emptyFirst.blockValue);
 assert.ok(provedLater.blockValue>provedLater.passValue);
 const shared={n:400};
 const locked=bindProbeBudget({pool:shared,deadline:Infinity,now:()=>0},()=>{
  const kept=provenRebuild(ready.packs,structuredClone(ready.state),0,uid);
  const banned=provenRebuild(ready.packs,structuredClone(restricted),0,uid);
  return {kept,banned};
 });
 assert.equal(locked.kept.ok,true);
 assert.equal(locked.banned.ok,false);
 const starvedState=structuredClone(ready.state);
 const starved=bindProbeBudget({pool:{n:1},deadline:Infinity,now:()=>0},()=>provenRebuild(ready.packs,starvedState,0,uid));
 assert.equal(starved.ok,false);
 assert.equal(starved.reason,'budget');
 const repeated=bindProbeBudget({pool:{n:1},deadline:Infinity,now:()=>0},()=>provenRebuild(ready.packs,starvedState,0,uid));
 assert.equal(repeated.ok,false);
 assert.equal(repeated.reason,'budget');
 const expired=bindProbeBudget({pool:{n:40},deadline:0,now:()=>1},()=>provenRebuild(ready.packs,starvedState,0,uid));
 assert.equal(expired.ok,false);
 assert.equal(expired.reason,'budget');
 assert.equal(provenRebuild(ready.packs,starvedState,0,uid).ok,true);
});

function answer(packs,start,laterUids){
 const choices=[];
 let cursor=start;
 const started=cursor.players[0].ownTurns;
 let at=0;
 for(let guard=0;guard<48;guard++){
  if(cursor.active===0&&cursor.phase==='start'&&!cursor.pending&&cursor.players[0].ownTurns>started)
   return {cursor,choices};
  const legal=legalUniversalActions(packs,cursor);
  const actor=cursor.pending?.player??cursor.active;
  let action;
  if(cursor.pending?.kind==='block'){
   const choice=ask(packs,cursor);
   choices.push({attacker:cursor.pending.attackerUid,uid:choice.action.uid??null,
    nodes:choice.trace.nodesUsed??null,reason:choice.trace.reason});
   action=choice.action;
  }else if(cursor.pending?.kind==='life-trigger'){
   action=legal.find(item=>item.mode==='get')||legal.find(item=>item.mode==='skip');
  }else if(cursor.pending?.kind==='life-batch-order'){
   action=legal.find(item=>item.type==='chooseLifeOrder');
  }else if(!cursor.pending&&cursor.active===1&&cursor.phase==='attack'){
   const uid=laterUids[at];
   action=legal.find(item=>item.type==='attack'&&item.uid===uid)||legal.find(item=>item.type==='next');
   if(action?.type==='attack')at++;
  }else action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw');
  if(!action)throw Error('stuck '+(cursor.pending?.kind||cursor.phase));
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 throw Error('our turn did not start');
}
function standing(state,uids){
 const front=state.players[0].front.filter(Boolean);
 assert.equal(front.length,uids.length);
 for(const uid of uids)assert.equal(front.find(card=>card.uid===uid)?.ready,true);
}
function squad(swapUs,swapLater){
 const opened=blockWindow(7,{blockerId:'BLC-4-036',blockerBp:6000,attackerId:'BLC-1-009',attackerBp:4000,
  secondBp:4000,secondId:'BLC-4-036',secondDamage:2,secondImpact:0,
  thirdBp:5000,thirdId:'BLC-4-036',thirdDamage:2,thirdImpact:1,getLife:true});
 const small=take(opened.state,0,'BLC-4-036');
 place(opened.state,0,small,'front',1);
 setBp(opened.state,small,4500);
 if(swapUs){
  const front=opened.state.players[0].front;
  [front[0],front[1]]=[front[1],front[0]];
 }
 if(swapLater){
  const front=opened.state.players[1].front;
  [front[1],front[2]]=[front[2],front[1]];
 }
 assert.equal(opened.state.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(opened.packs,opened.state),true);
 assert.equal(universalImpact(opened.packs,opened.state,opened.foe),1);
 assert.equal(universalAttackDamage(opened.packs,opened.state,opened.second),2);
 assert.equal(universalImpact(opened.packs,opened.state,opened.second),0);
 assert.equal(universalAttackDamage(opened.packs,opened.state,opened.third),2);
 assert.equal(universalImpact(opened.packs,opened.state,opened.third),1);
 return {...opened,small};
}
test('two blockers are assigned across the whole attack, not by front order',()=>{
 const base=squad(false,false);
 const first=ask(base.packs,base.state);
 assert.equal(first.action.uid??null,null);
 const rows=first.trace.candidates.filter(row=>row.action?.type==='chooseBlock');
 const passed=rows.find(row=>(row.action.uid??null)===null);
 assert.ok(passed);
 for(const row of rows){
  if(row.damageOpen)assert.notEqual(row.boundary,'returned');
  if(row.action.uid)assert.ok(passed.battleScore>row.battleScore);
 }
 const played=answer(base.packs,base.state,[base.second.uid,base.third.uid]);
 assert.deepEqual(played.choices.map(row=>row.uid),[null,base.small.uid,base.mine.uid]);
 assert.deepEqual(played.choices.map(row=>row.attacker),[base.foe.uid,base.second.uid,base.third.uid]);
 assert.ok(played.choices.every(row=>row.reason!=='forced'&&row.nodes<=48));
 assert.equal(played.cursor.players[0].life.length,6);
 standing(played.cursor,[base.mine.uid,base.small.uid]);
 const worse=march(base.packs,structuredClone(base.state),(cursor,legal)=>{
  if(cursor.pending?.kind==='block'){
   const attacker=cursor.pending.attackerUid;
   if(attacker===base.foe.uid)return legal.find(action=>action.uid===base.mine.uid);
   if(attacker===base.second.uid)return legal.find(action=>action.uid===base.small.uid);
   return legal.find(action=>action.type==='chooseBlock'&&(action.uid??null)===null);
  }
  if(cursor.pending?.kind==='life-trigger')
   return legal.find(action=>action.mode==='get')||legal.find(action=>action.mode==='skip');
  if(cursor.pending?.kind==='life-batch-order')return legal.find(action=>action.type==='chooseLifeOrder');
  if(!cursor.pending&&cursor.active===1&&cursor.phase==='attack')
   return legal.find(action=>action.type==='attack'&&action.uid===base.second.uid)||
    legal.find(action=>action.type==='attack'&&action.uid===base.third.uid)||
    legal.find(action=>action.type==='next');
  return legal.find(action=>action.type==='next')||legal.find(action=>action.type==='extraDraw');
 });
 assert.equal(worse.players[0].life.length,5);
 standing(worse,[base.mine.uid,base.small.uid]);
 const flipped=squad(true,false);
 const flippedPlay=answer(flipped.packs,flipped.state,[flipped.second.uid,flipped.third.uid]);
 assert.deepEqual(flippedPlay.choices.map(row=>row.uid),[null,flipped.small.uid,flipped.mine.uid]);
 assert.equal(flippedPlay.cursor.players[0].life.length,6);
 standing(flippedPlay.cursor,[flipped.mine.uid,flipped.small.uid]);
 const reordered=squad(false,true);
 const reorderedPlay=answer(reordered.packs,reordered.state,[reordered.third.uid,reordered.second.uid]);
 assert.deepEqual(reorderedPlay.choices.map(row=>row.uid),[null,reordered.mine.uid,reordered.small.uid]);
 assert.deepEqual(reorderedPlay.choices.map(row=>row.attacker),[reordered.foe.uid,reordered.third.uid,reordered.second.uid]);
 assert.equal(reorderedPlay.cursor.players[0].life.length,6);
 standing(reorderedPlay.cursor,[reordered.mine.uid,reordered.small.uid]);
});

function filledDeck(source,extra){
 const counts={...extra};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=source.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(source.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=(counts[card.id]||0)+n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(source,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
test('different attacker restrictions use the full pairing, not the lower BP',()=>{
 const source=officialV2Pack('solo-leveling');
 const counts=filledDeck(source,{
  'SLG-1-024':1,'SLG-1-001':2,'SLG-1-006':2,'SLG-1-015':4,'SLG-1-005':2,'SLG-1-045':4
 });
 const packs=[source,source];
 const open=swap=>{
  let state=newUniversalMatch(packs,{decks:[counts,counts],seed:11,first:0});
  for(let guard=0;guard<40&&!(state.active===1&&state.phase==='attack'&&!state.pending);guard++){
   const legal=legalUniversalActions(packs,state);
   const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
   state=dispatchUniversalAction(packs,state,action);
  }
  const pull=(player,id)=>{
   for(const zone of ['hand','deck','life','outside','removed']){
    const list=state.players[player][zone];
    if(!list)continue;
    const index=list.findIndex(card=>card?.cardId===id);
    if(index>=0)return list.splice(index,1)[0];
   }
   throw Error('Missing '+id);
  };
  for(const player of [0,1]){
   for(const card of [...state.players[player].hand])state.players[player].deck.push(card);
   state.players[player].hand.length=0;
  }
  const low=pull(0,'SLG-1-001');
  const high=pull(0,'SLG-1-006');
  const current=pull(1,'SLG-1-015');
  const shared=pull(1,'SLG-1-005');
  const onlyLow=pull(1,'SLG-1-024');
  place(state,0,low,'front',swap?1:0);
  place(state,0,high,'front',swap?0:1);
  place(state,1,current,'front',0);
  place(state,1,shared,'front',1);
  place(state,1,onlyLow,'front',2);
  const raise=(card,bp)=>{
   const delta=bp-universalBp(packs,state,card);
   card.buffs=delta?[{bp:delta,untilTurn:state.turn}]:[];
  };
  raise(low,3000);
  raise(high,5000);
  raise(current,1500);
  raise(shared,2000);
  shared.attackDamageGranted={turn:state.turn,stamp:shared.fieldEntryStamp,amount:2};
  while(state.players[0].life.length>7)state.players[0].deck.push(state.players[0].life.pop());
  const life=state.players[0].life,deck=state.players[0].deck;
  for(let i=0;i<life.length;i++){
   if(source.cards[life[i].cardId]?.trigger==='get')continue;
   const index=deck.findIndex(card=>source.cards[card.cardId]?.trigger==='get');
   if(index<0)break;
   const got=deck.splice(index,1)[0];
   deck.push(life[i]);
   life[i]=got;
  }
  const swing=legalUniversalActions(packs,state).find(item=>item.type==='attack'&&item.uid===current.uid);
  state=dispatchUniversalAction(packs,state,swing,{actor:1});
  assert.equal(assertUniversalMatch(packs,state),true);
  const lists=uid=>{
   const copy=structuredClone(state);
   copy.pending={kind:'block',player:0,attackerUid:uid};
   return legalUniversalActions(packs,copy).filter(item=>item.type==='chooseBlock'&&item.uid).map(item=>item.uid).sort();
  };
  assert.deepEqual(lists(onlyLow.uid),[low.uid]);
  assert.deepEqual(lists(shared.uid),[high.uid,low.uid].sort());
  const choice=ask(packs,state);
  assert.equal(choice.action.uid??null,null);
  const played=answer(packs,state,[shared.uid,onlyLow.uid]);
  assert.equal(played.choices[0].uid,null);
  assert.equal(played.choices[1].uid,high.uid);
  assert.equal(played.choices[2].uid,low.uid);
  assert.equal(played.cursor.players[0].life.length,6);
  standing(played.cursor,[low.uid,high.uid]);
  return played.choices.map(row=>row.nodes);
 };
 const forward=open(false);
 const backward=open(true);
 assert.ok([...forward,...backward].every(nodes=>nodes<=48));
});

function doubleDeck(){
 return deck({
  'BLC-1-088':2,'BLC-4-036':4,'BLC-1-009':1,'BLC-4-005':2,'BLC-4-022':1,
  'BLC-4-070':2,'BLC-1-083':4,'BLC-4-068':2,'BLC-4-062':2,'BLC-1-082':2,
  'BLC-1-050':2,'BLC-2-040':4,'BLC-1-043':2
 });
}
function freshAttack(){
 const packs=[pack,pack];
 const built=doubleDeck();
 let state=newUniversalMatch(packs,{decks:[built,built],seed:11,first:0});
 for(let guard=0;guard<40&&!(state.active===1&&state.phase==='attack'&&!state.pending);guard++){
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
  state=dispatchUniversalAction(packs,state,action);
 }
 clearHand(state,0);
 clearHand(state,1);
 return {packs,state};
}
function arm(state,card,bp,damage=1,impact=0){
 setBp(state,card,bp);
 if(damage===2)card.attackDamageGranted={turn:state.turn,stamp:card.fieldEntryStamp,amount:2};
 if(impact)card.impactGranted={turn:state.turn,stamp:card.fieldEntryStamp,amount:1};
}
function swing(packs,state,uid){
 const action=legalUniversalActions(packs,state).find(item=>item.type==='attack'&&item.uid===uid);
 const next=dispatchUniversalAction(packs,state,action,{actor:1});
 assert.equal(assertUniversalMatch(packs,next),true);
 assert.equal(next.pending?.kind,'block');
 return next;
}
function follow(packs,start,laterUids){
 const choices=[];
 const marks=[];
 let cursor=start;
 const started=cursor.players[0].ownTurns;
 let at=0;
 for(let guard=0;guard<64;guard++){
  if(cursor.active===0&&cursor.phase==='start'&&!cursor.pending&&cursor.players[0].ownTurns>started)
   return {cursor,choices,marks};
  const legal=legalUniversalActions(packs,cursor);
  const actor=cursor.pending?.player??cursor.active;
  let action;
  if(cursor.pending?.kind==='block'){
   const choice=ask(packs,cursor);
   choices.push({attacker:cursor.pending.attackerUid,uid:choice.action.uid??null,
    nodes:choice.trace.nodesUsed??null,reason:choice.trace.reason,rows:choice.trace.candidates||[]});
   action=choice.action;
  }else if(cursor.pending?.kind==='life-trigger'){
   action=legal.find(item=>item.mode==='get')||legal.find(item=>item.mode==='skip');
  }else if(cursor.pending?.kind==='life-batch-order'){
   action=legal.find(item=>item.type==='chooseLifeOrder');
  }else if(!cursor.pending&&cursor.active===1&&cursor.phase==='attack'){
   const uid=laterUids[at];
   action=legal.find(item=>item.type==='attack'&&item.uid===uid)||legal.find(item=>item.type==='next');
   if(action?.type==='attack')at++;
  }else action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw');
  if(!action)throw Error('stuck '+(cursor.pending?.kind||cursor.phase));
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
  assert.equal(assertUniversalMatch(packs,cursor),true);
  if(action.type==='chooseBlock'&&action.uid){
   const body=cursor.players[0].front.find(card=>card?.uid===action.uid)||null;
   marks.push({uid:action.uid,life:cursor.players[0].life.length,ready:body?.ready??null,
    blocks:cursor.blocksByUid?.[action.uid]||0,present:!!body});
  }
 }
 throw Error('our turn did not start');
}
test('a printed second block stands again and stops the next attack',()=>{
 const {packs,state}=freshAttack();
 const mine=take(state,0,'BLC-1-088');
 const first=take(state,1,'BLC-1-009');
 const second=take(state,1,'BLC-4-036');
 place(state,0,mine,'front',0);
 place(state,1,first,'front',0);
 place(state,1,second,'front',1);
 arm(state,mine,5000);
 arm(state,first,4000);
 arm(state,second,4000,2,0);
 setLife(state,0,7);
 fillGetLife(state,0);
 assert.equal(state.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(packs,state),true);
 const opened=swing(packs,state,first.uid);
 assert.equal(universalImpact(packs,opened,first),1);
 assert.equal(universalAttackDamage(packs,opened,second),2);
 assert.equal(universalImpact(packs,opened,second),0);
 const played=follow(packs,opened,[second.uid]);
 assert.deepEqual(played.choices.map(row=>row.uid),[mine.uid,mine.uid]);
 assert.ok(played.choices.every(row=>row.reason!=='forced'&&row.nodes<=48));
 assert.deepEqual(played.marks,[
  {uid:mine.uid,life:7,ready:true,blocks:1,present:true},
  {uid:mine.uid,life:7,ready:false,blocks:2,present:true}
 ]);
 assert.equal(played.cursor.players[0].life.length,7);
 standing(played.cursor,[mine.uid]);
 const rows=played.choices[0].rows.filter(row=>row.action?.type==='chooseBlock');
 const blocked=rows.find(row=>row.action.uid===mine.uid);
 const passed=rows.find(row=>(row.action.uid??null)===null);
 assert.ok(blocked&&passed);
 assert.ok(blocked.battleScore>passed.battleScore);
 for(const row of rows)if(row.damageOpen)assert.notEqual(row.boundary,'returned');
});

test('a second block already spent does not stand for two more saves',()=>{
 const {packs,state}=freshAttack();
 const mine=take(state,0,'BLC-1-088');
 const spent=take(state,1,'BLC-4-036');
 const heavy=take(state,1,'BLC-4-036');
 const left=take(state,1,'BLC-4-036');
 const right=take(state,1,'BLC-4-036');
 place(state,0,mine,'front',0);
 place(state,1,spent,'front',0);
 place(state,1,heavy,'front',1);
 place(state,1,left,'front',2);
 place(state,1,right,'front',3);
 arm(state,mine,5000);
 arm(state,spent,2000);
 arm(state,heavy,4000,2,0);
 arm(state,left,3000);
 arm(state,right,3000);
 setLife(state,0,7);
 fillGetLife(state,0);
 assert.equal(assertUniversalMatch(packs,state),true);
 let cursor=swing(packs,state,spent.uid);
 const scripted=legalUniversalActions(packs,cursor).find(action=>action.type==='chooseBlock'&&action.uid===mine.uid);
 cursor=dispatchUniversalAction(packs,cursor,scripted,{actor:0});
 assert.equal(assertUniversalMatch(packs,cursor),true);
 assert.equal(cursor.players[0].life.length,7);
 assert.equal(cursor.players[0].front.find(card=>card?.uid===mine.uid)?.ready,true);
 assert.equal(cursor.blocksByUid[mine.uid],1);
 const played=follow(packs,cursor,[heavy.uid,left.uid,right.uid]);
 assert.equal(played.choices[0].uid,mine.uid);
 assert.equal(played.choices.filter(row=>row.uid).length,1);
 assert.equal(played.choices[0].reason!=='forced'&&played.choices[0].nodes<=48,true);
 assert.deepEqual(played.marks,[{uid:mine.uid,life:7,ready:false,blocks:2,present:true}]);
 assert.equal(played.cursor.players[0].life.length,5);
 standing(played.cursor,[mine.uid]);
});

test('a locked or silenced second block is not a proven later save',()=>{
 const run=(kind)=>{
  const {packs,state}=freshAttack();
  const mine=take(state,0,'BLC-1-088');
  const first=take(state,1,'BLC-1-009');
  const second=take(state,1,'BLC-4-036');
  place(state,0,mine,'front',0);
  place(state,1,first,'front',0);
  place(state,1,second,'front',1);
  arm(state,mine,5000);
  arm(state,first,4000);
  arm(state,second,4000,2,0);
  setLife(state,0,7);
  fillGetLife(state,0);
  const until={player:0,phase:'start',edge:'start'};
  grantContinuousState(state,{kind,controller:0,sourceUid:first.uid,targetUid:mine.uid,sourceLinked:false,
   ...(kind==='skipNextActive'?{}:{until})});
  assert.equal(assertUniversalMatch(packs,state),true);
  const opened=swing(packs,state,first.uid);
  const played=follow(packs,opened,[second.uid]);
  assert.deepEqual(played.choices.map(row=>row.uid),[null,mine.uid]);
  assert.equal(played.choices[1].reason!=='forced'&&played.choices[1].nodes<=48,true);
  assert.deepEqual(played.marks,[{uid:mine.uid,life:6,ready:false,blocks:1,present:true}]);
  assert.equal(played.cursor.players[0].life.length,6);
  standing(played.cursor,[mine.uid]);
 };
 run('skipNextActive');
 run('cannotActive');
 run('originalEffectsDisabled');
});

test('a blocker that leaves is not assigned to the next attack',()=>{
 const {packs,state}=freshAttack();
 const mine=take(state,0,'BLC-1-088');
 const first=take(state,1,'BLC-4-036');
 const second=take(state,1,'BLC-4-036');
 place(state,0,mine,'front',0);
 place(state,1,first,'front',0);
 place(state,1,second,'front',1);
 arm(state,mine,3000);
 arm(state,first,4000);
 arm(state,second,2000,2,0);
 setLife(state,0,7);
 fillGetLife(state,0);
 assert.equal(assertUniversalMatch(packs,state),true);
 const opened=swing(packs,state,first.uid);
 const played=follow(packs,opened,[second.uid]);
 assert.deepEqual(played.choices.map(row=>row.uid),[null,mine.uid]);
 assert.deepEqual(played.marks,[{uid:mine.uid,life:6,ready:true,blocks:1,present:true}]);
 assert.equal(played.cursor.players[0].life.length,6);
 standing(played.cursor,[mine.uid]);
});

test('a normal blocker and a second blocker still cover the whole attack',()=>{
 const play=(swapUs,swapLater)=>{
  const {packs,state}=freshAttack();
  const tall=take(state,0,'BLC-1-088');
  const short=take(state,0,'BLC-4-036');
  const first=take(state,1,'BLC-1-009');
  const mid=take(state,1,'BLC-4-036');
  const last=take(state,1,'BLC-4-036');
  place(state,0,tall,'front',swapUs?1:0);
  place(state,0,short,'front',swapUs?0:1);
  place(state,1,first,'front',0);
  place(state,1,mid,'front',1);
  place(state,1,last,'front',2);
  arm(state,tall,6000);
  arm(state,short,4500);
  arm(state,first,4000);
  arm(state,mid,4000,2,0);
  arm(state,last,5000,2,1);
  if(swapLater){
   const front=state.players[1].front;
   [front[1],front[2]]=[front[2],front[1]];
  }
  setLife(state,0,7);
  fillGetLife(state,0);
  assert.equal(state.players[0].hand.length,0);
  assert.equal(assertUniversalMatch(packs,state),true);
  const opened=swing(packs,state,first.uid);
  const order=swapLater?[last.uid,mid.uid]:[mid.uid,last.uid];
  const played=follow(packs,opened,order);
  assert.equal(played.choices.filter(row=>row.uid).length,3);
  assert.ok(played.choices.every(row=>row.reason!=='forced'&&row.nodes<=48));
  assert.equal(Math.max(...played.marks.filter(row=>row.uid===tall.uid).map(row=>row.blocks)),2);
  assert.equal(Math.max(...played.marks.filter(row=>row.uid===short.uid).map(row=>row.blocks)),1);
  assert.equal(played.cursor.players[0].life.length,7);
  standing(played.cursor,[tall.uid,short.uid]);
 };
 play(false,false);
 play(true,false);
 play(false,true);
});

function devDeck(){
 return deck({
  'BLC-4-066':2,'BLC-1-083':4,'BLC-2-066':3,'BLC-2-069':2,
  'BLC-2-067':4,'BLC-1-085':2,'BLC-2-073':2,'BLC-4-070':4,
  'BLC-1-080':2,'BLC-4-005':4
 });
}
function readyAp(state,player){
 return state.players[player].apCards.filter(card=>card.inPlay&&card.ready).length;
}
function reachStart(ap,first=0){
 const packs=[pack,pack];
 const used=devDeck();
 let state=newUniversalMatch(packs,{decks:[used,used],seed:21,first});
 for(let guard=0;guard<160&&state.status==='playing';guard++){
  if(state.active===first&&state.phase==='start'&&!state.pending&&readyAp(state,first)>=ap)break;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal[0];
  state=dispatchUniversalAction(packs,state,action);
 }
 assert.equal(state.phase,'start');
 assert.equal(state.active,first);
 assert.equal(state.pending,null);
 assert.ok(readyAp(state,first)>=ap);
 return {packs,state};
}
function wipeSide(state,player){
 clearHand(state,player);
 for(const line of ['front','energy']){
  for(let slot=0;slot<4;slot++){
   const card=state.players[player][line][slot];
   if(!card)continue;
   state.players[player].deck.push(card);
   state.players[player][line][slot]=null;
  }
 }
}
function hold(state,player,ids){
 const cards=ids.map(id=>take(state,player,id));
 state.players[player].hand.push(...cards);
 return cards;
}
function clockAsk(packs,state){
 const actor=state.pending?.player??state.active;
 resetAiV3Report();
 const action=chooseAiV3Action(packs,structuredClone(state),{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 if(trace.reason!=='forced')assert.ok(trace.nodesUsed<=48);
 if(trace.reason==='budget-fallback'){
  assert.equal(trace.fallbackKind,'budget');
  assert.equal(trace.incomplete,true);
  assert.equal(trace.settled,false);
 }
 console.log('clock40',JSON.stringify({
  action,reason:trace.reason,nodes:trace.nodesUsed??null,fallback:trace.fallbackKind??null,
  executed:trace.coverage?.executed??null,roots:trace.coverage?.roots??null,
  cutoff:trace.coverage?.reasons??null,over:trace.overSoft??null
 }));
 return {action,trace};
}
function passToMain(packs,state){
 let cursor=state;
 const passed=[];
 for(let guard=0;guard<4&&cursor.phase!=='main';guard++){
  assert.ok(cursor.phase==='start'||cursor.phase==='move');
  const choice=ask(packs,cursor);
  passed.push({phase:cursor.phase,type:choice.action.type,reason:choice.trace.reason,nodes:choice.trace.nodesUsed});
  assert.equal(choice.action.type,'next');
  cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor:0});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 assert.equal(cursor.phase,'main');
 return {cursor,passed};
}

function openDiscard(first=0,dropEvent=false){
 const {packs,state}=reachStart(2,first);
 wipeSide(state,0);
 wipeSide(state,1);
 place(state,first,take(state,first,'BLC-1-083'),'energy',0);
 const played=take(state,first,'BLC-4-066');
 const ids=['BLC-4-066','BLC-2-069','BLC-2-067','BLC-2-067','BLC-1-085'];
 if(!dropEvent)ids.push('BLC-2-073');
 const kept=hold(state,first,ids);
 state.players[first].hand.push(played);
 setLife(state,0,7);
 setLife(state,1,7);
 state.players[first].apCards.forEach((card,index)=>{card.inPlay=index<2;card.ready=index<2;});
 let cursor=state;
 for(let guard=0;guard<4&&cursor.phase!=='main';guard++){
  const step=legalUniversalActions(packs,cursor).find(action=>action.type==='next');
  cursor=dispatchUniversalAction(packs,cursor,step,{actor:first});
 }
 assert.equal(cursor.phase,'main');
 assert.equal(readyAp(cursor,first),2);
 assert.equal(assertUniversalMatch(packs,cursor),true);
 const play=legalUniversalActions(packs,cursor).find(action=>action.type==='play'&&action.uid===played.uid&&action.line==='energy');
 assert.ok(play);
 cursor=dispatchUniversalAction(packs,cursor,play,{actor:first});
 assert.equal(cursor.pending?.kind,'effect-discard-gate');
 assert.equal(cursor.pending.player,first);
 assert.equal(readyAp(cursor,first),1);
 assert.equal(universalEnergyByColor(packs,cursor,first).green,2);
 assert.equal(cursor.players[0].front.filter(Boolean).length,0);
 assert.equal(cursor.players[1].front.filter(Boolean).length,0);
 assert.equal(assertUniversalMatch(packs,cursor),true);
 return {packs,state:cursor,event:dropEvent?null:kept[5].uid,generator:kept[0].uid,played:played.uid,actor:first};
}
function askUntil(packs,state,at){
 const meter={dispatches:0};
 resetAiV3Report();
 const actor=state.pending?.player??state.active;
 const action=chooseAiV3Action(packs,state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,diagnose:true,meter,
  ms:at==null?1e9:40,now:at==null?()=>0:()=>meter.dispatches>=at?1e9:0
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=48);
 return {action,trace,meter};
}

test('an optional discard spends the unaffordable event and keeps the generator',()=>{
 const opened=openDiscard();
 const {packs,event,generator,played}=opened;
 let cursor=opened.state;
 const clock=clockAsk(packs,cursor);
 const choice=ask(packs,cursor);
 assert.equal(choice.action.type,'chooseDiscardGate');
 assert.equal(choice.action.uid,event);
 const clockCard=cursor.players[0].hand.find(card=>card.uid===clock.action.uid);
 console.log('discard clock',clockCard?pack.cards[clockCard.cardId].name:clock.action.uid,clock.trace.reason,'nodes',clock.trace.nodesUsed,'over',clock.trace.overSoft);
 cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor:cursor.pending.player});
 assert.equal(assertUniversalMatch(packs,cursor),true);
 for(let guard=0;guard<6&&cursor.pending;guard++){
  const step=ask(packs,cursor);
  cursor=dispatchUniversalAction(packs,cursor,step.action,{actor:cursor.pending.player});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 assert.equal(cursor.pending,null);
 assert.equal(cursor.players[0].hand.some(card=>card.uid===event),false);
 assert.equal(cursor.players[0].outside.some(card=>card.uid===event),true);
 assert.equal(cursor.players[0].hand.some(card=>card.uid===generator),true);
 assert.equal(cursor.players[0].energy.some(card=>card?.uid===played),true);
});

test('the same discard stays on the event at every listed cutoff',()=>{
 const spot=openDiscard();
 const cuts=[8,16,24,32,40,44,null];
 for(const at of cuts){
  const {action,trace,meter}=askUntil(spot.packs,spot.state,at);
  const card=spot.state.players[0].hand.find(item=>item.uid===action.uid);
  assert.equal(action.type,'chooseDiscardGate',String(at));
  assert.equal(action.uid,spot.event,String(at)+' '+(card?pack.cards[card.cardId].name:''));
  const row=(trace.candidates||[]).find(item=>item.action?.uid===action.uid);
  if(row){
   assert.equal(trace.settled,row.settled===true);
   assert.equal(trace.score,row.search);
   if(trace.sequence?.length)assert.equal(trace.sequence[0].uid,action.uid);
  }else{
   assert.equal(trace.settled,false);
   assert.equal(trace.sequence?.length||0,0);
  }
  if(at==null){
   assert.equal(trace.reason,'search');
   assert.equal(trace.overSoft,false);
   assert.equal(trace.settled,true);
  }else{
   assert.equal(meter.dispatches,at);
   assert.equal(trace.overSoft,true);
   assert.ok(trace.reason==='budget'||trace.reason==='budget-fallback');
  }
 }
 const early=askUntil(spot.packs,spot.state,8);
 assert.equal(early.trace.settled,false);
 assert.equal(early.trace.incomplete,true);
 assert.equal(early.trace.coverage.executed,1);
 assert.equal(early.trace.coverage.unexecuted,3);
 const unfinished=early.trace.candidates.find(item=>item.action?.uid===spot.event);
 assert.equal(unfinished.boundary,'yielded');
 assert.equal(unfinished.settled,false);
 assert.equal(unfinished.cut,'time');
 const tied=askUntil(spot.packs,spot.state,24);
 const eventRow=tied.trace.candidates.find(item=>item.action?.uid===spot.event);
 const others=tied.trace.candidates.filter(item=>item.action?.uid&&item.action.uid!==spot.event&&item.boundary==='returned');
 assert.ok(others.length>=1);
 assert.ok(others.every(item=>item.search===eventRow.search));
 const open=tied.trace.candidates.find(item=>item.settled!==true);
 assert.ok(open);
 if(open.search>eventRow.search)assert.equal(open.settled,false);
});

function lethalHand(){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:11,first:0});
 for(let guard=0;guard<40&&state.status==='playing';guard++){
  if(state.active===0&&state.phase==='main'&&!state.pending)break;
  const legal=legalUniversalActions(packs,state);
  state=dispatchUniversalAction(packs,state,legal.find(item=>item.type==='next')||legal[0]);
 }
 clearHand(state,0);
 clearHand(state,1);
 for(const player of [0,1])for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
  const card=state.players[player][line][slot];
  if(card){state.players[player].deck.push(card);state.players[player][line][slot]=null;}
 }
 const orihime=take(state,0,'BLC-4-022');
 const heavy=take(state,0,'BLC-4-036');
 state.players[0].hand.push(orihime,heavy);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-2-040'),'energy',slot);
 setLife(state,0,7);
 setLife(state,1,1);
 state.players[0].apCards.forEach((card,index)=>{card.inPlay=index<2;card.ready=index<2;});
 assert.equal(state.phase,'main');
 assert.equal(readyAp(state,0),2);
 assert.equal(universalEnergyByColor(packs,state,0).blue,4);
 assert.equal(state.players[0].front.filter(Boolean).length,0);
 assert.equal(state.players[1].front.filter(Boolean).length,0);
 assert.equal(assertUniversalMatch(packs,state),true);
 return {packs,state,orihime,heavy};
}

test('a full energy line does not count a replaced generator as new energy',()=>{
 const {packs,state,orihime}=lethalHand();
 const energy=legalUniversalActions(packs,state).find(action=>action.type==='play'&&action.line==='energy'&&action.uid===orihime.uid);
 const net=energyPlayNet(packs,state,0,energy);
 assert.equal(net.before.blue,4);
 assert.equal(net.after.blue,4);
 assert.equal(net.gain.blue||0,0);
 assert.equal(net.ap,2);
 assert.equal(net.readyAfter,0);
 const held=state.players[0].energy[3];
 state.players[0].energy[3]=null;
 state.players[0].hand.push(held);
 const added=legalUniversalActions(packs,state).find(action=>action.type==='play'&&action.line==='energy'&&action.uid===held.uid&&!action.replaceUid);
 const grown=energyPlayNet(packs,state,0,added);
 assert.equal(grown.before.blue,3);
 assert.equal(grown.after.blue,4);
 assert.equal(grown.gain.blue,1);
});

test('a proven win stays on the front when energy would only replace a generator',()=>{
 const {packs,state,orihime}=lethalHand();
 const choice=ask(packs,state);
 assert.equal(choice.action.type,'play');
 assert.equal(choice.action.line,'front');
 assert.equal(choice.action.uid,orihime.uid);
 assert.equal(choice.trace.reason,'search');
 assert.equal(choice.trace.score,100000);
 assert.equal(choice.trace.settled,true);
 assert.equal(choice.trace.sequence[0].type,'play');
 assert.equal(choice.trace.sequence[0].line,'front');
 assert.equal(choice.trace.sequence[0].uid,orihime.uid);
 const front=choice.trace.candidates.find(row=>row.action?.line==='front'&&row.action.uid===orihime.uid);
 assert.equal(front.boundary,'terminal');
 assert.equal(front.search,100000);
 let cursor=dispatchUniversalAction(packs,state,choice.action,{actor:0});
 assert.equal(assertUniversalMatch(packs,cursor),true);
 for(let guard=0;guard<12&&cursor.status==='playing';guard++){
  const legal=legalUniversalActions(packs,cursor);
  let step;
  if(cursor.pending?.kind==='effect-discard-gate')
   step=legal.find(action=>action.type==='chooseDiscardGate'&&(action.uid??null)===null);
  else if(cursor.pending?.kind==='block')
   step=legal.find(action=>action.type==='chooseBlock'&&(action.uid??null)===null);
  else if(cursor.pending?.kind==='life-trigger')
   step=legal.find(action=>action.type==='chooseTrigger'&&action.mode==='skip')||legal[0];
  else step=legal.find(action=>action.type==='attack'&&action.uid===orihime.uid)||legal.find(action=>action.type==='next');
  assert.ok(step,cursor.pending?.kind||cursor.phase);
  cursor=dispatchUniversalAction(packs,cursor,step,{actor:cursor.pending?.player??cursor.active});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 assert.equal(cursor.status,'finished');
 assert.equal(cursor.winner,0);
 assert.equal(cursor.players[1].life.length,0);
});

test('a short energy line draws before it spends the only payable generator',()=>{
 const {packs,state}=reachStart(3);
 wipeSide(state,0);
 wipeSide(state,1);
 place(state,0,take(state,0,'BLC-1-083'),'energy',0);
 place(state,0,take(state,0,'BLC-2-066'),'energy',1);
 const hand=hold(state,0,['BLC-2-067','BLC-2-067','BLC-2-067','BLC-1-085','BLC-2-073','BLC-4-070']);
 const generator=hand[5];
 place(state,1,take(state,1,'BLC-4-070'),'front',0);
 setLife(state,0,7);
 setLife(state,1,7);
 const expensive=take(state,0,'BLC-1-080');
 const cheap=take(state,0,'BLC-1-083');
 state.players[0].deck.unshift(expensive,cheap);
 assert.equal(readyAp(state,0),3);
 assert.equal(universalEnergyByColor(packs,state,0).green,2);
 assert.equal(state.players[0].front.filter(Boolean).length,0);
 assert.equal(assertUniversalMatch(packs,state),true);
 const swapped=structuredClone(state);
 [swapped.players[0].deck[0],swapped.players[0].deck[1]]=[swapped.players[0].deck[1],swapped.players[0].deck[0]];
 const clock=clockAsk(packs,state);
 const drawn=ask(packs,state);
 const again=ask(packs,swapped);
 assert.equal(drawn.action.type,'extraDraw');
 assert.deepEqual(again.action,drawn.action);
 assert.equal(clock.action.type,'extraDraw');
 let cursor=dispatchUniversalAction(packs,state,drawn.action,{actor:0});
 assert.equal(assertUniversalMatch(packs,cursor),true);
 assert.equal(readyAp(cursor,0),2);
 assert.equal(cursor.players[0].hand.length,7);
 assert.equal(cursor.players[0].hand.some(card=>card.uid===expensive.uid),true);
 const main=passToMain(packs,cursor);
 cursor=main.cursor;
 assert.equal(readyAp(cursor,0),2);
 const first=ask(packs,cursor);
 assert.equal(first.action.type,'play');
 assert.equal(first.action.line,'energy');
 assert.equal(first.action.uid,generator.uid);
 cursor=dispatchUniversalAction(packs,cursor,first.action,{actor:0});
 assert.equal(assertUniversalMatch(packs,cursor),true);
 assert.equal(universalEnergyByColor(packs,cursor,0).green,3);
 assert.equal(cursor.players[0].energy.some(card=>card?.uid===generator.uid),true);
 assert.equal(readyAp(cursor,0),1);
});

test('a zero-cost draw and the one-cost generator both become energy',()=>{
 const {packs,state}=reachStart(3);
 wipeSide(state,0);
 wipeSide(state,1);
 place(state,0,take(state,0,'BLC-2-066'),'energy',0);
 place(state,0,take(state,0,'BLC-2-066'),'energy',1);
 const hand=hold(state,0,['BLC-2-067','BLC-2-067','BLC-2-067','BLC-1-085','BLC-2-073','BLC-4-070']);
 const generator=hand[5];
 place(state,1,take(state,1,'BLC-1-080'),'front',0);
 setBp(state,state.players[1].front[0],4000);
 setLife(state,0,7);
 setLife(state,1,7);
 const zero=take(state,0,'BLC-1-083');
 const other=take(state,0,'BLC-1-080');
 state.players[0].deck.unshift(zero,other);
 assert.equal(assertUniversalMatch(packs,state),true);
 const hidden=structuredClone(state);
 [hidden.players[0].deck[0],hidden.players[0].deck[1]]=[hidden.players[0].deck[1],hidden.players[0].deck[0]];
 assert.deepEqual(ask(packs,hidden).action,ask(packs,state).action);
 const drawn=ask(packs,state);
 assert.equal(drawn.action.type,'extraDraw');
 let cursor=dispatchUniversalAction(packs,state,drawn.action,{actor:0});
 assert.equal(cursor.players[0].hand.some(card=>card.uid===zero.uid),true);
 assert.equal(readyAp(cursor,0),2);
 assert.equal(assertUniversalMatch(packs,cursor),true);
 cursor=passToMain(packs,cursor).cursor;
 const played=[];
 for(let step=0;step<4&&cursor.phase==='main'&&cursor.active===0&&!cursor.pending;step++){
  const choice=ask(packs,cursor);
  const card=cursor.players[0].hand.find(item=>item?.uid===choice.action.uid);
  played.push(choice.action.type+':'+(choice.action.line||'')+':'+(card?.cardId||''));
  if(choice.action.type==='next')break;
  cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor:0});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 assert.equal(cursor.players[0].energy.some(card=>card?.uid===zero.uid),true,played.join(' || '));
 assert.equal(cursor.players[0].energy.some(card=>card?.uid===generator.uid),true,played.join(' || '));
 assert.equal(universalEnergyByColor(packs,cursor,0).green,4);
 assert.equal(readyAp(cursor,0),0);
});

test('a finished three-card plan still draws and keeps the spent action point',()=>{
 const {packs,state}=reachStart(3);
 wipeSide(state,0);
 wipeSide(state,1);
 for(let slot=0;slot<3;slot++)place(state,0,take(state,0,'BLC-2-066'),'energy',slot);
 const ours=[0,1].map(slot=>{
  const card=take(state,0,'BLC-4-005');
  place(state,0,card,'front',slot);
  setBp(state,card,4000);
  return card;
 });
 const theirs=[0,1].map(slot=>{
  const card=take(state,1,'BLC-4-005');
  place(state,1,card,'front',slot);
  setBp(state,card,4000);
  return card;
 });
 const hand=hold(state,0,['BLC-1-083','BLC-4-070','BLC-1-080']);
 setLife(state,0,6);
 setLife(state,1,6);
 const low=take(state,0,'BLC-1-083');
 const high=take(state,0,'BLC-2-067');
 state.players[0].deck.unshift(high,low);
 assert.equal(readyAp(state,0),3);
 assert.equal(universalEnergyByColor(packs,state,0).green,3);
 assert.equal(ours.length,2);
 assert.equal(theirs.length,2);
 assert.equal(assertUniversalMatch(packs,state),true);
 const hidden=structuredClone(state);
 [hidden.players[0].deck[0],hidden.players[0].deck[1]]=[hidden.players[0].deck[1],hidden.players[0].deck[0]];
 const clock=clockAsk(packs,state);
 const drawn=ask(packs,state);
 assert.equal(drawn.action.type,'extraDraw');
 assert.deepEqual(ask(packs,hidden).action,drawn.action);
 assert.equal(clock.action.type,'extraDraw');
 let cursor=dispatchUniversalAction(packs,state,drawn.action,{actor:0});
 assert.equal(readyAp(cursor,0),2);
 assert.equal(cursor.players[0].hand.some(card=>card.uid===high.uid),true);
 assert.equal(assertUniversalMatch(packs,cursor),true);
 cursor=passToMain(packs,cursor).cursor;
 assert.equal(readyAp(cursor,0),2);
 const played=[];
 for(let step=0;step<6&&cursor.phase==='main'&&cursor.active===0&&!cursor.pending;step++){
  assert.ok(readyAp(cursor,0)<=2);
  const choice=ask(packs,cursor);
  const card=cursor.players[0].hand.find(item=>item?.uid===choice.action.uid);
  played.push({type:choice.action.type,line:choice.action.line||null,id:card?.cardId||null,ap:readyAp(cursor,0),reason:choice.trace.reason,nodes:choice.trace.nodesUsed});
  if(choice.action.type==='next')break;
  cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor:0});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 const spent=hand.filter(card=>!cursor.players[0].hand.some(item=>item.uid===card.uid));
 assert.ok(spent.length<=2,JSON.stringify(played));
 assert.ok(readyAp(cursor,0)<=2);
 console.log('after draw',JSON.stringify(played));
});

function reachMove(actor){
 const packs=[pack,pack];
 const used=devDeck();
 let state=newUniversalMatch(packs,{decks:[used,used],seed:21,first:0});
 for(let guard=0;guard<160&&state.status==='playing';guard++){
  if(state.active===actor&&state.phase==='move'&&!state.pending&&state.players[0].ownTurns>=2&&state.players[1].ownTurns>=2)break;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal[0];
  state=dispatchUniversalAction(packs,state,action);
 }
 assert.equal(state.active,actor);
 assert.equal(state.phase,'move');
 assert.equal(state.pending,null);
 assert.ok(state.players[0].ownTurns>=2&&state.players[1].ownTurns>=2);
 return {packs,state};
}
function lifeSpot(actor){
 const {packs,state}=reachMove(actor);
 const opp=1-actor;
 wipeSide(state,0);
 wipeSide(state,1);
 const body=take(state,actor,'BLC-2-069');
 place(state,actor,body,'energy',0);
 const stranded=take(state,actor,'BLC-1-080');
 state.players[actor].hand.push(stranded);
 const big=take(state,opp,'BLC-4-070');
 const small=take(state,opp,'BLC-2-066');
 place(state,opp,big,'front',0);
 place(state,opp,small,'front',1);
 setLife(state,actor,2);
 setLife(state,opp,7);
 fillGetLife(state,actor);
 fillGetLife(state,opp);
 assert.equal(state.players[actor].front.filter(Boolean).length,0);
 assert.equal(state.players[actor].hand.map(card=>card.cardId).join(','),'BLC-1-080');
 assert.equal(state.players[opp].hand.length,0);
 assert.equal(universalEnergyByColor(packs,state,actor).green,1);
 assert.equal(pack.cards['BLC-1-080'].energy,4);
 assert.equal(universalBp(packs,state,body),2500);
 assert.equal(universalBp(packs,state,big),4000);
 assert.equal(universalBp(packs,state,small),2000);
 assert.equal(universalAttackDamage(packs,state,big),1);
 assert.equal(universalAttackDamage(packs,state,small),1);
 assert.equal(universalImpact(packs,state,big),0);
 assert.equal(universalImpact(packs,state,small),0);
 assert.equal(assertUniversalMatch(packs,state),true);
 return {packs,state,body,big,small,opp};
}
function act(packs,cursor,action){
 const seat=cursor.pending?.player??cursor.active;
 const next=dispatchUniversalAction(packs,cursor,action,{actor:seat});
 assert.equal(assertUniversalMatch(packs,next),true);
 return next;
}
// Walk one stretch. Moving the 2500, blocking the 2000, and taking the 4000
// returns to our next start at 1 life with the character still in play.
// Passing takes both hits. This is not a claim about the rest of the game.
function stretch(packs,start,actor,body,big,small,doMove,order){
 let cursor=start;
 const began=cursor.players[actor].ownTurns;
 let moved=!doMove;
 let sawBlock=false;
 let lived=false;
 for(let guard=0;guard<80;guard++){
  if(cursor.status!=='playing')return {cursor,sawBlock,lived};
  if(cursor.active===actor&&cursor.phase==='start'&&!cursor.pending&&cursor.players[actor].ownTurns>began)
   return {cursor,sawBlock,lived};
  const legal=legalUniversalActions(packs,cursor);
  const seat=cursor.pending?.player??cursor.active;
  let action;
  if(!moved){
   action=legal.find(item=>item.type==='move'&&item.uid===body.uid&&item.slot===0);
   moved=true;
  }else if(cursor.pending?.kind==='block'){
   const blocking=doMove&&cursor.pending.attackerUid===small.uid;
   action=blocking
    ?legal.find(item=>item.type==='chooseBlock'&&item.uid===body.uid)
    :legal.find(item=>item.type==='chooseBlock'&&(item.uid==null));
   if(blocking){
    assert.ok(action,'block against the 2000 is legal');
    sawBlock=true;
   }
  }else if(cursor.pending?.kind==='life-trigger'){
   action=legal.find(item=>item.type==='chooseTrigger'&&item.mode==='skip');
   assert.equal(cursor.pending.trigger,'get');
  }else if(cursor.pending?.kind==='attack-life-target'){
   action=legal.find(item=>item.type==='chooseAttackLife');
  }else if(cursor.pending){
   throw Error('unexpected '+(cursor.pending.kind));
  }else if(seat!==actor&&cursor.phase==='attack'){
   const uid=order.find(item=>legal.some(entry=>entry.type==='attack'&&entry.uid===item&&!entry.targetUid));
   action=uid?legal.find(entry=>entry.type==='attack'&&entry.uid===uid&&!entry.targetUid):legal.find(entry=>entry.type==='next');
  }else action=legal.find(item=>item.type==='next');
  assert.ok(action,cursor.pending?.kind||cursor.phase);
  cursor=act(packs,cursor,action);
  if(sawBlock&&!lived){
   assert.equal(cursor.players[actor].front.some(card=>card?.uid===body.uid),true);
   lived=true;
  }
 }
 throw Error('stretch did not finish');
}
function frozenAsk(packs,state){
 const meter={dispatches:0};
 const actor=state.pending?.player??state.active;
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true,meter
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=48);
 return {action,trace};
}

test('a partial block that saves the last life is not replaced by the losing pass',()=>{
 for(const actor of [0,1]){
  const spot=lifeSpot(actor);
  const {packs,body,big,small}=spot;
  const orders=[[big.uid,small.uid],[small.uid,big.uid]];
  for(const order of orders){
   const saved=stretch(packs,structuredClone(spot.state),actor,body,big,small,true,order);
   assert.equal(saved.sawBlock,true);
   assert.equal(saved.lived,true);
   assert.equal(saved.cursor.status,'playing');
   assert.equal(saved.cursor.phase,'start');
   assert.equal(saved.cursor.active,actor);
   assert.equal(saved.cursor.players[actor].life.length,1);
   assert.equal(saved.cursor.players[actor].front.some(card=>card?.uid===body.uid),true);
   const lost=stretch(packs,structuredClone(spot.state),actor,body,big,small,false,order);
   assert.equal(lost.cursor.status,'finished');
   assert.equal(lost.cursor.winner,1-actor);
   assert.equal(lost.cursor.players[actor].life.length,0);
  }
  const move=legalUniversalActions(packs,spot.state).find(item=>item.type==='move'&&item.uid===body.uid);
  const view=moveDevelopment(packs,spot.state,actor,move);
  assert.equal(view.benefit,'block');
  assert.equal(view.strip,false);
  assert.equal(view.reason,'block');
  const frozen=frozenAsk(packs,spot.state);
  const moveRow=frozen.trace.candidates.find(row=>row.action?.type==='move'&&row.action.uid===body.uid);
  const passRow=frozen.trace.candidates.find(row=>row.action?.type==='next');
  assert.equal(frozen.action.type,'move');
  assert.equal(frozen.action.uid,body.uid);
  assert.equal(moveRow.boundary,'returned');
  assert.equal(moveRow.settled,true);
  assert.ok(moveRow.search>-90000);
  assert.equal(passRow.search,-100000);
  assert.equal(passRow.boundary,'terminal');
  assert.equal(passRow.settled,true);
  assert.equal(frozen.trace.score,moveRow.search);
  assert.equal(frozen.trace.settled,true);
  assert.equal(frozen.trace.incomplete,false);
  assert.equal(frozen.trace.sequence[0].type,'move');
  assert.equal(frozen.trace.sequence[0].uid,body.uid);
  assert.equal(frozen.trace.replacedMove,null);
  assert.equal(frozen.trace.reason,'search');
  console.log('life-save frozen',JSON.stringify({
   actor,score:frozen.trace.score,nodes:frozen.trace.nodesUsed,boundary:moveRow.boundary,pass:passRow.search
  }));
  let roots=0,hot=false;
  const meter={dispatches:0};
  resetAiV3Report();
  const cut=chooseAiV3Action(packs,spot.state,{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter,
   now:()=>hot?1e9:0,
   onRootDone(){roots++;if(roots>=2)hot=true;}
  });
  const cutTrace=lastAiV3Trace();
  const cutMove=cutTrace.candidates.find(row=>row.action?.type==='move'&&row.action.uid===body.uid);
  const cutPass=cutTrace.candidates.find(row=>row.action?.type==='next');
  assert.equal(meter.dispatches,cutTrace.nodesUsed);
  assert.ok(cutTrace.nodesUsed<=48);
  assert.equal(cut.type,'move');
  assert.equal(cut.uid,body.uid);
  assert.equal(cutMove.boundary,'returned');
  assert.equal(cutMove.settled,true);
  assert.equal(cutPass.boundary,'terminal');
  assert.equal(cutPass.search,-100000);
  assert.equal(cutTrace.score,cutMove.search);
  assert.equal(cutTrace.sequence[0].type,'move');
  assert.equal(cutTrace.sequence[0].uid,body.uid);
  assert.equal(cutTrace.settled,cutMove.settled===true);
  assert.equal(cutTrace.incomplete,!cutTrace.settled);
  assert.equal(cutTrace.overSoft,true);
  assert.notEqual(cut.type,'next');
  const timedMeter={dispatches:0};
  resetAiV3Report();
  const timed=chooseAiV3Action(packs,structuredClone(spot.state),{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter:timedMeter
  });
  const timedTrace=lastAiV3Trace();
  assert.equal(timedMeter.dispatches,timedTrace.nodesUsed);
  assert.ok(timedTrace.nodesUsed<=48);
  const timedMove=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type==='move'&&row.action.uid===body.uid);
  const timedPass=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type==='next');
  if(timedMove?.boundary==='returned'&&timedMove.settled&&timedPass?.boundary==='terminal'&&timedPass.search<=-90000){
   assert.equal(timed.type,'move');
   assert.equal(timedTrace.score,timedMove.search);
   assert.equal(timedTrace.sequence[0].type,'move');
   assert.equal(timedTrace.settled,true);
  }else{
   const chosen=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type===timed.type&&(row.action?.uid??null)===(timed.uid??null));
   if(chosen){
    assert.equal(timedTrace.score,chosen.search);
    if(timedTrace.settled)assert.equal(chosen.boundary==='returned'||chosen.boundary==='terminal',true);
   }else{
    assert.equal(timedTrace.settled,false);
    assert.equal(timedTrace.incomplete,true);
   }
  }
  console.log('clock40 life-save',JSON.stringify({
   actor,action:timed.type,reason:timedTrace.reason,nodes:timedTrace.nodesUsed,
   settled:timedTrace.settled,fallback:timedTrace.fallbackKind??null,over:timedTrace.overSoft??null
  }));
 }
});

// Official 4-cost 4000 raids all print an extra effect. These two are blank
// test cards: one raids 更木 剣八, the other only plays normally. Neither
// generates energy or has an entry, raid, attack, or AP effect.
function blankDeveloper(id,name,extra){
 const card=structuredClone(pack.cards['BLC-4-005']);
 card.id=id;
 card.name=name;
 card.color='green';
 card.energy=4;
 card.ap=1;
 card.bp=4000;
 card.gen=0;
 card.trigger=null;
 card.effects={};
 card.mainAbility=null;
 card.printedMains=[];
 card.phaseEffects=[];
 card.passiveBonuses=[];
 card.ownTurnBp=0;
 card.raidOwnTurnBp=0;
 card.raidBp=0;
 card.raidImpact=0;
 card.printedAttackDamage=1;
 card.raidName=null;
 card.raidBaseNames=[];
 card.raidRequiresNames=[];
 card.raidFromRaid=[];
 card.enterAlwaysActive=false;
 card.enterActiveIfOpponentRest=false;
 card.implementation='printed';
 return Object.assign(card,extra||{});
}
function developerPack(gen=0){
 const cards={...pack.cards};
 const baseName=pack.cards['BLC-2-066'].name;
 cards['TEST-BLANK-RAID']=blankDeveloper('TEST-BLANK-RAID','測試白板突襲',{
  raidName:baseName,raidBaseNames:[baseName],gen
 });
 cards['TEST-BLANK-MAIN']=blankDeveloper('TEST-BLANK-MAIN','測試白板主力',{gen});
 return {...pack,cards};
}
function developerDeck(source){
 const counts={'TEST-BLANK-RAID':1,'TEST-BLANK-MAIN':1,'BLC-2-066':1,'BLC-1-083':4};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=source.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(source.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(source,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
function reachMain(source,counts,actor){
 const packs=[source,source];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:11,first:actor});
 for(let guard=0;guard<80&&state.status==='playing';guard++){
  if(state.active===actor&&state.phase==='main'&&!state.pending)break;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
  state=dispatchUniversalAction(packs,state,action);
 }
 assert.equal(state.phase,'main');
 assert.equal(state.active,actor);
 assert.equal(state.pending,null);
 return {packs,state};
}
function plainLife(source,state,player,n){
 const life=state.players[player].life;
 const deck=state.players[player].deck;
 while(life.length)deck.push(life.pop());
 for(let i=0;i<n;i++){
  const index=deck.findIndex(card=>!source.cards[card.cardId]?.trigger);
  if(index<0)throw Error('no plain life');
  life.push(deck.splice(index,1)[0]);
 }
}
function setReadyAp(state,player,n){
 state.players[player].apCards.forEach((card,index)=>{card.inPlay=index<n;card.ready=index<n;});
}
function twoMains(actor,life,gen=0){
 const source=developerPack(gen);
 const {packs,state}=reachMain(source,developerDeck(source),actor);
 wipeSide(state,0);
 wipeSide(state,1);
 const base=take(state,actor,'BLC-2-066');
 const gens=[take(state,actor,'BLC-1-083'),take(state,actor,'BLC-1-083'),take(state,actor,'BLC-1-083')];
 place(state,actor,base,'energy',0);
 gens.forEach((card,index)=>place(state,actor,card,'energy',index+1));
 const raid=take(state,actor,'TEST-BLANK-RAID');
 const main=take(state,actor,'TEST-BLANK-MAIN');
 state.players[actor].hand.push(raid,main);
 plainLife(source,state,0,life);
 plainLife(source,state,1,life);
 setReadyAp(state,actor,2);
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.equal(universalEnergyByColor(packs,state,actor).green,4);
 return {packs,state,raid,main,base};
}
function skipOthers(packs,state,actor){
 let cursor=state;
 for(let guard=0;guard<8&&cursor.pending&&(cursor.pending.player??cursor.active)!==actor;guard++){
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>item.mode==='skip'||item.mode==='get'||item.type==='chooseLifeOrder')||legal[0];
  cursor=settle(packs,cursor,action);
 }
 return cursor;
}
function waveSpot(actor){
 const {packs,state}=boot('attack',actor,actor);
 wipeSide(state,0);
 wipeSide(state,1);
 const mine=[take(state,actor,'BLC-4-036'),take(state,actor,'BLC-4-036')];
 const tall=take(state,1-actor,'BLC-4-005');
 const short=take(state,1-actor,'BLC-4-062');
 place(state,actor,mine[0],'front',0);
 place(state,actor,mine[1],'front',1);
 place(state,1-actor,tall,'front',0);
 place(state,1-actor,short,'front',1);
 for(const card of mine)setBp(state,card,4000);
 setBp(state,tall,5000);
 setBp(state,short,3000);
 plainLife(pack,state,0,4);
 plainLife(pack,state,1,4);
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.equal(legalUniversalActions(packs,state).some(action=>action.type==='play'||action.type==='raid'||action.type==='event'),false);
 return {packs,state,mine,tall,short};
}

test('two payable mains stay on the front and keep the raid base generating',()=>{
 for(const gen of [0,1])for(const actor of [0,1]){
  const spot=twoMains(actor,5,gen);
  const {packs,state,raid,main}=spot;
  const legal=legalUniversalActions(packs,state);
  const raidAction=legal.find(action=>action.type==='raid'&&action.uid===raid.uid&&action.line!=='energy');
  const raided=settle(packs,structuredClone(state),raidAction);
  assert.equal(universalEnergyByColor(packs,raided,actor).green,3);
  assert.equal(raided.players[actor].front.find(card=>card?.uid===raid.uid)?.ready,true);
  assert.equal(legalUniversalActions(packs,raided).some(action=>action.uid===main.uid&&(action.type==='play'||action.type==='raid')),false);
  const first=frozenAsk(packs,state);
  const played=[];
  let cursor=state;
  let choice=first;
  for(let guard=0;guard<4&&cursor.active===actor&&cursor.phase==='main'&&!cursor.pending;guard++){
   assert.notEqual(choice.action.type,'raid');
   played.push(choice.action);
   if(choice.action.type==='next')break;
   cursor=settle(packs,cursor,choice.action);
   if(cursor.phase!=='main'||cursor.pending)break;
   const left=legalUniversalActions(packs,cursor);
   if(left.length===1){
    resetAiV3Report();
    const only=chooseAiV3Action(packs,cursor,{
     ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true
    });
    assert.equal(lastAiV3Trace().reason,'forced');
    assert.equal(only.type,left[0].type);
    choice={action:only,trace:lastAiV3Trace()};
   }else choice=frozenAsk(packs,cursor);
  }
  const front=cursor.players[actor].front.filter(Boolean);
  assert.deepEqual(front.map(card=>card.cardId).sort(),['TEST-BLANK-MAIN','TEST-BLANK-RAID']);
  assert.equal(front.every(card=>card.ready===false),true);
  assert.equal(universalEnergyByColor(packs,cursor,actor).green,4);
  assert.equal(cursor.players[actor].apCards.filter(card=>card.ready).length,0);
  assert.equal(played.filter(action=>action.type==='play'&&action.line==='front').length,2);
  const playRow=first.trace.candidates.find(row=>row.action?.type==='play'&&row.action.line==='front'&&row.action.uid===first.action.uid);
  const raidRow=first.trace.candidates.find(row=>row.action?.type==='raid'&&row.action.uid===raid.uid);
  assert.equal(playRow.executed,true);
  assert.equal(playRow.boundary,'returned');
  assert.equal(playRow.settled,true);
  assert.equal(raidRow.executed,true);
  assert.equal(raidRow.boundary,'returned');
  assert.ok(playRow.search>raidRow.search);
  assert.equal(first.trace.score,playRow.search);
  assert.equal(first.trace.settled,true);
  assert.equal(first.trace.replacedMove,null);
  assert.equal(first.trace.sequence.filter(step=>step.type==='play'&&step.line==='front').length,2);
  assert.equal(first.trace.sequence.some(step=>step.type==='raid'),false);
  const meter={dispatches:0};
  let hot=false;
  resetAiV3Report();
  const cut=chooseAiV3Action(packs,structuredClone(state),{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter,
   now:()=>hot?1e9:0,
   onRootDone({action,executed}){if(executed&&action?.type==='play'&&action.line==='front')hot=true;}
  });
  const cutTrace=lastAiV3Trace();
  assert.equal(meter.dispatches,cutTrace.nodesUsed);
  assert.ok(cutTrace.nodesUsed<=48);
  const cutPlay=(cutTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type==='play'&&row.action.line==='front');
  const cutRaid=(cutTrace.candidates||[]).find(row=>row.action?.type==='raid'&&row.action.uid===raid.uid);
  if(cutPlay?.boundary==='returned'&&cutPlay.settled&&cutRaid?.executed&&cutPlay.search>cutRaid.search){
   assert.equal(cut.type,'play');
   assert.equal(cut.line,'front');
   assert.equal(cutTrace.score,cutPlay.search);
   assert.equal(cutTrace.sequence.filter(step=>step.type==='play'&&step.line==='front').length,2);
  }
  for(const row of cutTrace.unexecuted||[]){
   assert.equal(row.executed,false);
   assert.equal(row.search,undefined);
  }
  const timedMeter={dispatches:0};
  resetAiV3Report();
  const timed=chooseAiV3Action(packs,structuredClone(state),{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter:timedMeter
  });
  const timedTrace=lastAiV3Trace();
  assert.equal(timedMeter.dispatches,timedTrace.nodesUsed);
  assert.ok(timedTrace.nodesUsed<=48);
  const finishedFront=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.boundary==='returned'&&row.settled&&row.action?.type==='play'&&row.action.line==='front');
  const finishedRaid=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type==='raid'&&row.action.uid===raid.uid);
  if(finishedFront&&finishedRaid&&finishedFront.search>finishedRaid.search){
   assert.equal(timed.type,'play');
   assert.equal(timed.line,'front');
   assert.equal(timedTrace.score,finishedFront.search);
   assert.equal(timedTrace.settled,true);
  }else{
   const chosen=(timedTrace.candidates||[]).find(row=>row.executed!==false&&sameAction(row.action,timed));
   if(chosen){
    assert.equal(timedTrace.score,chosen.search);
    if(timedTrace.settled)assert.equal(chosen.boundary==='returned'||chosen.boundary==='terminal',true);
   }else{
    assert.equal(timedTrace.settled,false);
    assert.equal(timedTrace.incomplete,true);
   }
  }
  console.log('two mains',JSON.stringify({
   gen,actor,score:first.trace.score,raid:raidRow.search,nodes:first.trace.nodesUsed,
   order:played.map(action=>action.uid),clock:timed.type,clockLine:timed.line||null,
   clockNodes:timedTrace.nodesUsed,clockReason:timedTrace.reason,clockSettled:timedTrace.settled
  }));
 }
});

test('a follow-up uses the decision clock when the root slice is already inside 8ms',()=>{
 for(const gen of [0,1])for(const actor of [0,1]){
  const spot=twoMains(actor,5,gen);
  const {packs,state,raid,main}=spot;
  const ask=(step)=>{
   const meter={dispatches:0};
   resetAiV3Report();
   const action=chooseAiV3Action(packs,structuredClone(state),{
    ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter,
    now:()=>meter.dispatches*step
   });
   const trace=lastAiV3Trace();
   assert.equal(meter.dispatches,trace.nodesUsed);
   assert.ok(trace.nodesUsed<48);
   assert.ok(trace.nodesUsed>0);
   return {action,trace};
  };
  const open=ask(1.25);
  const openPlay=(open.trace.candidates||[]).find(row=>row.action?.type==='play'&&row.action.line==='front'&&row.executed!==false);
  const openRaid=(open.trace.candidates||[]).find(row=>row.action?.type==='raid'&&row.action.uid===raid.uid);
  const openPlays=(open.trace.sequence||[]).filter(step=>step.type==='play'&&step.line==='front');
  assert.equal(open.action.type,'play');
  assert.equal(open.action.line,'front');
  assert.equal(openPlays.length,2);
  assert.deepEqual(openPlays.map(step=>step.uid).sort(),[raid.uid,main.uid].sort());
  assert.equal(openPlay.boundary,'returned');
  assert.equal(openPlay.settled,true);
  assert.equal(openRaid.executed,true);
  assert.equal(openRaid.settled,true);
  assert.ok(openPlay.search>openRaid.search);
  assert.equal(open.trace.score,openPlay.search);
  assert.equal(open.trace.settled,true);
  let cursor=structuredClone(state);
  for(const step of openPlays){
   const legal=legalUniversalActions(packs,cursor);
   const play=legal.find(item=>item.type==='play'&&item.line==='front'&&item.uid===step.uid);
   assert.ok(play);
   cursor=settle(packs,cursor,play);
  }
  assert.deepEqual(cursor.players[actor].front.filter(Boolean).map(card=>card.cardId).sort(),['TEST-BLANK-MAIN','TEST-BLANK-RAID']);
  assert.equal(universalEnergyByColor(packs,cursor,actor).green,4);
  const tight=ask(2);
  const tightPlay=(tight.trace.candidates||[]).find(row=>row.action?.type==='play'&&row.action.line==='front'&&row.executed!==false);
  const tightRaid=(tight.trace.candidates||[]).find(row=>row.action?.type==='raid'&&row.action.uid===raid.uid);
  const tightPlays=(tightPlay.sequence||[]).filter(step=>step.type==='play'&&step.line==='front');
  const other=tightPlay.action.uid===main.uid?raid.uid:main.uid;
  assert.equal(tightPlays.length,1);
  assert.equal(tightPlay.settled,false);
  assert.equal(tightPlay.followSeen.some(step=>step.type==='play'&&step.line==='front'&&step.uid===other),true);
  assert.equal(tightPlay.unexplored.some(step=>step.type==='play'&&step.line==='front'&&step.uid===other&&step.reason==='clock'),true);
  assert.equal(tight.trace.sequence.some(step=>step.uid===other),false);
  assert.equal(tightRaid.settled,true);
  assert.ok(tightRaid.search>tightPlay.search);
  assert.equal(tight.action.type,'raid');
  assert.equal(tight.action.uid,raid.uid);
  assert.equal(tight.trace.score,tightRaid.search);
  assert.equal(tight.trace.settled,true);
  assert.notEqual(tight.trace.score,tightPlay.search);
 }
});

test('a follow-up play stays in the search when the front is busy or the card has an on-play',()=>{
 for(const actor of [0,1]){
  for(const variant of ['busy','onplay']){
   const spot=twoMains(actor,5,1);
   const {packs,state,raid,main}=spot;
   if(variant==='busy'){
    const body=take(state,actor,'BLC-1-083');
    place(state,actor,body,'front',2);
    body.ready=false;
   }else{
    packs[actor].cards[main.cardId].effects={onPlay:[{op:'draw',n:1}]};
   }
   assert.equal(assertUniversalMatch(packs,state),true);
   const legal=legalUniversalActions(packs,state);
   assert.equal(legal.some(action=>action.type==='play'&&action.uid===main.uid),true);
   assert.equal(legal.some(action=>action.type==='play'&&action.uid===raid.uid),true);
   const choice=frozenAsk(packs,state);
   const playRow=(choice.trace.candidates||[]).find(row=>row.action?.type==='play'&&row.action.line==='front'&&row.executed!==false);
   assert.ok(playRow);
   const other=playRow.action.uid===main.uid?raid.uid:main.uid;
   const seen=[...(playRow.followSeen||[]),...(playRow.sequence||[]),...(playRow.unexplored||[])];
   if(!seen.some(step=>step.type==='play'&&step.uid===other)){
    console.log('missing follow',JSON.stringify({variant,actor,uid:playRow.action.uid,other,follow:playRow.followSeen,seq:playRow.sequence,unexplored:playRow.unexplored,nodes:playRow.nodes}));
   }
   assert.equal(seen.some(step=>step.type==='play'&&step.uid===other),true);
   console.log('follow stays',JSON.stringify({
    variant,actor,root:playRow.action.uid,
    follow:(playRow.followSeen||[]).map(step=>[step.type,step.line||'',step.uid||''].join(':')),
    chosen:choice.action.type,score:choice.trace.score
   }));
  }
 }
});

function energyRaidSpot(ready=2){
 const counts=deck({'BLC-2-069':2,'BLC-1-085':2,'BLC-1-080':2,'BLC-1-083':4});
 const {packs,state}=reachMain(pack,counts,0);
 wipeSide(state,0);
 wipeSide(state,1);
 const base=take(state,0,'BLC-2-069');
 place(state,0,base,'energy',0);
 for(let slot=1;slot<4;slot++)place(state,0,take(state,0,'BLC-1-083'),'energy',slot);
 const raid=take(state,0,'BLC-1-085');
 const main=take(state,0,'BLC-1-080');
 state.players[0].hand.push(raid,main);
 plainLife(pack,state,0,5);
 plainLife(pack,state,1,5);
 setReadyAp(state,0,ready);
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.equal(universalEnergyByColor(packs,state,0).green,4);
 return {packs,state,base,raid,main};
}
function raidOnto(packs,state,card,base,line){
 const legal=legalUniversalActions(packs,state);
 return legal.find(action=>action.type==='raid'&&action.uid===card.uid&&action.baseUid===base.uid&&(line==='energy'?action.line==='energy':action.line!=='energy'));
}

test('raid energy loss follows the transfer the line actually reached',()=>{
 const spot=energyRaidSpot(2);
 const {packs,state,base,raid,main}=spot;
 const front=raidOnto(packs,state,raid,base,'front');
 const energy=raidOnto(packs,state,raid,base,'energy');
 assert.ok(front&&energy);
 const frontState=settle(packs,structuredClone(state),front);
 const energyState=settle(packs,structuredClone(state),energy);
 const frontColors=universalEnergyByColor(packs,frontState,0);
 const energyColors=universalEnergyByColor(packs,energyState,0);
 const frontPlays=legalUniversalActions(packs,frontState).filter(action=>action.uid===main.uid&&(action.type==='play'||action.type==='raid'));
 const energyPlays=legalUniversalActions(packs,energyState).filter(action=>action.uid===main.uid&&(action.type==='play'||action.type==='raid'));
 assert.equal(frontColors.green,3);
 assert.equal(energyColors.green,4);
 assert.equal(frontPlays.length,0);
 assert.ok(energyPlays.length>0);
 assert.equal(raidStranded(packs,state,0,front,frontState),2.2);
 assert.equal(raidStranded(packs,state,0,energy,energyState),0);
 const played=settle(packs,structuredClone(energyState),energyPlays.find(action=>action.type==='play'&&action.line==='front')||energyPlays[0]);
 assert.equal(played.players[0].hand.some(card=>card.uid===main.uid),false);
 assert.equal(raidStranded(packs,state,0,energy,played),0);
 const raised=twoMains(0,5,0);
 const baseGen=Number(raised.packs[0].cards['BLC-2-066'].gen)||0;
 raised.packs[0].cards['TEST-BLANK-RAID'].gen=baseGen+1;
 raised.packs[1].cards['TEST-BLANK-RAID'].gen=baseGen+1;
 const raisedBefore=universalEnergyByColor(raised.packs,raised.state,0).green;
 const raisedRaid=raidOnto(raised.packs,raised.state,raised.raid,raised.base,'energy');
 assert.ok(raisedRaid);
 const raisedState=settle(raised.packs,structuredClone(raised.state),raisedRaid);
 const raisedAfter=universalEnergyByColor(raised.packs,raisedState,0).green;
 assert.ok(raisedAfter>raisedBefore);
 assert.equal(raidStranded(raised.packs,raised.state,0,raisedRaid,raisedState),0);
 const blocked=twoMains(0,5,0);
 blocked.packs[0].cards['TEST-BLANK-MAIN'].ap=3;
 blocked.packs[1].cards['TEST-BLANK-MAIN'].ap=3;
 setReadyAp(blocked.state,0,1);
 const blockedRaid=legalUniversalActions(blocked.packs,blocked.state).find(action=>action.type==='raid'&&action.uid===blocked.raid.uid&&action.line!=='energy');
 assert.ok(blockedRaid);
 assert.equal(legalUniversalActions(blocked.packs,blocked.state).some(action=>action.uid===blocked.main.uid),false);
 const blockedState=settle(blocked.packs,structuredClone(blocked.state),blockedRaid);
 assert.ok(universalEnergyByColor(blocked.packs,blockedState,0).green<4);
 assert.equal(raidStranded(blocked.packs,blocked.state,0,blockedRaid,blockedState),0);
 const meter={dispatches:0};
 resetAiV3Report();
 const choice=chooseAiV3Action(packs,structuredClone(state),{
  ...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true,meter,
  rootFirst:[energy,front]
 });
 const choiceTrace=lastAiV3Trace();
 assert.equal(meter.dispatches,choiceTrace.nodesUsed);
 assert.ok(choiceTrace.nodesUsed<=48);
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(choice)),true);
 const rows=(choiceTrace.candidates||[]).filter(row=>row.action?.type==='raid'&&row.action.uid===raid.uid);
 const frontRow=rows.find(row=>row.action.baseUid===base.uid&&row.action.line!=='energy'&&row.executed!==false);
 const energyRow=rows.find(row=>row.action.baseUid===base.uid&&row.action.line==='energy'&&row.executed!==false);
 assert.ok(frontRow&&energyRow);
 assert.equal(frontRow.stranded,2.2);
 assert.equal(frontRow.sequence.some(step=>step.uid===main.uid&&step.type==='play'),false);
 assert.equal(energyRow.stranded||0,0);
 const energyPlayed=energyRow.sequence.some(step=>step.uid===main.uid&&step.type==='play');
 if(energyPlayed)assert.equal(energyRow.stranded||0,0);
 console.log('raid energy',JSON.stringify({
  before:{green:4},
  front:{green:frontColors.green,plays:frontPlays.length,penalty:frontRow.stranded,score:frontRow.search,settled:frontRow.settled},
  energy:{green:energyColors.green,plays:energyPlays.length,penalty:energyRow.stranded||0,score:energyRow.search,played:energyPlayed,settled:energyRow.settled},
  raised:{before:raisedBefore,after:raisedAfter,penalty:0},
  blockedAp:{penalty:0,green:universalEnergyByColor(blocked.packs,blockedState,0).green},
  chosen:{type:choice.type,line:choice.line||null,score:choiceTrace.score,nodes:choiceTrace.nodesUsed}
 }));
});

function discountMains(actor,rule){
 const spot=twoMains(actor,5,1);
 const {packs,state,main}=spot;
 for(const side of packs)side.cards[main.cardId].otherHandEnergyDiscount={min:rule.min,amount:rule.amount};
 const beforeZones=state.players[actor].deck.length+state.players[actor].hand.length;
 const companion=take(state,actor,'BLC-1-083');
 state.players[actor].hand.push(companion);
 const afterZones=state.players[actor].deck.length+state.players[actor].hand.length;
 assert.equal(afterZones,beforeZones);
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.equal(universalEnergyByColor(packs,state,actor).green,4);
 assert.equal(readyAp(state,actor),2);
 return {...spot,companion};
}
function mainCost(packs,state,actor,card){
 const printed=packs[actor].cards[card.cardId];
 return {
  printed:printed.energy,
  effective:effectiveHandRequiredEnergy(packs,state,actor,printed,card),
  green:universalEnergyByColor(packs,state,actor).green,
  ap:readyAp(state,actor),
  plays:legalUniversalActions(packs,state).filter(action=>action.uid===card.uid&&(action.type==='play'||action.type==='raid')).length
 };
}

test('a live hand discount is not an energy loss after the raid',()=>{
 for(const actor of [0,1]){
  const held=discountMains(actor,{min:1,amount:1});
  const {packs,state,raid,main,base,companion}=held;
  const before=mainCost(packs,state,actor,main);
  assert.equal(before.printed,4);
  assert.equal(before.effective,3);
  assert.equal(before.green,4);
  assert.equal(before.plays>0,true);
  const front=raidOnto(packs,state,raid,base,'front');
  assert.ok(front);
  const raided=settle(packs,structuredClone(state),front);
  const afterCard=raided.players[actor].hand.find(card=>card.uid===main.uid);
  const after=mainCost(packs,raided,actor,afterCard);
  assert.equal(after.green,3);
  assert.equal(after.ap,1);
  assert.equal(after.effective,3);
  assert.equal(after.plays>0,true);
  assert.equal(raided.players[actor].hand.some(card=>card.uid===companion.uid),true);
  const play=legalUniversalActions(packs,raided).find(action=>action.type==='play'&&action.line==='front'&&action.uid===main.uid);
  const played=settle(packs,structuredClone(raided),play);
  assert.equal(played.players[actor].front.some(card=>card?.uid===main.uid),true);
  assert.equal(readyAp(played,actor),0);
  assert.equal(raidStranded(packs,state,actor,front,raided),0);
  assert.equal(raidStranded(packs,state,actor,front,played),0);
  const started=structuredClone(raided);
  started.phase='start';
  const startPlays=legalUniversalActions(packs,started).filter(action=>action.type==='play'||action.type==='raid');
  assert.equal(startPlays.length,0);
  assert.equal(raidStranded(packs,state,actor,front,started),0);
  const expired=discountMains(actor,{min:2,amount:1});
  const expiredFront=raidOnto(expired.packs,expired.state,expired.raid,expired.base,'front');
  const expiredBefore=mainCost(expired.packs,expired.state,actor,expired.main);
  const expiredRaid=settle(expired.packs,structuredClone(expired.state),expiredFront);
  const expiredCard=expiredRaid.players[actor].hand.find(card=>card.uid===expired.main.uid);
  const expiredAfter=mainCost(expired.packs,expiredRaid,actor,expiredCard);
  assert.equal(expiredBefore.effective,3);
  assert.equal(expiredAfter.effective,4);
  assert.equal(expiredAfter.green,3);
  assert.equal(expiredAfter.plays,0);
  assert.equal(raidStranded(expired.packs,expired.state,actor,expiredFront,expiredRaid),2.2);
  const plain=twoMains(actor,5,1);
  const plainFront=raidOnto(plain.packs,plain.state,plain.raid,plain.base,'front');
  const plainRaid=settle(plain.packs,structuredClone(plain.state),plainFront);
  const plainCard=plainRaid.players[actor].hand.find(card=>card.uid===plain.main.uid);
  const plainAfter=mainCost(plain.packs,plainRaid,actor,plainCard);
  assert.equal(plainAfter.printed,4);
  assert.equal(plainAfter.effective,4);
  assert.equal(plainAfter.green,3);
  assert.equal(plainAfter.plays,0);
  assert.equal(raidStranded(plain.packs,plain.state,actor,plainFront,plainRaid),2.2);
  const meter={dispatches:0};
  resetAiV3Report();
  const choice=chooseAiV3Action(packs,structuredClone(state),{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true,meter,
   rootFirst:[front]
  });
  const trace=lastAiV3Trace();
  assert.equal(meter.dispatches,trace.nodesUsed);
  assert.ok(trace.nodesUsed<=48);
  assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(choice)),true);
  const raidRow=(trace.candidates||[]).find(row=>row.action?.type==='raid'&&row.action.uid===raid.uid&&row.action.line!=='energy'&&row.executed!==false);
  assert.ok(raidRow);
  assert.equal(raidRow.stranded||0,0);
  assert.equal(raidRow.sequence.some(step=>step.type==='play'&&step.uid===main.uid),true);
  const chosen=(trace.candidates||[]).find(row=>row.executed!==false&&sameAction(row.action,choice));
  if(chosen){
   assert.equal(trace.score,chosen.search);
   assert.equal(trace.sequence[0].type,choice.type);
   if(trace.settled)assert.equal(chosen.boundary==='returned'||chosen.boundary==='terminal',true);
  }
  const timedMeter={dispatches:0};
  resetAiV3Report();
  const timed=chooseAiV3Action(packs,structuredClone(state),{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter:timedMeter
  });
  const timedTrace=lastAiV3Trace();
  assert.equal(timedMeter.dispatches,timedTrace.nodesUsed);
  assert.ok(timedTrace.nodesUsed<=48);
  const timedRaid=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type==='raid'&&row.action.uid===raid.uid);
  if(timedRaid)assert.equal(timedRaid.stranded||0,0);
  const timedChosen=(timedTrace.candidates||[]).find(row=>row.executed!==false&&sameAction(row.action,timed));
  if(timedChosen){
   assert.equal(timedTrace.score,timedChosen.search);
   if(timedTrace.settled)assert.equal(timedChosen.boundary==='returned'||timedChosen.boundary==='terminal',true);
  }else{
   assert.equal(timedTrace.settled,false);
   assert.equal(timedTrace.incomplete,true);
  }
  console.log('discount raid',JSON.stringify({
   label:'test-card',actor,
   before,after,
   played:{ap:readyAp(played,actor),penalty:0},
   startPhase:{plays:startPlays.length,penalty:0},
   expired:{before:expiredBefore,after:expiredAfter,penalty:2.2},
   plain:{after:plainAfter,penalty:2.2},
   search:{stranded:raidRow.stranded||0,score:raidRow.search,sequence:raidRow.sequence.map(step=>step.type),settled:raidRow.settled,nodes:trace.nodesUsed,chosen:choice.type},
   clock:{type:timed.type,nodes:timedTrace.nodesUsed,reason:timedTrace.reason,settled:timedTrace.settled}
  }));
 }
});

test('a blank raid that attacks the last life still wins',()=>{
 for(const actor of [0,1]){
  const {packs,state,raid}=twoMains(actor,1);
  state.players[1-actor].front=state.players[1-actor].front.map(()=>null);
  const choice=frozenAsk(packs,state);
  assert.equal(choice.action.type,'raid');
  assert.equal(choice.action.uid,raid.uid);
  const row=choice.trace.candidates.find(item=>item.action?.type==='raid'&&item.action.uid===raid.uid);
  assert.equal(row.boundary,'terminal');
  assert.equal(row.settled,true);
  assert.ok(row.search>=90000);
  assert.equal(choice.trace.score,row.search);
  assert.equal(choice.trace.sequence[0].type,'raid');
  const play=choice.trace.candidates.find(item=>item.action?.type==='play'&&item.action.line==='front');
  assert.equal(play.executed,true);
  assert.ok(play.search<row.search);
 }
});

function sameAction(left,right){
 return !!left&&!!right&&left.type===right.type&&(left.uid??null)===(right.uid??null)&&
  (left.line||null)===(right.line||null)&&(left.baseUid||null)===(right.baseUid||null);
}

test('two 4000s both attack into a 5000 and a 3000, and one 4000 still stays back',()=>{
 const single=attackSpot('BLC-4-036');
 assert.equal(ask(single.packs,single.state).action.type,'next');
 for(const actor of [0,1]){
  const spot=waveSpot(actor);
  const {packs,state,mine,tall,short}=spot;
  const first=frozenAsk(packs,state);
  assert.equal(first.action.type,'attack');
  assert.equal(mine.some(card=>card.uid===first.action.uid),true);
  const attackRow=first.trace.candidates.find(row=>sameAction(row.action,first.action));
  const passRow=first.trace.candidates.find(row=>row.action?.type==='next');
  assert.equal(attackRow.executed,true);
  assert.equal(attackRow.boundary,'returned');
  assert.equal(attackRow.settled,true);
  assert.equal(attackRow.swing,0);
  assert.ok(attackRow.search>passRow.search);
  assert.equal(first.trace.score,attackRow.search);
  assert.equal(first.trace.settled,true);
  assert.equal(first.trace.replacedMove,null);
  assert.equal(first.trace.sequence[0].type,'attack');
  assert.equal(first.trace.sequence[0].uid,first.action.uid);
  const followed=first.trace.sequence.filter(step=>step.type==='attack'&&mine.some(card=>card.uid===step.uid));
  assert.equal(followed.length,2);
  assert.equal(new Set(followed.map(step=>step.uid)).size,2);
  for(const blockUid of [tall.uid,short.uid,null]){
   let cursor=settle(packs,structuredClone(state),first.action);
   assert.equal(cursor.pending.kind,'block');
   const blocks=legalUniversalActions(packs,cursor);
   assert.equal(blocks.some(action=>action.type==='chooseBlock'&&action.uid===tall.uid),true);
   assert.equal(blocks.some(action=>action.type==='chooseBlock'&&action.uid===short.uid),true);
   const block=blocks.find(action=>action.type==='chooseBlock'&&(action.uid??null)===blockUid);
   cursor=settle(packs,cursor,block);
   cursor=skipOthers(packs,cursor,actor);
   assert.equal(cursor.pending,null);
   assert.equal(cursor.active,actor);
   assert.equal(cursor.phase,'attack');
   const rested=cursor.players[actor].front.find(card=>card?.uid===first.action.uid);
   const ready=cursor.players[actor].front.find(card=>card?.ready);
   assert.ok(rested);
   assert.equal(rested.ready,false);
   assert.equal(ready.uid===first.action.uid,false);
   if(blockUid===tall.uid){
    assert.equal(cursor.players[1-actor].front.some(card=>card?.uid===tall.uid&&card.ready),false);
    assert.equal(cursor.players[1-actor].front.some(card=>card?.uid===short.uid&&card.ready),true);
    assert.equal(cursor.players[1-actor].life.length,4);
   }else if(blockUid===short.uid){
    assert.equal(cursor.players[1-actor].front.some(card=>card?.uid===short.uid),false);
    assert.equal(cursor.players[1-actor].front.some(card=>card?.uid===tall.uid&&card.ready),true);
   }else{
    assert.equal(cursor.players[1-actor].life.length,3);
    assert.equal(cursor.players[1-actor].front.filter(card=>card?.ready).length,2);
   }
   const second=frozenAsk(packs,cursor);
   assert.equal(second.action.type,'attack');
   assert.equal(second.action.uid,ready.uid);
   const secondRow=second.trace.candidates.find(row=>sameAction(row.action,second.action));
   const secondPass=second.trace.candidates.find(row=>row.action?.type==='next');
   assert.equal(secondRow.executed,true);
   assert.equal(secondRow.boundary,'returned');
   assert.equal(secondRow.settled,true);
   assert.ok(secondRow.search>=secondPass.search);
   assert.equal(second.trace.score,secondRow.search);
   assert.equal(second.trace.sequence[0].uid,ready.uid);
   assert.equal(second.trace.settled,true);
   const opened=settle(packs,cursor,second.action);
   assert.equal(opened.pending.kind,'block');
   const secondBlocks=legalUniversalActions(packs,opened);
   if(blockUid===tall.uid)assert.equal(secondBlocks.some(action=>action.uid===tall.uid),false);
   else assert.equal(secondBlocks.some(action=>action.uid===tall.uid),true);
  }
  const meter={dispatches:0};
  let hot=false;
  resetAiV3Report();
  const cut=chooseAiV3Action(packs,structuredClone(state),{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter,
   now:()=>hot?1e9:0,
   onRootDone({action,executed}){if(executed&&action?.type==='attack')hot=true;}
  });
  const cutTrace=lastAiV3Trace();
  assert.equal(meter.dispatches,cutTrace.nodesUsed);
  assert.ok(cutTrace.nodesUsed<=48);
  const cutAttack=(cutTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type==='attack');
  assert.equal(cut.type,'attack');
  assert.equal(cutTrace.score,cutAttack.search);
  assert.equal(cutTrace.sequence[0].type,'attack');
  for(const row of cutTrace.unexecuted||[])assert.equal(row.executed,false);
  const timedMeter={dispatches:0};
  resetAiV3Report();
  const timed=chooseAiV3Action(packs,structuredClone(state),{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:40,diagnose:true,meter:timedMeter
  });
  const timedTrace=lastAiV3Trace();
  assert.equal(timedMeter.dispatches,timedTrace.nodesUsed);
  assert.ok(timedTrace.nodesUsed<=48);
  const finishedAttack=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.boundary==='returned'&&row.settled&&row.action?.type==='attack');
  const finishedPass=(timedTrace.candidates||[]).find(row=>row.executed!==false&&row.action?.type==='next'&&(row.boundary==='returned'||row.boundary==='terminal'));
  if(finishedAttack&&finishedPass&&finishedAttack.search>=finishedPass.search){
   assert.equal(timed.type,'attack');
   assert.equal(timedTrace.score,finishedAttack.search);
   assert.equal(timedTrace.sequence[0].uid,timed.uid);
   assert.equal(timedTrace.settled,true);
  }else{
   const chosen=(timedTrace.candidates||[]).find(row=>row.executed!==false&&sameAction(row.action,timed));
   if(chosen){
    assert.equal(timedTrace.score,chosen.search);
    if(timedTrace.settled)assert.equal(chosen.boundary==='returned'||chosen.boundary==='terminal',true);
   }else{
    assert.equal(timedTrace.settled,false);
    assert.equal(timedTrace.incomplete,true);
   }
  }
  console.log('two attackers',JSON.stringify({
   actor,score:first.trace.score,pass:passRow.search,nodes:first.trace.nodesUsed,
   clock:timed.type,clockNodes:timedTrace.nodesUsed,settled:timedTrace.settled
  }));
 }
});

function minKeep(packs,state,actor){
 return Math.min(...state.players[actor].hand.map(card=>keepScore(packs,state,actor,card)));
}
function replayWhiteHandLimit(seed=8302,first=1,seat=0,step=49){
 const deck=battleDecks().find(item=>item.id==='white-sword');
 const audit=JSON.parse(readFileSync(new URL('../audit/ai-v3-official-8300-nodes48-white-reuse.json',import.meta.url),'utf8'));
 const game=audit.titles['white-sword'].byMode.tree.games
  .find(item=>item.seed===seed&&item.first===first&&item.challengerSeat===seat);
 const packs=[deck.pack,deck.pack];
 let state=newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first,matchRules('official'));
 for(const choice of game.opening){
  const legal=legalUniversalActions(packs,state);
  state=dispatchUniversalAction(packs,state,legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode),{actor:choice.actor});
 }
 for(const recorded of game.actions){
  if(recorded.step===step)return {packs,state};
  const legal=legalUniversalActions(packs,state);
  state=dispatchUniversalAction(packs,state,legal.find(item=>JSON.stringify(item)===JSON.stringify(recorded.action)),{actor:recorded.actor});
 }
 throw Error('hand-limit snapshot missing');
}
function keepBackup(packs,state,actor){
 const legal=legalUniversalActions(packs,state).filter(action=>action.uid&&
  (action.type==='chooseHandLimit'||action.type==='chooseDiscard'||action.type==='chooseDiscardGate'));
 legal.sort((a,b)=>{
  const delta=keepScore(packs,state,actor,state.players[actor].hand.find(card=>card.uid===a.uid))
   -keepScore(packs,state,actor,state.players[actor].hand.find(card=>card.uid===b.uid));
  if(delta)return delta;
  return JSON.stringify(a)<JSON.stringify(b)?-1:1;
 });
 return legal[0];
}
function handCut(packs,state,at,nodes=48){
 const actor=state.pending.player;
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(packs,structuredClone(state),{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes,diagnose:true,meter,
  ms:at==null?1e9:40,now:at==null?()=>0:()=>meter.dispatches>=at?1e9:0
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=nodes);
 return {action,trace,meter,actor};
}
// Step 49 used to discard the raid piece. One event line was already
// searched; the miss was the string order filling the rest of the beam,
// then the cutoff backup selecting that raid piece back.
test('hand limit spends the lowest keep card and leaves the raid piece',()=>{
 const {packs,state}=replayWhiteHandLimit();
 const actor=state.pending.player;
 const catalog=packs[actor].cards;
 assert.equal(state.pending.kind,'end-hand-limit');
 assert.equal(state.phase,'attack');
 assert.equal(state.players.map(player=>player.life.length).join('-'),'7-7');
 assert.equal(universalEnergyByColor(packs,state,actor).green,5);
 const hand=state.players[actor].hand;
 const raid=hand.find(card=>catalog[card.cardId].energy===4&&catalog[card.cardId].bp===4000&&catalog[card.cardId].raidName);
 const floor=minKeep(packs,state,actor);
 assert.ok(raid);
 assert.ok(keepScore(packs,state,actor,raid)>floor);
 assert.equal(catalog[hand.find(card=>keepScore(packs,state,actor,card)===floor).cardId].type,'event');
 const legal=legalUniversalActions(packs,state);
 const ranked=rankLegal(packs,state,actor,legal,null);
 assert.equal(keepScore(packs,state,actor,hand.find(card=>card.uid===ranked[0].uid)),floor);
 const beam=selectCandidates(packs,state,actor,legal,MATCH_LIMITS.beam,null);
 assert.equal(beam.some(action=>keepScore(packs,state,actor,hand.find(card=>card.uid===action.uid))===floor),true);
 assert.equal(beam.some(action=>action.uid===raid.uid),false);
 const choice=ask(packs,state);
 assert.equal(choice.action.type,'chooseHandLimit');
 assert.equal(keepScore(packs,state,actor,hand.find(card=>card.uid===choice.action.uid)),floor);
 assert.notEqual(choice.action.uid,raid.uid);
 assert.ok(choice.trace.nodesUsed<=48);
 const spent=dispatchUniversalAction(packs,state,choice.action,{actor});
 assert.equal(assertUniversalMatch(packs,spent),true);
 assert.equal(spent.players[actor].hand.some(card=>card.uid===raid.uid),true);
 assert.equal(spent.players[actor].hand.some(card=>card.uid===choice.action.uid),false);

 const withoutEvents=structuredClone(state);
 const events=[];
 withoutEvents.players[actor].hand=withoutEvents.players[actor].hand.filter(card=>{
  if(catalog[card.cardId].type!=='event')return true;
  events.push(card);
  return false;
 });
 withoutEvents.players[actor].deck.push(...events);
 const raised=minKeep(packs,withoutEvents,actor);
 assert.ok(raised>floor);
 assert.ok(keepScore(packs,withoutEvents,actor,withoutEvents.players[actor].hand.find(card=>card.uid===raid.uid))>raised);
 const cheaper=ask(packs,withoutEvents);
 assert.equal(keepScore(packs,withoutEvents,actor,withoutEvents.players[actor].hand.find(card=>card.uid===cheaper.action.uid)),raised);
 assert.notEqual(cheaper.action.uid,raid.uid);
 const kept=dispatchUniversalAction(packs,withoutEvents,cheaper.action,{actor});
 assert.equal(kept.players[actor].hand.some(card=>card.uid===raid.uid),true);

 const lowLife=structuredClone(state);
 for(const player of lowLife.players)while(player.life.length>1)player.deck.push(player.life.pop());
 assert.equal(lowLife.players.map(player=>player.life.length).join('-'),'1-1');
 const pressured=ask(packs,lowLife);
 const doomed=new Set((pressured.trace.compared||[])
  .filter(row=>row.boundary==='terminal'&&row.search<=-90000)
  .map(row=>row.action?.uid).filter(Boolean));
 assert.ok(doomed.size>=1);
 assert.equal(doomed.has(pressured.action.uid),false);
 const surviving=lowLife.players[actor].hand.filter(card=>!doomed.has(card.uid));
 const liveFloor=Math.min(...surviving.map(card=>keepScore(packs,lowLife,actor,card)));
 assert.ok(liveFloor>floor);
 assert.equal(keepScore(packs,lowLife,actor,lowLife.players[actor].hand.find(card=>card.uid===pressured.action.uid)),liveFloor);
 assert.notEqual(pressured.action.uid,raid.uid);
 const lived=dispatchUniversalAction(packs,lowLife,pressured.action,{actor});
 assert.equal(lived.players[actor].hand.some(card=>card.uid===raid.uid),true);

 const alone=structuredClone(state);
 const spare=alone.players[actor].hand.filter(card=>card.uid!==raid.uid);
 alone.players[actor].hand=[alone.players[actor].hand.find(card=>card.uid===raid.uid)];
 alone.players[actor].deck.push(...spare);
 const last=ask(packs,alone);
 assert.equal(last.action.type,'chooseHandLimit');
 assert.equal(last.action.uid,raid.uid);
});

function assertUnfinishedBackup(packs,state,label){
 const actor=state.pending.player;
 const backup=keepBackup(packs,state,actor);
 const catalog=packs[actor].cards;
 const hand=state.players[actor].hand;
 const floor=keepScore(packs,state,actor,hand.find(card=>card.uid===backup.uid));
 const checks=[null,4,8,12,16,24,32,40,44,48];
 let first=null;
 for(const at of checks){
  const {action,trace}=handCut(packs,state,at);
  assert.equal(action.type,'chooseHandLimit',label+' '+at);
  assert.equal(action.uid,backup.uid,label+' '+at);
  assert.equal(keepScore(packs,state,actor,hand.find(card=>card.uid===action.uid)),floor);
  assert.equal(trace.reason,'budget-fallback',label+' '+at);
  assert.equal(trace.incomplete,true);
  assert.equal(trace.settled,false);
  const row=(trace.compared||[]).find(item=>item.executed!==false&&item.action?.uid===action.uid);
  if(row){
   assert.equal(trace.score,row.search,label+' '+at);
   assert.equal(row.settled,false);
   assert.equal(trace.sequence[0].uid,action.uid);
   assert.notEqual(row.boundary,'returned');
   assert.notEqual(row.boundary,'terminal');
  }else{
   assert.equal(trace.score,null);
   assert.equal(trace.sequence?.length||0,0);
  }
  const further=(trace.compared||[]).filter(item=>item.executed!==false&&item.action?.uid&&item.action.uid!==action.uid&&
   item.search>row?.search);
  for(const other of further){
   const card=hand.find(item=>item.uid===other.action.uid);
   assert.ok(keepScore(packs,state,actor,card)>=floor,label+' '+at);
   assert.equal(other.boundary==='terminal'&&other.search>=90000,false,label+' '+at);
  }
  if(at==null)first={action,trace,floor};
 }
 const again=handCut(packs,state,null);
 assert.equal(again.action.uid,first.action.uid);
 assert.equal(catalog[hand.find(card=>card.uid===backup.uid).cardId].type==='event'||
  catalog[hand.find(card=>card.uid===backup.uid).cardId].type==='character',true);
 return first;
}

test('an unfinished hand limit discards the lowest keep card at every cutoff',()=>{
 const progress=replayWhiteHandLimit(8302,0,0,137);
 const {packs,state}=progress;
 const actor=state.pending.player;
 assert.equal(actor,0);
 assert.equal(state.pending.kind,'end-hand-limit');
 assert.equal(state.players.map(player=>player.life.length).join('-'),'6-5');
 const hand=state.players[actor].hand;
 const events=hand.filter(card=>packs[actor].cards[card.cardId].type==='event');
 const floor=minKeep(packs,state,actor);
 assert.equal(events.filter(card=>keepScore(packs,state,actor,card)===floor).length,2);
 const cheap=hand.find(card=>packs[actor].cards[card.cardId].energy===0&&packs[actor].cards[card.cardId].bp===1500);
 assert.ok(keepScore(packs,state,actor,cheap)>floor);
 const chosen=assertUnfinishedBackup(packs,state,'137');
 assert.equal(packs[actor].cards[hand.find(card=>card.uid===chosen.action.uid).cardId].type,'event');
 assert.notEqual(chosen.action.uid,cheap.uid);
 const ahead=(chosen.trace.compared||[]).filter(row=>row.executed!==false&&row.search>chosen.trace.score);
 for(const row of ahead){
  assert.ok(keepScore(packs,state,actor,hand.find(card=>card.uid===row.action?.uid))>=chosen.floor);
  assert.equal(row.boundary==='terminal'&&row.search>=90000,false);
 }
 const spent=dispatchUniversalAction(packs,state,chosen.action,{actor});
 assert.equal(assertUniversalMatch(packs,spent),true);
 assert.equal(spent.players[actor].hand.some(card=>card.uid===cheap.uid),true);

 const watched=replayWhiteHandLimit(8301,0,1,29);
 assert.equal(watched.state.pending.player,1);
 assert.equal(watched.state.pending.kind,'end-hand-limit');
 const seat=watched.state.pending.player;
 const watchedHand=watched.state.players[seat].hand;
 const watchedCards=watched.packs[seat].cards;
 const watchedFloor=minKeep(watched.packs,watched.state,seat);
 const plain=watchedHand.find(card=>{
  const printed=watchedCards[card.cardId];
  return printed.energy===0&&printed.gen>0&&!(printed.effects?.onPlay||[]).length;
 });
 const filters=watchedHand.filter(card=>sequencedFilter(watchedCards[card.cardId])&&watchedCards[card.cardId].energy===0);
 assert.equal(filters.length,2);
 assert.equal(keepScore(watched.packs,watched.state,seat,plain),watchedFloor);
 for(const card of filters)assert.ok(keepScore(watched.packs,watched.state,seat,card)>watchedFloor);
 const observed=assertUnfinishedBackup(watched.packs,watched.state,'29');
 assert.equal(observed.action.uid,plain.uid);
 const removed=dispatchUniversalAction(watched.packs,watched.state,observed.action,{actor:seat});
 assert.equal(assertUniversalMatch(watched.packs,removed),true);
 assert.equal(removed.players[seat].hand.some(card=>card.uid===plain.uid),false);
 for(const card of filters)assert.equal(removed.players[seat].hand.some(item=>item.uid===card.uid),true);
});

function measured(packs,state,variant){
 const actor=state.pending?.player??state.active;
 const meter={dispatches:0};
 let calls=0;
 const stop=watchEngineDispatch(()=>{calls++;});
 resetAiV3Report();
 const selected=askedVariant(variant);
 let action;
 try{
  action=chooseAiV3Action(packs,state,{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,diagnose:true,meter,
   ms:1e9,now:()=>0,...(selected?{variant:selected}:{})
  });
 }finally{stop();}
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 if(trace.reason!=='forced'){
  assert.equal(calls,trace.nodesUsed);
  assert.equal(meter.dispatches,trace.nodesUsed);
  assert.ok(trace.nodesUsed<=48);
  const row=(trace.compared||[]).find(item=>item.executed!==false&&JSON.stringify(item.action)===JSON.stringify(action));
  if(row){
   assert.equal(trace.score,row.search);
   assert.equal(trace.settled,!!row.settled);
   assert.equal(trace.incomplete,!row.settled);
   if(trace.sequence?.length)assert.equal(trace.sequence[0].type,action.type);
  }else{
   assert.equal(trace.score,null);
   assert.equal(trace.sequence?.length||0,0);
  }
 }
 return {action,trace,actor};
}
function exchange(state,actor,handUid,pred){
 const hand=state.players[actor].hand;
 const deck=state.players[actor].deck;
 const handIndex=hand.findIndex(card=>card.uid===handUid);
 const deckIndex=deck.findIndex(pred);
 const [fromHand]=hand.splice(handIndex,1);
 const [fromDeck]=deck.splice(deckIndex,1);
 hand.push(fromDeck);
 deck.push(fromHand);
}
function scriptToOwnStart(packs,state,actor){
 let cursor=state;
 for(let guard=0;guard<160&&cursor.status==='playing';guard++){
  if(cursor.active===actor&&!cursor.pending&&cursor.phase==='start')return cursor;
  const seat=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const action=seat===actor
   ?legal.find(item=>item.type==='next')
   :(legal.find(item=>item.type==='next')||legal.find(item=>item.type==='chooseHandLimit')||legal[0]);
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:seat});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 throw Error('opponent script did not reach the next start');
}
function orderDeck(state,actor,catalog,refund){
 const deck=state.players[actor].deck;
 const take=pred=>{
  const index=deck.findIndex(pred);
  assert.ok(index>=0);
  return deck.splice(index,1)[0];
 };
 const raid=()=>take(card=>catalog[card.cardId].energy>=6&&catalog[card.cardId].type==='character');
 const quiet=()=>take(card=>{
  const printed=catalog[card.cardId];
  return printed.energy>=4&&printed.type==='character'&&!recoversActionPoints(printed);
 });
 const top=[raid(),raid(),quiet(),refund?take(card=>recoversActionPoints(catalog[card.cardId])):quiet(),quiet()];
 deck.unshift(...top);
}
function playChain(packs,state,actor,refund,variant){
 const catalog=packs[actor].cards;
 let cursor=state;
 const fuel=new Set(cursor.players[actor].hand.filter(card=>{
  const printed=catalog[card.cardId];
  return printed.type==='character'&&printed.energy===1&&!sequencedFilter(printed);
 }).map(card=>card.uid));
 const standing=cursor.players[actor].front.find(Boolean);
 const spent=[];
 const keys=[];
 let filtersPlayed=0;
 for(let guard=0;guard<16&&cursor.status==='playing'&&cursor.active===actor;guard++){
  if(!cursor.pending&&cursor.phase==='attack')break;
  const choice=measured(packs,cursor,variant);
  const card=cursor.players[actor].hand.find(item=>item?.uid===choice.action.uid);
  const key=choice.action.type+':'+(choice.action.line||choice.action.mode||'');
  keys.push(key);
  if(choice.action.type==='chooseDiscardGate'&&choice.action.uid){
   assert.equal(fuel.has(choice.action.uid),true,catalog[card?.cardId]?.id||choice.action.uid);
   spent.push(choice.action.uid);
  }
  if(choice.action.type==='play'&&choice.action.line==='energy'&&sequencedFilter(catalog[card?.cardId]))filtersPlayed++;
  if(choice.action.type==='play'&&choice.action.line==='energy'&&lineSwitchBody(catalog[card?.cardId])){
   assert.equal(filtersPlayed,2);
   assert.equal(spent.length,2);
   assert.equal(readyAp(cursor,actor),1);
   const before=universalEnergyByColor(packs,cursor,actor).green;
   cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor});
   assert.equal(assertUniversalMatch(packs,cursor),true);
   const entered=cursor.players[actor].energy.find(item=>item?.uid===choice.action.uid);
   assert.ok(entered);
   assert.equal(entered.ready,false);
   assert.equal(universalEnergyByColor(packs,cursor,actor).green,before+(catalog[entered.cardId].gen||0));
   const standingEnergy=cursor.players[actor].energy.filter(item=>item?.ready);
   assert.equal(standingEnergy.length,1);
   const blocker=standingEnergy[0];
   const restedEntrant=cursor.players[actor].energy.find(item=>item&&item.ready===false&&item.uid!==entered.uid);
   assert.ok(restedEntrant);
   const preview=structuredClone(cursor);
   const previewMove=legalUniversalActions(packs,preview).find(action=>action.type==='chooseLineMove'&&action.uid===restedEntrant.uid);
   assert.ok(previewMove);
   let restedCursor=dispatchUniversalAction(packs,preview,previewMove,{actor});
   if(restedCursor.pending?.kind==='effect-line-slot'){
    const previewSlot=legalUniversalActions(packs,restedCursor).find(action=>action.type==='chooseLineSlot');
    restedCursor=dispatchUniversalAction(packs,restedCursor,previewSlot,{actor});
   }
   assert.equal(assertUniversalMatch(packs,restedCursor),true);
   const restedFront=restedCursor.players[actor].front.find(item=>item?.uid===restedEntrant.uid);
   assert.ok(restedFront);
   assert.equal(restedFront.ready,false);
   const moved=measured(packs,cursor,variant);
   assert.equal(moved.action.type,'chooseLineMove');
   assert.equal(moved.action.uid,blocker.uid);
   cursor=dispatchUniversalAction(packs,cursor,moved.action,{actor});
   if(cursor.pending?.kind==='effect-line-slot'){
    const slot=measured(packs,cursor,variant);
    assert.equal(slot.action.type,'chooseLineSlot');
    cursor=dispatchUniversalAction(packs,cursor,slot.action,{actor});
   }
   assert.equal(assertUniversalMatch(packs,cursor),true);
   const shifted=cursor.players[actor].front.find(item=>item?.uid===blocker.uid);
   assert.ok(shifted);
   assert.equal(shifted.ready,true);
   assert.equal(cursor.players[actor].energy.some(item=>item?.uid===blocker.uid),false);
   const body=[...cursor.players[actor].energy,...cursor.players[actor].front].find(item=>item?.uid===entered.uid);
   assert.equal(body.ready,false);
   assert.equal(cursor.players[actor].energy.some(item=>item?.uid===entered.uid),true);
   assert.equal(cursor.players[actor].front.some(item=>item?.uid===standing.uid&&item.ready),true);
   for(const card of cursor.players[actor].energy)if(card&&card.uid!==blocker.uid)assert.equal(card.ready,false);
   const passed=measured(packs,cursor,variant);
   assert.equal(passed.action.type,'next');
   return {cursor,spent,keys,refundPlayed:false};
  }
  if(choice.action.type==='event'&&recoversActionPoints(catalog[card?.cardId])){
   assert.equal(filtersPlayed,2);
   assert.equal(spent.length,2);
   assert.equal(readyAp(cursor,actor),1);
   assert.equal(refund,true);
   const paid=readyAp(cursor,actor);
   cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor});
   assert.equal(readyAp(cursor,actor),paid-1);
   let recovered=0;
   while(cursor.pending?.kind==='effect-recover-ap'&&recovered<2){
    const step=measured(packs,cursor,variant);
    assert.equal(step.action.type,'chooseApRecovery');
    const readyBefore=readyAp(cursor,actor);
    cursor=dispatchUniversalAction(packs,cursor,step.action,{actor});
    assert.equal(readyAp(cursor,actor),readyBefore+1);
    recovered++;
   }
   assert.equal(recovered,2);
   assert.equal(assertUniversalMatch(packs,cursor),true);
   return {cursor,spent,keys,refundPlayed:true};
  }
  cursor=dispatchUniversalAction(packs,cursor,choice.action,{actor:cursor.pending?.player??cursor.active});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 throw Error('chain did not resolve '+String(variant)+' '+keys.join(' > '));
}
// Constructed boundary. The attack ban is a fixture from the continuous-state
// grant, expiring at the granter's next START. It is not a printed effect.
function openShift(actor,{rested=false,ban=false}={}){
 const local=deck({'BLC-4-060':2,'BLC-4-070':2,'BLC-1-083':4,'BLC-1-037':2});
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[local,local],seed:11,first:0});
 for(let guard=0;guard<80&&state.status==='playing';guard++){
  if(state.active===actor&&state.phase==='main'&&!state.pending&&state.players[actor].ownTurns>=2)break;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
  state=dispatchUniversalAction(packs,state,action);
 }
 assert.equal(state.active,actor);
 assert.equal(state.phase,'main');
 assert.equal(state.pending,null);
 const foe=1-actor;
 for(const seat of [actor,foe])for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
  const card=state.players[seat][line][slot];
  if(!card)continue;
  card.ready=false;
  card.fieldEntryStamp=null;
  state.players[seat].deck.push(card);
  state.players[seat][line][slot]=null;
 }
 const aizen=take(state,actor,'BLC-4-060');
 const fronts=[take(state,actor,'BLC-4-070'),take(state,actor,'BLC-1-083')];
 place(state,actor,aizen,'energy',0);
 aizen.ready=!rested;
 place(state,actor,fronts[0],'front',0);
 place(state,actor,fronts[1],'front',1);
 if(ban){
  const until={player:actor,phase:'start',edge:'start'};
  for(const body of fronts)grantContinuousState(state,{
   kind:'cannotAttack',controller:actor,sourceUid:aizen.uid,targetUid:body.uid,until,sourceLinked:false
  });
 }
 setLife(state,actor,5);
 setLife(state,foe,1);
 const quiet=take(state,foe,'BLC-1-037');
 state.players[foe].deck.push(state.players[foe].life[0]);
 state.players[foe].life[0]=quiet;
 assert.equal(pack.cards[quiet.cardId].trigger,null);
 for(const card of state.players[actor].apCards)card.ready=false;
 clearHand(state,actor);
 clearHand(state,foe);
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.equal(state.players[actor].apCards.filter(card=>card.ready).length,0);
 assert.equal(state.players[foe].front.some(Boolean),false);
 return {packs,state,actor,aizen,fronts};
}
function askShift(packs,state,options={}){
 const actor=state.pending?.player??state.active;
 const nodes=options.nodes??48;
 const meter={dispatches:0};
 let calls=0;
 const stop=watchEngineDispatch(()=>{calls++;});
 resetAiV3Report();
 let action;
 try{
  action=chooseAiV3Action(packs,state,{
   ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes,ms:options.ms??1e9,
   now:options.now||(()=>0),diagnose:true,meter,
   ...(options.rootFirst?{rootFirst:options.rootFirst}:{}),
   ...(options.onRootDone?{onRootDone:info=>options.onRootDone(info,calls)}:{})
  });
 }finally{stop();}
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.equal(Number.isInteger(trace.nodesUsed),true);
 assert.equal(calls,trace.nodesUsed);
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=nodes);
 const row=(trace.compared||[]).find(item=>item.executed!==false&&JSON.stringify(item.action)===JSON.stringify(action));
 if(row){
  assert.equal(trace.score,row.search);
  assert.equal(trace.settled,!!row.settled);
  assert.equal(trace.sequence[0].type,action.type);
 }else{
  assert.equal(trace.score,null);
  assert.equal(trace.sequence?.length||0,0);
  assert.equal(trace.settled,false);
 }
 return {action,trace,meter,actor,calls};
}
function followLine(packs,state,sequence){
 let cursor=state;
 const steps=sequence||[];
 for(const step of steps){
  if(cursor.status!=='playing')break;
  const who=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(step))||
   legal.find(item=>item.type===step.type&&(item.uid||null)===(step.uid??null)&&(item.mode||null)===(step.mode??null)&&(item.slot??null)===(step.slot??null));
  if(!action)break;
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:who});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 for(let guard=0;guard<12&&cursor.status==='playing';guard++){
  const who=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  const action=legal.find(item=>item.type==='chooseBlock'&&!item.uid)||
   legal.find(item=>item.type==='attack')||legal.find(item=>item.type==='next')||legal[0];
  cursor=dispatchUniversalAction(packs,cursor,action,{actor:who});
  assert.equal(assertUniversalMatch(packs,cursor),true);
 }
 return cursor;
}
test('a standing shift that can attack keeps the searched win on both seats',()=>{
 for(const actor of [0,1]){
  const opened=openShift(actor,{ban:true});
  const {packs,state,aizen,fronts}=opened;
  const legal=legalUniversalActions(packs,state);
  assert.equal(legal.some(action=>action.type==='activate'&&action.uid===aizen.uid),true);
  assert.equal(legal.some(action=>action.type==='next'),true);
  const asked=askShift(packs,state);
  const rows=(asked.trace.compared||[]).filter(row=>row.executed!==false);
  const win=rows.find(row=>row.action?.type==='activate'&&row.action.uid===aizen.uid);
  const pass=rows.find(row=>row.action?.type==='next');
  assert.equal(win.boundary,'terminal');
  assert.ok(win.search>=90000);
  assert.equal(win.settled,true);
  assert.equal(pass.boundary==='terminal'&&pass.search<=-90000,false);
  const wins=rows.filter(row=>row.boundary==='terminal'&&row.search>=90000);
  assert.equal(wins.some(row=>JSON.stringify(row.action)===JSON.stringify(asked.action)),true);
  assert.equal(asked.action.type,'activate');
  assert.equal(asked.action.uid,aizen.uid);
  assert.equal(asked.trace.reason,'search');
  assert.equal(asked.trace.score,win.search);
  assert.equal(asked.trace.settled,true);
  assert.deepEqual(asked.trace.sequence,win.sequence);
  for(const row of rows)if(row.boundary!=='terminal'||row.search<90000)
   assert.notEqual(JSON.stringify(row.action),JSON.stringify(asked.action));
  const finished=followLine(packs,state,asked.trace.sequence);
  assert.equal(finished.status,'finished');
  assert.equal(finished.winner,actor);
  assert.equal(finished.endReason,'life-zero');
  const activate=legal.find(action=>action.type==='activate'&&action.uid===aizen.uid);
  const next=legal.find(action=>action.type==='next');
  const held=preferConfirmedChoices(packs,state,actor,activate,[
   {action:activate,executed:true,boundary:'yielded',search:500,settled:false},
   {action:next,executed:true,boundary:'returned',search:400,settled:true}
  ]);
  assert.equal(held.type,'activate');
  void fronts;
 }
});
test('a rested shift that only taps two attackers is not taken, and a known loss is not forced',()=>{
 for(const actor of [0,1]){
  const {packs,state,aizen,fronts}=openShift(actor,{rested:true});
  const asked=askShift(packs,state);
  assert.notEqual(asked.action.type,'activate');
  const rows=(asked.trace.compared||[]).filter(row=>row.executed!==false);
  const shift=rows.find(row=>row.action?.type==='activate');
  if(shift)assert.equal(shift.boundary==='terminal'&&shift.search>=90000,false);
  for(const row of rows)if(row.boundary==='terminal'&&row.search<=-90000)
   assert.notEqual(JSON.stringify(row.action),JSON.stringify(asked.action));
  const wins=rows.filter(row=>row.boundary==='terminal'&&row.search>=90000);
  if(wins.length)assert.equal(wins.some(row=>JSON.stringify(row.action)===JSON.stringify(asked.action)),true);
  let cursor=dispatchUniversalAction(packs,state,asked.action,{actor});
  assert.equal(cursor.phase,'attack');
  const swings=legalUniversalActions(packs,cursor).filter(action=>action.type==='attack');
  assert.equal(swings.some(action=>action.uid===fronts[0].uid),true);
  assert.equal(swings.some(action=>action.uid===fronts[1].uid),true);
  assert.equal(swings.some(action=>action.uid===aizen.uid),false);
  const won=followLine(packs,cursor,[]);
  assert.equal(won.status,'finished');
  assert.equal(won.winner,actor);
  const wasted=structuredClone(state);
  let walked=dispatchUniversalAction(packs,wasted,legalUniversalActions(packs,wasted).find(action=>action.type==='activate'),{actor});
  while(walked.pending&&walked.status==='playing'){
   const steps=legalUniversalActions(packs,walked);
   const step=steps.find(action=>action.type==='chooseRestTwo')||steps.find(action=>action.type==='chooseSelfFront');
   walked=dispatchUniversalAction(packs,walked,step,{actor:walked.pending?.player??walked.active});
  }
  const pass=legalUniversalActions(packs,walked).find(action=>action.type==='next');
  walked=dispatchUniversalAction(packs,walked,pass,{actor});
  const moved=walked.players[actor].front.find(card=>card?.uid===aizen.uid);
  assert.ok(moved);
  assert.equal(moved.ready,false);
  assert.equal(legalUniversalActions(packs,walked).some(action=>action.type==='attack'),false);
  const activate=legalUniversalActions(packs,state).find(action=>action.type==='activate');
  const next=legalUniversalActions(packs,state).find(action=>action.type==='next');
  const avoided=preferConfirmedChoices(packs,state,actor,activate,[
   {action:activate,executed:true,boundary:'returned',search:10,settled:true},
   {action:next,executed:true,boundary:'returned',search:20,settled:true}
  ]);
  assert.equal(avoided.type,'next');
  const kept=preferConfirmedChoices(packs,state,actor,activate,[
   {action:activate,executed:true,boundary:'returned',search:10,settled:true},
   {action:next,executed:true,boundary:'terminal',search:-100000,settled:true}
  ]);
  assert.equal(kept.type,'activate');
  assert.equal(JSON.stringify(kept),JSON.stringify(activate));
 }
});
test('shift checks stay inside 8, 24 and 48 nodes on both seats',()=>{
 for(const actor of [0,1]){
  for(const nodes of [8,24,48]){
   const {packs,state,aizen}=openShift(actor,{ban:true});
   const asked=askShift(packs,state,{nodes});
   assert.equal(asked.calls,asked.meter.dispatches);
   assert.equal(asked.calls,asked.trace.nodesUsed);
   assert.ok(asked.calls<=nodes);
   if(nodes===8){
    assert.equal(asked.action.type,'activate');
    assert.equal(asked.action.uid,aizen.uid);
    assert.equal(asked.trace.settled,false);
    assert.ok(asked.trace.score<90000);
   }
   if(nodes===48){
    assert.equal(asked.action.type,'activate');
    assert.equal(asked.action.uid,aizen.uid);
    assert.equal(asked.trace.settled,true);
    assert.ok(asked.trace.score>=90000);
   }
  }
 }
});
test('a cutoff after the winning root does not start another shift walk',()=>{
 for(const actor of [0,1]){
  const {packs,state,aizen}=openShift(actor,{ban:true});
  let time=0;
  let atCut=null;
  const asked=askShift(packs,state,{
   nodes:48,now:()=>time,
   rootFirst:[{type:'activate',uid:aizen.uid}],
   onRootDone:(_info,seen)=>{if(atCut==null){atCut=seen;time=1e15;}}
  });
  assert.equal(asked.calls,atCut);
  assert.equal(asked.action.type,'activate');
  assert.equal(asked.action.uid,aizen.uid);
  assert.equal(asked.trace.settled,true);
  assert.ok(asked.trace.score>=90000);
  assert.equal(asked.trace.reason==='search'||asked.trace.reason==='budget',true);
  const finished=followLine(packs,state,asked.trace.sequence);
  assert.equal(finished.status,'finished');
  assert.equal(finished.winner,actor);
  assert.equal(finished.endReason,'life-zero');
 }
});
test('an unfinished shift check does not borrow another line',()=>{
 for(const actor of [0,1]){
  const opened=openShift(actor,{ban:true});
  const book=opened.packs[actor];
  const cards={...book.cards,'BLC-4-060':{...book.cards['BLC-4-060'],attackRequiresName:'無此名稱'}};
  const packs=[{...book,cards},{...book,cards}];
  let time=0;
  let atCut=null;
  const asked=askShift(packs,opened.state,{
   nodes:48,now:()=>time,
   rootFirst:[{type:'activate',uid:opened.aizen.uid}],
   onRootDone:(_info,seen)=>{if(atCut==null){atCut=seen;time=1e15;}}
  });
  assert.equal(asked.calls,atCut);
  assert.equal(asked.action.type,'activate');
  assert.equal(asked.action.uid,opened.aizen.uid);
  const row=(asked.trace.compared||[]).find(item=>item.executed!==false&&item.action?.type==='activate'&&item.action.uid===opened.aizen.uid);
  assert.ok(row);
  assert.equal(asked.trace.score,row.search);
  assert.deepEqual(asked.trace.sequence,row.sequence);
  assert.equal(asked.trace.settled,!!row.settled);
  assert.equal(row.boundary==='terminal'&&row.search>=90000,false);
  const pass=(asked.trace.compared||[]).find(item=>item.action?.type==='next'&&item.executed!==false);
  if(pass)assert.notEqual(JSON.stringify(asked.trace.sequence),JSON.stringify(pass.sequence));
 }
});
test('a covered plain generator is discarded and the next turn keeps the filter chain',()=>{
 for(const variant of [null,'ab-front'])filterChain(variant);
});
function filterChain(variant){
 const opened=replayWhiteHandLimit(8301,0,1,29);
 const {packs}=opened;
 const actor=opened.state.pending.player;
 const catalog=packs[actor].cards;
 const discard=measured(packs,opened.state,variant);
 const plain=opened.state.players[actor].hand.find(card=>card.uid===discard.action.uid);
 const printed=catalog[plain.cardId];
 assert.equal(discard.action.type,'chooseHandLimit');
 assert.equal(printed.energy,0);
 assert.equal(printed.gen>0,true);
 assert.equal((printed.effects?.onPlay||[]).length,0);
 assert.equal(keepScore(packs,opened.state,actor,plain),minKeep(packs,opened.state,actor));
 let base=dispatchUniversalAction(packs,opened.state,discard.action,{actor});
 assert.equal(assertUniversalMatch(packs,base),true);
 const hidden=structuredClone(base);
 orderDeck(base,actor,catalog,false);
 orderDeck(hidden,actor,catalog,true);
 assert.equal(assertUniversalMatch(packs,base),true);
 assert.equal(assertUniversalMatch(packs,hidden),true);
 const start=scriptToOwnStart(packs,base,actor);
 const other=scriptToOwnStart(packs,hidden,actor);
 assert.equal(readyAp(start,actor),3);
 assert.equal(readyAp(other,actor),3);
 assert.equal(universalEnergyByColor(packs,start,actor).green,1);
 const kept=measured(packs,start,variant);
 const keptOther=measured(packs,other,variant);
 if(variant==null){
  const wide=measured(packs,start,'ab');
  assert.equal(wide.action.type,'extraDraw');
  assert.equal(readyAp(dispatchUniversalAction(packs,start,wide.action,{actor}),actor),2);
 }
 assert.equal(kept.action.type,'next');
 assert.deepEqual(keptOther.action,kept.action);
 assert.notEqual(kept.trace.score,null);
 let plainCursor=dispatchUniversalAction(packs,start,kept.action,{actor});
 let finalCursor=dispatchUniversalAction(packs,other,keptOther.action,{actor});
 const plainLine=playChain(packs,plainCursor,actor,false,variant);
 const finalLine=playChain(packs,finalCursor,actor,true,variant);
 assert.deepEqual(plainLine.keys.slice(0,6),finalLine.keys.slice(0,6));
 assert.equal(plainLine.keys[6],'chooseTopCard:bottom');
 assert.equal(finalLine.keys[6],'chooseTopCard:top');
 assert.equal(new Set(plainLine.spent).size,2);
 assert.deepEqual(finalLine.spent,plainLine.spent);
 assert.equal(plainLine.refundPlayed,false);
 assert.equal(finalLine.refundPlayed,true);
 assert.equal(plainLine.cursor.players[actor].energy.some(card=>card&&catalog[card.cardId].frontForbidden&&card.ready===false),true);
}

test('the filter exception follows the hand and does not invent a missing backup',()=>{
 const opened=replayWhiteHandLimit(8301,0,1,29);
 const {packs,state}=opened;
 const actor=state.pending.player;
 const catalog=packs[actor].cards;
 const hand=state.players[actor].hand;
 const plain=hand.find(card=>catalog[card.cardId].energy===0&&!(catalog[card.cardId].effects?.onPlay||[]).length);
 const filters=hand.filter(card=>sequencedFilter(catalog[card.cardId]));
 const backup=hand.find(card=>lineSwitchBody(catalog[card.cardId]));
 assert.equal(filters.length>=2,true);
 const one=structuredClone(state);
 exchange(one,actor,filters[0].uid,card=>!sequencedFilter(catalog[card.cardId])&&catalog[card.cardId].energy!==0);
 const oneChoice=measured(packs,one);
 assert.notEqual(oneChoice.action.uid,plain.uid);
 assert.ok(keepScore(packs,one,actor,one.players[actor].hand.find(card=>card.uid===plain.uid))>
  keepScore(packs,one,actor,one.players[actor].hand.find(card=>card.uid===oneChoice.action.uid)));
 const none=structuredClone(state);
 exchange(none,actor,filters[0].uid,card=>!sequencedFilter(catalog[card.cardId])&&catalog[card.cardId].energy>1);
 exchange(none,actor,filters[1].uid,card=>!sequencedFilter(catalog[card.cardId])&&catalog[card.cardId].energy>1);
 const noneChoice=measured(packs,none);
 assert.notEqual(noneChoice.action.uid,plain.uid);
 assert.ok(keepScore(packs,none,actor,none.players[actor].hand.find(card=>card.uid===plain.uid))>
  keepScore(packs,none,actor,none.players[actor].hand.find(card=>card.uid===noneChoice.action.uid)));
 const missing=structuredClone(state);
 exchange(missing,actor,backup.uid,card=>!lineSwitchBody(catalog[card.cardId])&&catalog[card.cardId].type==='character'&&catalog[card.cardId].energy>1);
 for(const variant of [null,'ab-front']){
  const still=measured(packs,missing,variant);
  assert.equal(still.action.uid,plain.uid);
  let cursor=dispatchUniversalAction(packs,missing,still.action,{actor});
  cursor=scriptToOwnStart(packs,cursor,actor);
  const drawn=measured(packs,cursor,variant);
  assert.equal(drawn.action.type,'extraDraw');
  assert.notEqual(drawn.trace.score,null);
 }
});

test('a finished hand-limit comparison keeps its score, including a tied keep order',()=>{
 const {packs,state}=replayWhiteHandLimit(8302,0,0,137);
 const {action,trace,actor}=handCut(packs,state,null,480);
 const hand=state.players[actor].hand;
 const rows=(trace.compared||[]).filter(row=>row.executed!==false&&row.action?.type==='chooseHandLimit');
 assert.ok(rows.length>=2);
 assert.ok(rows.every(row=>row.boundary==='returned'&&row.settled===true));
 const best=Math.max(...rows.map(row=>row.search));
 const chosen=rows.find(row=>row.action.uid===action.uid);
 assert.equal(trace.reason,'search');
 assert.equal(trace.settled,true);
 assert.equal(trace.score,best);
 assert.equal(chosen.search,best);
 assert.equal(trace.sequence[0].uid,action.uid);
 const tied=rows.filter(row=>row.search===best);
 const floor=Math.min(...tied.map(row=>keepScore(packs,state,actor,hand.find(card=>card.uid===row.action.uid))));
 assert.equal(keepScore(packs,state,actor,hand.find(card=>card.uid===action.uid)),floor);
 const worse=rows.filter(row=>row.search<best);
 for(const row of worse)assert.notEqual(row.action.uid,action.uid);
});

test('an optional discard gate keeps a finished skip comparison and does not ignore it',()=>{
 for(const seat of [0,1]){
  const opened=openDiscard(seat,false);
  const legal=legalUniversalActions(opened.packs,opened.state);
  assert.equal(legal.some(action=>action.type==='chooseDiscardGate'&&!action.uid),true);
  const full=ask(opened.packs,opened.state);
  assert.equal(full.action.type,'chooseDiscardGate');
  assert.equal(full.action.uid,opened.event);
  assert.equal(full.trace.reason,'search');
  assert.equal(full.trace.settled,true);
  const rows=(full.trace.compared||[]).filter(row=>row.executed!==false);
  const skip=rows.find(row=>row.action?.type==='chooseDiscardGate'&&!row.action.uid);
  const event=rows.find(row=>row.action?.uid===opened.event);
  assert.equal(skip.boundary,'returned');
  assert.equal(event.boundary,'returned');
  assert.ok(event.search>skip.search);
  assert.equal(full.trace.score,event.search);
  const early=askUntil(opened.packs,opened.state,8);
  assert.equal(early.action.type,'chooseDiscardGate');
  assert.equal(early.action.uid,opened.event);
  assert.notEqual(early.action.uid,null);

  const quiet=openDiscard(seat,true);
  assert.equal(legalUniversalActions(quiet.packs,quiet.state).some(action=>action.type==='chooseDiscardGate'&&!action.uid),true);
  const kept=ask(quiet.packs,quiet.state);
  assert.equal(kept.action.type,'chooseDiscardGate');
  assert.ok(kept.action.uid);
  assert.equal(kept.trace.reason,'search');
  assert.equal(kept.trace.settled,true);
  const quietRows=(kept.trace.compared||[]).filter(row=>row.executed!==false);
  const quietSkip=quietRows.find(row=>!row.action?.uid);
  const picked=quietRows.find(row=>row.action?.uid===kept.action.uid);
  assert.equal(quietSkip.boundary,'returned');
  assert.ok(picked.search>quietSkip.search);
  assert.equal(kept.trace.score,picked.search);
  const best=Math.max(...quietRows.map(row=>row.search));
  assert.equal(picked.search,best);
  const hand=quiet.state.players[seat].hand;
  const tied=quietRows.filter(row=>row.action?.uid&&row.search===best);
  const floor=Math.min(...tied.map(row=>keepScore(quiet.packs,quiet.state,seat,hand.find(card=>card.uid===row.action.uid))));
  assert.equal(keepScore(quiet.packs,quiet.state,seat,hand.find(card=>card.uid===kept.action.uid)),floor);
  const higher=quietRows.filter(row=>row.action?.uid&&keepScore(quiet.packs,quiet.state,seat,hand.find(card=>card.uid===row.action.uid))>floor);
  assert.ok(higher.length>=1);
  assert.ok(higher.every(row=>row.search<picked.search));
 }
});

test('front coverage uses cost, energy, attack and effect, and stays off by default',()=>{
 const {packs,state}=reachStart(2);
 wipeSide(state,0);
 wipeSide(state,1);
 for(let slot=0;slot<3;slot++)place(state,0,take(state,0,'BLC-2-066'),'energy',slot);
 place(state,0,take(state,0,'BLC-4-066'),'energy',3);
 const held=hold(state,0,['BLC-2-069','BLC-4-070','BLC-1-085']);
 const early=held.find(card=>card.cardId==='BLC-1-085');
 const late=held.find(card=>card.cardId==='BLC-2-069');
 if(String(early.uid)<String(late.uid)){early.cardId='BLC-2-069';late.cardId='BLC-1-085';}
 place(state,1,take(state,1,'BLC-4-070'),'front',0);
 let main=state;
 for(let guard=0;guard<3&&main.phase!=='main';guard++){
  const step=legalUniversalActions(packs,main).find(action=>action.type==='next');
  main=dispatchUniversalAction(packs,main,step,{actor:0});
 }
 assert.equal(main.phase,'main');
 assert.equal(assertUniversalMatch(packs,main),true);
 const legal=legalUniversalActions(packs,main);
 const byId=id=>legal.find(action=>action.type==='play'&&action.line==='front'&&
  main.players[0].hand.find(card=>card.uid===action.uid)?.cardId===id);
 const small=byId('BLC-2-069'),ken=byId('BLC-4-070'),effect=byId('BLC-1-085');
 assert.ok(small&&ken&&effect);
 const score=action=>frontCoverageScore(packs,main,0,action);
 assert.ok(score(effect)>score(ken));
 assert.ok(score(ken)>score(small));
 const low=structuredClone(main);
 for(let slot=1;slot<4;slot++){
  low.players[0].deck.push(low.players[0].energy[slot]);
  low.players[0].energy[slot]=null;
 }
 assert.ok(frontCoverageScore(packs,low,0,effect)<frontCoverageScore(packs,low,0,ken));
 const plain=selectionTrace(packs,main,0,legal,4,null);
 const covered=bindVariant('a',()=>selectionTrace(packs,main,0,legal,4,null));
 const narrowed=bindVariant('ab-front',()=>selectionTrace(packs,main,0,legal,4,null));
 const plainFront=plain.picked.find(action=>action.type==='play'&&action.line==='front');
 const coveredFront=covered.picked.find(action=>action.type==='play'&&action.line==='front');
 assert.equal(JSON.stringify(plainFront),JSON.stringify(plain.ranked.find(action=>action.type==='play'&&action.line==='front')));
 assert.notEqual(plainFront.uid,effect.uid);
 assert.equal(coveredFront.uid,effect.uid);
 assert.equal(covered.notes.find(note=>note.action.uid===effect.uid&&note.action.line==='front').reason,'front-slot');
 assert.equal(covered.picked.filter(action=>action.type==='play'&&action.line==='front').length,1);
 assert.equal(narrowed.picked.find(action=>action.type==='play'&&action.line==='front').uid,effect.uid);
});

test('an evidence gate keeps a searched line unless the replacement matches its boundary',()=>{
 const front={type:'play',line:'front',uid:'body'};
 const energy={type:'play',line:'energy',uid:'body'};
 const other={type:'play',line:'energy',uid:'other'};
 const win={type:'attack',uid:'body'};
 assert.equal(evidencedChoice(front,energy,[
  {action:front,search:30,boundary:'yielded',executed:true}
 ]).uid,front.uid);
 assert.equal(evidencedChoice(front,energy,[
  {action:front,search:-12,boundary:'yielded',executed:true},
  {action:energy,search:4,boundary:'yielded',executed:true}
 ]).line,'energy');
 assert.equal(evidencedChoice(front,energy,[
  {action:front,search:4,boundary:'yielded',executed:true},
  {action:energy,search:20,boundary:'pending',executed:true}
 ]).line,'front');
 assert.equal(evidencedChoice(win,energy,[
  {action:win,search:100000,boundary:'terminal',executed:true},
  {action:energy,search:40,boundary:'returned',executed:true}
 ]).type,'attack');
 assert.equal(evidencedChoice(front,other,[
  {action:front,search:-100000,boundary:'terminal',executed:true},
  {action:other,search:-10,boundary:'yielded',executed:true}
 ]).uid,'other');
 assert.equal(evidencedChoice(front,other,[
  {action:front,search:10,boundary:'yielded',executed:true},
  {action:other,search:-100000,boundary:'terminal',executed:true}
 ]).line,'front');
 const main={phase:'main',pending:null,active:0};
 const start={phase:'start',pending:null,active:0};
 const moving={phase:'move',pending:null,active:0};
 const discarding={phase:'main',pending:{kind:'end-hand-limit',player:0},active:0};
 const pass={type:'next'};
 const rows=[{action:front,search:30,boundary:'yielded',executed:true}];
 assert.equal(frontEvidenceChoice(main,0,front,energy,rows).line,'front');
 assert.equal(frontEvidenceChoice(main,0,front,pass,rows).type,'play');
 assert.equal(frontEvidenceChoice(main,0,front,energy,[
  {action:front,search:-12,boundary:'yielded',executed:true},
  {action:energy,search:4,boundary:'yielded',executed:true}
 ]).line,'energy');
 assert.equal(frontEvidenceChoice(start,0,front,energy,rows).line,'energy');
 assert.equal(frontEvidenceChoice(moving,0,front,pass,rows).type,'next');
 assert.equal(frontEvidenceChoice(discarding,0,front,energy,rows).line,'energy');
 const event={type:'event',uid:'refund'};
 assert.equal(frontEvidenceChoice(main,0,front,event,rows).type,'event');
});
