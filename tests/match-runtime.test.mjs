import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS} from '../dist/cards.mjs';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {SOLO_TRAINING_PRESET} from '../dist/solo-match.mjs';
import {
 MATCH_RUNTIME_TITLES,matchRuntime,matchTitle,matchSupport,matchDeckIssues,
 startMatchForTitle,matchChoiceActor,matchLegalActions,dispatchMatchAction,chooseMatchBotAction
} from '../dist/match-runtime.mjs';

const decks={
 bleach:PRESETS[0].counts,
 'gurren-lagann':TTG_GREEN_BETA_PRESET,
 'solo-leveling':SOLO_TRAINING_PRESET
};
const settings={bleach:{mode:'solo',seed:41,first:0},'gurren-lagann':{seed:51,first:0},'solo-leveling':{seed:61,first:0,mode:'solo'}};

test('common match runtime registers three actual engines but not unfinished series',()=>{
 assert.deepEqual(MATCH_RUNTIME_TITLES,['bleach','gurren-lagann','solo-leveling']);
 for(const name of MATCH_RUNTIME_TITLES){
  const runtime=matchRuntime(name);
  assert.equal(typeof runtime.dispatch,'function');
  assert.equal(typeof runtime.legalActions,'function');
  assert.equal(typeof runtime.assert,'function');
  assert.deepEqual(matchDeckIssues(name,decks[name]),[],name);
  assert.equal(matchSupport(name).title,name);
  assert.equal(matchSupport(name).allCardsVerified,false,'engine readiness cannot masquerade as official card QA');
 }
 for(const id of ['mushoku-tensei','sword-art-online']){
  assert.equal(matchSupport(id).beta,false);
  assert.throws(()=>matchRuntime(id),/尚未提供判定引擎/);
  assert.throws(()=>startMatchForTitle(id,{decks:[{},{}]}),/尚未提供判定引擎/);
 }
 assert.equal(matchSupport('bleach').corePlayable,true);
 assert.equal(matchSupport('gurren-lagann').beta,true);
 assert.equal(matchSupport('solo-leveling').beta,true);
});

test('one API creates, validates and progresses a real match for each series',()=>{
 for(const title of MATCH_RUNTIME_TITLES){
  const s=startMatchForTitle(title,{...settings[title],decks:[decks[title],decks[title]]});
  assert.equal(matchTitle(s),title);
  assert.equal(s.players.length,2);
  assert.equal(matchChoiceActor(title,s),0);
  const legal=matchLegalActions(title,s);
  assert.ok(legal.length,title+' has executable actions');
  const action=legal.find(a=>a.type==='next'||a.type==='keep')||legal[0];
  const next=dispatchMatchAction(title,s,action,{actor:0});
  assert.equal(matchTitle(next),title);
  assert.notDeepEqual(next,s);
  assert.equal(s.players[0].hand.length,7,'original state is never mutated');
  assert.ok(matchRuntime(title).assert(next));
  assert.throws(()=>dispatchMatchAction(title,s,action,{actor:1}),/輪到另一位/);
 }
});

test('reject cross-game dispatch and corrupted saves before touching physical card zones',()=>{
 const bleach=startMatchForTitle('bleach',{...settings.bleach,decks:[decks.bleach,decks.bleach]});
 const ttg=startMatchForTitle('gurren-lagann',{...settings['gurren-lagann'],decks:[decks['gurren-lagann'],decks['gurren-lagann']]});
 const solo=startMatchForTitle('solo-leveling',{...settings['solo-leveling'],decks:[decks['solo-leveling'],decks['solo-leveling']]});
 for(const [wrong,s] of [['bleach',ttg],['solo-leveling',bleach],['gurren-lagann',solo]]){
  const previous=structuredClone(s);
  assert.throws(()=>dispatchMatchAction(wrong,s,{type:'next'}),/不能跨作品/);
  assert.deepEqual(s,previous);
  assert.throws(()=>matchLegalActions(wrong,s),/不能跨作品/);
 }
 const tampered=structuredClone(ttg);tampered.players[0].life.push({...tampered.players[0].life[0]});
 assert.throws(()=>matchLegalActions('gurren-lagann',tampered),/card conservation/);
});

test('AI decisions use each native title-specific rules engine, no rules translation needed',()=>{
 for(const title of MATCH_RUNTIME_TITLES.filter(x=>x!=='bleach')){
  const state=startMatchForTitle(title,{...settings[title],decks:[decks[title],decks[title]]});
  const choice=chooseMatchBotAction(title,state);
  assert.ok(choice,title+' AI produced a decision');
  const next=dispatchMatchAction(title,state,choice);
  assert.ok(matchRuntime(title).assert(next));
 }
});

test('TTG raw rule templates remain available for complex effect selection while buttons use executable actions',()=>{
 const state=startMatchForTitle('gurren-lagann',{...settings['gurren-lagann'],decks:[decks['gurren-lagann'],decks['gurren-lagann']]});
 const raw=matchLegalActions('gurren-lagann',state,{templates:true});
 const ready=matchLegalActions('gurren-lagann',state);
 assert.ok(raw.some(x=>x.type==='next'));
 assert.ok(ready.some(x=>x.type==='next'));
});
