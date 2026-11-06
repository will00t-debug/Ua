import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalBp,universalEnergyByColor,universalImpact,universalImpactNull,universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {chooseAiV3Action,lastAiV3Trace,MATCH_LIMITS,resetAiV3Report,comparedLines} from '../dist/universal-v2/ai-v3/search.mjs';
import {battleWindowAction,blankSwingAdjustment,provenRebuild} from '../dist/universal-v2/ai-v3/eval.mjs';
import {bindProbeBudget} from '../dist/universal-v2/ai-v3/strategy.mjs';

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
function ask(packs,state){
 const actor=state.pending?.player??state.active;
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,diagnose:true
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 if(trace.reason!=='forced')assert.ok(trace.nodesUsed<=48,trace.reason+' nodes '+trace.nodesUsed);
 return {action,trace};
}
function blockWindow(life,{hand,blockerId='BLC-4-005',attackerId='BLC-4-005',blockerBp=4000,attackerBp=4000,damage=1,secondBp=0,secondId='BLC-4-062',secondDamage=1,secondImpact=0,getLife=false}={}){
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
 setLife(state,0,life);
 if(getLife)fillGetLife(state,0);
 for(const card of hand||[])state.players[0].hand.push(card(state));
 const swing=legalUniversalActions(packs,state).find(item=>item.type==='attack'&&item.uid===foe.uid);
 const opened=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(assertUniversalMatch(packs,opened),true);
 assert.equal(opened.pending.kind,'block');
 return {packs,state:opened,mine,foe,second};
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
 const starved=bindProbeBudget({pool:{n:1},deadline:Infinity,now:()=>0},()=>provenRebuild(ready.packs,ready.state,0,ready.mine.uid));
 assert.equal(starved.ok,false);
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
