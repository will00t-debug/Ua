import assert from 'node:assert/strict';
import test from 'node:test';
import {orient} from '../training/white-sword-ai/v6a1/lib/audit.mjs';
import {gameLoss,gamesNeeded,positionLoss} from '../training/white-sword-ai/v6a1/lib/metrics.mjs';
import {gameRole} from '../training/white-sword-ai/v6a/lib/protocol.mjs';

test('swapping A and B reverses the target and the recorded keys',()=>{
 const row={featuresA:[1],featuresB:[2],keyA:'a',keyB:'b',y:0.4,diffs:[1,-1],plus:1,minus:1,weight:2};
 const flipped=orient(row);
 assert.equal(flipped.y,-0.4);
 assert.deepEqual(flipped.diffs,[-1,1]);
 assert.equal(flipped.keyA,'b');
 assert.equal(flipped.featuresA[0],2);
});

test('a game average can hide position errors',()=>{
 const rows=[
  {game:'g',y:1,weight:1,x:[0]},
  {game:'g',y:-1,weight:1,x:[0]}
 ];
 const model={beta:[]};
 const positions=positionLoss(rows,model);
 const games=gameLoss(rows,model);
 assert.ok(positions.mse>0.5);
 assert.ok(games.cancelledMse<1e-12);
 assert.ok(games.mse>0.5);
});

test('the rough sample formula reports a total and an extra count',()=>{
 const needed=gamesNeeded(0.3,18);
 assert.equal(needed.total>needed.extra,true);
 assert.equal(needed.extra,needed.total-18);
 assert.equal(gamesNeeded(0,18).total,null);
 assert.equal(gameRole('reject-blue|183200'),gameRole('reject-blue|183200'));
});
