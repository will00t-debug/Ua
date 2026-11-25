import assert from 'node:assert/strict';
import test from 'node:test';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {CONSTRAINTS} from '../training/white-sword-ai/v5a/lib/protocol.mjs';
import {matchSpecs} from '../training/white-sword-ai/v5b/lib/match.mjs';
import {
 FEATURE,MATCH_GAMES,OFFICIAL_V2,budgetFor,fullMatchGate,installColumn,stepSizes
} from '../training/white-sword-ai/v5b/lib/protocol.mjs';
import {decideResidual,hardPool,indicates,residualChoice} from '../training/white-sword-ai/v5b/lib/residual.mjs';
import {renderReport} from '../training/white-sword-ai/v5b/lib/report.mjs';
import {selectCollateral} from '../training/white-sword-ai/v5b/lib/select.mjs';
import {chooseCandidate,minimumWeight} from '../training/white-sword-ai/v5b/lib/sweep.mjs';

const WIDTH=115;
const feature={type:'play',card:'BLC-4-070',line:'energy'};

function row(key,hard,energy){
 const features=Array(WIDTH).fill(0);
 if(energy)features[POLICY_INDEX['card_BLC-4-070']]=1;
 return {key,hard,features};
}

test('the column is derived from the confirmed preferences and a second card is refused',()=>{
 const installed=installColumn();
 assert.equal(installed.ok,true);
 assert.equal(installed.text,FEATURE);
 const extra=[...CONSTRAINTS,{id:'other',role:'preference',type:'play',card:'BLC-3-009',line:'energy',text:'另一張'}];
 assert.equal(installColumn(extra).ok,false);
});

test('a zero residual matches v2, and the hard cap ignores the bonus',()=>{
 const weights=Array(WIDTH).fill(0);
 const band=[
  row('{"type":"play","line":"front","uid":"0-1"}',1,true),
  row('{"type":"play","line":"energy","uid":"9-9"}',1,true)
 ];
 assert.equal(residualChoice(band,weights,0,feature),chooseKey(band,weights));
 assert.equal(indicates(band[0],feature),0);
 assert.equal(indicates(band[1],feature),1);
 const capped=hardPool([
  {action:{type:'play',line:'front'},hardScore:10},
  {action:{type:'play',line:'energy'},hardScore:0}
 ],{type:'play',line:'front'});
 assert.equal(capped.length,1);
 assert.equal(capped[0].hardScore,10);
});

test('the minimum legal bonus is the smallest weight that flips every target',()=>{
 const weights=Array(WIDTH).fill(0);
 const front='{"type":"play","line":"front","uid":"0-1"}';
 const energy='{"type":"play","line":"energy","uid":"0-1"}';
 const position={
  id:'d12a2d6f5ced1d88',
  actionA:{key:front,action:{line:'front'}},
  actionB:{key:energy,action:{line:'energy'}},
  band:[
   {...row(front,6,true),sort:'a'},
   {...row(energy,0,true),sort:'z'}
  ]
 };
 const others=[
  {...position,id:'b122fb89d72eec7e'},
  {...position,id:'01c85e5ddb31e7fa'}
 ];
 const positions=[position,...others];
 const weight=minimumWeight(positions,weights,feature);
 assert.ok(weight>1&&weight<1.01);
 assert.equal(residualChoice(position.band,weights,weight,feature),energy);
 assert.equal(residualChoice(position.band,weights,1,feature),front);
 const parts=stepSizes(weight);
 assert.ok(parts.every(step=>step<=1.5));
 assert.ok(Math.abs(parts.reduce((sum,step)=>sum+step,0)-weight)<1e-8);
});

test('the frozen candidate is the eligible bonus with fewer collateral changes',()=>{
 const picked=chooseCandidate([
  {id:'points-27',eligible:true,collateral:8,weight:4.5},
  {id:'minimum',eligible:true,collateral:3,weight:3.3},
  {id:'points-9',eligible:false,collateral:0,weight:1.5}
 ]);
 assert.equal(picked.id,'minimum');
 const rows=[
  {id:'k',role:'keep-front',opponent:'renruki',stage:'late',bucket:'ap',energyBand:'low',frontBand:'high'},
  {id:'f',role:'fresh',opponent:'reject-blue',stage:'early',bucket:'early-energy',energyBand:'low',frontBand:'low'},
  {id:'o',role:'other',opponent:'white-sword',stage:'mid',bucket:'mid-entry',energyBand:'high',frontBand:'low'}
 ];
 assert.deepEqual(selectCollateral(rows).map(row=>row.id),['k','f','o']);
 assert.equal(fullMatchGate([{confirmed:false,role:'fresh',mean:-0.1}]).open,true);
 assert.equal(fullMatchGate([{confirmed:true,role:'fresh',mean:-0.1}]).open,false);
 assert.equal(fullMatchGate([{confirmed:false,role:'other',mean:-0.2}]).open,false);
 assert.equal(budgetFor(8),1056);
 assert.equal(MATCH_GAMES,96);
});

test('weight zero follows the official blend on a legal opening',()=>{
 const model=loadModel(V2_FILE);
 const white=getDeck('white-sword');
 const other=getDeck('renruki');
 const packs=[white.pack,other.pack];
 const state=newComparedMatch(packs,[white.counts,other.counts],175800,0,matchRules('official'));
 const official=chooseWhiteSwordAction(packs,state,{
  actor:0,model,mode:'blend',explore:0,seed:175800,scale:6,hardCap:7
 });
 const residual=decideResidual(packs,state,0,model,175800,0,feature);
 assert.equal(JSON.stringify(residual.action),JSON.stringify(official.action));
 const specs=matchSpecs({seeds:[176200],opponents:['white-sword','reject-blue'],model,weight:1.5,feature});
 assert.equal(specs.length,4);
 assert.equal(specs.find(spec=>spec.opponent==='reject-blue').seats[1].policy,'hard-search-2');
});

test('the report keeps an unchanged end-turn preference unlearned',()=>{
 const report=renderReport({
  official:OFFICIAL_V2,feature:FEATURE,checked:3,picked:'minimum',
  rows:[{
   id:'minimum',weight:3.2,points:19.2,steps:[1.5,1.5,0.2],changes:4,collateral:1,eligible:true,
   targets:[{id:'d12a2d6f5ced1d88',hardGap:2,ok:true}],
   preserves:[],harm:{same:true},raid:{same:true},ee6c:{same:true}
  }],
  mined:{games:6},validation:{ran:true,positions:1,games:132,rows:[{id:'abc',role:'fresh',mean:-0.1,p:0.4,status:'inconclusive'}]},
  gate:{open:false},matches:null
 });
 assert.match(report,/尚未學會/);
 assert.match(report,/不表示已證明安全/);
 assert.match(report,/沒有寫入權重/);
 assert.match(report,/不採用/);
});
