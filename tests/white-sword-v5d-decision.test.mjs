import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {readJson,V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {publicBoard,sampleHidden} from '../training/white-sword-ai/v4b/lib/hidden.mjs';
import {replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {applyPairRules,decideResidual} from '../training/white-sword-ai/v5b/lib/residual.mjs';
import {fairSpecs as frozenFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';
import {minimumMagnitude} from '../training/white-sword-ai/v5c/lib/fit.mjs';
import {choiceRules,learnRules,sameSignature} from '../training/white-sword-ai/v5d/lib/compare.mjs';
import {
 BRANCH_BUDGET,CONFIRM_SALT,FAMILY_CAP,FAMILY_MIN,MATCH_SEEDS,MINE_SEEDS,SCREEN_SALT,assertBudget,branchGames
} from '../training/white-sword-ai/v5d/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5d/lib/report.mjs';
import {assertSchedule,fairSpecs} from '../training/white-sword-ai/v5d/lib/schedule.mjs';
import {isActivate060Pair,selectFamily,splitRoles} from '../training/white-sword-ai/v5d/lib/select.mjs';

function bit(card){
 const features=[];
 features[POLICY_INDEX['card_'+card]]=1;
 return features;
}
function side(type,card,uid,line){
 const key=JSON.stringify({type,uid,line:line||null});
 return {key,features:card?bit(card):[],action:{type,uid,line:line||null},card};
}
function position({id,preferred,other,hardPreferred=0,hardOther=1}){
 return {
  id,
  band:[
   {key:other.key,hard:hardOther,features:other.features,sort:'a'},
   {key:preferred.key,hard:hardPreferred,features:preferred.features,sort:'z'}
  ],
  actionA:other,actionB:preferred
 };
}
function family(id,opponent,bucket,activateFirst){
 const activate=side('activate','BLC-4-060',id+'-a');
 const end=side('next',null,id+'-n');
 const first=activateFirst?activate:end;
 const second=activateFirst?end:activate;
 return {
  id,opponent,bucket,
  band:[{key:first.key,hard:1,features:first.features},{key:second.key,hard:0,features:second.features}],
  actionA:first,actionB:second
 };
}

test('a feasible residual can sit between zero and the clip',()=>{
 const front=side('play','BLC-1-085','front','front');
 const next=side('next',null,'next');
 const target=position({id:'t',preferred:front,other:next,hardPreferred:0,hardOther:6});
 const guard=position({id:'guard',preferred:front,other:next,hardPreferred:0,hardOther:15});
 const column={sign:1,type:'play',card:'BLC-1-085',line:'front',targets:[{id:'t',key:front.key}]};
 const found=minimumMagnitude([target,guard],[],column,column.targets,['guard']);
 assert.ok(found);
 assert.ok(found.weight>1&&found.weight<1.05);
 assert.equal(minimumMagnitude([target],[],column,column.targets,[]).weight>1,true);
});

test('the comparison layer switches only the confirmed pair inside the hard cap',()=>{
 const activate=side('activate','BLC-4-060','s');
 const next=side('next',null,'n');
 const attack=side('attack','BLC-4-066','k');
 const weights=[];
 weights[POLICY_INDEX['card_BLC-4-060']]=20;
 const band=[
  {key:activate.key,hard:0,features:activate.features,sort:'a'},
  {key:attack.key,hard:-0.5,features:attack.features,sort:'b'},
  {key:next.key,hard:-1,features:next.features,sort:'c'}
 ];
 const rule={loser:{type:'activate',card:'BLC-4-060',line:null},winner:{type:'next',card:null,line:null}};
 assert.equal(choiceRules(band,weights,[rule]),next.key);
 assert.equal(choiceRules(band,weights,[]),activate.key);
 const outside=[
  {key:activate.key,hard:0,features:activate.features,sort:'a'},
  {key:next.key,hard:-20,features:next.features,sort:'c'}
 ];
 assert.equal(choiceRules(outside,weights,[rule]),activate.key);
 const state={players:[{hand:[{uid:'s',cardId:'BLC-4-060'},{uid:'k',cardId:'BLC-4-066'}],front:[],energy:[],outside:[],removed:[]}]};
 const rows=[
  {action:{type:'activate',uid:'s',line:null},baseScore:100},
  {action:{type:'attack',uid:'k',line:null},baseScore:50},
  {action:{type:'next'},baseScore:1}
 ];
 const switched=applyPairRules(rows,state,0,[rule]);
 assert.equal(switched.applied,true);
 assert.equal(switched.row.action.type,'next');
 const staying=applyPairRules([
  {action:{type:'attack',uid:'k',line:null},baseScore:100},
  {action:{type:'activate',uid:'s',line:null},baseScore:50},
  {action:{type:'next'},baseScore:1}
 ],state,0,[rule]);
 assert.equal(staying.applied,false);
 assert.equal(applyPairRules(rows,state,0,[]).applied,false);
});

test('a rule is installed only when held-out confirmation agrees',()=>{
 const activate=side('activate','BLC-4-060','s');
 const next=side('next',null,'n');
 const against=row=>({...row,actionA:activate,actionB:next});
 const favor=row=>({...row,actionA:next,actionB:activate});
 const learned=learnRules([against({id:'train'})],[against({id:'holdout'})]);
 assert.equal(learned.ok,true);
 assert.equal(learned.rules.length,1);
 assert.equal(learned.rules[0].winner.type,'next');
 assert.equal(learned.rules[0].trainIds[0],'train');
 assert.equal(Object.hasOwn(learned.rules[0],'id'),false);
 assert.equal(learnRules([against({id:'train'})],[]).reason,'驗證沒有獨立確認同一方向');
 assert.equal(learnRules([against({id:'a'}),favor({id:'b'})],[against({id:'v'})]).reason,'訓練同時確認了相反方向');
 assert.equal(learnRules([against({id:'train'})],[favor({id:'v'})]).reason,'驗證確認了相反方向');
 assert.equal(learnRules([],[]).ok,false);
 const attack=side('attack','BLC-4-066','k');
 const other=row=>({...row,actionA:attack,actionB:next});
 const partial=learnRules([against({id:'keep'}),other({id:'drop'})],[against({id:'held'})]);
 assert.equal(partial.ok,true);
 assert.equal(partial.rules.length,1);
 assert.equal(partial.rules[0].loser.card,'BLC-4-060');
 assert.deepEqual(partial.missed,['attack|BLC-4-066|=>next||']);
});

test('family sampling separates training from validation without reading outcomes',()=>{
 const pool=[
  family('z','white-sword','early-energy',true),
  family('a','white-sword','early-energy',false),
  family('m','white-sword','early-energy',true),
  family('q','reject-blue','ap',true)
 ];
 const picked=selectFamily(pool,8);
 assert.deepEqual(picked.map(row=>row.id),['a','q','m','z']);
 assert.equal(picked.some(row=>row.mean!=null),false);
 const roles=splitRoles(picked);
 assert.deepEqual(roles.map(row=>row.role),['train','validation','train','validation']);
 assert.equal(isActivate060Pair(family('p','renruki','raid',false)),true);
 assert.equal(isActivate060Pair(family('p','renruki','raid',true)),true);
 const other=family('x','white-sword','ap',true);
 other.actionB=side('attack','BLC-4-066','x');
 assert.equal(isActivate060Pair(other),false);
 assert.equal(selectFamily([family('only','white-sword','ap',true),family('two','white-sword','ap',true)],8).length,2);
});

test('the registered budget, salts and fair schedule stay fixed',()=>{
 assert.equal(FAMILY_CAP,8);
 assert.equal(FAMILY_MIN,4);
 assert.equal(SCREEN_SALT,1010000);
 assert.equal(CONFIRM_SALT,1020000);
 assert.equal(BRANCH_BUDGET,1184);
 assert.equal(branchGames(8,8),1184);
 assert.equal(assertBudget(4,2),4*16+2*132);
 assert.throws(()=>assertBudget(9,0));
 assert.equal(MINE_SEEDS['white-sword'][0],180200);
 assert.equal(MINE_SEEDS['reject-blue'][0],180300);
 assert.equal(MINE_SEEDS.renruki[0],180400);
 assert.equal(MATCH_SEEDS[0],180600);
 assert.equal(MATCH_SEEDS.length,16);
 const specs=fairSpecs();
 assertSchedule(specs);
 assert.equal(specs.filter(spec=>spec.arm!=='v2'&&spec.specialistSeat===spec.first).length,specs.filter(spec=>spec.arm!=='v2').length/2);
 assert.throws(()=>frozenFair({weight:1}),/不得改權重/);
 const source=readFileSync(new URL('../scripts/white-sword-v5d.mjs',import.meta.url),'utf8');
 assert.equal(source.includes('minimumWeight'),false);
 assert.equal(source.includes('v2-capped'),false);
 assert.equal(source.includes('adopted:true'),false);
});

test('an empty rule list matches v2, and the report does not claim a result',()=>{
 const model=loadModel(V2_FILE);
 const white=getDeck('white-sword');
 const other=getDeck('renruki');
 const packs=[white.pack,other.pack];
 const state=newComparedMatch(packs,[white.counts,other.counts],175800,0,matchRules('official'));
 const official=chooseWhiteSwordAction(packs,state,{actor:0,model,mode:'blend',explore:0,seed:175800,scale:6,hardCap:7});
 const ruled=decideResidual(packs,state,0,model,175800,0,null,{rules:[
  {loser:{type:'activate',card:'BLC-4-060',line:null},winner:{type:'next',card:null,line:null}}
 ]});
 assert.equal(JSON.stringify(ruled.action),JSON.stringify(official.action));
 assert.equal(ruled.changed,false);
 assert.equal(ruled.source,'blend');
 const report=renderReport({
  official:'abc',frozenWeight:3.25954286097052,mined:{games:12,family:2,selected:2},
  rows:[],leads:[],forActivate:0,againstActivate:0,collateral:0,heldMoves:[],
  ee6cMoved:false,reason:'驗證沒有獨立確認同一方向',installed:false,games:128,matches:null,kinds:{}
 });
 assert.match(report,/不採用/);
 assert.match(report,/證據不足/);
 assert.match(report,/沒有寫入權重/);
 assert.match(report,/沒有打 192 場/);
 assert.match(report,/36/);
 assert.match(report,/正式 v2/);
});

test('an open top window stays face-down and out of the other seat observation',{timeout:30000},()=>{
 const mine=readJson('training/white-sword-ai/v5c/mine.json');
 const position=mine.positions.find(row=>row.id==='0db12268106bbbf0');
 const {packs,state}=replayState(position);
 assert.equal(state.pending?.kind,'effect-top-filter-many-choice');
 const hidden=sampleHidden(state,position.actor,1);
 assert.deepEqual(publicBoard(hidden),publicBoard(state));
 assert.doesNotThrow(()=>legalUniversalActions(packs,hidden));
 const rest=state.pending.uids.filter(uid=>!(state.pending.selected||[]).includes(uid));
 const selected=state.pending.selected||[];
 const actor=state.pending.player;
 assert.deepEqual(hidden.players[actor].deck.slice(0,rest.length).map(card=>card.uid),rest);
 for(const uid of rest){
  const card=hidden.players[actor].deck.find(item=>item.uid===uid);
  assert.notEqual(card.faceDown,false);
  assert.equal(hidden.players[1-actor].hand.some(item=>item?.uid===uid),false);
 }
 const opponent=observeActor(packs,hidden,1-actor);
 const hiddenText=JSON.stringify(opponent);
 for(const uid of [...rest,...selected])assert.equal(hiddenText.includes('"'+uid+'"'),false);
 assert.equal(opponent.private,null);
 const viewer=observeActor(packs,hidden,actor);
 const seen=JSON.stringify(viewer.private);
 for(const uid of rest)assert.equal(seen.includes('"'+uid+'"'),true);
});

test('the comparison layer can choose the confirmed end action on the stored 060 position',{timeout:60000},()=>{
 const mine=readJson('training/white-sword-ai/v5c/mine.json');
 const position=mine.positions.find(row=>row.id==='35816c698fab8755');
 const {packs,state}=replayState(position);
 const model=loadModel(V2_FILE);
 const rule={loser:{type:'activate',card:'BLC-4-060',line:null},winner:{type:'next',card:null,line:null}};
 const before=decideResidual(packs,state,position.actor,model,position.seed,0,null,{rules:[]});
 const after=decideResidual(packs,state,position.actor,model,position.seed,0,null,{rules:[rule]});
 assert.equal(before.action.type,'activate');
 assert.equal(after.action.type,'next');
 assert.equal(after.source,'compare');
 assert.equal(after.changed,true);
 assert.equal(sameSignature(rule.loser,{type:'activate',card:'BLC-4-060',line:null}),true);
});
