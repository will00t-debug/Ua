import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareSoloBattle,loadSoloBattle,isDesignatedWhiteSword} from '../dist/universal-v2/solo-battle-session.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {WHITE_SWORD_V2_MODEL} from '../dist/universal-v2/white-sword-ai/weights-v2.mjs';
import {WHITE_SWORD_V2_POLICY,handleWhiteSwordRequest} from '../dist/universal-v2/white-sword-ai/browser-entry.mjs';
import {newComparedMatch,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';

const white=getDeck('white-sword');
const blue=getDeck('reject-blue');
const duelDeck=(deck)=>({pack:deck.pack,counts:deck.counts,label:deck.label||deck.id});

test('browser weight snapshot equals the audited v2 capped weights',()=>{
 const candidate=JSON.parse(readFileSync('training/white-sword-ai/weights/v2-capped.json','utf8'));
 assert.equal(WHITE_SWORD_V2_MODEL.version,'white-sword-specialist-v2-capped');
 assert.equal(WHITE_SWORD_V2_MODEL.hardCap,7);
 assert.equal(WHITE_SWORD_V2_MODEL.blendScale,6);
 assert.deepEqual(WHITE_SWORD_V2_MODEL.policy,candidate.policy);
 assert.deepEqual(WHITE_SWORD_V2_MODEL.value,candidate.value);
});

test('only the designated BLEACH 50-card White Sword can activate opt-in',()=>{
 assert.equal(isDesignatedWhiteSword(white.pack.id,white.counts),true);
 assert.equal(isDesignatedWhiteSword(blue.pack.id,blue.counts),false);
 const forged={...white.counts,'BLC-1-085':3};
 assert.equal(isDesignatedWhiteSword(white.pack.id,forged),false);
 const config=prepareSoloBattle({
  mine:duelDeck(blue),foe:duelDeck(white),first:0,difficulty:'normal',
  whiteSwordV2:true,now:1795290000000,nonce:1
 });
 assert.equal(config.whiteSwordV2,true);
 const storage={getItem:()=>JSON.stringify(config)};
 const restored=loadSoloBattle(storage,{now:1795290000001});
 assert.equal(restored?.config?.whiteSwordV2,true);
 assert.throws(()=>prepareSoloBattle({
  mine:duelDeck(white),foe:duelDeck(blue),first:0,difficulty:'hard',
  whiteSwordV2:true,now:1795290000000,nonce:2
 }),/白劍專屬 AI/);
 const tampered={...config,decks:[config.decks[0],{
  ...config.decks[1],counts:{...config.decks[1].counts,'BLC-1-085':3}
 }]};
 assert.equal(loadSoloBattle({getItem:()=>JSON.stringify(tampered)},{now:1795290000001}),null);
 const normal=prepareSoloBattle({
  mine:duelDeck(white),foe:duelDeck(blue),first:0,difficulty:'hard',
  now:1795290000000,nonce:3
 });
 assert.equal(normal.whiteSwordV2,undefined);
});

test('browser worker request returns a reducer-legal white sword action without fallback',()=>{
 const packs=[blue.pack,white.pack];
 let state=newComparedMatch(packs,[blue.counts,white.counts],92101,1,matchRules('official'));
 let actor=state.pending?.player??state.active;
 for(let i=0;i<12&&actor!==1;i++){
  const legal=legalUniversalActions(packs,state);
  assert.ok(legal.length);
  state=dispatchUniversalAction(packs,state,legal[0],{actor});
  actor=state.pending?.player??state.active;
 }
 assert.equal(actor,1);
 const request=buildAiV3Request(packs,state,1,{requestId:21,stateVersion:4,seed:17,nodes:48,ms:40});
 assert.ok(request?.sealed);
 const result=handleWhiteSwordRequest(request);
 assert.equal(result.requestId,21);
 assert.equal(result.stateVersion,4);
 assert.equal(result.policy,WHITE_SWORD_V2_POLICY);
 assert.equal(result.error,null,JSON.stringify(result));
 assert.ok(legalUniversalActions(request.pack,request.state).some(a=>JSON.stringify(a)===JSON.stringify(result.action)));
 assert.equal(handleWhiteSwordRequest({...request,actor:0}).error,'not-ai-seat');
 assert.equal(handleWhiteSwordRequest({...request,sealed:false}).error,'unsealed');
});

test('production lobby markup and AI handoff have dedicated opt-in controls',()=>{
 const html=readFileSync('dist/universal-v2-preview.html','utf8');
 const js=readFileSync('dist/universal-v2-preview.mjs','utf8');
 assert.match(html,/id="white-sword-ai-v2"/);
 assert.match(js,/whiteSwordV2:whiteSwordOn\(\)/);
 assert.match(js,/whiteSwordWorkerHandle\(\)/);
 assert.match(js,/if\(whiteSwordOn\(\)\)/);
});
