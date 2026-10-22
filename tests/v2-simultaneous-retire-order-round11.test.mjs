import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';

// Synthetic fixtures only. They exercise the shared queue; they are not registry cards.
// Official order: the retired card's controller chooses among that player's
// simultaneous 退場時. The turn player finishes their own triggers first.
// Q74: 退場時 is processed before Impact's life check.
// Q105: moving to the removed area is not retirement.
function deckOf(cards){
 const deck=Object.fromEntries(cards.map(c=>[c.id,4]));
 deck[cards.at(-1).id]=2;
 return deck;
}
function take(s,owner,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[owner][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function toMain(packs,s){
 for(let n=0;n<4&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
const chainCards=Array.from({length:13},(_,i)=>({
 id:'Q'+i,name:'Q'+i,color:'green',type:i===0?'event':'character',
 energy:0,ap:1,bp:i===3?4000:2000,gen:i===12?4:1,implementation:'vanilla'
}));
chainCards[0]={...chainCards[0],bp:0,gen:0,implementation:'dsl',effects:{onPlay:[
 {op:'retireOppFrontAllUnderBp',bp:2000},{op:'draw',count:1}
]}};
chainCards[1]={...chainCards[1],implementation:'dsl',effects:{onRetire:[
 {op:'retireOppFrontOneUnderBp',bp:5000,optional:true}
]}};
chainCards[2]={...chainCards[2],implementation:'dsl',effects:{onRetire:[{op:'millTop',count:1}]}};
chainCards[3]={...chainCards[3],implementation:'dsl',effects:{onRetire:[{op:'draw',count:1}]}};
const chainPack=createUniversalPack({id:'retire-chain-r11',cards:chainCards});
const chainPacks=[chainPack,chainPack];
const chainDeck=deckOf(chainCards);

function chainBoard(){
 let s=newUniversalMatch(chainPacks,{decks:[chainDeck,chainDeck],seed:1103,first:0});
 const event=take(s,0,'Q0');s.players[0].hand.push(event);
 // Q1's onRetire retires the opponent, so the chain target belongs to player 0.
 const left=take(s,1,'Q1'),right=take(s,1,'Q2'),tall=take(s,0,'Q3');
 left.ready=true;right.ready=true;tall.ready=true;
 s.players[1].front[0]=left;s.players[1].front[1]=right;s.players[0].front[0]=tall;
 s=toMain(chainPacks,s);
 return {s,event,left,right,tall};
}

test('controller chooses simultaneous onRetire order; a nested retire resolves before the other trigger and the follow-up draw',()=>{
 let {s,event,left,right,tall}=chainBoard();
 const ownDeck=s.players[0].deck.length,foeDeck=s.players[1].deck.length,foeHand=s.players[1].hand.length;
 const play=legalUniversalActions(chainPacks,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 s=dispatchUniversalAction(chainPacks,s,play);
 assert.equal(s.pending?.kind,'retirement-order');
 assert.equal(s.pending.player,1);
 assert.equal(s.players[0].deck.length,ownDeck,'source follow-up draw waits for every onRetire');
 assert.equal(s.players[0].front[0]?.uid,tall.uid,'BP 4000 stays until the nested onRetire');
 assert.ok(s.players[1].outside.some(c=>c.uid===left.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===right.uid));
 const choices=legalUniversalActions(chainPacks,s);
 assert.equal(choices.length,2);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(chainPacks,s,{difficulty});
  assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 assert.match(uiActionLabel(choices[0]),/退場/);
 assert.match(V2_PENDING_LABELS['retirement-order'],/退場/);
 assert.equal(universalPublicView(chainPacks,s,0).players[1].hand,null);
 const first=choices.find(a=>a.key.startsWith(left.uid));
 s=dispatchUniversalAction(chainPacks,s,first,{actor:1});
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.equal(s.pending.player,1);
 assert.ok(legalUniversalActions(chainPacks,s).some(a=>a.uid===tall.uid));
 assert.ok(!legalUniversalActions(chainPacks,s).some(a=>a.uid===left.uid));
 assert.equal(s.players[1].deck.length,foeDeck,'the other onRetire has not milled yet');
 assert.equal(s.players[0].deck.length,ownDeck);
 const ownHand=s.players[0].hand.length;
 s=dispatchUniversalAction(chainPacks,s,{type:'chooseRetireBp',uid:tall.uid},{actor:1});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===tall.uid));
 assert.equal(s.players[0].hand.length,ownHand+2,'nested draw then the event follow-up, once each');
 assert.equal(s.players[0].deck.length,ownDeck-2);
 assert.equal(s.players[1].deck.length,foeDeck-1,'the remaining onRetire mills exactly once');
 assert.equal(s.players[1].hand.length,foeHand,'milling does not draw for the other controller');
 assert.equal(countRetirementsThisTurn(s,'any','character'),3);
 for(const uid of [left.uid,right.uid,tall.uid])
  assert.equal(s.turnRetireEvents.filter(e=>e.uid===uid).length,1);
 assert.equal(s.retirementBatch,null);
 assert.equal(assertUniversalMatch(chainPacks,s),true);
});

test('the other simultaneous order mills before the nested retirement, still exactly once',()=>{
 let {s,event,left,right,tall}=chainBoard();
 const ownDeck=s.players[0].deck.length,foeDeck=s.players[1].deck.length;
 s=dispatchUniversalAction(chainPacks,s,legalUniversalActions(chainPacks,s)
  .find(a=>a.type==='event'&&a.uid===event.uid));
 const millFirst=legalUniversalActions(chainPacks,s).find(a=>a.key.startsWith(right.uid));
 s=dispatchUniversalAction(chainPacks,s,millFirst,{actor:1});
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.equal(s.players[1].deck.length,foeDeck-1,'choosing the mill first resolves it before the nested retire');
 assert.equal(s.players[0].deck.length,ownDeck,'the event draw still waits');
 assert.equal(s.players[0].front[0]?.uid,tall.uid);
 s=dispatchUniversalAction(chainPacks,s,{type:'chooseRetireBp',uid:null},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0]?.uid,tall.uid,'declining the nested retire leaves the tall character');
 assert.equal(s.players[0].deck.length,ownDeck-1,'only the event follow-up draws');
 assert.equal(s.players[1].deck.length,foeDeck-1,'the mill is not repeated');
 assert.equal(countRetirementsThisTurn(s,'any','character'),2);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===left.uid).length,1);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===right.uid).length,1);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===tall.uid).length,0);
 assert.equal(assertUniversalMatch(chainPacks,s),true);
});

test('one printed onRetire among several victims does not ask for an order and is not repeated',()=>{
 const cards=chainCards.map(c=>c.id==='Q2'?{...c,implementation:'vanilla',effects:{}}:c);
 const pack=createUniversalPack({id:'single-trigger-r11',cards});
 const packs=[pack,pack],deck=deckOf(cards);
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:1104,first:0});
 const event=take(s,0,'Q0');s.players[0].hand.push(event);
 const left=take(s,1,'Q1'),right=take(s,1,'Q2'),victim=take(s,0,'Q4');
 left.ready=true;right.ready=true;victim.ready=true;
 s.players[1].front[0]=left;s.players[1].front[1]=right;s.players[0].front[0]=victim;
 s=toMain(packs,s);
 const foeDeck=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending?.kind,'effect-retire-bp','the single trigger starts immediately');
 assert.equal(s.players[1].deck.length,foeDeck);
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:null},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===left.uid).length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Raid top strip and full-line removal do not queue onRetire or a retirement event',()=>{
 const cards=Array.from({length:13},(_,i)=>({
  id:'R'+i,name:'R'+i,color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,
  implementation:'vanilla'
 }));
 cards[0]={...cards[0],type:'event',bp:0,gen:0,implementation:'dsl',effects:{onPlay:[{op:'stripOppRaidTop',optional:true}]}};
 cards[1]={...cards[1],raidName:'R2',implementation:'dsl',effects:{onRetire:[{op:'draw',count:1}]}};
 cards[2]={...cards[2],implementation:'dsl',effects:{onRetire:[{op:'draw',count:1}]}};
 const pack=createUniversalPack({id:'strip-remove-r11',cards});
 const packs=[pack,pack],deck=deckOf(cards);
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:1105,first:0});
 const event=take(s,0,'R0');s.players[0].hand.push(event);
 const top=take(s,1,'R1'),base=take(s,1,'R3');
 top.stack=[base];top.ready=true;s.players[1].front[0]=top;
 s=toMain(packs,s);
 const foeDeck=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending?.kind,'effect-strip-raid-top');
 s=dispatchUniversalAction(packs,s,{type:'chooseRaidTopStrip',uid:top.uid},{actor:0});
 assert.equal(s.players[1].front[0]?.uid,base.uid);
 assert.ok(s.players[1].outside.some(c=>c.uid===top.uid));
 assert.equal(s.players[1].deck.length,foeDeck);
 assert.equal(countRetirementsThisTurn(s,'any','any'),0);
 assert.equal(s.pending,null);
 let removed=newUniversalMatch(packs,{decks:[deck,deck],seed:1106,first:0});
 const displaced=take(removed,0,'R2');
 displaced.ready=true;removed.players[0].energy[0]=displaced;
 for(let slot=1;slot<4;slot++){
  const filler=take(removed,0,'R'+(slot+4));
  filler.ready=true;removed.players[0].energy[slot]=filler;
 }
 const incoming=take(removed,0,'R8');removed.players[0].hand.push(incoming);
 removed=toMain(packs,removed);
 const before=removed.players[0].deck.length;
 const play=legalUniversalActions(packs,removed).find(a=>a.type==='play'&&
  a.uid===incoming.uid&&a.line==='energy'&&a.slot===0&&a.replaceUid===displaced.uid);
 assert.ok(play);
 removed=dispatchUniversalAction(packs,removed,play);
 assert.ok(removed.players[0].removed.some(c=>c.uid===displaced.uid));
 assert.equal(removed.players[0].deck.length,before);
 assert.equal(countRetirementsThisTurn(removed,'any','any'),0);
 assert.equal(assertUniversalMatch(packs,removed),true);
});

test('Q74: blocker onRetire choice finishes before Impact reveals the next life',()=>{
 const cards=Array.from({length:13},(_,i)=>({
  id:'I'+i,name:'I'+i,color:'green',type:'character',energy:0,ap:1,
  bp:i===0?3000:1000,gen:1,implementation:'vanilla'
 }));
 cards[0]={...cards[0],raidName:'I1',implementation:'dsl',effects:{onRetire:[]},
  conditionalUnderFaceDown:{bp:1000,impact:1,leaveReplacementMinBp:5000}};
 cards[1]={...cards[1],implementation:'dsl',effects:{onRetire:[
  {op:'retireOppFrontOneUnderBp',bp:5000,optional:true}
]}};
 cards[2]={...cards[2],trigger:'draw'};
 const pack=createUniversalPack({id:'impact-order-r11',cards});
 const packs=[pack,pack],deck=deckOf(cards);
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:1107,first:0});
 const attacker=take(s,0,'I0'),base=take(s,0,'I3'),hidden=take(s,0,'I4');
 hidden.faceDown=true;base.under=[hidden];attacker.stack=[base];attacker.ready=true;
 s.players[0].front[0]=attacker;
 const blocker=take(s,1,'I1');blocker.ready=true;s.players[1].front[0]=blocker;
 const life=take(s,1,'I2');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.unshift(life);
 for(let n=0;n<4&&s.phase!=='attack';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.equal(s.players[1].life.length,lives,'Impact life stays hidden during 退場時');
 assert.equal(s.publicReveals.length,0);
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,life.uid);
 assert.equal(s.players[1].life.length,lives-1);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===blocker.uid).length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
