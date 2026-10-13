import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newTtgCoreMatch,dispatchTtgCoreAction,legalTtgCoreActions,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {TTG_BETA_IDS,TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET,ttgBetaDeckIssues,ttgChoiceActor,ttgCardByUid,ttgActionLabel,ttgActionKinds,ttgFilteredActions} from '../dist/ttg-browser.mjs';
test('81/81 TTG beta engine card identities and both ready-to-play 50 card examples',()=>{
 assert.equal(TTG_BETA_IDS.length,81);
 for(const deck of [TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET]){assert.equal(Object.values(deck).reduce((a,b)=>a+b,0),50);assert.deepEqual(ttgBetaDeckIssues(deck),[]);}
});
test('browser adapter exposes only legal actions, source remains immutable',()=>{
 const s=newTtgCoreMatch({decks:[TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET],seed:37});
 assert.equal(ttgChoiceActor(s),s.active);assert.ok(assertTtgCoreState(s));
 const a=legalTtgCoreActions(s)[0];const subset=ttgFilteredActions(s,{limit:1});assert.equal(subset.actions.length,1);assert.equal(subset.total,legalTtgCoreActions(s).length);
 assert.equal(typeof ttgActionLabel(s,a),'string');assert.ok(ttgActionKinds(s).some(x=>x.type===a.type));
 const uid=s.players[0].hand[0].uid;assert.equal(ttgCardByUid(s,uid).uid,uid);
 const next=dispatchTtgCoreAction(s,{type:'next'});assert.ok(assertTtgCoreState(next));assert.equal(s.phase,'start');
});
test('browser handles defending player prompts without exposing illegal buttons',()=>{
 const s=newTtgCoreMatch({decks:[TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET],seed:55});
 s.pending={kind:'block',attackerUid:'fake'};assert.equal(ttgChoiceActor(s),1-s.active);
 s.pending={kind:'ttgGreenEntry',player:1};assert.equal(ttgChoiceActor(s),1);
});
test('site has isolated beta match entry and keeps official unsupported flags untouched',()=>{
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 for(const x of ['ttgArena','ttgBetaStartGreen','ttgBetaStartRed','ttgAct','ttgActionLabel'])assert.ok(app.includes(x),x);
 const title=readFileSync(new URL('../dist/title-registry.mjs',import.meta.url),'utf8');
 assert.match(title,/gurren-lagann'.*playable:false/);
});
