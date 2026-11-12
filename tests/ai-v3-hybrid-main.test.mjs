import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {AI_V3_POLICY,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseHybridMainAction,hybridLane,hybridSource,HYBRID_MAIN_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport,HARD_AI_POLICY} from '../dist/universal-v2/hard-ai.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {newComparedMatch,applySharedOpening} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseDecision} from '../scripts/ai-v3-phase-hybrid.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const baseline=JSON.parse(readFileSync('audit/ai-v3-hold-info-8401-baseline.json','utf8'));
const CLOCKLESS={nodes:48,ms:1e9,seed:1};

function positions(){
 const deck=battleDecks().find(item=>item.id==='white-sword');
 const packs=[deck.pack,deck.pack];
 const game=baseline.titles['white-sword'].byMode.tree.games.find(item=>item.seed===8401&&item.first===0&&item.challengerSeat===0);
 let state=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first)).state;
 let main=null;
 let pending=null;
 for(const played of game.actions){
  if(state.status!=='playing')break;
  if(!main&&state.phase==='main'&&!state.pending&&legalUniversalActions(packs,state).length>1)main=structuredClone(state);
  if(!pending&&state.pending)pending=structuredClone(state);
  if(main&&pending)break;
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>same(item,played.action));
  assert.ok(action,'replay '+played.step);
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 assert.ok(main);
 assert.ok(pending);
 return {packs,main,pending};
}

test('hybrid-main-v1 keeps pending on AI v3 and idle main on hard-search-2',()=>{
 assert.equal(HYBRID_MAIN_POLICY,'hybrid-main-v1');
 assert.equal(hybridLane({phase:'start',pending:null}),'start');
 assert.equal(hybridLane({phase:'move',pending:null}),'move');
 assert.equal(hybridLane({phase:'main',pending:null}),'main');
 assert.equal(hybridLane({phase:'attack',pending:null}),'battle');
 for(const kind of ['block','life-trigger','effect-choice','effect-discard','end-hand-limit','attack-life-target']){
  assert.equal(hybridLane({phase:'main',pending:{kind}}),'pending');
  assert.equal(hybridSource(hybridLane({phase:'main',pending:{kind}})),'v3');
 }
 assert.equal(hybridSource('main'),'hard');
 assert.equal(hybridSource('start'),'v3');
 assert.equal(hybridSource('move'),'v3');
 assert.equal(hybridSource('battle'),'v3');
 assert.equal(hybridSource('other'),'v3');
 assert.equal(MATCH_LIMITS.nodes,48);
 assert.equal(MATCH_LIMITS.ms,40);
 assert.equal(HARD_AI_POLICY,'hard-search-2');
});

test('the worker routes idle main to hard and a real pending choice to v3',()=>{
 const {packs,main,pending}=positions();
 const actor=main.active;
 resetHardAiReport();
 const hard=chooseStrengthenedHardAction(packs,main,{...CLOCKLESS});
 const hybrid=chooseHybridMainAction(packs,main,{actor,...CLOCKLESS});
 assert.equal(same(hybrid,hard),true);
 const mainLegal=legalUniversalActions(packs,main);
 const request=buildAiV3Request(packs,main,actor,{requestId:3,stateVersion:8,seed:1,nodes:48,ms:1e9,policy:HYBRID_MAIN_POLICY});
 assert.equal(request.policy,HYBRID_MAIN_POLICY);
 assert.equal(request.sealed,true);
 assert.equal(Object.hasOwn(request,'opponentHand'),false);
 const result=handleAiV3Request(request);
 assert.equal(result.error,null);
 assert.equal(result.policy,HYBRID_MAIN_POLICY);
 assert.equal(result.search.route.lane,'main');
 assert.equal(result.search.route.source,'hard');
 assert.ok(result.search.nodesUsed==null||result.search.nodesUsed<=48);
 assert.equal(acceptAiV3Result({requestId:3,stateVersion:8,actor,legal:legalUniversalActions(packs,request.state)},result).ok,true);
 const plain=buildAiV3Request(packs,main,actor,{requestId:3,stateVersion:8,seed:1,nodes:48,ms:1e9});
 assert.equal(Object.hasOwn(plain,'policy'),false);
 const v3=handleAiV3Request(plain);
 assert.equal(v3.policy,AI_V3_POLICY);
 assert.equal(v3.search.route,undefined);
 const pendingActor=pending.pending.player??pending.active;
 const pendingHybrid=chooseHybridMainAction(packs,pending,{actor:pendingActor,...CLOCKLESS});
 const pendingWorker=handleAiV3Request(buildAiV3Request(packs,pending,pendingActor,{
  requestId:4,stateVersion:9,seed:1,nodes:48,ms:1e9,policy:HYBRID_MAIN_POLICY
 }));
 assert.equal(pendingWorker.error,null);
 assert.equal(pendingWorker.search.route.lane,'pending');
 assert.equal(pendingWorker.search.route.source,'v3');
 assert.equal(same(pendingWorker.action,pendingHybrid),true);
 assert.equal(handleAiV3Request({...request,opponentHand:['secret'],lifeOrder:['hidden'],deckOrder:['hidden']}).error,'hidden-field');
 assert.equal(handleAiV3Request({...request,sealed:false}).error,'unsealed');
 assert.equal(acceptAiV3Result({requestId:9,stateVersion:8,actor,legal:mainLegal},result).reason,'stale-request');
 assert.equal(acceptAiV3Result({requestId:3,stateVersion:1,actor,legal:mainLegal},result).reason,'stale-version');
 assert.equal(acceptAiV3Result({requestId:3,stateVersion:8,actor:1-actor,legal:mainLegal},result).reason,'stale-actor');
 const timed=handleAiV3Request(buildAiV3Request(packs,main,actor,{
  requestId:5,stateVersion:10,seed:1,nodes:48,ms:40,policy:HYBRID_MAIN_POLICY
 }));
 assert.equal(timed.error,null);
 assert.ok(timed.search.nodesUsed==null||timed.search.nodesUsed<=48);
 assert.equal(acceptAiV3Result({
  requestId:5,stateVersion:10,actor,legal:legalUniversalActions(packs,buildAiV3Request(packs,main,actor,{
   requestId:5,stateVersion:10,seed:1,nodes:48,ms:40,policy:HYBRID_MAIN_POLICY
  }).state)
 },timed).ok,true);
});

test('a hybrid continuation stays legal across phase changes',()=>{
 const {packs,main}=positions();
 let state=main;
 const routes=[];
 for(let step=0;step<16&&state.status==='playing';step++){
  const actor=state.pending?.player??state.active;
  const picked=chooseDecision(packs,state,HYBRID_MAIN_POLICY,actor);
  assert.equal(picked.legal,true);
  assert.equal(picked.source,hybridSource(hybridLane(state)));
  if(hybridLane(state)==='pending')assert.equal(picked.source,'v3');
  if(hybridLane(state)==='main')assert.equal(picked.source,'hard');
  routes.push(picked.lane+':'+picked.source);
  state=dispatchUniversalAction(packs,state,picked.action,{actor});
  assert.equal(assertUniversalMatch(packs,state),true);
 }
 assert.ok(routes.some(item=>item==='main:hard'));
 assert.ok(routes.some(item=>item.endsWith(':v3')));
});
