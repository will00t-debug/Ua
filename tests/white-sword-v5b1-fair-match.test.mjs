import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {selectScored} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V2_FILE,readJson} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {matchSpecs} from '../training/white-sword-ai/v5b/lib/match.mjs';
import {assertSchedule,auditJobs,fairSpecs,summarizeFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';
import {compareFallback,playAudit} from '../training/white-sword-ai/v5b1/lib/play.mjs';
import {
 AUDIT_SEEDS,FAIR_SEEDS,FEATURE,FROZEN_WEIGHT,assertDiagnosticSeeds,assertFrozenCandidate,seedInterval
} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5b1/lib/report.mjs';

const feature={type:'play',card:'BLC-4-070',line:'energy'};

test('the fair schedule gives the residual second move and keeps the frozen weight',()=>{
 const candidate=readJson('training/white-sword-ai/v5b/candidate.json');
 assert.equal(assertFrozenCandidate(candidate),FROZEN_WEIGHT);
 assertDiagnosticSeeds(FAIR_SEEDS,Object.values(AUDIT_SEEDS));
 assertDiagnosticSeeds(Object.values(AUDIT_SEEDS));
 const specs=fairSpecs({feature});
 assertSchedule(specs);
 const audits=auditJobs();
 assert.equal(audits.length,12);
 assert.equal(new Set(audits.map(job=>[job.seed,job.opponent,job.first,job.specialistSeat].join(':'))).size,12);
 assert.equal(audits.filter(job=>job.opponent==='white-sword'&&job.first===0).length,2);
 const old=matchSpecs({seeds:[176200],opponents:['renruki'],model:null,weight:FROZEN_WEIGHT,feature});
 assert.equal(old.length,2);
 assert.ok(old.every(spec=>spec.specialistSeat===spec.first));
 const source=readFileSync('scripts/white-sword-v5b1.mjs','utf8');
 assert.equal(source.includes('minimumWeight'),false);
 assert.equal(source.includes('1056'),false);
});

test('the paired interval uses one observation per seed',()=>{
 const interval=seedInterval([[1,-1],[1,1]]);
 assert.equal(interval.n,2);
 assert.equal(interval.df,1);
 assert.equal(interval.mean,0.5);
 assert.ok(interval.low<0&&interval.high>1);
 const rows=[];
 const add=(seed,first,arm,win,changes)=>(rows.push({
  opponent:'reject-blue',arm,seed,specialistSeat:seed%2,first,finished:true,illegal:0,
  winner:win?seed%2:1-seed%2,changes,indicated:changes?changes+1:0
 }));
 add(177000,0,'residual',true,2);
 add(177000,0,'v2',false,0);
 add(177000,1,'residual',false,0);
 add(177000,1,'v2',false,0);
 add(177001,0,'residual',true,0);
 add(177001,0,'v2',true,0);
 add(177001,1,'residual',false,0);
 add(177001,1,'v2',true,0);
 rows.push(
  {opponent:'white-sword',arm:'mirror',seed:1,specialistSeat:0,first:0,finished:true,winner:0,changes:1,indicated:1},
  {opponent:'white-sword',arm:'mirror',seed:1,specialistSeat:1,first:0,finished:true,winner:0,changes:0,indicated:0}
 );
 const summary=summarizeFair(rows);
 const mirror=summary.decks['white-sword'];
 assert.equal(mirror.residualFirst.wins,1);
 assert.equal(mirror.residualSecond.wins,0);
 assert.equal(mirror.v2First.wins,1);
 assert.equal(mirror.v2Second.wins,0);
 const deck=summary.decks['reject-blue'];
 assert.equal(deck.delta.mean,0);
 assert.equal(deck.delta.n,2);
 assert.equal(deck.pairs,4);
 assert.equal(deck.sameOutcome,2);
 assert.equal(deck.changedSame,0);
 assert.equal(deck.effects.changedWin,1);
 assert.equal(deck.effects.unchangedLoss,2);
 assert.equal(summary.v2Changes,0);
});

test('equal blend scores keep the same action v2 keeps',()=>{
 const rows=[{action:{type:'z'},score:3},{action:{type:'a'},score:3}];
 const picked=selectScored(rows);
 const smaller=[...rows].sort((left,right)=>JSON.stringify(left.action)<JSON.stringify(right.action)?-1:1)[0];
 assert.equal(picked.action.type,smaller.action.type);
});

test('weight zero matches v2 on a live prefix, including a forced fallback',()=>{
 const model=loadModel(V2_FILE);
 const white=getDeck('white-sword');
 const other=getDeck('renruki');
 const packs=[white.pack,other.pack];
 const state=newComparedMatch(packs,[white.counts,other.counts],176802,1,matchRules('official'));
 const fallback=compareFallback(packs,state,1,model,176802,feature);
 assert.equal(fallback.same,true);
 assert.equal(fallback.residual.source,'fallback');
 assert.equal(fallback.official.source,'fallback');
 const audit=playAudit({
  seed:176802,opponent:'renruki',specialistSeat:1,first:1
 },model,feature,{steps:24});
 assert.equal(audit.mismatches,0);
 assert.ok(audit.openings>=1);
 assert.equal(audit.error,null);
});

test('the report keeps the diagnostic from being treated as a promotion',()=>{
 const report=renderReport({
  official:'abc',weight:FROZEN_WEIGHT,feature:FEATURE,identity:{decisions:3,mismatches:0,openings:1,ties:0,fallbacks:0},
  matches:{finished:192,illegal:0,v2Changes:0,decks:{},effects:{changes:1,gamesWithChange:1,unchangedWin:0,unchangedLoss:0,changedWin:1,changedLoss:0,indicated:2}}
 });
 assert.match(report,/沒有寫入權重/);
 assert.match(report,/不採用/);
 assert.match(report,/1,056/);
 assert.match(report,new RegExp(String(FROZEN_WEIGHT)));
});
