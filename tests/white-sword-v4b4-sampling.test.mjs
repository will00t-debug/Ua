import assert from 'node:assert/strict';
import test from 'node:test';
import {judgeSamples} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {mulberry32} from '../training/white-sword-ai/v4a/lib/evolve.mjs';
import {seriesFromSaved} from '../scripts/white-sword-v4b4-sampling.mjs';
import {
 consumeCurrent,pairsForPower,recount,runReplication,spread,symmetricNull,tilt
} from '../training/white-sword-ai/v4b4/lib/sampling.mjs';

test('eight exact ties stop and one decisive pair asks for more',()=>{
 const ties=consumeCurrent(Array(24).fill(0));
 assert.equal(ties.pairs,8);
 assert.equal(ties.usable,false);
 const one=[1,0,0,0,0,0,0,0,...Array(16).fill(0)];
 assert.ok(consumeCurrent(one).pairs>8);
});

test('three runner-up wins and five ties already exclude zero',()=>{
 const row=judgeSamples([-1,-1,-1,0,0,0,0,0]);
 assert.equal(row.usable,true);
 assert.ok(row.high<0);
});

test('tilting the observed tie rate reaches the requested mean',()=>{
 const base=symmetricNull(56,481,62);
 const tilted=tilt(base,-0.375);
 assert.ok(Math.abs(tilted.mean+0.375)<1e-3);
 assert.ok(tilted.tie<base.tie);
 assert.ok(pairsForPower(spread(tilted),0.375,2.8)>8);
});

test('a sure runner-up advantage is confirmed on a fresh sample of the planned size',()=>{
 const rng=mulberry32(3);
 const sure={plus:0,tie:0,minus:1};
 const result=runReplication(rng,Array.from({length:42},()=>sure),{cap:4,floor:-0.25});
 assert.equal(result.each,66);
 assert.equal(result.hits.length,4);
 assert.equal(result.hits.every(row=>row.n===66&&row.high<0),true);
});

test('the saved round spent its extra pairs without a new runner-up finding',()=>{
 const saved=recount(seriesFromSaved());
 assert.ok(saved.tieRate>0.75);
 assert.equal(saved.updateAfterExtension,0);
 assert.deepEqual(saved.screenUpdates.map(id=>id.slice(0,8)).sort(),['0406f018','4b6338ce','a925bcd5']);
 assert.ok(saved.extension>200);
});
