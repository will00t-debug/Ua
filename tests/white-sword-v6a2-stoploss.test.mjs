import assert from 'node:assert/strict';
import test from 'node:test';
import {looseCanChange,proveTargets,winner,withResidual} from '../training/white-sword-ai/v6a2/lib/feasible.mjs';
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

test('shared weights are accepted only inside the linear clip',()=>{
 const feasible=proveTargets([{
  actions:[
   {key:'keep',sort:'keep',blend:0,phi:[1,0]},
   {key:'alt',sort:'alt',blend:1,phi:[0,1]}
  ],
  winnerKey:'alt',eps:1e-4
 }],{seconds:5});
 assert.equal(feasible.status,'found');
 const beta=feasible.beta;
 const alt=1+beta[1];
 const keep=0+beta[0];
 assert.ok(alt>=keep+1e-4-1e-6);
 assert.ok(Math.abs(beta[0])<=18+1e-8&&Math.abs(beta[1])<=18+1e-8);
 const behind=proveTargets([{
  actions:[
   {key:'v2',sort:'v2',blend:5,phi:[1,0]},
   {key:'want',sort:'want',blend:0,phi:[0,1]}
  ],
  winnerKey:'want',eps:1e-4
 }],{seconds:5});
 assert.equal(behind.status,'found');
 assert.ok(behind.beta[1]>=5+behind.beta[0]+1e-4-1e-6);
 const blocked=proveTargets([{
  actions:[
   {key:'keep',sort:'keep',blend:0,phi:[1]},
   {key:'alt',sort:'alt',blend:100,phi:[1]}
  ],
  winnerKey:'keep',eps:1e-4
 }],{seconds:5});
 assert.equal(blocked.status,'infeasible');
});
