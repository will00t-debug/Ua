import assert from 'node:assert/strict';
import test from 'node:test';
import {HARD_OPTIONS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {studySaved} from '../training/white-sword-ai/v4b1/lib/study.mjs';

const study=studySaved();
const byId=new Map(study.rows.map(row=>[row.id,row]));
const first=byId.get('6717e5fccd75a090');
const second=byId.get('dadcdc80f133e959');
const move=byId.get('675759e42cddd095');

test('the blend limits are unchanged',()=>{
 assert.equal(HARD_CAP,7);
 assert.equal(STEP_CAP,1.5);
 assert.equal(WEIGHT_CLIP,6);
 assert.equal(SCALE,6);
 assert.deepEqual(HARD_OPTIONS,{nodes:48});
});
test('the 060 margin is a shared pass penalty, not a card weight',()=>{
 for(const row of [first,second]){
  assert.ok(row.margin.groups.economy>row.margin.groups.hash);
  assert.ok(row.margin.groups.economy>80);
  assert.ok(row.margin.groups.card<1);
  assert.ok(row.margin.groups.aizen<0);
  assert.ok(row.margin.hard<7);
  assert.ok(row.ceilings.noShared.box<row.ceilings.noShared.gap);
  assert.ok(row.ceilings.cardOnly.box<40);
 }
});
test('repeated legal steps can flip 060 and the collateral is not small',()=>{
 for(const row of [first,second]){
  const named=row.walks.find(walk=>walk.kind==='logistic'&&walk.freezeHash);
  assert.equal(named.flipped,true);
  assert.ok(named.steps>=2);
  assert.ok(named.collateralSelected+named.collateralPool>=4);
  assert.equal(named.largestHash,0);
  assert.ok(named.maxAbs>1.5);
  assert.equal(row.safe.flipped,false);
  assert.ok(row.safe.gap>0);
 }
});
test('the move preference flips from one card weight with no collateral',()=>{
 assert.equal(move.safe.flipped,true);
 assert.equal(move.safe.steps,1);
 assert.deepEqual(move.safe.moved,['card_BLC-1-072']);
 assert.equal(move.safe.selected,0);
 assert.equal(move.safe.pool,0);
});
test('hash bins are the only separator for one stored pair',()=>{
 assert.equal(study.dependence.hashOnly,1);
 assert.equal(study.dependence.identical,30);
 assert.equal(study.dependence.boxWithoutHash,13);
 assert.equal(study.dependence.oneStepNeedsHash,14);
});
