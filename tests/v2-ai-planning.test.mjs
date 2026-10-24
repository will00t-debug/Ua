import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedUniversalAiContinuation} from '../dist/universal-v2/ai-planner.mjs';
import {rankUniversalAiActions} from '../dist/universal-v2/ai-strategy.mjs';
// Synthetic observation checks policy arithmetic, not official full-card play.
const packs=[{cards:{
 generator:{id:'generator',color:'red',type:'character',energy:0,ap:1,gen:1,bp:500},
 finisher:{id:'finisher',color:'red',type:'character',energy:5,ap:1,gen:1,bp:5000},
 filler:{id:'filler',color:'red',type:'character',energy:3,ap:1,gen:1,bp:1000}
}},{cards:{}}];
const make=()=>({actor:0,active:0,phase:'main',status:'playing',ownDeckCounts:{generator:4,finisher:4},
 pending:null,choices:[],legal:[],players:[
 {life:5,deckCount:20,handCount:2,hand:[{uid:'0-g',cardId:'generator'},{uid:'0-f',cardId:'finisher'}],
  outside:[],ap:3,energyTotal:4,energyByColor:{red:4},front:[],energy:[]},
 {life:5,deckCount:20,handCount:0,hand:[],outside:[],ap:3,energyTotal:0,energyByColor:{},front:[],energy:[]}
 ]});
test('bounded continuation rewards an energy play that unlocks a known own-hand finisher',()=>{
 const o=make();o.legal=[{type:'next'},{type:'play',uid:'0-g',line:'energy'}];
 const b=boundedUniversalAiContinuation(packs,o);
 assert.ok((b.get(JSON.stringify(o.legal[1]))||0)>0);
 assert.equal(b.has(JSON.stringify(o.legal[0])),false);
 assert.equal(rankUniversalAiActions(packs,o)[0].action.type,'play');
});
test('no AP or explicit node/time budget falls back without speculative actions',()=>{
 const o=make();o.legal=[{type:'next'},{type:'play',uid:'0-g',line:'energy'}];
 o.players[0].ap=1;assert.equal(boundedUniversalAiContinuation(packs,o).size,0);
 o.players[0].ap=3;
 assert.equal(boundedUniversalAiContinuation(packs,o,{nodes:0}).size,0);
 assert.equal(boundedUniversalAiContinuation(packs,o,{timeMs:0}).size,0);
});
test('private opponent hand, unrevealed LIFE and other hidden values are inaccessible to planner',()=>{
 const o=make();o.legal=[{type:'next'},{type:'play',uid:'0-g',line:'energy'}];
 const before=[...boundedUniversalAiContinuation(packs,o)],clone=structuredClone(o);
 clone.players[1].hand=[{uid:'secret',cardId:'unknown'}];
 clone.players[1].life=1;
 assert.deepEqual([...boundedUniversalAiContinuation(packs,clone)],before);
});
