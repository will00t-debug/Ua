import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {HARD_OPTIONS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {cloneModel,loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {choiceKey} from '../training/white-sword-ai/v4a/lib/diverge.mjs';
import {readJson} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {analyzeSaved} from '../training/white-sword-ai/v4b1/lib/audit.mjs';
import {HASH_INDEX,auditPair,policyAfter,selection} from '../training/white-sword-ai/v4b1/lib/feasibility.mjs';
import {logisticPolicy} from '../training/white-sword-ai/v4b1/lib/updates.mjs';

const V2='a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa';

function row(key,hard,features){
 return {key,hard,features};
}
test('limits stay at the v4-B values',()=>{
 assert.equal(HARD_CAP,7);
 assert.equal(STEP_CAP,1.5);
 assert.equal(WEIGHT_CLIP,6);
 assert.equal(SCALE,6);
 assert.deepEqual(HARD_OPTIONS,{nodes:48});
 const bytes=readFileSync('training/white-sword-ai/weights/v2-capped.json');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),V2);
});
test('a small gap is learnable in one step',()=>{
 const parent=[0.2,0];
 const band=[row('prefer',0,[0,1]),row('other',0,[1,0])];
 const verdict=auditPair(parent,{band},'prefer');
 assert.equal(verdict.class,1);
 assert.equal(verdict.oneFlips,true);
 assert.equal(selection(band,policyAfter(parent,verdict.oneDelta)),'prefer');
});
test('identical features cannot be separated',()=>{
 const parent=[0,0];
 const band=[row('prefer',1,[1,0]),row('other',4,[1,0])];
 const verdict=auditPair(parent,{band},'prefer');
 assert.equal(verdict.class,2);
 assert.equal(verdict.oneFlips,false);
 assert.equal(verdict.wideFlips,false);
});
test('a gap larger than one step is blocked without widening the cap',()=>{
 const parent=[5,0];
 const band=[row('prefer',0,[0,1]),row('other',0,[1,0])];
 const verdict=auditPair(parent,{band},'prefer');
 assert.equal(verdict.class,3);
 assert.equal(verdict.oneFlips,false);
 assert.equal(verdict.wideFlips,true);
 assert.ok(verdict.swingToRival<verdict.gapToRival);
});
test('an action outside the hard cap is blocked',()=>{
 const parent=[0,0];
 const band=[row('prefer',0,[1,0]),row('other',8,[0,1])];
 const verdict=auditPair(parent,{band},'prefer');
 assert.equal(verdict.class,3);
 assert.equal(verdict.inHardCap,false);
});
test('saved preferences match the one-step ceiling',()=>{
 const audit=analyzeSaved();
 const byId=new Map(audit.rows.map(row=>[row.id,row]));
 const first=byId.get('6717e5fccd75a090');
 const second=byId.get('dadcdc80f133e959');
 const move=byId.get('675759e42cddd095');
 const play=byId.get('ec7c5e704ca0b7d5');
 assert.equal(first.verdict.class,3);
 assert.match(first.verdict.reason,/單步 1\.5/);
 assert.match(second.verdict.reason,/單步 1\.5/);
 assert.equal(second.verdict.class,3);
 assert.ok(Math.abs(first.verdict.gapToRival-120.238)<0.01);
 assert.ok(Math.abs(second.verdict.gapToRival-116.730)<0.01);
 assert.ok(Math.abs(first.verdict.swingToRival-114.45)<0.01);
 assert.ok(first.verdict.swingToRival<first.verdict.gapToRival);
 assert.ok(second.verdict.swingToRival<second.verdict.gapToRival);
 assert.equal(first.verdict.oneFlips,false);
 assert.equal(first.verdict.wideFlips,true);
 assert.equal(first.verdict.inHardCap,true);
 assert.equal(move.verdict.class,1);
 assert.equal(move.methods[0].targetChanged,true);
 assert.equal(move.methods[1].targetChanged,true);
 assert.equal(move.methods[1].hashMoved,0);
 assert.equal(play.verdict.label,'已符合');
 assert.equal(play.methods[0].changedWeights,0);
 for(const row of [first,second]){
  assert.equal(row.methods[0].targetChanged,false);
  assert.equal(row.methods[1].targetChanged,false);
  assert.equal(row.methods[1].hashMoved,0);
  assert.equal(row.alone.clears,false);
  assert.notEqual(row.interaction.jointChoice,row.preferredKey);
 }
});
test('freezing hash bins leaves h0-h7 unchanged',()=>{
 const before=readJson('training/white-sword-ai/v4b/model-before.json').policy;
 const judged=readJson('training/white-sword-ai/v4b/judgments.json');
 const row=judged.find(item=>item.id==='6717e5fccd75a090');
 const named=logisticPolicy(before,row,{freezeHash:true});
 const open=logisticPolicy(before,row,{freezeHash:false});
 for(const index of HASH_INDEX)assert.equal(named.policy[index],before[index]);
 assert.ok(HASH_INDEX.some(index=>open.policy[index]!==before[index]));
 assert.ok(named.largestHash===0);
});
test('one preference does not consume another preference',()=>{
 const before=readJson('training/white-sword-ai/v4b/model-before.json').policy;
 const judged=readJson('training/white-sword-ai/v4b/judgments.json');
 const play=judged.find(item=>item.id==='ec7c5e704ca0b7d5');
 const move=judged.find(item=>item.id==='675759e42cddd095');
 const fromPlay=logisticPolicy(before,play,{freezeHash:false});
 const fromMove=logisticPolicy(before,move,{freezeHash:true});
 assert.equal(fromPlay.changed,0);
 assert.notDeepEqual(fromMove.policy,fromPlay.policy);
 const selected=readJson('training/white-sword-ai/v4b/selected.json').positions;
 const position=selected.find(item=>item.id===move.id);
 const preferred=move.mean>0?move.actionA.key:move.actionB.key;
 assert.equal(selection(position.band,fromMove.policy),preferred);
 assert.notEqual(selection(position.band,fromPlay.policy),preferred);
});
test('live blend does not select next after the largest legal step',async()=>{
 const before=readJson('training/white-sword-ai/v4b/model-before.json').policy;
 const selected=readJson('training/white-sword-ai/v4b/selected.json').positions;
 const position=selected.find(item=>item.id==='6717e5fccd75a090');
 const verdict=auditPair(before,position,position.band.find(row=>row.key.includes('"type":"next"')).key);
 const model=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const viewed=replayState(position);
 const pick=policy=>{
  const next=cloneModel(model);
  next.policy=policy;
  next.promoted=false;
  return choiceKey(chooseWhiteSwordAction(viewed.packs,cloneMatch(viewed.state),{
   actor:position.actor,model:next,mode:'blend',scale:6,hardCap:7,explore:0,seed:position.seed
  }).action);
 };
 const preferred=position.band.find(row=>JSON.parse(row.key).type==='next').key;
 assert.notEqual(pick(before),preferred);
 assert.notEqual(pick(policyAfter(before,verdict.oneDelta)),preferred);
 assert.equal(verdict.class,3);
});
