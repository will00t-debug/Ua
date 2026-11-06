import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalBp,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,MATCH_LIMITS,resetAiV3Report,comparedLines} from '../dist/universal-v2/ai-v3/search.mjs';
import {battleWindowAction,blankSwingAdjustment,provenRebuild} from '../dist/universal-v2/ai-v3/eval.mjs';

// Player strategy, stated as situations rather than card lists.
// 1. With life to spare, keep a 4000 that can still attack and block. One
//    life does not pay for that body. The same attack is still passed at 6
//    life. From 5 life the life step is larger than the body, so 5, 4 and 3
//    all spend it. That is the life table, not a cutoff written at 3. A refill counts only
//    when the known hand can enter ready, pay its cost, and leave the energy
//    line in place. The deck is not assumed.
// 2. Two affordable plays in one main are both made. Energy is not always
//    first, and the front is not always first.
// 3. An attack that removes nothing and deals nothing rests the attacker
//    through the opponent's turn. Skip it unless a declaration, hit, or win
//    effect can actually start. A lower BP that still removes a body, or a
//    swing that connects, stays legal.

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
 'BLC-4-068':2,'BLC-4-062':2,'BLC-1-082':2,'BLC-1-050':2
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
function blockWindow(life,{hand}={}){
 const {packs,state}=boot('attack',1,0);
 clearHand(state,0);
 const mine=take(state,0,'BLC-4-005');
 const foe=take(state,1,'BLC-4-005');
 place(state,0,mine,'front',0);
 place(state,1,foe,'front',0);
 setLife(state,0,life);
 for(const card of hand||[])state.players[0].hand.push(card(state));
 const swing=legalUniversalActions(packs,state).find(item=>item.type==='attack'&&item.uid===foe.uid);
 const opened=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(assertUniversalMatch(packs,opened),true);
 assert.equal(opened.pending.kind,'block');
 assert.equal(universalBp(packs,opened,mine),4000);
 assert.equal(universalBp(packs,opened,foe),4000);
 return {packs,state:opened,mine};
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

test('seven life keeps the 4000, and three life spends it on the same attack',()=>{
 const high=blockWindow(7);
 const highHelper=battleWindowAction(high.packs,high.state,0);
 assert.equal(highHelper.uid??null,null);
 const highChoice=ask(high.packs,high.state);
 assert.equal(highChoice.action.type,'chooseBlock');
 assert.equal(highChoice.action.uid??null,null);
 const highRows=highChoice.trace.candidates.filter(row=>row.action?.type==='chooseBlock');
 const highPass=highRows.find(row=>!row.action.uid);
 const highBody=highRows.find(row=>row.action.uid===high.mine.uid);
 assert.ok(highPass&&highBody);
 assert.ok(highPass.battleScore>highBody.battleScore);
 for(const row of highRows)if(row.damageOpen)assert.notEqual(row.boundary,'returned');
 const low=blockWindow(3);
 assert.equal(battleWindowAction(low.packs,low.state,0).uid,low.mine.uid);
 const lowChoice=ask(low.packs,low.state);
 assert.equal(lowChoice.action.uid,low.mine.uid);
 // The life table, not a 3-life switch: 6 to 5 drops 25 and the body stays;
 // 5 to 4 drops 35 and the same 4000 is spent. 4 life is already in that region.
 const six=blockWindow(6);
 assert.equal(ask(six.packs,six.state).action.uid??null,null);
 const five=blockWindow(5);
 assert.equal(ask(five.packs,five.state).action.uid,five.mine.uid);
 const danger=blockWindow(1);
 assert.equal(ask(danger.packs,danger.state).action.uid,danger.mine.uid);
});

test('a ready refill from the known hand can be spent, and an unproven one cannot',()=>{
 const ready=blockWindow(7);
 const refill=take(ready.state,0,'BLC-4-022');
 for(let slot=0;slot<4;slot++){
  const gen=take(ready.state,0,'BLC-4-036');
  place(ready.state,0,gen,'energy',slot);
 }
 ready.state.players[0].hand.push(refill);
 assert.equal(universalEnergyByColor(ready.packs,ready.state,0).blue>=4,true);
 assert.equal(provenRebuild(ready.packs,ready.state,0,ready.mine.uid).ok,true);
 assert.equal(assertUniversalMatch(ready.packs,ready.state),true);
 assert.equal(battleWindowAction(ready.packs,ready.state,0).uid,ready.mine.uid);
 assert.equal(ask(ready.packs,ready.state).action.uid,ready.mine.uid);
 const short=blockWindow(7);
 short.state.players[0].hand.push(take(short.state,0,'BLC-4-022'));
 place(short.state,0,take(short.state,0,'BLC-4-036'),'energy',0);
 assert.equal(provenRebuild(short.packs,short.state,0,short.mine.uid).ok,false);
 assert.equal(ask(short.packs,short.state).action.uid??null,null);
 const rested=blockWindow(7);
 place(rested.state,0,take(rested.state,0,'BLC-1-083'),'energy',0);
 rested.state.players[0].hand.push(take(rested.state,0,'BLC-4-070'));
 assert.equal(provenRebuild(rested.packs,rested.state,0,rested.mine.uid).ok,false);
 assert.equal(ask(rested.packs,rested.state).action.uid??null,null);
 const crowded=blockWindow(7);
 const small=take(crowded.state,0,'BLC-1-083');
 place(crowded.state,0,small,'front',1);
 for(let slot=0;slot<4;slot++)place(crowded.state,0,take(crowded.state,0,'BLC-4-036'),'energy',slot);
 crowded.state.players[0].hand.push(take(crowded.state,0,'BLC-4-022'));
 assert.equal(provenRebuild(crowded.packs,crowded.state,0,crowded.mine.uid).ok,false);
 assert.notEqual(ask(crowded.packs,crowded.state).action.uid,crowded.mine.uid);
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
