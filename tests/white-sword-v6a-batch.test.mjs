import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {decideResidual} from '../training/white-sword-ai/v5b/lib/residual.mjs';
import {fitRidge,pairPredict,solve,valueChoice,unchangedChoice} from '../training/white-sword-ai/v6a/lib/model.mjs';
import {
 BRANCH_BUDGET,GENERIC_FEATURES,INTERACTIONS,MINE_SEEDS,gameRole
} from '../training/white-sword-ai/v6a/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v6a/lib/report.mjs';

test('the shared residual starts at zero and ignores card identity',()=>{
 assert.equal(GENERIC_FEATURES.includes('my_energy'),true);
 assert.equal(GENERIC_FEATURES.includes('h0'),false);
 assert.equal(GENERIC_FEATURES.includes('card_bp'),true);
 assert.equal(GENERIC_FEATURES.some(name=>name.startsWith('card_BLC')),false);
 assert.equal(INTERACTIONS.length,8);
 assert.equal(BRANCH_BUDGET,1152);
 assert.equal(MINE_SEEDS['white-sword'][0],183200);
 assert.equal(gameRole('reject-blue|1'),gameRole('reject-blue|1'));
 const roles=new Set(Array.from({length:40},(_,index)=>gameRole('white-sword|'+index)));
 assert.equal(roles.size,2);
 const solved=solve([[2,0],[0,4]],[2,8]);
 assert.ok(Math.abs(solved[0]-1)<1e-9&&Math.abs(solved[1]-2)<1e-9);
 const rows=[
  {x:[1],y:1,weight:10,game:'g',fold:0},
  {x:[-1],y:-1,weight:10,game:'h',fold:1}
 ];
 const model=fitRidge(rows,0.001);
 assert.ok(pairPredict(rows[0],model)>0.5);
 assert.ok(pairPredict(rows[1],model)< -0.5);
 const band=[
  {key:'{"type":"next"}',hard:1,features:[],sort:'a'},
  {key:'{"type":"activate"}',hard:0,features:[],sort:'b'}
 ];
 assert.equal(valueChoice(band,[],null),'{"type":"next"}');
 assert.equal(unchangedChoice(band,[]),'{"type":"next"}');
});

test('a zero value model matches v2 on an opening',()=>{
 const model=loadModel(V2_FILE);
 const white=getDeck('white-sword');
 const other=getDeck('renruki');
 const packs=[white.pack,other.pack];
 const state=newComparedMatch(packs,[white.counts,other.counts],183600,0,matchRules('official'));
 const official=chooseWhiteSwordAction(packs,state,{actor:0,model,mode:'blend',explore:0,seed:183600,scale:6,hardCap:7});
 const names=GENERIC_FEATURES;
 const zero={
  beta:names.map(()=>0),scale:names.map(()=>1),interactions:[],clip:18
 };
 const played=decideResidual(packs,state,0,model,183600,0,null,{valueModel:zero});
 assert.equal(JSON.stringify(played.action),JSON.stringify(official.action));
 assert.equal(played.changed,false);
 assert.equal(POLICY_INDEX.my_energy>=0,true);
 const source=readFileSync(new URL('../scripts/white-sword-v6a.mjs',import.meta.url),'utf8');
 assert.equal(source.includes('adopted:true'),false);
 const report=renderReport({
  official:'abc',frozenWeight:3.25954286097052,historical:{positions:10,games:4,pairs:80,trainGames:3,devGames:1,medianPairs:8,deep:0},
  fit:{class:'linear',lambda:100,dev:{mse:0.2,correlation:0},zero:{mse:0.2},devPass:false},
  mined:{games:24,selected:0},games:0,candidate:false,matches:null
 });
 assert.match(report,/沒有產生候選模型/);
 assert.match(report,/不採用/);
 assert.match(report,/沒有打 192 場/);
});
