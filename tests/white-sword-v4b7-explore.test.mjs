import assert from 'node:assert/strict';
import test from 'node:test';
import {v2Hash} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {
 CLASS_LABEL,classifyRow,conflictIds,filterRecord,preferenceOf,searchEligible
} from '../training/white-sword-ai/v4b7/lib/catalog.mjs';
import {
 assertBudget,assertMineSeed,assertMineSeeds,branchGames,MINE_SEEDS
} from '../training/white-sword-ai/v4b7/lib/protocol.mjs';
import {selectExplore} from '../training/white-sword-ai/v4b7/lib/select.mjs';

test('confirmation slots stay within three learnable and one reserved',()=>{
 const means=[-0.8,-0.6,-0.5,-0.4,-0.3,-0.7,-0.2];
 const flags=[true,true,true,true,false,false,true];
 const chosen=selectExplore(means.map(mean=>({mean})),flags);
 assert.deepEqual(chosen.filter(row=>row.role==='learnable').map(row=>row.index),[0,1,2]);
 assert.deepEqual(chosen.filter(row=>row.role==='reserved').map(row=>row.index),[5]);
 assert.equal(selectExplore([{mean:-0.4},{mean:-0.8}],[true,true]).length,2);
 assert.equal(selectExplore([{mean:-0.4}],[false])[0].role,'reserved');
 assert.equal(selectExplore([{mean:-0.24}],[false]).length,0);
});

test('the branch budget matches the old 1200-game cap',()=>{
 assert.equal(branchGames(42,4),1200);
 assert.equal(assertBudget(42,4),1200);
 assert.throws(()=>assertBudget(43,4));
 assert.equal(branchGames(42,2),936);
});

test('opposite directions are recorded and are not learned',()=>{
 const front={actionA:{key:JSON.stringify({type:'play',line:'front'}),features:[]},actionB:{key:JSON.stringify({type:'play',line:'energy'}),features:[]}};
 const left=preferenceOf(front,-0.5);
 const right=preferenceOf(front,0.4);
 const ids=conflictIds([
  {id:'a',mean:-0.5,...left},
  {id:'b',mean:0.4,...right}
 ]);
 assert.equal(ids.has('a')&&ids.has('b'),true);
 const row={confirmed:true,learnable:true,role:'learnable',conflict:true,searchStatus:'safe'};
 assert.equal(classifyRow(row),'opposite');
 assert.equal(searchEligible(row),false);
 assert.equal(classifyRow({confirmed:true,learnable:false}),'unlearnable');
 assert.equal(classifyRow({confirmed:false}),'insufficient');
 assert.equal(CLASS_LABEL.safe.includes('安全學會'),true);
});

test('the energy-gap result is a missed filter, and new mine seeds are fresh',()=>{
 const before=v2Hash();
 const note=filterRecord(2.25,1.625);
 assert.equal(note.status,'filter-not-passed');
 assert.match(note.text,/不是該特徵在數學上無法改善策略的證明/);
 assertMineSeeds();
 assert.throws(()=>assertMineSeed(174200,'old'));
 assert.throws(()=>assertMineSeed(173100,'old'));
 assert.equal(MINE_SEEDS['white-sword'][0],175300);
 assert.equal(v2Hash(),before);
});
