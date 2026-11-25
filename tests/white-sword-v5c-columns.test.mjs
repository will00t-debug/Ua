import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {BUCKETS,OPPONENTS} from '../training/white-sword-ai/v4b2/lib/protocol.mjs';
import {CONSTRAINTS} from '../training/white-sword-ai/v5a/lib/protocol.mjs';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {readJson} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {sampleHidden} from '../training/white-sword-ai/v4b/lib/hidden.mjs';
import {decideResidual} from '../training/white-sword-ai/v5b/lib/residual.mjs';
import {fairSpecs as frozenFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';
import {AUDIT_SEEDS,FAIR_SEEDS} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {MATCH_SEEDS as OLD_MATCH,MINE_SEEDS as OLD_MINE} from '../training/white-sword-ai/v5b/lib/protocol.mjs';
import {MINE_SEEDS as V4B7_MINE} from '../training/white-sword-ai/v4b7/lib/protocol.mjs';
import {accumulateColumns,columnFromRow,columnFromSides,roundColumns} from '../training/white-sword-ai/v5c/lib/columns.mjs';
import {choiceColumns,combine,diagnosticModel,fitColumns,minimumMagnitude} from '../training/white-sword-ai/v5c/lib/fit.mjs';
import {
 BRANCH_BUDGET,FROZEN_WEIGHT,HISTORICAL_060,MATCH_SEEDS,MINE_SEEDS,SCREEN_CAP,assertBudget,branchGames,signedSteps
} from '../training/white-sword-ai/v5c/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5c/lib/report.mjs';
import {assertSchedule,fairSpecs} from '../training/white-sword-ai/v5c/lib/schedule.mjs';
import {selectConfirm,selectDiverse} from '../training/white-sword-ai/v5c/lib/select.mjs';

function bit(card){
 const features=[];
 features[POLICY_INDEX['card_'+card]]=1;
 return features;
}
function side(type,card,uid,line){
 const key=JSON.stringify({type,uid,line});
 return {key,features:card?bit(card):[],action:{type,uid,line:line||null}};
}
function position({id,bucket='early-energy',opponent='white-sword',preferred,other,hardPreferred=0,hardOther=1}){
 return {
  id,bucket,opponent,
  band:[
   {key:other.key,hard:hardOther,features:other.features,sort:'a'},
   {key:preferred.key,hard:hardPreferred,features:preferred.features,sort:'z'}
  ],
  actionA:other,actionB:preferred
 };
}

test('a named preference becomes a signed column and the old 060 row stays out',()=>{
 const activate=side('activate','BLC-4-060','s');
 const next=side('next',null,'n');
 const attack=side('attack','BLC-4-066','k');
 const learned={id:'new-060',source:'v5c',confirmed:true,prefer:'B',actionA:activate,actionB:next};
 const column=columnFromRow(learned);
 assert.equal(column.sign,-1);
 assert.equal(column.type,'activate');
 assert.equal(column.card,'BLC-4-060');
 assert.equal(column.preferKey,next.key);
 const historical={...learned,id:HISTORICAL_060};
 assert.equal(columnFromRow(historical),null);
 assert.equal(roundColumns(CONSTRAINTS.map(item=>({id:item.id,source:'v5a',confirmed:true,prefer:'B'}))).length,0);
 const specific=columnFromSides(next,attack,'B');
 assert.equal(specific.sign,1);
 assert.equal(specific.card,'BLC-4-066');
 assert.equal(columnFromSides(next,side('next',null,'m'),'B'),null);
 const first={id:'a1',source:'v5c',confirmed:true,prefer:'B',actionA:next,actionB:activate};
 const second={...first,id:'a2'};
 const merged=roundColumns([first,second]);
 assert.equal(merged.length,1);
 assert.equal(merged[0].sign,1);
 assert.equal(merged[0].targets.length,2);
 const opposite=roundColumns([first,learned]);
 assert.equal(opposite.length,2);
 assert.deepEqual(opposite.map(row=>row.sign).sort(),[-1,1]);
 const cleaned=accumulateColumns(opposite);
 assert.equal(cleaned.kept.length,0);
 assert.match(cleaned.rejected[0].reason,/相反/);
 const duplicated=accumulateColumns([merged[0],{...merged[0],targets:[{id:'a3',key:merged[0].preferKey}]}]);
 assert.equal(duplicated.kept.length,1);
 assert.equal(duplicated.kept[0].targets.length,3);
});

test('screening prefers other cards and confirmation does not stack one action',()=>{
 const cells=[];
 for(const bucket of BUCKETS){
  for(const opponent of OPPONENTS){
   cells.push(position({
    id:bucket+'|'+opponent+'|other',bucket,opponent,
    preferred:side('attack','BLC-4-066',bucket+opponent),other:side('next',null,'n'+bucket)
   }));
   cells.push(position({
    id:bucket+'|'+opponent+'|070',bucket,opponent,
    preferred:side('play','BLC-4-070',bucket+opponent,'energy'),other:side('next',null,'e'+bucket)
   }));
  }
 }
 const chosen=selectDiverse(cells);
 assert.equal(chosen.length,BUCKETS.length*OPPONENTS.length);
 assert.equal(new Set(chosen.map(row=>row.bucket)).size,7);
 assert.equal(chosen.some(row=>row.id.endsWith('|070')),false);
 const only=selectDiverse([
  position({id:'b',preferred:side('play','BLC-4-070','b','energy'),other:side('next',null,'bn')}),
  position({id:'a',preferred:side('play','BLC-4-070','a','energy'),other:side('attack','BLC-4-066','aa')})
 ],{buckets:['early-energy'],opponents:['white-sword'],perCell:2});
 assert.deepEqual(only.map(row=>row.id),['a']);
 const rows=[
  {id:'e1',mean:-1,column:{sign:1,type:'play',card:'BLC-4-070',line:'energy'}},
  {id:'e2',mean:-0.9,column:{sign:1,type:'play',card:'BLC-4-070',line:'energy'}},
  {id:'atk',mean:-0.4,column:{sign:1,type:'attack',card:'BLC-4-066',line:null}},
  {id:'weak',mean:-0.2,column:{sign:1,type:'move',card:'BLC-4-080',line:null}}
 ];
 const confirmed=selectConfirm(rows);
 assert.deepEqual(confirmed.map(row=>row.id),['e1','atk']);
 const many=selectConfirm([0,1,2,3,4].map(index=>({
  id:'c'+index,mean:-1+index/100,
  column:{sign:1,type:'t'+index,card:'BLC-4-066',line:null}
 })));
 assert.equal(many.length,4);
 assert.equal(many.some(row=>row.id==='c4'),false);
 const same=selectConfirm([
  {id:'late',mean:-0.4,column:{sign:1,type:'attack',card:'BLC-4-066',line:null}},
  {id:'early',mean:-0.8,column:{sign:1,type:'attack',card:'BLC-4-066',line:null}}
 ]);
 assert.deepEqual(same.map(row=>row.id),['early']);
});

test('the branch budget stays 1200 and a new weight is signed and bounded',()=>{
 assert.equal(branchGames(SCREEN_CAP,4),BRANCH_BUDGET);
 assert.equal(assertBudget(10,1),10*16+132);
 assert.throws(()=>assertBudget(43,0));
 const steps=signedSteps(-3.25);
 assert.deepEqual(steps,[-1.5,-1.5,-0.25]);
 assert.ok(steps.every(step=>Math.abs(step)<=1.5));
 assert.throws(()=>signedSteps(7));
});

test('each residual is fit alone, then the sum is checked again',()=>{
 const front=side('play','BLC-1-085','front','front');
 const energy=side('play','BLC-4-070','energy','energy');
 const energyFront=side('play','BLC-4-070','front','front');
 const next=side('next',null,'next');
 const target=position({id:'t',preferred:front,other:next,hardPreferred:0,hardOther:3});
 const negative=position({id:'n',preferred:next,other:front,hardPreferred:0,hardOther:2});
 const pref=position({id:'pref',preferred:energy,other:energyFront,hardPreferred:0,hardOther:0});
 const keep=position({id:'keep',preferred:energy,other:energyFront,hardPreferred:0,hardOther:1});
 const positive={
  sign:1,type:'play',card:'BLC-1-085',line:'front',signature:'+|play|BLC-1-085|front',
  targets:[{id:'t',key:front.key}]
 };
 const penalty={
  sign:-1,type:'play',card:'BLC-1-085',line:'front',signature:'-|play|BLC-1-085|front',
  targets:[{id:'n',key:next.key}]
 };
 const found=minimumMagnitude([target],[],positive,positive.targets,[]);
 assert.ok(found.weight>0.5&&found.weight<0.51);
 assert.equal(choiceColumns(target.band,[],[ {...positive,weight:found.weight}]),front.key);
 assert.equal(choiceColumns(target.band,[],[ {...positive,weight:0.5}]),next.key);
 assert.notEqual(minimumMagnitude([target,keep],[],positive,positive.targets,['keep']),null);
 const blocking=position({id:'block',preferred:front,other:next,hardPreferred:0,hardOther:1});
 assert.equal(minimumMagnitude([target,blocking],[],positive,positive.targets,['block']),null);
 const far=position({id:'far',preferred:front,other:next,hardPreferred:0,hardOther:10});
 assert.equal(minimumMagnitude([far],[],{...positive,targets:[{id:'far',key:front.key}]},[{id:'far',key:front.key}],[]),null);
 assert.equal(choiceColumns([{key:front.key,hard:1,features:front.features,sort:'a'}],[],[{...positive,line:'energy',weight:6}]),front.key);
 const both=fitColumns([target,negative,pref],[],[positive,penalty],[]);
 assert.equal(both.accepted.length,0);
 assert.match(both.rejected.map(row=>row.reason).join('\n'),/相反/);
 const control={
  column:{sign:1,type:'play',card:'BLC-4-070',line:'energy',signature:'+|play|BLC-4-070|energy'},
  weight:FROZEN_WEIGHT,wants:[{id:'pref',key:energy.key}],holds:[]
 };
 const summed=combine([target,negative,pref],[],both.accepted,control);
 assert.equal(summed.ok,false);
 assert.equal(diagnosticModel(both.accepted,summed),null);
 const one=fitColumns([target,keep,pref],[],[positive],['keep']);
 assert.equal(one.accepted.length,1);
 const broken=combine([target,keep,pref],[],one.accepted,{...control,holds:['keep']});
 assert.equal(broken.ok,false);
 const single=diagnosticModel(one.accepted,broken);
 assert.equal(single.includes070,false);
 assert.equal(single.columns.length,1);
 const clear=fitColumns([target,pref],[],[positive],[]);
 const joint=combine([target,pref],[],clear.accepted,control);
 assert.equal(joint.ok,true);
 assert.equal(diagnosticModel(clear.accepted,joint).id,'combination');
 assert.equal(diagnosticModel([],joint),null);
 const activate=side('activate','BLC-4-060','gap');
 const end=side('next',null,'gap-end');
 const wide=position({id:'gap',preferred:end,other:activate,hardPreferred:0,hardOther:1});
 const heavy=Array(115).fill(0);
 heavy[POLICY_INDEX['card_BLC-4-060']]=20;
 const blocked=fitColumns([wide],heavy,[{
  sign:-1,type:'activate',card:'BLC-4-060',line:null,signature:'-|activate|BLC-4-060|',
  targets:[{id:'gap',key:end.key}]
 }],[]);
 assert.equal(blocked.accepted.length,0);
 assert.match(blocked.rejected[0].reason,/領先/);
 assert.match(blocked.rejected[0].reason,/36/);
});

test('the diagnostic schedule is fair and does not retune the frozen 070 weight',()=>{
 const specs=fairSpecs();
 assertSchedule(specs);
 assert.equal(specs.length,192);
 assert.equal(specs.some(spec=>spec.specialistSeat!==spec.first),true);
 const mirror=specs.find(spec=>spec.opponent==='white-sword'&&spec.specialistSeat===0&&spec.first===1);
 assert.equal(mirror.seats[0].modelRole,'candidate');
 assert.equal(mirror.seats[1].modelRole,'none');
 const withControl=fairSpecs({baseline:true});
 assertSchedule(withControl);
 const paired=withControl.find(spec=>spec.opponent==='renruki'&&spec.arm==='v2');
 assert.equal(paired.seats[paired.specialistSeat].modelRole,'baseline');
 assert.equal(paired.seats[paired.specialistSeat].residual,true);
 const used=new Set([
  ...FAIR_SEEDS,...Object.values(AUDIT_SEEDS),...OLD_MATCH,...Object.values(OLD_MINE).flat(),
  ...Object.values(V4B7_MINE).flat()
 ]);
 for(const seed of [...Object.values(MINE_SEEDS).flat(),...MATCH_SEEDS])assert.equal(used.has(seed),false);
 assert.throws(()=>frozenFair({weight:1}),/不得改權重/);
});

test('an open top window stays legal after the hidden shuffle',{timeout:30000},()=>{
 const mine=readJson('training/white-sword-ai/v5c/mine.json');
 const position=mine.positions.find(row=>row.id==='0db12268106bbbf0');
 const {packs,state}=replayState(position);
 assert.equal(state.pending?.kind,'effect-top-filter-many-choice');
 const hidden=sampleHidden(state,position.actor,1);
 assert.doesNotThrow(()=>legalUniversalActions(packs,hidden));
 const rest=state.pending.uids.filter(uid=>!state.pending.selected.includes(uid));
 assert.deepEqual(hidden.players[state.pending.player].deck.slice(0,rest.length).map(card=>card.uid),rest);
});

test('weight zero with two columns matches official v2 on an opening',()=>{
 const model=loadModel(V2_FILE);
 const white=getDeck('white-sword');
 const other=getDeck('renruki');
 const packs=[white.pack,other.pack];
 const state=newComparedMatch(packs,[white.counts,other.counts],175800,0,matchRules('official'));
 const official=chooseWhiteSwordAction(packs,state,{
  actor:0,model,mode:'blend',explore:0,seed:175800,scale:6,hardCap:7
 });
 const residual=decideResidual(packs,state,0,model,175800,0,null,{
  columns:[
   {type:'play',card:'BLC-4-070',line:'energy',weight:0},
   {type:'activate',card:'BLC-4-060',line:null,weight:0}
  ]
 });
 assert.equal(JSON.stringify(residual.action),JSON.stringify(official.action));
 assert.equal(residual.changed,false);
 assert.equal(residual.changedFromBaseline,false);
});

test('an empty round adds no weight and the script cannot rewrite the frozen candidate',()=>{
 const report=renderReport({
  frozenWeight:FROZEN_WEIGHT,official:'abc',mined:{games:30},screened:12,buckets:7,
  confirmCount:0,games:192,confirmed:[],accepted:[],rejected:[],deferred:[],
  combination:{ok:false},diagnostic:null,baselineLabel:'沒有對戰',matches:null,kinds:{}
 });
 assert.match(report,/不採用/);
 assert.match(report,/不強迫新增權重/);
 const held=renderReport({
  frozenWeight:FROZEN_WEIGHT,official:'abc',mined:{games:30},screened:42,buckets:7,
  confirmCount:1,games:804,passedScreen:1,
  confirmed:[{id:'35816c698fab8755',labelA:'起動 BLC-4-060',labelB:'結束行動',confirmMean:-0.258,pOne:0.000455}],
  accepted:[],rejected:[{signature:'-|activate|BLC-4-060|',reason:'v2 原評分領先 129.0 分'}],deferred:[],
  combination:{ok:false},diagnostic:null,baselineLabel:'沒有對戰',matches:null,kinds:{}
 });
 assert.match(held,/4\.55e-4/);
 assert.match(held,/無法變成首選/);
 assert.doesNotMatch(held,/不強迫新增權重/);
 assert.match(report,/尚未學會/);
 assert.match(report,/不表示已證明安全/);
 assert.match(report,/沒有寫入權重/);
 assert.match(report,/不含挖掘/);
 const source=readFileSync(new URL('../scripts/white-sword-v5c.mjs',import.meta.url),'utf8');
 assert.equal(source.includes('minimumWeight'),false);
 assert.equal(source.includes('writeJson(CONTROL'),false);
 assert.ok(source.indexOf("ROOT+'/model.json'")<source.indexOf('white-sword-v5c-worker'));
});
