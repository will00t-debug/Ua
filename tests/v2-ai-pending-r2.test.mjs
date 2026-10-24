import test from 'node:test';
import assert from 'node:assert/strict';
import {rankUniversalAiActions} from '../dist/universal-v2/ai-strategy.mjs';
import inventory from './fixtures/v2-ai-decision-inventory.json' with {type:'json'};
// Artificial observations are *not* simulated registered cards or engine coverage.
const pack={cards:{
 weak:{id:'weak',type:'character',name:'Weak',color:'red',energy:0,ap:1,gen:1,bp:1000},
 mid:{id:'mid',type:'character',name:'Mid',color:'red',energy:2,ap:1,gen:1,bp:3000},
 big:{id:'big',type:'character',name:'Big',color:'red',energy:5,ap:1,gen:1,bp:5000}
}};
const physical=(cardId,uid,bp)=>({cardId,uid,bp,ready:true,impact:0,damage:1,produces:1});
function observation(kind){
 const own={life:5,deckCount:25,handCount:3,hand:[physical('weak','w',1000),physical('mid','m',3000),physical('big','b',5000)],
  outside:[],ap:3,energyTotal:5,energyByColor:{red:5},front:[],energy:[]};
 return {actor:0,active:0,status:'playing',phase:'main',pending:{kind,player:0},
  ownDeckCounts:{weak:4,mid:4,big:4},legal:[],choices:[],players:[own,
  {life:5,deckCount:25,handCount:0,hand:[],outside:[],ap:3,energyTotal:3,energyByColor:{red:3},front:[],energy:[]}]};
}
const pick=o=>rankUniversalAiActions([pack,pack],o)[0].action;
test('inventory keeps 61 unique kinds; synthetic coverage is separately classified',()=>{
 const all=Object.values(inventory.pendingGroups).flat();
 assert.equal(all.length,61);assert.equal(new Set(all).size,61);
});
test('optional one-card gated payment rejects poor effect but pays for verified profitable draw',()=>{
 const o=observation('effect-discard-gate');
 o.legal=[{type:'chooseDiscardGate',uid:null},{type:'chooseDiscardGate',uid:'w'},{type:'chooseDiscardGate',uid:'b'}];
 o.pending.continuation=[];assert.equal(pick(o).uid,null);
 o.pending.continuation=[{op:'draw',count:3}];assert.equal(pick(o).uid,'w');
});
test('atomic two-card payment uses distinct cheap UIDs, or declines optional bad exchange',()=>{
 const o=observation('effect-discard-gate');
 o.legal=[{type:'chooseDiscardGate',uid:null},{type:'chooseDiscardGate',uids:['w','b']},{type:'chooseDiscardGate',uids:['w','m']}];
 o.pending.continuation=[{op:'draw',count:4}];assert.deepEqual(pick(o).uids,['w','m']);
 o.pending.continuation=[];assert.equal(pick(o).uid,null);
});
test('forced bounce selects a lower-loss body, optional bounce may decline',()=>{
 const o=observation('effect-bounce-own');
 o.players[0].front=[physical('weak','w',1000),physical('big','b',5000)];
 o.players[0].hand=[];o.pending.after=[];
 o.legal=[{type:'chooseOwnBounce',uid:'b'},{type:'chooseOwnBounce',uid:'w'}];
 assert.equal(pick(o).uid,'w');
 o.legal.unshift({type:'chooseOwnBounce',uid:null});assert.equal(pick(o).uid,null);
});
test('optional printed once-per-turn effect must justify activation',()=>{
 const o=observation('effect-once-choice');
 o.legal=[{type:'chooseOnce',mode:'skip'},{type:'chooseOnce',mode:'activate'}];
 o.pending.continuation=[];assert.equal(pick(o).mode,'skip');
 o.pending.continuation=[{op:'draw',count:2}];assert.equal(pick(o).mode,'activate');
});
test('officially resolved mode options compare printed effect estimates',()=>{
 const o=observation('effect-choice-mode');o.pending.options=[
 {id:'none',then:[]},{id:'draw',then:[{op:'draw',count:2}]}];
 o.legal=[{type:'chooseEffectMode',mode:'none'},{type:'chooseEffectMode',mode:'draw'}];
 assert.equal(pick(o).mode,'draw');
});
test('authorized private search identities favor more useful affordable material',()=>{
 const o=observation('effect-search-deck');
 o.legal=[{type:'chooseSearch',uid:'sr-w'},{type:'chooseSearch',uid:'sr-b'}];
 o.choices=o.legal.map((action,i)=>({action,card:{cardId:i?'big':'weak'}}));
 assert.equal(pick(o).uid,'sr-b');
});
test('own sacrifice uses public printed followup rather than always retiring a body',()=>{
 const o=observation('effect-retire-own-character');
 o.players[0].front=[physical('weak','w',1000)];o.legal=[
 {type:'retireSelf',uid:null},{type:'retireSelf',uid:'w'}];
 o.pending.after=[];assert.equal(pick(o).uid,null);
 o.pending.after=[{op:'draw',count:3}];assert.equal(pick(o).uid,'w');
});
test('enemy targets and attack-end swap use visible effective values',()=>{
 const o=observation('effect-retire-bp');
 o.players[1].front=[physical('weak','ew',1000),physical('big','eb',5000)];
 o.legal=[{type:'retireEnemy',uid:'ew'},{type:'retireEnemy',uid:'eb'}];
 assert.equal(pick(o).uid,'eb');
 o.pending.kind='attack-end-swap';o.players[0].front=[physical('weak','w',1000),physical('big','b',5000)];
 o.legal=[{type:'attackEndSwap',uid:'w'},{type:'attackEndSwap',uid:'b'}];
 assert.equal(pick(o).uid,'b');
});
