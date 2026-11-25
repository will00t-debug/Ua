import assert from 'node:assert/strict';
import test from 'node:test';
import {POLICY_DIM,POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {readJson,V2_FILE,v2Hash} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {judgeDirected} from '../training/white-sword-ai/v4b9/lib/directed.mjs';
import {hardFeasible} from '../training/white-sword-ai/v4b9/lib/feasible.mjs';
import {explainHashes,hashBin,storedBin} from '../training/white-sword-ai/v4b9/lib/hash.mjs';
import {
 BRANCH_BUDGET,CONFIRM_SALT,MINE_SEEDS,VALIDATE_SALT,assertBudget,assertJointRule,assertMineSeed
} from '../training/white-sword-ai/v4b9/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b9/lib/report.mjs';
import {pickCandidate,runRepresentation} from '../training/white-sword-ai/v4b9/lib/study.mjs';
import {repeatedIds,selectValidation} from '../training/white-sword-ai/v4b9/lib/validate.mjs';

const OFFICIAL='a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa';

function band(keep,other,keepFeatures,otherFeatures,keepHard=0,otherHard=0){
 return [
  {key:keep,hard:keepHard,features:keepFeatures},
  {key:other,hard:otherHard,features:otherFeatures}
 ];
}
function find070(){
 for(const file of ['training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b/selected.json']){
  const found=(readJson(file,{positions:[]}).positions||[]).find(row=>{
   const cards=[...cardsOf(row.actionA?.features),...cardsOf(row.actionB?.features)];
   return cards.includes('BLC-4-070')&&row.band?.length>=2;
  });
  if(found)return found;
 }
 return null;
}

test('the focused round keeps the 1188 cap and the registered wording',()=>{
 const rule=assertJointRule();
 assert.equal(rule.joint.id,'v4b9-joint-1');
 assert.match(rule.joint.text,/不新增特徵/);
 assert.match(rule.validate.text,/不表示兩個動作等價/);
 assert.match(rule.validate.text,/不再重複驗證/);
 assert.equal(assertBudget(6),1188);
 assert.equal(assertBudget(0),396);
 assert.throws(()=>assertBudget(7));
 assert.equal(BRANCH_BUDGET,1188);
 assert.equal(CONFIRM_SALT,940000);
 assert.equal(VALIDATE_SALT,950000);
 assert.notEqual(CONFIRM_SALT,810000);
 assert.notEqual(VALIDATE_SALT,920000);
 assert.throws(()=>assertMineSeed(175500,'old'));
 assert.throws(()=>assertMineSeed(175549,'old'));
 assert.doesNotThrow(()=>assertMineSeed(175700,'fresh'));
 assert.equal(MINE_SEEDS['white-sword'][0],175700);
 assert.equal(MINE_SEEDS.renruki.at(-1),175741);
});

test('a miss stays inconclusive and never equivalent',()=>{
 const strongMinus=Array.from({length:66},(_,index)=>index<40?-1:0);
 const strongPlus=Array.from({length:66},(_,index)=>index<40?1:0);
 const judged=judgeDirected([
  {id:'end',direction:'negative',diffs:strongMinus},
  {id:'start',direction:'positive',diffs:strongPlus},
  {id:'flat',direction:'negative',diffs:Array(66).fill(0)}
 ]);
 assert.equal(judged[0].confirmed,true);
 assert.equal(judged[1].confirmed,true);
 assert.equal(judged[2].confirmed,false);
 assert.equal(judged[2].status,'inconclusive');
 assert.notEqual(judged[2].status,'equivalent');
 const weak=judgeDirected([{id:'weak',direction:'positive',diffs:Array.from({length:66},(_,index)=>index<3?1:0)}]);
 assert.equal(weak[0].status,'inconclusive');
 assert.equal(weak[0].confirmed,false);
});

test('raid necessity is the hard box, not one released vertex',()=>{
 const parent=[0,0];
 const target={id:'t',keepKey:'b',band:band('b','a',[1,0],[0,0],0,1)};
 const anchor={id:'525ea92d',keepKey:'a',band:band('a','b',[0,0],[0,1],1,0)};
 const raid={id:'raid',keepKey:'a',band:band('a','b',[0,0],[1,0],0,0)};
 const open=hardFeasible(parent,[target],[anchor]);
 assert.equal(open.ok,true);
 const closed=hardFeasible(parent,[target],[anchor,raid]);
 assert.equal(closed.ok,false);
 const run=runRepresentation(parent,{targets:[target],anchor,raid,front:null,soft:[],names:[]});
 assert.equal(run.targetsOk,true);
 assert.equal(run.raidOk,false);
 assert.equal(run.raidRequired,true);
 assert.equal(run.fit.ok,true);
 assert.equal(run.keepsRaid,false);
 const easy={id:'raid',keepKey:'a',band:band('a','b',[0,0],[0,0],1,0)};
 const kept=runRepresentation(parent,{targets:[target],anchor,raid:easy,front:null,soft:[],names:[]});
 assert.equal(kept.raidOk,true);
 assert.equal(kept.raidRequired,false);
 assert.equal(kept.keepsRaid,true);
 const picked=pickCandidate(
  {frontOk:true,raidOk:false,keepsRaid:false,raidRequired:true,fit:{ok:true,status:'collateral'}},
  kept,
  {ok:true,keepsTargets:true,keepsFront:true,keepsRaid:true,fit:{ok:true,status:'frozen'},policy:[0],names:[]}
 );
 assert.equal(picked.kind,'position-action');
 assert.equal(picked.keepsRaid,true);
 const onlyPrevious=pickCandidate(
  {frontOk:true,raidOk:false,keepsRaid:false,fit:{ok:true}},
  {frontOk:true,raidOk:false,keepsRaid:false,fit:{ok:true}},
  {ok:true,keepsTargets:true,keepsFront:true,keepsRaid:true,fit:{ok:true},policy:[1],names:['hand_short']}
 );
 assert.equal(onlyPrevious.kind,'v4b8');
 const none=pickCandidate(
  {frontOk:false,raidOk:false,fit:{ok:false}},
  {frontOk:false,raidOk:false,fit:{ok:false}},
  {ok:false,keepsTargets:false,keepsFront:false,keepsRaid:false}
 );
 assert.equal(none,null);
});

test('validation slots do not backfill and do not replay the same pair',()=>{
 const flips=[];
 for(let index=0;index<10;index++)flips.push({id:'energy-'+index,changed:true,role:'other-energy'});
 flips.push({id:'1fbdc61d55fa7f09',changed:true,role:'raid'});
 flips.push({id:'fresh-1',changed:true,role:'fresh'});
 flips.push({id:'front-1',changed:true,role:'keep-front'});
 const chosen=selectValidation(flips,{exclude:['energy-0']});
 assert.equal(chosen.length,5);
 assert.equal(chosen.filter(row=>row.role==='other-energy').length,2);
 assert.equal(chosen.some(row=>row.role==='raid'),true);
 assert.equal(chosen.some(row=>row.id==='energy-0'),false);
 const positions=[{
  id:'d8',
  actionA:{key:'front'},
  actionB:{key:'energy'}
 }];
 assert.deepEqual(repeatedIds([{id:'d8',changed:true,afterKey:'energy'}],[{id:'d8'}],positions),['d8']);
 assert.deepEqual(repeatedIds([{id:'d8',changed:true,afterKey:'third'}],[{id:'d8'}],positions),[]);
});

test('frozen hash bins match the stored 070 bits',()=>{
 const position=find070();
 assert.ok(position);
 const parent=loadModel(V2_FILE).policy;
 assert.equal(parent.length,POLICY_DIM);
 const explained=explainHashes(parent,[position]);
 assert.equal(explained.mismatched,0);
 assert.notEqual(explained.line.frontBin,explained.line.energyBin);
 const front=position.band.find(row=>JSON.parse(row.key).line==='front'&&cardsOf(row.features).includes('BLC-4-070'));
 const energy=position.band.find(row=>JSON.parse(row.key).line==='energy'&&cardsOf(row.features).includes('BLC-4-070'));
 assert.ok(front&&energy);
 assert.deepEqual(storedBin(front.features),[explained.line.frontBin]);
 assert.deepEqual(storedBin(energy.features),[explained.line.energyBin]);
 assert.equal(hashBin(explained.line.front),explained.line.frontBin);
 assert.ok(explained.bins[explained.line.frontBin].space.length>1);
 assert.ok(explained.bins[explained.line.energyBin].space.length>1);
 const gap=explained.bins[explained.line.frontBin].points-explained.bins[explained.line.energyBin].points;
 assert.ok(Math.abs(gap)>10);
 assert.equal(POLICY_INDEX['h'+explained.line.frontBin]>=0,true);
 const features=Array(POLICY_DIM).fill(0);
 features[POLICY_INDEX.h6]=1;
 const choice=explainHashes(parent,[{band:[{key:JSON.stringify({type:'chooseRestLock',mode:null,line:null}),features}]}]);
 assert.equal(choice.structural,0);
 assert.equal(choice.mismatched,1);
 assert.match(choice.bins[6].unresolved[0].text,/chooseRestLock/);
});

test('v2 is untouched and a non-result is not called safe',()=>{
 assert.equal(v2Hash(),OFFICIAL);
 const text=renderReport({
  official:OFFICIAL,
  games:396,
  verdict:'沒有通過的結果是證據不足。v2 沒有改，棋力沒有因此提升。',
  confirm:[
   {id:'d8a4e2b6f8d32818',text:'070 前線偏好',direction:'positive',labelA:'前線',labelB:'能量線',mean:0.1,plus:20,minus:10,tie:36,p:0.2,holm:false,confirmed:false,aligned:true},
   {id:'a8ea32166942bc90',text:'060 結束行動偏好',direction:'negative',labelA:'起動',labelB:'結束',mean:0,plus:0,minus:0,tie:66,p:1,holm:false,confirmed:false,aligned:false},
   {id:'5f868c674f2e1fee',text:'060 起動偏好',direction:'positive',labelA:'起動',labelB:'結束',mean:0,plus:0,minus:0,tie:66,p:1,holm:false,confirmed:false,aligned:false}
  ],
  frontConfirmed:false,
  representations:{existing:{ok:false,status:'target-infeasible',targetsOk:false,frontOk:false,raidOk:false}},
  previous:{rows:[]},
  candidate:null,
  validation:{ran:false,rows:[]},
  hash:{
   checked:1,mismatched:0,
   line:{front:'play|BLC-4-070||front',energy:'play|BLC-4-070||energy',frontBin:2,energyBin:7,frontWeight:1,energyWeight:-1,frontPoints:6,energyPoints:-6},
   bins:[{},{},{signatures:['play|BLC-4-070||front','play|BLC-4-060||front'],examples:[]},{},{},{},{},{signatures:['play|BLC-4-070||energy'],examples:[]}]
  }
 });
 assert.match(text,/證據不足/);
 assert.match(text,/不表示兩個動作等價/);
 assert.match(text,/不是全域無解證明/);
 assert.match(text,/不計入 1,188/);
 assert.match(text,/v2 沒有改/);
 assert.match(text,/沒有進行集中驗證/);
});
