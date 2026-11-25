import assert from 'node:assert/strict';
import test from 'node:test';
import {looseCanChange,winner,withResidual} from '../training/white-sword-ai/v6a2/lib/feasible.mjs';
import {numericalRank} from '../training/white-sword-ai/v6a2/lib/rank.mjs';

test('a repeated column has rank 1',()=>{
 assert.equal(numericalRank([[1,1],[1,1]]).rank,1);
 assert.equal(numericalRank([[1,0],[0,1]]).rank,2);
 assert.equal(numericalRank([[0,0],[0,0]]).rank,0);
 assert.equal(numericalRank([[1,2,3],[2,4,6],[1,0,1]]).rank,2);
});

test('a blend gap above 36 cannot be crossed by a clipped residual',()=>{
 const blocked=[
  {key:'a',sort:'a',blend:0,phi:[1]},
  {key:'b',sort:'b',blend:36.1,phi:[0]}
 ];
 assert.equal(winner(blocked.map(action=>({...action,total:action.blend}))).key,'b');
 assert.equal(looseCanChange(blocked).possible,false);
 const tied=[
  {key:'a',sort:'a',blend:0,phi:[1]},
  {key:'b',sort:'b',blend:36,phi:[0]}
 ];
 const scored=withResidual(tied,action=>action.key==='a'?18:-18);
 assert.equal(winner(scored).key,'a');
});

function clipped(blend,phi,beta){
 const dot=phi.reduce((sum,value,index)=>sum+value*beta[index],0);
 return blend+Math.max(-18,Math.min(18,dot));
}
test('a shared weight stays inside the clip and cannot close an identical-feature gap',()=>{
 const ahead=[0,0];
 assert.ok(clipped(1,[0,1],ahead)>=clipped(0,[1,0],ahead)+1e-4);
 assert.ok(ahead.every(value=>Math.abs(value)<=18));
 const behind=[0,5+1e-4];
 assert.ok(clipped(0,[0,1],behind)>=clipped(5,[1,0],behind)+1e-4-1e-9);
 assert.ok(behind.every(value=>Math.abs(value)<=18));
 const blocked=[
  {key:'keep',sort:'keep',blend:0,phi:[1]},
  {key:'alt',sort:'alt',blend:100,phi:[1]}
 ];
 assert.equal(looseCanChange(blocked).possible,false);
 const any=[3,-7];
 assert.ok(clipped(100,[1],any)-clipped(0,[1],any)>36);
});
