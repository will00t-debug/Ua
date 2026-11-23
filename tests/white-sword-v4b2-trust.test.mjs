import assert from 'node:assert/strict';
import test from 'node:test';
import {POLICY_DIM,POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {MINE_SEEDS as OLD_SEEDS} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {acceptBalanced,interleaveSpecs,selectBalanced} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {chooseUpdate,evaluateGroup} from '../training/white-sword-ai/v4b2/lib/decide.mjs';
import {MINE_SEEDS,assertRoundPlan,assertRoundSeed} from '../training/white-sword-ai/v4b2/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b2/lib/report.mjs';
import {minimumStep} from '../training/white-sword-ai/v4b2/lib/step.mjs';
import {contrastOf,legacyBaseline,relationOf,trustDecision} from '../training/white-sword-ai/v4b2/lib/trust.mjs';

const CARD_A=POLICY_INDEX['card_BLC-2-069'];
const CARD_B=POLICY_INDEX['card_BLC-1-072'];
const CARD_C=POLICY_INDEX['card_BLC-1-083'];
const MOVE=POLICY_INDEX.type_move;
const PLAY=POLICY_INDEX.type_play;
const NEXT=POLICY_INDEX.type_next;
const ACTIVATE=POLICY_INDEX.type_activate;
const HASH=POLICY_INDEX.h0;

function blank(){
 return Array(POLICY_DIM).fill(0);
}
function row(key,hard,features){
 return {key,hard,features};
}
function judgment(id,mean,left,right){
 return {
  id,usable:true,mean,low:mean-0.1,high:mean+0.1,n:16,
  bucket:'line-move',opponent:'white-sword',actionA:left,actionB:right
 };
}
function position(id,band){
 return {id,bucket:'line-move',opponent:'white-sword',source:'round',band};
}

test('fresh mine seeds stay outside the blocked and v4-B ranges',()=>{
 assert.throws(()=>assertRoundSeed(170100,'mine'),error=>error.code==='V4B2_SEED');
 assert.throws(()=>assertRoundSeed(172000,'mine'),error=>error.code==='V4B2_SEED');
 assert.throws(()=>assertRoundSeed(100000,'mine'),error=>error.code==='V4B_SEED');
 const seeds=Object.values(MINE_SEEDS).flat();
 assertRoundPlan(seeds,'mine');
 assert.equal(seeds.length,30);
 const used=new Set(Object.values(OLD_SEEDS).flat());
 assert.equal(seeds.some(seed=>used.has(seed)),false);
 const order=interleaveSpecs(MINE_SEEDS).map(spec=>spec.opponent);
 assert.deepEqual(order.slice(0,3),['white-sword','reject-blue','renruki']);
});

test('acceptance and selection take turns across opponents',()=>{
 const games=[
  {opponent:'white-sword',positions:Array.from({length:5},(_,index)=>({id:'w'+index,bucket:'ap',opponent:'white-sword',step:index,band:[{},{}]}))},
  {opponent:'reject-blue',positions:[{id:'r',bucket:'ap',opponent:'reject-blue',step:1,band:[{},{}]}]},
  {opponent:'renruki',positions:[{id:'n',bucket:'ap',opponent:'renruki',step:1,band:[{},{}]}]}
 ];
 const accepted=acceptBalanced(games,2);
 assert.deepEqual(accepted.positions.map(item=>item.id),['w0','w1','r','n']);
 const pool=[];
 for(let index=0;index<8;index++)pool.push({id:'white-'+index,bucket:'ap',opponent:'white-sword',step:index,seed:index,band:[{key:'a'},{key:'b'}]});
 for(const opponent of ['reject-blue','renruki']){
  pool.push({id:opponent+'-0',bucket:'ap',opponent,step:3,seed:1,band:[{key:'a'},{key:'b'}]});
  pool.push({id:opponent+'-1',bucket:'raid',opponent,step:1,seed:1,band:[{key:'a'},{key:'b'}]});
 }
 const selected=selectBalanced(pool,{perCell:2,buckets:['ap','raid'],opponents:['white-sword','reject-blue','renruki']});
 assert.equal(selected.opponents['white-sword'],2);
 assert.equal(selected.opponents['reject-blue'],2);
 assert.equal(selected.opponents.renruki,2);
 assert.equal(selected.chosen.filter(item=>item.bucket==='ap'&&item.opponent==='white-sword').length,2);
});

test('the smallest named step ignores hash bins and stays inside 1.5',()=>{
 const parent=blank();
 const preferred=blank();
 const other=blank();
 preferred[NEXT]=1;
 other[ACTIVATE]=1;
 other[HASH]=1;
 const prefer=row('{"type":"next"}',0,preferred);
 const alt=row('{"type":"activate"}',1,other);
 const step=minimumStep(parent,[prefer,alt],prefer.key,alt.key);
 assert.equal(step.status,'flipped');
 assert.equal(step.hashMoved,0);
 assert.equal(step.policy[HASH],0);
 assert.ok(step.maxAbs<=1.5+1e-9);
 assert.ok(step.maxAbs<0.2);
 assert.equal(step.policy[NEXT]>0,true);
 assert.equal(step.policy[ACTIVATE]<0,true);
});

test('similar collateral may pass while an unrelated change is rejected',()=>{
 const parent=blank();
 const preferred=blank();
 const other=blank();
 preferred[MOVE]=1;
 preferred[CARD_A]=1;
 other[MOVE]=1;
 other[CARD_B]=1;
 const prefer=row('{"type":"move","uid":"p"}',0,preferred);
 const alt=row('{"type":"move","uid":"o"}',0.2,other);
 const band=[prefer,alt];
 const target=judgment('target',0.4,prefer,alt);
 const echo=judgment('echo',0.3,prefer,alt);
 const positions=[position('target',band),position('echo',band),position('second',band)];
 const context={
  positions,judgments:[target,echo],
  selectedIds:['target','echo','second'],holdoutIds:[]
 };
 const passed=evaluateGroup(parent,{
  pair:contrastOf(target).pair,contrast:contrastOf(target),role:'candidate',representative:target,rows:[target,echo]
 },context);
 assert.equal(passed.adopt,true);
 assert.equal(passed.unrelated,0);
 assert.equal(passed.contradiction,0);
 assert.ok(passed.similar>=2);
 assert.equal(passed.legacy.pass,false);
 assert.equal(passed.hashMoved,0);
 const playPrefer=blank();
 const playOther=blank();
 playPrefer[PLAY]=1;
 playPrefer[CARD_A]=1;
 playOther[PLAY]=1;
 playOther[CARD_C]=1;
 const stray=position('stray',[
  row('{"type":"play","uid":"z"}',0.05,playOther),
  row('{"type":"play","uid":"a"}',0,playPrefer)
 ]);
 const blocked=evaluateGroup(parent,{
  pair:contrastOf(target).pair,contrast:contrastOf(target),role:'candidate',representative:target,rows:[target]
 },{positions:[...positions,stray],judgments:[target],selectedIds:['target'],holdoutIds:['stray']});
 assert.equal(blocked.adopt,false);
 assert.ok(blocked.unrelated>=1);
 assert.equal(blocked.legacy.pass,false);
});

test('a confirmed reversal is rejected and insufficient evidence is not updated',()=>{
 const parent=blank();
 const preferred=blank();
 const other=blank();
 preferred[MOVE]=1;
 preferred[CARD_A]=1;
 other[MOVE]=1;
 other[CARD_B]=1;
 const prefer=row('{"type":"move","uid":"p"}',0,preferred);
 const alt=row('{"type":"move","uid":"o"}',0.2,other);
 const target=judgment('target',0.5,prefer,alt);
 const reversed=judgment('prior',-0.4,prefer,alt);
 const result=evaluateGroup(parent,{
  pair:'move',contrast:contrastOf(target),role:'candidate',representative:target,rows:[target]
 },{
  positions:[position('target',[prefer,alt]),position('prior',[prefer,alt])],
  judgments:[target,reversed],selectedIds:['target'],holdoutIds:[]
 });
 assert.equal(result.adopt,false);
 assert.ok(result.contradiction>=1);
 const skipped=chooseUpdate(parent,[{id:'thin',usable:false,mean:0.9,actionA:prefer,actionB:alt}],{
  positions:[],judgments:[],selectedIds:[],holdoutIds:[]
 });
 assert.equal(skipped.adopted,null);
 assert.equal(skipped.evaluated.length,0);
 const opposite=chooseUpdate(parent,[target,reversed],{
  positions:[position('target',[prefer,alt]),position('prior',[prefer,alt])],
  judgments:[target,reversed],selectedIds:['target','prior'],holdoutIds:[]
 });
 assert.equal(opposite.adopted,null);
 assert.equal(opposite.evaluated[0].status,'conflict');
});

test('the saved BLC-4-060 preferences are not forced through',()=>{
 const parent=loadModel('training/white-sword-ai/weights/v2-capped.json').policy;
 const judgments=readJson('training/white-sword-ai/v4b/judgments.json');
 const selected=readJson('training/white-sword-ai/v4b/selected.json').positions;
 const card=POLICY_INDEX['card_BLC-4-060'];
 const rows=judgments.filter(row=>row.usable&&((row.actionA.features[card]||0)>0.5||(row.actionB.features[card]||0)>0.5));
 assert.ok(rows.length>=1);
 for(const row of rows){
  const group={pair:contrastOf(row).pair,contrast:contrastOf(row),role:'candidate',representative:row,rows:[row]};
  const result=evaluateGroup(parent,group,{
   positions:selected.map(item=>({...item,source:'prior'})),
   judgments,selectedIds:selected.map(item=>item.id),holdoutIds:[]
  });
  assert.equal(result.adopt,false);
  assert.equal(result.hashMoved||0,0);
 }
 const text=renderReport({
  codeVersion:'v4b2-1',stopped:'kept',limits:{nodes:48,hardCap:7,clip:6,stepCap:1.5,scale:6},
  mined:{games:30,decisions:1,stored:1,seedsPerOpponent:10,firstSeed:173100,table:{ap:{'white-sword':1,'reject-blue':1,renruki:1}}},
  selected:{n:3,buckets:1,opponents:{'white-sword':1,'reject-blue':1,renruki:1},table:{ap:{'white-sword':1,'reject-blue':1,renruki:1}}},
  preferences:[],updates:[],adopted:null
 });
 assert.match(text,/沒有採用任何權重/);
 assert.match(text,/Hard cap 7/);
 assert.equal(relationOf(
  {types:['activate','next'],sameType:false,cards:['BLC-4-060']},
  '{"type":"next"}',blank(),'{"type":"activate"}',blank()
 ),'similar');
 assert.equal(trustDecision({contradiction:0,unrelated:1},true).ok,false);
 assert.equal(legacyBaseline([{id:'a',changed:true},{id:'b',changed:true}],['a'],['b']).pass,false);
 assert.equal(legacyBaseline([{id:'a',changed:true}],['a'],[]).pass,true);
});
