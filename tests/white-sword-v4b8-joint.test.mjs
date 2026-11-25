import assert from 'node:assert/strict';
import test from 'node:test';
import {POLICY_DIM,POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE,v2Hash} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {savedPositions} from '../training/white-sword-ai/v4b5/lib/update.mjs';
import {explainPair} from '../training/white-sword-ai/v4b8/lib/gap.mjs';
import {jointImpact} from '../training/white-sword-ai/v4b8/lib/joint.mjs';
import {selectLineQuota,selectScreen} from '../training/white-sword-ai/v4b8/lib/lines.mjs';
import {attachMeasured} from '../training/white-sword-ai/v4b8/lib/measure.mjs';
import {judgeOpposite} from '../training/white-sword-ai/v4b8/lib/opposite.mjs';
import {
 JOINT_RULE,MINE_SEEDS,OPPOSITE_RULE,assertBudget,assertJointRule,assertMineSeed,assertMineSeeds,
 branchGames,oppositeBudget
} from '../training/white-sword-ai/v4b8/lib/protocol.mjs';

function play(line,card='BLC-4-070'){
 const features=Array(POLICY_DIM).fill(0);
 features[POLICY_INDEX['card_'+card]]=1;
 return {key:JSON.stringify({type:'play',line}),features,action:{type:'play'}};
}
function position(id,opponent,direction,step=1){
 const front=play('front');
 const energy=play('energy');
 const actionA=direction==='front-kept'?front:energy;
 const actionB=direction==='front-kept'?energy:front;
 return {id,opponent,step,seed:step,bucket:'mid-entry',actionA,actionB,band:[actionA,actionB]};
}

test('the joint rule is registered before a search and drops the old quartile gate',()=>{
 const rule=assertJointRule();
 assert.equal(rule.id,'v4b8-joint-1');
 assert.match(JOINT_RULE.text,/不補 0/);
 assert.match(JOINT_RULE.text,/不採用/);
 assert.match(JOINT_RULE.text,/不再使用單特徵兩倍四分位數/);
 assert.match(OPPOSITE_RULE.text,/兩筆都顯著/);
 assert.equal(branchGames(42,4),1200);
 assert.equal(assertBudget(42,4),1200);
 assert.equal(oppositeBudget(42,4).confirm,false);
 assert.equal(oppositeBudget(42,2).confirm,true);
 assert.equal(oppositeBudget(42,3).leftover,132);
 assertMineSeeds();
 assert.throws(()=>assertMineSeed(175300,'old'));
 assert.throws(()=>assertMineSeed(175349,'old'));
 assert.equal(MINE_SEEDS['white-sword'][0],175500);
 assert.equal(MINE_SEEDS.renruki.at(-1),175549);
});

test('same-card line slots keep both directions and do not backfill',()=>{
 const pool=[];
 for(let index=0;index<5;index++){
  pool.push(position('f'+index,index<3?'white-sword':index===3?'reject-blue':'renruki','front-kept',index));
 }
 pool.push(position('e0','white-sword','energy-kept',9));
 pool.push(position('other','reject-blue','front-kept',4));
 const quota=selectLineQuota(pool,{perDirection:3});
 assert.equal(quota.chosen.filter(row=>row.direction==='front-kept').length,3);
 assert.equal(quota.chosen.filter(row=>row.direction==='energy-kept').length,1);
 assert.equal(quota.available['energy-kept'],1);
 const screen=selectScreen(pool,{cap:42,perDirection:3,perCell:2});
 assert.ok(screen.chosen.length<=42);
 assert.ok(screen.lines.every(row=>screen.chosen.some(item=>item.id===row.position.id)));
 const onlyFront=selectLineQuota(pool.filter(row=>row.id.startsWith('f')),{perDirection:3});
 assert.equal(onlyFront.chosen.filter(row=>row.direction==='energy-kept').length,0);
 assert.equal(onlyFront.chosen.length,3);
});

test('one step can satisfy two separable targets and refuses an empty feature gap',()=>{
 const parent=[0,0];
 const first={id:'t1',keepKey:'b',band:[{key:'a',hard:1,features:[0,0]},{key:'b',hard:0,features:[1,0]}]};
 const second={id:'t2',keepKey:'b',band:[{key:'a',hard:1,features:[0,0]},{key:'b',hard:0,features:[0,1]}]};
 const kept=jointImpact(parent,[first,second],[]);
 assert.equal(kept.ok,true);
 assert.equal(kept.adopted,false);
 assert.equal(kept.weights.length,2);
 assert.ok(kept.weights.every(row=>row.delta>0.1));
 const blocked={id:'x',keepKey:'b',band:[{key:'a',hard:10,features:[0]},{key:'b',hard:0,features:[0]}]};
 const missed=jointImpact([0],[blocked],[]);
 assert.equal(missed.ok,false);
 assert.equal(missed.status,'target-infeasible');
 const anchor={
  id:'525ea92d-anchor',hard:true,keepKey:'a',
  band:[{key:'a',hard:0,features:[0,0]},{key:'b',hard:0,features:[1,0]}]
 };
 const clash=jointImpact(parent,[first],[anchor]);
 assert.equal(clash.ok,false);
 assert.equal(clash.status,'anchor-infeasible');
});

test('a missing measured action is rejected instead of stored as zero',()=>{
 const band=[{key:'front',features:[1]},{key:'energy',features:[0]}];
 const partial=attachMeasured(band,[{key:'front',values:{hand_short:2}}],['hand_short']);
 assert.equal(partial.ok,false);
 assert.equal(partial.band,undefined);
 assert.deepEqual(partial.missing,['energy']);
 const full=attachMeasured(band,[
  {key:'front',values:{hand_short:0}},
  {key:'energy',values:{hand_short:2.25}}
 ],['hand_short']);
 assert.equal(full.ok,true);
 assert.equal(full.band[1].features.at(-1),2.25);
 assert.equal(full.band[0].features.at(-1),0);
});

test('opposite directions need both pre-registered signs, not one screen mean',()=>{
 const towardEnd=Array.from({length:66},(_,index)=>index<40?-1:0);
 const towardActivate=Array.from({length:66},(_,index)=>index<40?1:0);
 const confirmed=judgeOpposite([
  {id:'a8ea32166942bc90',screenMean:-0.25,diffs:towardEnd},
  {id:'5f868c674f2e1fee',screenMean:0.25,diffs:towardActivate}
 ]);
 assert.equal(confirmed.both,true);
 const oneSided=judgeOpposite([
  {id:'a8ea32166942bc90',screenMean:-0.25,diffs:towardEnd},
  {id:'5f868c674f2e1fee',screenMean:0.25,diffs:Array(66).fill(0)}
 ]);
 assert.equal(oneSided.both,false);
 assert.equal(oneSided.rows[1].confirmed,false);
});

test('the second confirmed line gap stays outside the frozen one-step box',()=>{
 const before=v2Hash();
 const parent=loadModel(V2_FILE).policy;
 const first=savedPositions().find(position=>position.id==='d12a2d6f5ced1d88');
 const second=readJson('training/white-sword-ai/v4b7/mine.json',{positions:[]}).positions
  .find(position=>position.id==='b122fb89d72eec7e');
 const left=explainPair(parent,first,first.actionB.key);
 const right=explainPair(parent,second,second.actionB.key);
 assert.equal(left.clears,true);
 assert.equal(left.fit,true);
 assert.equal(right.clears,false);
 assert.equal(right.fit,false);
 assert.equal(right.bandSize,2);
 assert.ok(right.shortfall>1);
 assert.ok(Math.abs(left.policy-right.policy)<1e-8);
 assert.ok(right.hard>left.hard);
 const movable=right.diffs.filter(row=>!row.hash).map(row=>row.name).sort();
 assert.deepEqual(movable,['line_energy','line_front']);
 assert.equal(v2Hash(),before);
});
