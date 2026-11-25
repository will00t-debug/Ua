import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {decideResidual} from '../training/white-sword-ai/v5b/lib/residual.mjs';
import {choiceRules} from '../training/white-sword-ai/v5d/lib/compare.mjs';
import {contextContrast} from '../training/white-sword-ai/v5d1/lib/context.mjs';
import {judgeTwoSided} from '../training/white-sword-ai/v5d1/lib/judge.mjs';
import {
 BRANCH_BUDGET,CONFIRM_SALT,FAMILY_GAMES,MATCH_SEEDS,MINE_BATCHES,MINE_SEEDS
} from '../training/white-sword-ai/v5d1/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5d1/lib/report.mjs';
import {gameCoverage,onePerGame,selectBalancedGames,splitByOpponent} from '../training/white-sword-ai/v5d1/lib/select.mjs';

function bit(card){
 const features=[];
 features[POLICY_INDEX['card_'+card]]=1;
 return features;
}
function side(type,card,uid){
 const key=JSON.stringify({type,uid,line:null});
 return {key,features:card?bit(card):[],action:{type,uid,line:null},card};
}
function game(opponent,seed,id,step=1){
 const activate=side('activate','BLC-4-060',id+'-a');
 const end=side('next',null,id+'-n');
 return {
  id,opponent,seed,step,bucket:'ap',
  band:[
   {key:activate.key,hard:1,features:activate.features,sort:'a'},
   {key:end.key,hard:0,features:end.features,sort:'b'}
  ],
  actionA:activate,actionB:end
 };
}

test('eight games stay inside one opponent split and one original game',()=>{
 const pool=[];
 for(let index=0;index<5;index++)pool.push(game('reject-blue',300+index,'r'+index));
 for(let index=0;index<5;index++)pool.push(game('renruki',400+index,'n'+index));
 pool.push({...game('reject-blue',300,'late',9),id:'late'});
 const picked=selectBalancedGames(pool,8);
 assert.equal(picked.length,8);
 assert.equal(picked.filter(row=>row.opponent==='reject-blue').length,4);
 assert.equal(picked.filter(row=>row.opponent==='renruki').length,4);
 assert.equal(picked.some(row=>row.id==='late'),false);
 const split=splitByOpponent(picked);
 assert.equal(split.singletonOpponents.length,0);
 for(const opponent of ['reject-blue','renruki']){
  assert.equal(split.rows.filter(row=>row.opponent===opponent&&row.role==='train').length,2);
  assert.equal(split.rows.filter(row=>row.opponent===opponent&&row.role==='validation').length,2);
 }
 assert.equal(new Set(split.rows.map(row=>row.opponent+'|'+row.seed)).size,8);
 assert.equal(onePerGame(pool).some(row=>row.seed===300&&row.step===9),false);
 const coverage=gameCoverage(pool);
 assert.equal(coverage.ready,true);
 assert.equal(gameCoverage([game('reject-blue',1,'only')]).ready,false);
});

test('a two-sided confirmation does not treat one strong position as support for every rule',()=>{
 const records=[];
 for(let attempt=0;attempt<66;attempt++){
  records.push({positionId:'strong',attempt,side:'A',finished:true,winner:1});
  records.push({positionId:'strong',attempt,side:'B',finished:true,winner:0});
  records.push({positionId:'weak',attempt,side:'A',finished:true,winner:attempt<33?0:1});
  records.push({positionId:'weak',attempt,side:'B',finished:true,winner:attempt<33?1:0});
 }
 const judged=judgeTwoSided([
  {id:'strong',role:'train',seed:1,opponent:'reject-blue'},
  {id:'weak',role:'train',seed:2,opponent:'reject-blue'}
 ],records,()=>0);
 const strong=judged.find(row=>row.id==='strong');
 const weak=judged.find(row=>row.id==='weak');
 assert.equal(strong.confirmed,true);
 assert.equal(strong.favor,'B');
 assert.equal(strong.mean<0,true);
 assert.equal(weak.confirmed,false);
 assert.ok(strong.pTwo<0.05);
});

test('the registered 1056-game sample does not reuse v5-D seeds',()=>{
 assert.equal(FAMILY_GAMES,8);
 assert.equal(MINE_BATCHES,8);
 assert.equal(CONFIRM_SALT,1040000);
 assert.equal(BRANCH_BUDGET,1056);
 assert.equal(MINE_SEEDS['white-sword'][0],182200);
 assert.equal(MINE_SEEDS['reject-blue'][0],182300);
 assert.equal(MINE_SEEDS.renruki[0],182400);
 assert.equal(MATCH_SEEDS[0],182600);
 const source=readFileSync(new URL('../scripts/white-sword-v5d1.mjs',import.meta.url),'utf8');
 assert.equal(source.includes('SCREEN_FLOOR'),false);
 assert.equal(source.includes('minimumWeight'),false);
 assert.equal(source.includes('adopted:true'),false);
 const report=renderReport({
  official:'abc',frozenWeight:3.25954286097052,mined:{games:20,positions:3,gamesDistinct:3,selected:3},
  rows:[],reason:'不同原始對局不到 8 個，不做 1056 場分支',installed:false,games:0,matches:null
 });
 assert.match(report,/不採用/);
 assert.match(report,/沒有寫入權重/);
 assert.match(report,/證據不足/);
 assert.match(report,/沒有打 192 場/);
 const mixed=contextContrast([
  {mean:-0.2,context:{energy:2,apReady:1,hand:4,life:5,oppLife:4,oppFront:1,front:['BLC-4-060']}},
  {mean:0.2,context:{energy:5,apReady:0,hand:2,life:3,oppLife:6,oppFront:2,front:['BLC-4-070']}}
 ]);
 assert.equal(mixed.end,1);
 assert.equal(mixed.activate,1);
 assert.equal(mixed.table.energy.end,2);
 assert.equal(mixed.table.energy.activate,5);
});

test('no rule matches v2, and an uncompared or out-of-cap action stays put',()=>{
 const model=loadModel(V2_FILE);
 const white=getDeck('white-sword');
 const other=getDeck('renruki');
 const packs=[white.pack,other.pack];
 const state=newComparedMatch(packs,[white.counts,other.counts],182600,0,matchRules('official'));
 const official=chooseWhiteSwordAction(packs,state,{actor:0,model,mode:'blend',explore:0,seed:182600,scale:6,hardCap:7});
 const ruled=decideResidual(packs,state,0,model,182600,0,null,{rules:[]});
 assert.equal(JSON.stringify(ruled.action),JSON.stringify(official.action));
 assert.equal(ruled.changed,false);
 const activate=side('activate','BLC-4-060','s');
 const next=side('next',null,'n');
 const attack=side('attack','BLC-4-066','k');
 const weights=[];
 weights[POLICY_INDEX['card_BLC-4-060']]=20;
 const rule={loser:{type:'activate',card:'BLC-4-060',line:null},winner:{type:'next',card:null,line:null}};
 const band=[
  {key:activate.key,hard:0,features:activate.features,sort:'a'},
  {key:attack.key,hard:-0.5,features:attack.features,sort:'b'},
  {key:next.key,hard:-1,features:next.features,sort:'c'}
 ];
 assert.equal(choiceRules(band,weights,[rule]),next.key);
 assert.equal(choiceRules(band,[],[]),activate.key);
 const outside=[
  {key:activate.key,hard:0,features:activate.features,sort:'a'},
  {key:next.key,hard:-20,features:next.features,sort:'c'}
 ];
 assert.equal(choiceRules(outside,weights,[rule]),activate.key);
});
