import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {REAL_V2_PILOT_IDS,verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';

const root=path.resolve(import.meta.dirname,'..');

test('[V2-E] report generates from actual catalog modules with four separate, fail-closed milestones',()=>{
 const stdout=execFileSync(process.execPath,['scripts/v2-audit-catalog.mjs'],
  {cwd:root,encoding:'utf8'});
 const summary=JSON.parse(fs.readFileSync(path.join(root,'audit/v2-full-catalog-summary.json'),'utf8'));
 assert.ok(stdout.includes(summary.source_commit));
 const rows=Object.values(summary.titles);
 assert.equal(rows.length,5,'all five source titles enumerated');
 assert.equal(summary.titles['solo-leveling'].catalogued,80);
 assert.equal(summary.titles['gurren-lagann'].catalogued,81);
 assert.equal(summary.titles['mushoku-tensei'].catalogued,80);
 assert.equal(summary.titles.bleach.v2_ported,REAL_V2_PILOT_IDS.bleach.length);
 assert.equal(summary.titles['gurren-lagann'].v2_ported,REAL_V2_PILOT_IDS['gurren-lagann'].length);
 for(const info of rows){
  assert.ok(info.catalogued>=info.metadata_complete);
  assert.ok(info.catalogued>=info.v2_ported);
  assert.ok(info.v2_ported>=info.fully_accepted);
  assert.ok(info.listed_in_preview_deck>=info.integrated_playable);
  assert.equal(info.fully_accepted,0,'must not certify just because tests exist');
  assert.equal(info.integrated_playable,0,'must run and record a complete audited match');
 }
 assert.equal(summary.titles.bleach.listed_in_preview_deck,13);
 assert.equal(summary.titles['gurren-lagann'].listed_in_preview_deck,13);
 assert.equal(summary.titles['solo-leveling'].v2_ported,0);
 assert.equal(summary.titles['mushoku-tensei'].v2_ported,0);
 assert.equal(summary.titles['sword-art-online'].v2_ported,0);
 assert.equal(summary.mobile_physical_test,'not_run');
});

test('[V2-E] integrated preview uses 2 real, source-mapped, legal 50-card decks without synthetic fillers',()=>{
 const b=verifiedBleachPurplePilotDeck(),t=verifiedTtgRedPilotDeck();
 for(const {pack,counts} of [b,t]){
  assert.deepEqual(validateUniversalDeck(pack,counts),[]);
  assert.equal(Object.values(counts).reduce((sum,n)=>sum+n,0),50);
  for(const [id,n] of Object.entries(counts)){
   assert.ok(pack.cards[id]&&n>0&&n<=4);
   assert.ok(!id.startsWith('TEST-ONLY'));
  }
 }
 const state=newUniversalMatch([b.pack,t.pack],{decks:[b.counts,t.counts],seed:20261015,first:0});
 assert.equal(assertUniversalMatch([b.pack,t.pack],state),true);
 for(let p=0;p<2;p++){
  const view=universalPublicView([b.pack,t.pack],state,p);
  assert.equal(view.players[1-p].hand,null);
  assert.equal(view.players[1-p].deckCount,state.players[1-p].deck.length);
 }
});

test('[V2-E] illegal physical UID action cannot mutate input or bypass legality',()=>{
 const b=verifiedBleachPurplePilotDeck(),t=verifiedTtgRedPilotDeck();
 const pack=[b.pack,t.pack],s=newUniversalMatch(pack,{decks:[b.counts,t.counts],seed:314159,first:0});
 const before=structuredClone(s);
 assert.ok(legalUniversalActions(pack,s).length>0);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'play',uid:'0-999999',line:'front',slot:0},{actor:0}),/not currently legal/);
 assert.deepEqual(s,before);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('[V2-E] explicit pilot registration never promotes every catalogued card',()=>{
 const b=verifiedPilotPack('bleach'),t=verifiedPilotPack('gurren-lagann');
 assert.equal(Object.keys(b.cards).length,REAL_V2_PILOT_IDS.bleach.length);
 assert.equal(Object.keys(t.cards).length,REAL_V2_PILOT_IDS['gurren-lagann'].length);
 assert.ok(!b.cards['BLC-1-104']);
 assert.ok(!t.cards['TTG-1-074']);
});
