import assert from 'node:assert/strict';
import test from 'node:test';
import {v2Hash} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {STEP_CAP,WEIGHT_CLIP} from '../training/white-sword-ai/v4b2/lib/protocol.mjs';
import {actionLabel} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {harmed,selectChecks} from '../training/white-sword-ai/v4b5/lib/checks.mjs';
import {assertMineSeeds,mineSeedList,TARGET_ID} from '../training/white-sword-ai/v4b5/lib/protocol.mjs';
import {loadUpdate} from '../training/white-sword-ai/v4b5/lib/update.mjs';

test('the confirmed energy play becomes a one-step line bias',()=>{
 const before=v2Hash();
 const update=loadUpdate();
 assert.equal(update.ok,true);
 assert.equal(update.keptTarget,true);
 assert.equal(update.hashMoved,false);
 assert.equal(update.adopted,false);
 assert.equal(update.target.id,TARGET_ID);
 assert.equal(v2Hash(),before);
 const names=update.weights.map(row=>row.name).sort();
 assert.deepEqual(names,['line_energy','line_front']);
 const front=update.weights.find(row=>row.name==='line_front');
 const energy=update.weights.find(row=>row.name==='line_energy');
 assert.ok(front.delta<0&&energy.delta>0);
 assert.ok(Math.abs(front.delta)<=STEP_CAP+1e-6);
 assert.ok(Math.abs(energy.delta)<=STEP_CAP+1e-6);
 assert.ok(Math.abs(front.after)<=WEIGHT_CLIP&&Math.abs(energy.after)<=WEIGHT_CLIP);
 assert.ok(update.necessary.some(id=>id.startsWith('1fbdc61d')));
 const changed=update.changes.map(row=>row.id);
 assert.equal(changed.some(id=>id.startsWith('2681cf04')),false);
 assert.equal(changed.some(id=>id.startsWith('80e8acea')),false);
 assert.equal(changed.some(id=>id.startsWith('525ea92d')),false);
 assert.equal(changed.some(id=>id.startsWith('4b6338ce')),false);
 assert.equal(changed.some(id=>id.startsWith('bc09a4e0')),false);
});

test('fresh front-keeping positions fill the check list before saved ones',()=>{
 assertMineSeeds();
 assert.equal(new Set(mineSeedList()).size,24);
 const update={
  changes:[{id:'raid',beforeKey:'a',afterKey:'b',beforeLabel:'原',afterLabel:'新'}],
  rows:[{id:'saved',line:{card:'BLC-4-070',currentLine:'front',frontKey:'f',energyKey:'e',frontLabel:'前線',energyLabel:'能量'},changed:false,beforeLabel:'前線',afterLabel:'前線'}]
 };
 const fresh=[{
  id:'kept',changed:false,beforeKey:'f',afterKey:'f',beforeLabel:'前線',afterLabel:'前線',
  line:{currentLine:'front',frontKey:'f',energyKey:'e',frontLabel:'前線',energyLabel:'能量'}
 }];
 const checks=selectChecks(update,fresh);
 assert.deepEqual(checks.map(row=>row.id),['raid','kept','saved']);
 assert.equal(checks[1].kind,'front-kept');
 assert.equal(checks[1].keyB,'e');
 const many=Array.from({length:8},(_,index)=>({...fresh[0],id:'kept'+index}));
 assert.equal(selectChecks(update,many).length,3);
 const flips=Array.from({length:5},(_,index)=>({
  id:'flip'+index,changed:true,beforeKey:'f',afterKey:'e',beforeLabel:'前線',afterLabel:'能量',
  opponent:index?'renruki':'white-sword',bucket:'mid-entry',
  line:{currentLine:'front',frontKey:'f',energyKey:'e',frontLabel:'前線',energyLabel:'能量'}
 }));
 const mixed=selectChecks(update,[...flips,...many]);
 assert.deepEqual(mixed.map(row=>row.kind),['collateral','flipped','flipped','front-kept','front-kept']);
 assert.equal(mixed[1].id,'flip0');
 const fallback=selectChecks(update,[]);
 assert.equal(fallback.some(row=>row.id==='saved'),true);
 assert.equal(harmed([{oldSideHolm:true,mean:0.2}]),true);
 assert.equal(harmed([{oldSideHolm:false,mean:0.2}]),false);
 assert.equal(actionLabel(JSON.stringify({type:'event'}),'BLC-2-073'),'打出 BLC-2-073');
 assert.equal(actionLabel(JSON.stringify({type:'raid'}),'BLC-2-067'),'突襲 BLC-2-067');
});
