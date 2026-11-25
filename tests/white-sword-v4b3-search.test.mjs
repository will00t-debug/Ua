import assert from 'node:assert/strict';
import test from 'node:test';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {benjaminiHochberg,comparisonP,normalTwoSided} from '../training/white-sword-ai/v4b3/lib/labels.mjs';
import {minimize} from '../training/white-sword-ai/v4b3/lib/lp.mjs';
import {fitTarget,minimumImpact,selectionAudit} from '../training/white-sword-ai/v4b3/lib/search.mjs';
import {loadStudy} from '../training/white-sword-ai/v4b3/lib/study.mjs';
import {VERIFY_SALT,checksFor,directedInterval,summarizeVerification} from '../training/white-sword-ai/v4b3/lib/verify.mjs';

const SCALE=6;
function zeros(width){return Array(width).fill(0);}
function action(key,hard,features){return {key,hard,features};}
function box(width){return Array.from({length:width},()=>({lo:-1.5,hi:1.5}));}

test('the bounded program finds the known minimum and rejects an empty box',()=>{
 const bounds=[{lo:-2,hi:2}];
 const one=minimize([{coeff:[1],rhs:1}],bounds);
 assert.equal(one.ok,true);
 assert.ok(Math.abs(one.x[0]-1)<1e-6);
 const pair=minimize([
  {coeff:[1,1],rhs:1},
  {coeff:[1,-1],rhs:1}
 ],[{lo:-2,hi:2},{lo:-2,hi:2}]);
 assert.deepEqual(pair.x.map(value=>Math.round(value*1e6)/1e6),[1,0]);
 const empty=minimize([{coeff:[1],rhs:3}],[{lo:-1,hi:1}]);
 assert.equal(empty.ok,false);
});

test('a normal tail and Benjamini-Hochberg keep only the strong comparison',()=>{
 assert.ok(Math.abs(normalTwoSided(1.95996398454)-0.05)<1e-3);
 const weak={mean:0.375,low:0.016,high:0.734,n:8,usable:true};
 const strong={mean:0.875,low:0.63,high:1.12,n:8,usable:true};
 assert.ok(comparisonP(weak)>0.01);
 assert.ok(comparisonP(strong)<1e-6);
 const noisy=Array.from({length:40},()=>({mean:0,low:-0.2,high:0.2,n:8}));
 const kept=benjaminiHochberg([...noisy,strong,weak].map(comparisonP));
 assert.equal(kept.has(40),true);
 assert.equal(kept.has(41),false);
});

test('the box can avoid a collateral move that the feature-difference ray causes',()=>{
 const parent=zeros(2);
 const target=[
  action('a',0,[1,0]),
  action('b',0.4,[0,1]),
  action('c',0,[2,0])
 ];
 const ray=parent.slice();
 ray[0]=0.04;
 ray[1]=-0.04;
 const scores=target.map(row=>row.hard+SCALE*ray.reduce((sum,weight,index)=>sum+weight*(row.features[index]||0),0));
 assert.ok(scores[2]>scores[0]);
 assert.ok(scores[0]>scores[1]);
 const audit=selectionAudit(ray,target,'a','b');
 assert.equal(audit.pair,true);
 assert.equal(audit.third,true);
 assert.equal(audit.chosen,'c');
 const fit=fitTarget(parent,target,'a',{freezeHash:false});
 assert.equal(fit.ok,true);
 assert.equal(chooseKey(target,fit.policy,SCALE),'a');
 const guarded=[
  {id:'other',hard:false,keepKey:'keep',band:[
   action('keep',0,[0,0]),
   action('copy',0.05,[1,0])
  ]}
 ];
 const impact=minimumImpact(parent,{band:target,keepKey:'a'},guarded,{freezeHash:false});
 assert.equal(impact.ok,true);
 assert.equal(chooseKey(target,impact.policy,SCALE),'a');
 assert.equal(chooseKey(guarded[0].band,impact.policy,SCALE),'keep');
 assert.equal(impact.necessary.length,0);
});

test('a fixed pair keeps a win for A positive and ignores an unfinished side',()=>{
 const checks=[{checkId:'target:abc',kind:'target',actor:0,pairs:2}];
 const records=[
  {id:'target:abc:0:A',attempt:0,side:'A',finished:true,winner:0},
  {id:'target:abc:0:B',attempt:0,side:'B',finished:true,winner:1},
  {id:'target:abc:1:A',attempt:1,side:'A',finished:false,winner:null},
  {id:'target:abc:1:B',attempt:1,side:'B',finished:true,winner:0}
 ];
 const [row]=summarizeVerification(checks,records);
 assert.equal(row.n,1);
 assert.equal(row.mean,1);
 assert.equal(row.unfinished,1);
});

test('a negative original mean flips the fresh interval onto the labeled preference',()=>{
 const directed=directedInterval({
  kind:'target',originalMean:-0.375,mean:0.4375,low:0.129,high:0.746
 });
 assert.ok(directed.mean<0);
 assert.ok(directed.high<0);
 assert.ok(Math.abs(directed.low+0.746)<1e-9);
});

test('verification seeds start after the earlier 24-sample window',()=>{
 assert.ok(VERIFY_SALT>88000+23*997);
});

test('saved rounds separate a quiet step, a necessary card coupling, and a box that cannot reach',()=>{
 const study=loadStudy();
 assert.equal(study.adopted,false);
 assert.deepEqual(study.anchors.map(row=>row.id.slice(0,8)),['525ea92d']);
 const byId=new Map(study.targets.map(row=>[row.id.slice(0,8),row]));
 const discard=byId.get('4b6338ce');
 assert.equal(discard.search.status,'zero-impact');
 assert.equal(discard.keptTarget,true);
 assert.equal(discard.changes.length,0);
 assert.equal(discard.ray.changes.some(row=>row.id.startsWith('eced4eba')),true);
 const move=byId.get('a925bcd5');
 assert.equal(move.keptTarget,true);
 assert.deepEqual(move.search.necessary.map(id=>id.slice(0,8)),['ff11698b']);
 assert.equal(move.changes.some(row=>row.id.startsWith('bb4fb082')),false);
 assert.equal(move.ray.changes.some(row=>row.id.startsWith('bb4fb082')),true);
 const pass=byId.get('0406f018');
 assert.equal(pass.search.status,'target-infeasible');
 assert.equal(pass.hashFree.ok,false);
 assert.equal(pass.swing.clears,false);
 const saved=byId.get('6717e5fc');
 assert.equal(saved.search.status,'target-infeasible');
 assert.equal(saved.hashFree.ok,false);
 const priorMove=byId.get('675759e4');
 assert.deepEqual(priorMove.search.necessary.map(id=>id.slice(0,8)),['e74d9a98']);
 const checks=checksFor(study);
 assert.equal(checks.filter(row=>row.kind==='target').length,3);
 assert.equal(checks.filter(row=>row.kind==='release').length,2);
});

test('identical features stay infeasible and a forced shared weight is a necessary release',()=>{
 const parent=zeros(1);
 const tied=fitTarget(parent,[
  action('a',0,[1]),
  action('b',0,[1])
 ],'a',{freezeHash:false});
 assert.equal(tied.ok,false);
 const target=[action('prefer',0,[1]),action('other',0.2,[0])];
 const blocked=[{
  id:'protected',hard:true,keepKey:'safe',
  band:[action('safe',0,[0]),action('risk',0.05,[1])]
 }];
 const result=minimumImpact(parent,{band:target,keepKey:'prefer'},blocked,{freezeHash:false});
 assert.equal(result.ok,false);
 assert.equal(result.status,'anchor-infeasible');
});
