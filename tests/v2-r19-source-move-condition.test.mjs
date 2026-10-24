import test from 'node:test';
import assert from 'node:assert/strict';
import {appendCompletedMove,completedMovesMatching,matchesCompletedMove,
 validateCompletedMoveCondition} from '../dist/universal-v2/zone-move-events.mjs';

// Printed EX07BT/BLC-2-047: hand-to-outside caused by one's BLUE Ichigo
// on the field. Official Q1033: resolves AFTER source main effect; Q1046
// no generated-energy check; Q2315 still works after outside -> under.
const when={owner:0,controller:0,cardId:'BLC-2-047',from:'hand',
 to:'outside',reasons:['payment','own-effect'],sourceOnField:true,
 sourceName:'黒崎 一護',sourceColor:'blue'};
const base={order:10,turn:2,uid:'0-19',cardId:'BLC-2-047',owner:0,controller:0,
 from:'hand',to:'outside',reason:'payment',sourceUid:'0-4',
 sourceCardId:'BLC-2-019',sourceName:'黒崎 一護',
 sourceColor:'blue',sourceOnField:true};
test('BLC-2-047 strict source condition: same card/UID, BLUE Ichigo, no inferred energy requirement',()=>{
 assert.ok(Object.isFrozen(validateCompletedMoveCondition(when).reasons));
 assert.equal(matchesCompletedMove(base,when),true);
 assert.equal(matchesCompletedMove({...base,reason:'own-effect'},when),true);
 assert.equal(matchesCompletedMove({...base,reason:'opponent-effect',controller:1},when),false);
 // Need paid or own effect from named BLUE Ichigo in own field; other
 // discard/payment reasons must not all collapse to one trigger.
 for(const wrong of [
  {sourceName:'朽木 ルキア'},{sourceColor:'red'},{sourceOnField:false},
  {sourceUid:null,sourceName:null,sourceColor:null,sourceOnField:false},
  {controller:1},{owner:1,uid:'1-10'},{reason:'rule'},
  {reason:'raid-strip',from:'front'},{from:'deck'},
  {cardId:'BLC-2-048'},{to:'hand'}
 ])assert.equal(matchesCompletedMove({...base,...wrong},when),false,JSON.stringify(wrong));
});
test('completed matching scans only new ordered events, preserves owner and never treats LIFE GET as own recover',()=>{
 const valid={...base};
 const other={...base,order:11,uid:'0-20',sourceName:'other'};
 const enemy={...base,order:12,reason:'opponent-effect',controller:1};
 const life={...base,order:13,reason:'life-trigger',from:'outside',to:'hand'};
 const followed={...base,order:14,uid:'0-21',reason:'own-effect'};
 const state={zoneMoveEvents:[valid,other,enemy,life,followed]};
 assert.deepEqual(completedMovesMatching(state,when).map(e=>e.order),[10,14]);
 assert.deepEqual(completedMovesMatching(state,when,{afterOrder:10}).map(e=>e.order),[14]);
 assert.deepEqual(completedMovesMatching(state,when,{afterOrder:14}),[]);
});
test('typed filter rejects bad reasons, ambiguous aliases, opponent assumptions and unknown cost semantics',()=>{
 for(const bad of [
  {reasons:[]},{reasons:['payment','payment']},{reason:'payment',reasons:['own-effect']},
  {reason:'discard'},{from:'zone-x'},{to:'zone-y'},{owner:2},{controller:-1},
  {sourceOnField:'yes'},{sourceName:''},{secretOverride:true},{from:'hand',to:'hand'}
 ])assert.throws(()=>validateCompletedMoveCondition({...when,...bad}),/Invalid/);
});
test('actual post-movement append refuses preview/skip with no matching destination',()=>{
 const physical={uid:'0-1',cardId:'BLC-2-047'};
 const s={players:[{outside:[],hand:[physical]},{outside:[],hand:[]}],
  zoneMoveEvents:[],nextZoneMoveOrder:1,turn:1};
 const fields={uid:physical.uid,cardId:physical.cardId,owner:0,controller:0,
  from:'hand',to:'outside',reason:'payment',sourceUid:'0-4',
  sourceCardId:'BLC-2-019',sourceName:'黒崎 一護',sourceColor:'blue',sourceOnField:true};
 assert.throws(()=>appendCompletedMove(s,fields),/completed destination/);
 assert.equal(s.zoneMoveEvents.length,0);
 const moved=s.players[0].hand.pop();s.players[0].outside.push(moved);
 const e=appendCompletedMove(s,fields);
 assert.equal(e.order,1);assert.equal(s.nextZoneMoveOrder,2);
 assert.deepEqual(completedMovesMatching(s,when).map(x=>x.uid),[moved.uid]);
});
