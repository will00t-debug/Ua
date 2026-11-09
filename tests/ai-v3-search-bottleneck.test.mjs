import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {walkTo,ask,rootsOf} from '../scripts/ai-v3-search-bottleneck.mjs';
import {lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';

const detail=JSON.parse(readFileSync('audit/ai-v3-search-bottleneck.json','utf8'));
const summary=JSON.parse(readFileSync('audit/ai-v3-search-bottleneck-summary.json','utf8'));
const report=JSON.parse(readFileSync('audit/ai-v3-hold-info-8401-baseline.json','utf8'));

test('the bottleneck report is a diagnosis of the recorded default',()=>{
 assert.equal(detail.base,'ef3377aa437147071f3212cceb4456e6b78ae2e7');
 assert.equal(detail.searchSeed,1);
 assert.equal(detail.reserveAp,false);
 assert.equal(detail.holdInfo,false);
 assert.equal(detail.rules,'official');
 assert.equal(detail.illegal,0);
 assert.equal(detail.replayMismatches,0);
 assert.equal(detail.dispatchMismatches,0);
 assert.equal(detail.scanned,1267);
 assert.ok(detail.snapshots.length>=12);
 assert.equal(new Set(detail.snapshots.map(row=>row.deck)).size,3);
 assert.equal(summary.diagnosis.enoughToImplement.defaultChange,false);
 assert.equal(summary.followUp.generator.decisions,21);
 assert.equal(summary.followUp.generator.actionChangedAt192,10);
 assert.equal(summary.followUp.unscoredFallback.returnedOutsideRoots,45);
 assert.match(summary.followUp.unscoredFallback.reading,/compared/);
 for(const row of detail.snapshots){
  assert.equal(row.searchSeed,1);
  assert.equal(row.illegal,0);
  assert.ok(row.hash&&row.publicHash&&row.public);
  assert.ok(row.beam.entered.length);
  for(const probe of Object.values(row.probes)){
   assert.equal(probe.legal,true);
   assert.equal(probe.factors.holdInfo,false);
   assert.equal(probe.factors.reserveAp,false);
   if(probe.reason!=='forced'&&probe.reason!=='deferred-baseline')assert.equal(probe.dispatches,probe.nodesUsed);
  }
 }
});

test('each saved snapshot replays the 48-node search',()=>{
 const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
 for(const row of detail.snapshots){
  const game=report.titles[row.deck].byMode.tree.games.find(item=>item.seed===row.gameSeed&&item.first===row.first&&item.challengerSeat===row.seat);
  const {packs,state}=walkTo(decks.get(row.deck),game,row.step);
  const actor=state.pending?.player??state.active;
  const hit=ask(packs,state,actor,{nodes:48,ms:1e9,actorDecisions:2});
  assert.equal(hit.legal,true,row.id+' '+row.step);
  assert.equal(hit.factors.holdInfo,false);
  assert.equal(hit.factors.reserveAp,false);
  if(hit.reason!=='forced'&&hit.reason!=='deferred-baseline')assert.equal(hit.dispatches,hit.nodesUsed,row.id+' '+row.step);
  assert.equal(hit.label,row.probes.n48.label,row.id+' '+row.step);
 }
});

test('a budget fallback score is read from compared',()=>{
 const action={type:'raid',uid:'1-13',baseUid:'1-11',slot:0};
 const trace={
  rootPlan:[{action}],
  nodesUsed:48,
  compared:[{action,executed:true,search:-13.2,boundary:'pending',nodes:8,cut:'nodes'}]
 };
 const roots=rootsOf(trace);
 assert.equal(roots.length,1);
 assert.equal(roots[0].executed,true);
 assert.equal(roots[0].search,-13.2);
 assert.equal(roots[0].boundary,'pending');
 const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
 const game=report.titles['sword-art-online-raid'].byMode.tree.games.find(item=>item.seed===8401&&item.first===0&&item.challengerSeat===1);
 const {packs,state}=walkTo(decks.get('sword-art-online-raid'),game,67);
 const actor=state.pending?.player??state.active;
 const hit=ask(packs,state,actor,{nodes:48,ms:1e9,actorDecisions:2});
 const live=lastAiV3Trace();
 assert.equal(hit.reason,'budget-fallback');
 assert.equal(hit.legal,true);
 assert.equal(hit.spentWithoutScore,false);
 assert.ok(hit.roots.length>=1);
 assert.ok(hit.roots.every(row=>row.executed&&Number.isFinite(row.search)));
 assert.equal((live.candidates||[]).length,0);
 assert.ok((live.compared||[]).some(row=>row.executed!==false&&Number.isFinite(row.search)));
 assert.equal(live.compared.length,hit.roots.length);
});
