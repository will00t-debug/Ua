import test, {after, before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {verifiedBleachPurplePilotDeck, BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch, dispatchUniversalAction, legalUniversalActions, universalActor, UNIVERSAL_V2_VERSION} from '../dist/universal-v2/engine.mjs';
import {makeUniversalPreviewReplay} from '../dist/universal-v2/preview-replay.mjs';
import {DECISION_CLASSES, DECISION_ENGINE_VERSION, classifyDecision, visibleForTraining} from '../dist/universal-v2/coach-format.mjs';
import {buildHumanStep, buildAiMark, coachHeader, hiddenLeak, newCoachMatchId} from '../dist/universal-v2/coach-record.mjs';
// The battle and online collectors import this exact URL. The write lock lives
// on the module instance, so the regression has to use the same one.
import {createDecisionQueue, readStoredQueue} from '../dist/universal-v2/coach-queue.mjs?v=20261104step1';
import {createCoachBattle} from '../dist/universal-v2/coach-battle.mjs';
import {createOnlineCollector} from '../dist/universal-v2/coach-online.mjs';
import {COACH_CONSENT_KEY} from '../dist/universal-v2/coach-client.mjs';
import {createHandler} from '../server/http.mjs';

const deck=verifiedBleachPurplePilotDeck();
const packs=[deck.pack, deck.pack];
const password='correct-horse-1';
const ME='u'+'a1'.repeat(8);
const OTHER='u'+'b2'.repeat(8);
function meBody(id=ME){return {ok:true, status:200, json:async()=>({id, username:'甲'})};}

function memoryStorage(seed={}){
 const data=new Map(Object.entries(seed));
 return {
  getItem(key){return data.has(key)?data.get(key):null;},
  setItem(key, value){data.set(String(key), String(value));},
  removeItem(key){data.delete(key);},
  get length(){return data.size;},
  key(index){return [...data.keys()][index]??null;}
 };
}
function consented(){return memoryStorage({[COACH_CONSENT_KEY]:'1'});}
function opening(){
 return newUniversalMatch(packs, {decks:[deck.counts, deck.counts], seed:7, first:0, openingMulligan:true});
}
function keepAction(state){
 const action=legalUniversalActions(packs, state).find(item=>item.mode==='keep');
 assert.ok(action);
 return action;
}
function headerFor(aiVersion='normal'){
 return coachHeader({matchId:newCoachMatchId(), packs, counts:deck.counts, aiVersion});
}
function human(state, action, header, step=0, previous=null, legal=null){
 return buildHumanStep({packs, state, action, step, replayIndex:step, previous, header, legal});
}

test('decision rows use the same engine version as the rules engine', ()=>{
 assert.equal(DECISION_ENGINE_VERSION, UNIVERSAL_V2_VERSION);
 assert.equal(DECISION_ENGINE_VERSION, 'ua-v2.0');
});

test('every requested decision class is recognized from a real action shape', ()=>{
 const samples=[
  ['play', {type:'play', uid:'0-1', line:'front', slot:0}],
  ['move', {type:'move', uid:'0-1', line:'energy', slot:1}],
  ['raid', {type:'raid', uid:'0-1', baseUid:'0-2'}],
  ['raid', {type:'chooseHandRestOrRaid', mode:'raid', uid:'0-1', baseUid:'0-2'}],
  ['attack', {type:'attack', uid:'0-1'}],
  ['block', {type:'chooseBlock', uid:'0-2'}],
  ['search', {type:'chooseDeckSearch', uid:'0-3'}],
  ['discard', {type:'chooseDiscard', uid:'0-4'}],
  ['pay', {type:'choosePayDeploy', mode:'pay'}],
  ['pay', {type:'choosePayNamed', mode:'hand', uid:'0-5'}],
  ['effect', {type:'chooseEffectMode', mode:'do'}],
  ['effect', {type:'chooseTopTraitHand', mode:'hand'}],
  ['effect', {type:'kmr', mode:'sub', uid:'0-6'}],
  ['order', {type:'chooseTopOrder', uid:'0-7'}],
  ['skip', {type:'next'}],
  ['skip', {type:'chooseBlock', uid:null}],
  ['skip', {type:'choosePayDeploy', mode:'skip'}],
  ['mulligan', {type:'openingMulligan', mode:'keep'}],
  ['other', {type:'customUnknown'}]
 ];
 const seen=new Set(samples.map(([name])=>name));
 for(const name of DECISION_CLASSES)assert.equal(seen.has(name), true, name);
 for(const [name, action] of samples)assert.equal(classifyDecision(action), name, action.type+':'+action.mode);
});

test('an accepted human action keeps the pre-action view, legal options and chain', ()=>{
 const state=opening();
 const legal=legalUniversalActions(packs, state);
 const action=keepAction(state);
 const header=headerFor();
 const step=human(state, action, header, 0, null, legal);
 assert.equal(step.format, 'ua-v2-coach-step-v2');
 assert.equal(step.source, 'human');
 assert.equal(step.actor, 'human');
 assert.equal(step.seat, 0);
 assert.equal(step.channel, 'solo');
 assert.equal(step.mode, 'solo');
 assert.equal(step.engine, 'universal-v2');
 assert.equal(step.engineVersion, UNIVERSAL_V2_VERSION);
 assert.equal(step.turn, state.turn);
 assert.equal(step.phase, state.phase);
 assert.equal(step.decisionClass, 'mulligan');
 assert.equal(step.forced, legal.length===1);
 assert.equal(step.forced, false);
 assert.deepEqual(step.choice, action);
 assert.equal(step.legal.some(item=>JSON.stringify(item)===JSON.stringify(action)), true);
 assert.equal(step.chain.previousStep, null);
 assert.equal(step.chain.step, 0);
 assert.equal(step.chain.clientKey, step.clientKey);
 assert.deepEqual(step.deck.counts, deck.counts);
 assert.equal(step.observation.visible.players[1].hand, null);
 assert.equal(Array.isArray(step.observation.visible.players[0].hand), true);
 assert.deepEqual(hiddenLeak(state, step.observation, 0), []);
 const text=JSON.stringify(step);
 assert.equal(text.includes('"winner"'), false);
 assert.equal(text.includes('"seed"'), false);
 assert.equal(text.includes('"initialCounts"'), false);
 let after=dispatchUniversalAction(packs, state, action, {actor:0});
 assert.equal(universalActor(after), 1);
 const reply=legalUniversalActions(packs, after).find(item=>item.mode==='keep');
 after=dispatchUniversalAction(packs, after, reply, {actor:1});
 assert.equal(universalActor(after), 0);
 const laterLegal=legalUniversalActions(packs, after);
 const second=human(after, laterLegal[0], header, 1, {step:0, type:action.type, replayIndex:0, clientKey:step.clientKey}, laterLegal);
 assert.equal(second.previous.step, 0);
 assert.equal(second.previous.clientKey, step.clientKey);
 assert.equal(second.chain.previousStep, 0);
 assert.equal(second.source, 'human');
 assert.deepEqual(hiddenLeak(after, second.observation, 0), []);
});

test('playing a short match records only the human seat and every class that occurs', ()=>{
 const header=headerFor('hard-search-2');
 let state=opening();
 const classes=new Set();
 let humanSteps=0;
 let aiSteps=0;
 for(let guard=0;guard<24 && state.status==='playing';guard++){
  const legal=legalUniversalActions(packs, state);
  assert.ok(legal.length);
  const actor=universalActor(state);
  const action=legal.find(item=>!classes.has(classifyDecision(item)))||legal[0];
  if(actor===0){
   const step=human(state, action, header, humanSteps, humanSteps?{step:humanSteps-1, type:'openingMulligan', replayIndex:humanSteps-1}:null, legal);
   assert.equal(step.actor, 'human');
   assert.equal(step.source, 'human');
   assert.equal(step.decisionClass, classifyDecision(action));
   assert.equal(step.forced, legal.length===1);
   assert.equal(step.observation.visible.players[1].hand, null);
   assert.deepEqual(hiddenLeak(state, step.observation, 0), []);
   classes.add(step.decisionClass);
   humanSteps++;
  }else{
   const mark=buildAiMark({packs, state, action, step:aiSteps, replayIndex:guard, header});
   assert.equal(mark.actor, 'ai');
   assert.equal(mark.source, 'ai');
   assert.equal(mark.format, 'ua-v2-coach-demo-v1');
   assert.notEqual(mark.format, 'ua-v2-coach-step-v2');
   aiSteps++;
  }
  state=dispatchUniversalAction(packs, state, action, {actor});
 }
 assert.ok(humanSteps>=1);
 assert.ok(aiSteps>=1);
 assert.equal(classes.has('mulligan'), true);
});

test('training view drops hidden hands, deck order, unrevealed life and future results', ()=>{
 const raw={
  winner:1, seed:99, initialCounts:[{'BLC-1-034':4}], endReason:'life-zero', rng:1,
  players:[
   {hand:[{uid:'0-1', cardId:'BLC-1-034', name:'secret'}], deck:[{uid:'0-9'}], life:[{uid:'0-8'}], lifeCount:1},
   {hand:[{uid:'1-1', cardId:'BLC-1-036'}], deck:[{uid:'1-9'}], life:[{uid:'1-8'}], lifeCount:1}
  ]
 };
 const visible=visibleForTraining(raw, 0);
 assert.equal(visible.winner, undefined);
 assert.equal(visible.seed, undefined);
 assert.equal(visible.players[0].deck, undefined);
 assert.equal(visible.players[0].life, undefined);
 assert.equal(visible.players[1].hand, null);
 assert.deepEqual(visible.players[0].hand, [{uid:'0-1', cardId:'BLC-1-034'}]);
 const text=JSON.stringify(visible);
 assert.equal(text.includes('1-1'), false);
 assert.equal(text.includes('0-9'), false);
 assert.equal(text.includes('1-8'), false);
});

test('consent off does not build a decision or call the network, and clears the queue', async()=>{
 const header=headerFor();
 const state=opening();
 const action=keepAction(state);
 const paths=[];
 const storage=memoryStorage();
 const battle=createCoachBattle({
  storage,
  schedule(){return 1;},
  fetchImpl:async path=>{
   paths.push(path);
   return path==='/api/me'?meBody():{ok:true, json:async()=>({})};
  }
 });
 await battle.begin(header);
 battle.noteHuman({packs, state, action:{type:'not-legal'}, replayIndex:0});
 assert.equal(battle.queued, 0);
 assert.equal(battle.session.lastError, '');
 assert.deepEqual(paths, ['/api/me']);
 battle.setConsent(true);
 battle.noteHuman({packs, state, action, replayIndex:0, legal:legalUniversalActions(packs, state)});
 assert.equal(battle.queued, 1);
 assert.equal(battle.session.humanStep, 1);
 battle.setConsent(false);
 assert.equal(battle.queued, 0);
 assert.equal(battle.session.humanStep, 0);
 assert.equal(storage.getItem('ua-v2-coach-queue-v1'), '[]');
 battle.noteHuman({packs, state, action, replayIndex:0});
 assert.equal(battle.queued, 0);
 assert.equal(paths.includes('/api/coach/steps'), false);
});

test('a human decision is queued before the upload finishes, and an AI action is not queued', async()=>{
 const header=headerFor();
 const state=opening();
 const action=keepAction(state);
 let release;
 const paths=[];
 const battle=createCoachBattle({
  storage:consented(),
  schedule(){return 1;},
  fetchImpl(path){
   paths.push(path);
   if(path==='/api/me')return Promise.resolve(meBody());
   return new Promise(resolve=>{release=()=>resolve({ok:true, json:async()=>({duplicate:false})});});
  }
 });
 await battle.begin(header);
 const started=Date.now();
 battle.noteHuman({packs, state, action, replayIndex:0, legal:legalUniversalActions(packs, state)});
 assert.ok(Date.now()-started<50);
 assert.equal(battle.queued, 1);
 assert.equal(paths.includes('/api/coach/steps'), false);
 battle.noteAi({replayIndex:1, action});
 assert.equal(battle.session.aiStep, 1);
 assert.equal(battle.queued, 1);
 const pending=battle.flush();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(paths.includes('/api/coach/steps'), true);
 release();
 await pending;
 assert.equal(battle.queued, 0);
});

test('illegal, deselected and unsent actions are not new decisions', async()=>{
 const header=headerFor();
 const state=opening();
 const legal=legalUniversalActions(packs, state);
 const battle=createCoachBattle({
  storage:consented(),
  schedule(){return 1;},
  fetchImpl:async path=>path==='/api/me'?meBody():{ok:true, json:async()=>({duplicate:false})}
 });
 await battle.begin(header);
 battle.noteHuman({packs, state, action:{type:'play', uid:'missing'}, replayIndex:0, legal});
 assert.equal(battle.queued, 0);
 assert.match(battle.session.lastError, /合法操作/);
 battle.noteHuman({packs, state, action:legal[0], replayIndex:0, legal});
 assert.equal(battle.queued, 1);
 assert.equal(battle.retractLast(), true);
 assert.equal(battle.queued, 0);
 assert.equal(battle.session.humanStep, 0);
});

test('a dropped upload is retried once and the same client key is not stored twice', async()=>{
 const body={clientKey:'m'+'c'.repeat(32)+':0:human', format:'ua-v2-coach-step-v2', step:0};
 let now=0;
 let attempts=0;
 const timers=[];
 const queue=createDecisionQueue({
  storage:memoryStorage(),
  consent:()=>true,
  now:()=>now,
  schedule(fn){timers.push(fn);return timers.length;},
  async send(){
   attempts++;
   if(attempts===1)return {ok:false, status:0};
   return {ok:true};
  }
 });
 queue.start();
 assert.deepEqual(queue.enqueue(body), {queued:true, bytes:JSON.stringify(body).length});
 assert.equal(queue.enqueue(body).skipped, 'queued');
 await queue.flushNow();
 assert.equal(attempts, 1);
 assert.equal(queue.length, 1);
 now=60000;
 await queue.flushNow();
 assert.equal(attempts, 2);
 assert.equal(queue.length, 0);
});

test('a rejected row is skipped so the next match can upload', async()=>{
 const matchA='m'+'a'.repeat(32);
 const matchB='m'+'b'.repeat(32);
 const stepA0={clientKey:matchA+':0:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:0};
 const stepA1={clientKey:matchA+':1:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:1};
 const labelA={clientKey:matchA+':label:life-zero', format:'ua-v2-coach-label-v2', matchId:matchA, endReason:'life-zero'};
 const stepB={clientKey:matchB+':0:human', format:'ua-v2-coach-step-v2', matchId:matchB, step:0};
 const sent=[];
 const queue=createDecisionQueue({
  storage:memoryStorage(),
  consent:()=>true,
  schedule(){return 1;},
  async send(body){
   sent.push(body.clientKey);
   if(body.matchId===matchA&&String(body.format).includes('step'))
    return {ok:false, status:409, data:{error:'步驟順序不連續。'}};
   return {ok:true};
  }
 });
 queue.start();
 queue.enqueue(stepA0);
 queue.enqueue(stepA1);
 queue.enqueue(labelA);
 queue.enqueue(stepB);
 await queue.flushNow();
 assert.deepEqual(sent, [stepA0.clientKey, labelA.clientKey, stepB.clientKey]);
 assert.equal(queue.length, 0);
 assert.equal(queue.dropped, 2);
 assert.match(queue.lastError, /步驟順序不連續/);
});

test('a saved rejection no longer blocks rows that were queued behind it', async()=>{
 const matchA='m'+'c'.repeat(32);
 const matchB='m'+'d'.repeat(32);
 const stuck={
  clientKey:matchA+':0:human',
  body:{clientKey:matchA+':0:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:0},
  attempts:1, bytes:20, holdUntil:Date.now()+60000, lastStatus:409, lastError:'步驟順序不連續。'
 };
 const next={
  clientKey:matchB+':0:human',
  body:{clientKey:matchB+':0:human', format:'ua-v2-coach-step-v2', matchId:matchB, step:0},
  attempts:0, bytes:20, holdUntil:0
 };
 const storage=memoryStorage({'ua-v2-coach-queue-v1':JSON.stringify([stuck, next])});
 const sent=[];
 const queue=createDecisionQueue({
  storage,
  consent:()=>true,
  schedule(){return 1;},
  async send(body){sent.push(body.clientKey);return {ok:true};}
 });
 queue.start();
 await queue.flushNow();
 assert.deepEqual(sent, [next.clientKey]);
 assert.equal(queue.length, 0);
 assert.equal(queue.dropped, 1);
});

test('a network failure still holds the rows behind it', async()=>{
 const first={clientKey:'m'+'1'.repeat(32)+':0:human', format:'ua-v2-coach-step-v2', matchId:'m'+'1'.repeat(32)};
 const second={clientKey:'m'+'2'.repeat(32)+':0:human', format:'ua-v2-coach-step-v2', matchId:'m'+'2'.repeat(32)};
 let attempts=0;
 const queue=createDecisionQueue({
  storage:memoryStorage(),
  consent:()=>true,
  schedule(){return 1;},
  async send(){attempts++;return {ok:false, status:0};}
 });
 queue.start();
 queue.enqueue(first);
 queue.enqueue(second);
 await queue.flushNow();
 assert.equal(attempts, 1);
 assert.equal(queue.length, 2);
 assert.equal(queue.dropped, 0);
});

test('undo cannot retract a row that is already being uploaded', async()=>{
 const match='m'+'e'.repeat(32);
 const first={clientKey:match+':0:human', format:'ua-v2-coach-step-v2', matchId:match, step:0};
 const second={clientKey:match+':1:human', format:'ua-v2-coach-step-v2', matchId:match, step:1};
 let calls=0;
 let release;
 const sent=[];
 const queue=createDecisionQueue({
  storage:memoryStorage(),
  consent:()=>true,
  schedule(){return 1;},
  send(body){
   sent.push(body.clientKey);
   calls++;
   if(calls===1)return new Promise(resolve=>{release=()=>resolve({ok:true});});
   return Promise.resolve({ok:true});
  }
 });
 queue.start();
 queue.enqueue(first);
 queue.enqueue(second);
 const flushing=queue.flushNow();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(queue.drop(first.clientKey), false);
 release();
 await flushing;
 assert.deepEqual(sent, [first.clientKey, second.clientKey]);
 assert.equal(queue.length, 0);
});

test('an unconfirmed or other-account row stays queued and does not block the signed-in account', async()=>{
 const matchA='m'+'a'.repeat(32);
 const matchB='m'+'b'.repeat(32);
 const unknown={clientKey:matchA+':0:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:0};
 const theirs={clientKey:matchB+':0:human', format:'ua-v2-coach-step-v2', matchId:matchB, step:0, accountId:OTHER};
 const mine={clientKey:matchA+':1:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:1, accountId:ME};
 const sent=[];
 let who=OTHER;
 const queue=createDecisionQueue({
  storage:memoryStorage(),
  consent:()=>true,
  account(){return who;},
  schedule(){return 1;},
  async send(body){sent.push(body.clientKey);return {ok:true};}
 });
 queue.start();
 queue.enqueue(unknown);
 queue.enqueue(theirs);
 queue.enqueue(mine);
 await queue.flushNow();
 assert.deepEqual(sent, [theirs.clientKey]);
 assert.equal(queue.length, 2);
 assert.equal(queue.paused(OTHER), 2);
 who=ME;
 await queue.flushNow();
 assert.deepEqual(sent, [theirs.clientKey, mine.clientKey]);
 assert.equal(queue.length, 1);
 assert.equal(queue.paused(ME), 1);
 who=null;
 await queue.flushNow();
 assert.deepEqual(sent, [theirs.clientKey, mine.clientKey]);
 assert.equal(queue.length, 1);
 assert.equal(queue.dropped, 0);
});

test('a row is not sent when the account changes between the check and the upload', async()=>{
 const body={clientKey:'m'+'f'.repeat(32)+':0:human', format:'ua-v2-coach-step-v2', accountId:ME};
 let checks=0;
 const sent=[];
 const queue=createDecisionQueue({
  storage:memoryStorage(),
  consent:()=>true,
  account(){checks++;return checks===1?ME:OTHER;},
  schedule(){return 1;},
  async send(item){sent.push(item.accountId);return {ok:true};}
 });
 queue.start();
 queue.enqueue(body);
 await queue.flushNow();
 assert.deepEqual(sent, []);
 assert.equal(queue.length, 1);
 assert.equal(queue.dropped, 0);
});

test('a 403 keeps the row instead of dropping it', async()=>{
 const body={clientKey:'m'+'9'.repeat(32)+':0:human', format:'ua-v2-coach-step-v2', accountId:ME};
 const queue=createDecisionQueue({
  storage:memoryStorage(),
  consent:()=>true,
  account(){return ME;},
  schedule(){return 1;},
  async send(){return {ok:false, status:403, data:{error:'這筆紀錄屬於另一個帳號，已暫停上傳。'}};}
 });
 queue.start();
 queue.enqueue(body);
 await queue.flushNow();
 assert.equal(queue.length, 1);
 assert.equal(queue.dropped, 0);
 assert.match(queue.lastError, /另一個帳號/);
});

test('turning consent off drops an upload that is already in flight', async()=>{
 const body={clientKey:'m'+'d'.repeat(32)+':0:human', format:'ua-v2-coach-step-v2'};
 let release;
 const queue=createDecisionQueue({
  storage:consented(),
  consent:()=>true,
  schedule(){return 1;},
  send:()=>new Promise(resolve=>{release=()=>resolve({ok:true});})
 });
 queue.start();
 queue.enqueue(body);
 const flushing=queue.flushNow();
 await new Promise(resolve=>setImmediate(resolve));
 const discarded=queue.discard();
 assert.equal(discarded.length, 1);
 release();
 await flushing;
 assert.equal(queue.length, 0);
});

test('two open queues keep each account record when adds and uploads interleave', async()=>{
 const storage=memoryStorage();
 const matchA='m'+'a'.repeat(32);
 const matchB='m'+'b'.repeat(32);
 const first={clientKey:matchA+':0:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:0, accountId:ME};
 const second={clientKey:matchA+':1:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:1, accountId:ME};
 const other={clientKey:matchB+':0:human', format:'ua-v2-coach-step-v2', matchId:matchB, step:0, accountId:OTHER};
 const sameKey={...first, accountId:OTHER, matchId:matchB, step:0};
 const addedDuringUpload={clientKey:matchB+':1:human', format:'ua-v2-coach-step-v2', matchId:matchB, step:1, accountId:OTHER};
 let who=ME;
 const sent=[];
 let release;
 function open(){
  return createDecisionQueue({
   storage,
   consent:()=>true,
   account(){return who;},
   schedule(){return 1;},
   send(body){
    sent.push(body.accountId+':'+body.clientKey);
    if(body.accountId===ME&&body.clientKey===first.clientKey)
     return new Promise(resolve=>{release=()=>resolve({ok:true});});
    return Promise.resolve({ok:true});
   }
  });
 }
 const tab1=open();
 const tab2=open();
 tab1.start();
 tab2.start();
 assert.equal(tab1.enqueue(first).queued, true);
 assert.equal(tab2.enqueue(other).queued, true);
 assert.equal(tab1.enqueue(second).queued, true);
 assert.equal(tab2.enqueue(first).skipped, 'queued');
 assert.equal(tab2.enqueue(sameKey).queued, true);
 const loaded=readStoredQueue(storage).map(item=>item.body.accountId+':'+item.clientKey);
 assert.deepEqual(loaded, [
  ME+':'+first.clientKey,
  OTHER+':'+other.clientKey,
  ME+':'+second.clientKey,
  OTHER+':'+sameKey.clientKey
 ]);
 const reloadedBeforeUpload=open();
 assert.equal(reloadedBeforeUpload.length, 4);
 const flushing=tab1.flushNow();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(tab2.enqueue(second).skipped, 'queued');
 assert.equal(tab2.enqueue(addedDuringUpload).queued, true);
 release();
 await flushing;
 assert.deepEqual(sent.filter(item=>item.startsWith(ME+':')), [ME+':'+first.clientKey, ME+':'+second.clientKey]);
 const afterUpload=readStoredQueue(storage).map(item=>item.body.accountId+':'+item.clientKey);
 assert.deepEqual(afterUpload, [
  OTHER+':'+other.clientKey,
  OTHER+':'+sameKey.clientKey,
  OTHER+':'+addedDuringUpload.clientKey
 ]);
 storage.setItem('ua-v2-coach-queue-v1', JSON.stringify([
  {clientKey:first.clientKey, body:first, attempts:0, bytes:1, holdUntil:0},
  ...JSON.parse(storage.getItem('ua-v2-coach-queue-v1'))
 ]));
 const reloaded=open();
 assert.equal(reloaded.length, 3);
 who=OTHER;
 await tab2.flushNow();
 assert.deepEqual(sent.filter(item=>item.startsWith(OTHER+':')), [
  OTHER+':'+other.clientKey,
  OTHER+':'+sameKey.clientKey,
  OTHER+':'+addedDuringUpload.clientKey
 ]);
 assert.equal(reloaded.length, 0);
 await tab1.flushNow();
 assert.equal(JSON.parse(storage.getItem('ua-v2-coach-queue-v1')).length, 0);
});

test('a legacy queue migrates owned rows and keeps an unknown row paused', async()=>{
 const matchA='m'+'c'.repeat(32);
 const matchB='m'+'d'.repeat(32);
 const unknown={
  clientKey:matchA+':0:human',
  body:{clientKey:matchA+':0:human', format:'ua-v2-coach-step-v2', matchId:matchA, step:0},
  attempts:0, bytes:10, holdUntil:0
 };
 const mine={
  clientKey:matchB+':0:human',
  body:{clientKey:matchB+':0:human', format:'ua-v2-coach-step-v2', matchId:matchB, step:0, accountId:ME},
  attempts:0, bytes:10, holdUntil:0
 };
 const storage=memoryStorage({'ua-v2-coach-queue-v1':JSON.stringify([unknown, mine])});
 const sent=[];
 const queue=createDecisionQueue({
  storage,
  consent:()=>true,
  account(){return ME;},
  schedule(){return 1;},
  async send(body){sent.push(body.clientKey);return {ok:true};}
 });
 queue.start();
 await queue.flushNow();
 assert.deepEqual(sent, [mine.clientKey]);
 assert.equal(queue.length, 1);
 assert.equal(queue.paused(ME), 1);
 const again=createDecisionQueue({
  storage,
  consent:()=>true,
  account(){return ME;},
  schedule(){return 1;},
  async send(){return {ok:true};}
 });
 assert.equal(again.length, 1);
 const pausedRow=readStoredQueue(storage)[0];
 assert.equal(pausedRow.clientKey, unknown.clientKey);
 assert.equal(pausedRow.body.accountId, undefined);
 assert.equal(storage.getItem('ua-v2-coach-queue-v1'), '[]');
});

test('a partial migration keeps the unsent row and dedups it after space is freed', async()=>{
 const match='m'+'e'.repeat(32);
 const firstBody={clientKey:match+':0:human', format:'ua-v2-coach-step-v2', matchId:match, step:0, accountId:ME};
 const secondBody={clientKey:match+':1:human', format:'ua-v2-coach-step-v2', matchId:match, step:1, accountId:ME};
 const seed=[
  {clientKey:firstBody.clientKey, body:firstBody, attempts:0, bytes:10, holdUntil:0},
  {clientKey:secondBody.clientKey, body:secondBody, attempts:0, bytes:10, holdUntil:0}
 ];
 const data=new Map([['ua-v2-coach-queue-v1', JSON.stringify(seed)]]);
 let itemWrites=0;
 let open=false;
 const storage={
  getItem(key){return data.has(key)?data.get(key):null;},
  setItem(key, value){
   const name=String(key);
   if(!open&&name.startsWith('ua-v2-coach-queue-v1/item/')){
    itemWrites+=1;
    if(itemWrites>1)throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
   }
   data.set(name, String(value));
  },
  removeItem(key){data.delete(String(key));},
  get length(){return data.size;},
  key(index){return [...data.keys()][index]??null;}
 };
 const sent=[];
 function openQueue(){
  return createDecisionQueue({
   storage,
   consent:()=>true,
   account:()=>ME,
   schedule(){return 1;},
   async send(body){
    const key=body.accountId+':'+body.clientKey;
    if(sent.includes(key))return {ok:true, duplicate:true};
    sent.push(key);
    return {ok:true};
   }
  });
 }
 const queue=openQueue();
 queue.start();
 await queue.flushNow();
 await queue.flushNow();
 assert.deepEqual(sent, [ME+':'+firstBody.clientKey]);
 assert.notEqual(storage.getItem('ua-v2-coach-queue-v1/migrated'), '1');
 const legacy=JSON.parse(storage.getItem('ua-v2-coach-queue-v1'));
 assert.equal(legacy.length, 1);
 assert.equal(legacy[0].body.clientKey, secondBody.clientKey);
 assert.equal(legacy[0].body.step, 1);
 let copied=0;
 for(let index=0;index<storage.length;index++){
  const key=storage.key(index);
  if(key.startsWith('ua-v2-coach-queue-v1/item/')&&String(storage.getItem(key)).includes(secondBody.clientKey))copied+=1;
 }
 assert.equal(copied, 0);
 const reloaded=openQueue();
 reloaded.start();
 assert.equal(reloaded.length, 1);
 assert.equal(readStoredQueue(storage)[0].body.accountId, ME);
 assert.equal(readStoredQueue(storage)[0].body.clientKey, secondBody.clientKey);
 open=true;
 await reloaded.flushNow();
 assert.deepEqual(sent, [ME+':'+firstBody.clientKey, ME+':'+secondBody.clientKey]);
 assert.equal(storage.getItem('ua-v2-coach-queue-v1/migrated'), '1');
 assert.equal(storage.getItem('ua-v2-coach-queue-v1'), '[]');
 assert.equal(reloaded.length, 0);
 const again=openQueue();
 again.start();
 assert.equal(again.enqueue(firstBody).queued, true);
 await again.flushNow();
 assert.deepEqual(sent, [ME+':'+firstBody.clientKey, ME+':'+secondBody.clientKey]);
 assert.equal(again.length, 0);
});

test('a new record that cannot be stored is not reported as queued', async()=>{
 const header=headerFor();
 const data=new Map([[COACH_CONSENT_KEY, '1']]);
 let open=false;
 const storage={
  getItem(key){return data.has(key)?data.get(key):null;},
  setItem(key, value){
   if(!open&&String(key).startsWith('ua-v2-coach-queue-v1'))
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
   data.set(String(key), String(value));
  },
  removeItem(key){data.delete(String(key));},
  get length(){return data.size;},
  key(index){return [...data.keys()][index]??null;}
 };
 const timers=[];
 const state=opening();
 const action=keepAction(state);
 const played=dispatchUniversalAction(packs, state, action, {actor:0});
 const battle=createCoachBattle({
  storage,
  schedule(fn){timers.push(fn);return timers.length;},
  fetchImpl:async()=>meBody()
 });
 await battle.begin(header, ME);
 const scheduled=timers.length;
 const started=performance.now();
 battle.noteHuman({packs, state, action, replayIndex:0, legal:legalUniversalActions(packs, state)});
 assert.ok(performance.now()-started<100);
 assert.notEqual(played, state);
 assert.equal(battle.session.humanStep, 1);
 assert.equal(battle.queued, 0);
 assert.equal(battle.session.lastError, '紀錄尚未儲存');
 assert.equal(readStoredQueue(storage).length, 0);
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs', import.meta.url), 'utf8');
 const online=readFileSync(new URL('../dist/online.mjs', import.meta.url), 'utf8');
 assert.match(preview, /session\?\.lastError==='紀錄尚未儲存'/);
 assert.match(online, /log\.lastError==='紀錄尚未儲存'/);
 const follow=legalUniversalActions(packs, played);
 if(universalActor(played)===0&&follow.length){
  battle.noteHuman({packs, state:played, action:follow[0], replayIndex:1, legal:follow});
  assert.equal(battle.session.humanStep, 2);
  assert.equal(battle.queued, 0);
  assert.equal(battle.session.lastError, '紀錄尚未儲存');
 }
 assert.ok(timers.length>scheduled);
 open=true;
 await timers[scheduled]();
 assert.equal(battle.session.lastError, '');
 const stored=readStoredQueue(storage);
 assert.equal(stored.length, battle.session.humanStep);
 assert.deepEqual(stored.map(item=>item.body.step), stored.map((_, index)=>index));
 assert.equal(stored[0].body.accountId, ME);
 assert.equal(stored[0].body.clientKey, header.matchId+':0:human');
});

test('a held write lock does not block play and both accounts finish in order', async()=>{
 const storage=memoryStorage({[COACH_CONSENT_KEY]:'1'});
 const header=headerFor();
 const battle=createCoachBattle({
  storage,
  schedule(){return 1;},
  fetchImpl:async()=>meBody()
 });
 await battle.begin(header, ME);
 const otherMatch='m'+'g'.repeat(32);
 const otherBody={clientKey:otherMatch+':0:human', format:'ua-v2-coach-step-v2', matchId:otherMatch, step:0, accountId:OTHER};
 const sameMatch={clientKey:header.matchId+':1:human', format:'ua-v2-coach-step-v2', matchId:header.matchId, step:1, accountId:ME};
 const holder=createDecisionQueue({
  storage,
  consent:()=>true,
  schedule(){return 1;},
  async send(){return {ok:true};}
 });
 let release;
 let opened;
 const held=holder.exclusive(async()=>{
  opened();
  await new Promise(resolve=>{release=resolve;});
 });
 await new Promise(resolve=>{opened=resolve;});
 const state=opening();
 const action=keepAction(state);
 const started=performance.now();
 const played=dispatchUniversalAction(packs, state, action, {actor:0});
 const pending=battle.noteHuman({packs, state, action, replayIndex:0, legal:legalUniversalActions(packs, state)});
 const other=holder.enqueue(otherBody);
 const follow=holder.enqueue(sameMatch);
 const elapsed=performance.now()-started;
 let playSaved=false;
 Promise.resolve(pending).then(()=>{playSaved=true;});
 assert.ok(played&&played!==state);
 assert.ok(elapsed<200, '出牌等待了 '+elapsed+' ms');
 assert.equal(other.pending, true);
 assert.equal(follow.pending, true);
 assert.equal(battle.session.humanStep, 1);
 assert.equal(battle.queued, 0);
 assert.equal(battle.session.lastError, '');
 await new Promise(resolve=>setTimeout(resolve, 40));
 assert.equal(playSaved, false);
 assert.equal(readStoredQueue(storage).length, 0);
 release();
 await held;
 await pending;
 await other.done;
 await follow.done;
 const stored=readStoredQueue(storage).map(item=>item.body.accountId+':'+item.body.step+':'+item.body.clientKey);
 assert.deepEqual(stored, [
  ME+':0:'+header.matchId+':0:human',
  OTHER+':0:'+otherBody.clientKey,
  ME+':1:'+sameMatch.clientKey
 ]);
 assert.equal(battle.session.lastError, '');
 const sent=[];
 const sender=createDecisionQueue({
  storage,
  consent:()=>true,
  account:()=>ME,
  schedule(){return 1;},
  async send(body){
   const key=body.accountId+':'+body.clientKey;
   if(sent.includes(key))return {ok:true, duplicate:true};
   sent.push(key);
   return {ok:true};
  }
 });
 sender.start();
 await sender.flushNow();
 assert.deepEqual(sent, [ME+':'+header.matchId+':0:human', ME+':'+sameMatch.clientKey]);
 storage.setItem('ua-v2-coach-queue-v1', JSON.stringify([
  {clientKey:header.matchId+':0:human', body:{
   clientKey:header.matchId+':0:human', accountId:ME, step:0, matchId:header.matchId,
   format:'ua-v2-coach-step-v2'
  }, attempts:0, bytes:1, holdUntil:0}
 ]));
 const stale=createDecisionQueue({
  storage,
  consent:()=>true,
  account:()=>ME,
  schedule(){return 1;},
  async send(body){sent.push('again:'+body.clientKey);return {ok:true};}
 });
 assert.equal(stale.length, 1);
 assert.equal(readStoredQueue(storage)[0].body.accountId, OTHER);
 await stale.flushNow();
 assert.equal(sent.some(item=>String(item).startsWith('again:')), false);
});

test('a browser lock that is still held does not write when the wait expires', async()=>{
 const storage=memoryStorage();
 let grant;
 const locks={
  request(name, fn){
   assert.equal(name, 'ua-v2-coach-queue-v1');
   return new Promise(resolve=>{
    grant=()=>Promise.resolve(fn()).then(resolve, resolve);
   });
  }
 };
 const body={clientKey:'m'+'h'.repeat(32)+':0:human', format:'ua-v2-coach-step-v2', matchId:'m'+'h'.repeat(32), step:0, accountId:ME};
 const queue=createDecisionQueue({
  storage,
  consent:()=>true,
  locks,
  schedule(){return 1;},
  async send(){return {ok:true};}
 });
 const started=performance.now();
 const pending=queue.enqueue(body);
 assert.ok(performance.now()-started<100);
 assert.equal(pending.pending, true);
 await new Promise(resolve=>setTimeout(resolve, 40));
 assert.equal(readStoredQueue(storage).length, 0);
 assert.equal(typeof grant, 'function');
 await grant();
 assert.equal((await pending.done).queued, true);
 assert.equal(readStoredQueue(storage)[0].body.clientKey, body.clientKey);
});

test('a late write does not retarget the match that replaced it', async()=>{
 const storage=consented();
 const header=headerFor();
 const battle=createCoachBattle({
  storage,
  schedule(){return 1;},
  fetchImpl:async()=>meBody()
 });
 await battle.begin(header, ME);
 const holder=createDecisionQueue({
  storage,
  consent:()=>true,
  schedule(){return 1;},
  async send(){return {ok:true};}
 });
 let release;
 let opened;
 const held=holder.exclusive(async()=>{
  opened();
  await new Promise(resolve=>{release=resolve;});
 });
 await new Promise(resolve=>{opened=resolve;});
 const state=opening();
 const legal=legalUniversalActions(packs, state);
 const pending=battle.noteHuman({packs, state, action:legal[0], replayIndex:0, legal});
 const other=headerFor();
 await battle.begin(other, ME);
 release();
 await held;
 await pending;
 assert.equal(battle.session.matchId, other.matchId);
 assert.equal(battle.session.humanStep, 0);
 assert.deepEqual(readStoredQueue(storage).map(item=>item.body.matchId+':'+item.body.step), [header.matchId+':0']);
});

test('undo cannot retract a human step that is already being uploaded', async()=>{
 const header=headerFor();
 const state=opening();
 const legal=legalUniversalActions(packs, state);
 let release;
 const battle=createCoachBattle({
  storage:consented(),
  schedule(){return 1;},
  fetchImpl(path){
   if(String(path).includes('/api/me'))return Promise.resolve(meBody());
   return new Promise(resolve=>{
    release=()=>resolve({ok:true, status:200, json:async()=>({duplicate:false})});
   });
  }
 });
 await battle.begin(header, ME);
 battle.noteHuman({packs, state, action:legal[0], replayIndex:0, legal});
 const flushing=battle.flush();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(battle.retractLast(), false);
 assert.equal(battle.session.humanStep, 1);
 assert.equal(battle.queued, 1);
 release();
 await flushing;
 assert.equal(battle.session.humanStep, 1);
 assert.equal(battle.session.confirmedThrough, 1);
});

test('reloading the same match drops the interrupt label before it can upload', async()=>{
 const header=headerFor();
 const paths=[];
 const storage=consented();
 const battle=createCoachBattle({
  storage,
  schedule(){return 1;},
  fetchImpl:async path=>{
   paths.push(path);
   return path==='/api/me'?meBody():{ok:true, json:async()=>({})};
  }
 });
 await battle.begin(header);
 await battle.finish({completed:false, winner:null, endReason:'interrupted', holdMs:4000, review:false, replay:{format:'ua-universal-v2-preview', version:1, seed:1, actions:[]}});
 assert.equal(battle.queued, 1);
 assert.equal(paths.includes('/api/coach/debug-replays'), false);
 const saved=battle.snapshot();
 const resumed=createCoachBattle({
  storage,
  schedule(){return 1;},
  fetchImpl:async path=>{
   paths.push('resume:'+path);
   return path==='/api/me'?meBody():{ok:true, json:async()=>({})};
  }
 });
 await resumed.restore({...saved, finished:false, label:null}, header);
 assert.equal(resumed.queued, 0);
 assert.equal(paths.some(path=>String(path).includes('/api/coach/labels')), false);
});

test('the battle page records a decision only after the engine accepts it', ()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs', import.meta.url), 'utf8');
 const online=readFileSync(new URL('../dist/online.mjs', import.meta.url), 'utf8');
 assert.equal([...preview.matchAll(/rememberHuman\(/g)].length, 2);
 assert.match(preview, /dispatchUniversalAction\(app\.packs,app\.state,a,\{actor:0\}\);[\s\S]{0,180}rememberHuman\(a,previous,replayIndex,legal\)/);
 assert.match(preview, /endReason:'abandoned'/);
 assert.match(preview, /endReason:'interrupted'/);
 assert.match(online, /提供對戰紀錄改善 AI/);
 assert.match(online, /if\(!choice\)return;\s*decisions\(\)\.arm/);
 assert.match(online, /if\(error\.status\)decisions\(\)\.cancel\(\)/);
 assert.match(readFileSync(new URL('../dist/universal-v2-preview.html', import.meta.url), 'utf8'), /提供對戰紀錄改善 AI/);
});

test('an online collector records only the consented player own accepted action', async()=>{
 const hostStorage=consented();
 const guestStorage=consented();
 const posted=[];
 function collector(storage, consent=true){
  if(consent)storage.setItem(COACH_CONSENT_KEY, '1');
  else storage.removeItem(COACH_CONSENT_KEY);
  return createOnlineCollector({
   storage,
   schedule(){return 1;},
   deckById:()=>({title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}}),
   fetchImpl:async(path, options)=>{
    if(path==='/api/me')return meBody();
    posted.push({path, body:JSON.parse(options.body)});
    return {ok:true, json:async()=>({duplicate:false})};
   }
  });
 }
 const host=collector(hostStorage);
 const guest=collector(guestStorage);
 host.start();
 guest.start();
 const room={
  code:'ABCD2345', revision:3, seat:0, accountId:ME, yourTurn:true, status:'playing',
  you:{deckId:'d0123456789abcde'},
  view:{
   playerTitles:['bleach', 'bleach'], status:'playing', phase:'setup', turn:0, active:0, actor:0,
   players:[
    {hand:[{uid:'0-1', cardId:'BLC-1-034', name:'hidden-name'}], handCount:1, lifeCount:0, deckCount:40, front:[], energy:[]},
    {hand:null, handCount:7, lifeCount:0, deckCount:43, front:[], energy:[]}
   ]
  },
  choices:[{index:0, type:'openingMulligan', mode:'keep', label:'保留'}, {index:1, type:'openingMulligan', mode:'redraw', label:'重抽'}]
 };
 assert.equal(host.arm(room, {index:9, type:'openingMulligan', mode:'keep'}), false);
 assert.equal(host.arm(room, room.choices[0]), true);
 await host.settle({...room, revision:3});
 assert.equal(host.queued, 0);
 const jumped=collector(memoryStorage());
 jumped.start();
 assert.equal(jumped.arm(room, room.choices[0]), true);
 await jumped.settle({...room, revision:5});
 assert.equal(jumped.queued, 0);
 await host.settle({...room, revision:4, yourTurn:false, choices:[]});
 assert.equal(host.queued, 1);
 const body=readStoredQueue(hostStorage)[0].body;
 assert.equal(body.accountId, ME);
 assert.equal(body.source, 'human');
 assert.equal(body.actor, 'human');
 assert.equal(body.seat, 0);
 assert.equal(body.channel, 'online');
 assert.equal(body.decisionClass, 'mulligan');
 assert.equal(body.engineRevision, 3);
 assert.equal(body.observation.visible.players[1].hand, null);
 assert.deepEqual(body.observation.visible.players[0].hand, [{uid:'0-1', cardId:'BLC-1-034'}]);
 assert.equal(JSON.stringify(body).includes('"seed"'), false);
 await guest.settle({...room, revision:4, seat:1, yourTurn:true});
 assert.equal(guest.queued, 0);
 const quiet=collector(memoryStorage(), false);
 assert.equal(quiet.arm(room, room.choices[0]), false);
 await quiet.settle({...room, revision:4});
 assert.equal(quiet.queued, 0);
 await host.flush();
 assert.equal(posted.length, 1);
 await host.settle({...room, revision:4, yourTurn:false, choices:[]});
 assert.equal(posted.length, 1);
 host.setConsent(false);
 assert.equal(host.queued, 0);
});

let ctx;
async function listen(handler){
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0, '127.0.0.1', resolve));
 return {server, base:'http://127.0.0.1:'+server.address().port, handler};
}
async function api(path, {method='GET', token, body}={}){
 const response=await fetch(ctx.base+path, {
  method,
  headers:{
   ...(body!==undefined?{'content-type':'application/json'}:{}),
   ...(token?{authorization:'Bearer '+token}:{})
  },
  body:body!==undefined?JSON.stringify(body):undefined
 });
 const text=await response.text();
 let data=null;
 try{data=text?JSON.parse(text):null;}catch{data={raw:text};}
 return {status:response.status, data, text, headers:response.headers};
}

before(async()=>{
 const dir=await mkdtemp(join(tmpdir(), 'ua-decision-'));
 const started=await listen(await createHandler({dataFile:join(dir, 'store.sqlite'), staticRoot:null}));
 ctx={...started, dir};
});
after(async()=>{
 if(!ctx)return;
 await new Promise(resolve=>ctx.server.close(resolve));
 ctx.handler.close();
 await rm(ctx.dir, {recursive:true, force:true});
});

test('uploaded decisions stay owned, deduped, exportable and deletable', {timeout:180000}, async()=>{
 const host=await api('/api/register', {method:'POST', body:{username:'決策甲', password}});
 const guest=await api('/api/register', {method:'POST', body:{username:'決策乙', password}});
 assert.equal(host.status, 201, host.text);
 const hostDeck=await api('/api/decks', {method:'POST', token:host.data.token, body:{
  name:'房主', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'decision-host'}});
 const guestDeck=await api('/api/decks', {method:'POST', token:guest.data.token, body:{
  name:'訪客', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'decision-guest'}});
 assert.equal(hostDeck.data.deck.playable, true, JSON.stringify(hostDeck.data.deck.issues));
 const created=await api('/api/rooms', {method:'POST', token:host.data.token, body:{deckId:hostDeck.data.deck.id, first:'me'}});
 const joined=await api('/api/rooms/'+created.data.code+'/join', {method:'POST', token:guest.data.token, body:{deckId:guestDeck.data.deck.id}});
 assert.equal(joined.status, 200, joined.text);
 const hostView=await api('/api/rooms/'+created.data.code, {token:host.data.token});
 const guestView=await api('/api/rooms/'+created.data.code, {token:guest.data.token});
 const posted=[];
 const hostLog=createOnlineCollector({
  storage:consented(),
  schedule(){return 1;},
  deckById:()=>({title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}}),
  fetchImpl:async(path, options)=>{
   const response=await fetch(ctx.base+path, {
    method:options.method||'GET',
    headers:{accept:'application/json',...(options.headers||{}), authorization:'Bearer '+host.data.token},
    body:options.body
   });
   const data=await response.json().catch(()=>null);
   if(path!=='/api/me')posted.push({path, status:response.status, data, body:JSON.parse(options.body)});
   return {ok:response.ok, status:response.status, json:async()=>data};
  }
 });
 const guestLog=createOnlineCollector({
  storage:memoryStorage(),
  schedule(){return 1;},
  deckById:()=>({title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}}),
  fetchImpl:async()=>{throw Error('未同意的玩家不應該上傳');}
 });
 hostLog.start();
 guestLog.start();
 assert.equal(guestLog.arm(guestView.data, guestView.data.choices[0]||{index:0}), false);
 assert.equal(hostLog.arm(hostView.data, hostView.data.choices[0]), true);
 const acted=await api('/api/rooms/'+created.data.code+'/actions', {method:'POST', token:host.data.token, body:{index:0}});
 assert.equal(acted.status, 200, acted.text);
 await hostLog.settle(acted.data);
 await guestLog.settle(await (await api('/api/rooms/'+created.data.code, {token:guest.data.token})).data);
 assert.equal(hostLog.queued, 1);
 assert.equal(guestLog.queued, 0);
 await hostLog.flush();
 assert.equal(posted[0].status, 200, JSON.stringify(posted[0].data));
 assert.equal(posted[0].data.duplicate, false);
 const hostMe=await api('/api/me', {token:host.data.token});
 assert.equal(posted[0].body.accountId, hostMe.data.id);
 const stolen=await api('/api/coach/steps', {method:'POST', token:guest.data.token, body:posted[0].body});
 assert.equal(stolen.status, 403);
 const guestList=await api('/api/coach/matches', {token:guest.data.token});
 assert.equal(guestList.data.matches.length, 0);
 const bare=structuredClone(posted[0].body);
 delete bare.accountId;
 const missing=await api('/api/coach/steps', {method:'POST', token:host.data.token, body:bare});
 assert.equal(missing.status, 403);
 const hostList=await api('/api/coach/matches', {token:host.data.token});
 assert.equal(hostList.data.matches.length, 1);
 const again=await hostLog.flush();
 void again;
 const replay=await api('/api/coach/steps', {method:'POST', token:host.data.token, body:posted[0].body});
 assert.equal(replay.status, 200, replay.text);
 assert.equal(replay.data.duplicate, true);
 const changed=structuredClone(posted[0].body);
 changed.publicHistory=[...(changed.publicHistory||[]), {kind:'note', name:'different'}];
 const conflict=await api('/api/coach/steps', {method:'POST', token:host.data.token, body:changed});
 assert.equal(conflict.status, 409);
 const leaked=structuredClone(posted[0].body);
 leaked.step=1;
 leaked.clientKey=leaked.matchId+':r9:human';
 leaked.engineRevision=9;
 leaked.observation.visible.players[1].hand=[{uid:'1-9', cardId:'BLC-1-067'}];
 const rejected=await api('/api/coach/steps', {method:'POST', token:host.data.token, body:leaked});
 assert.equal(rejected.status, 400);
 const machine=structuredClone(posted[0].body);
 machine.step=1;
 machine.clientKey=machine.matchId+':r8:human';
 machine.engineRevision=8;
 machine.actor='ai';
 machine.source='ai';
 const aiRejected=await api('/api/coach/steps', {method:'POST', token:host.data.token, body:machine});
 assert.equal(aiRejected.status, 400);
 const badEnd=await api('/api/coach/labels', {method:'POST', token:host.data.token, body:{
  ...posted[0].body, format:'ua-v2-coach-label-v2', completed:false, winner:0, endReason:'interrupted'
 }});
 assert.equal(badEnd.status, 400);
 const ended=await api('/api/coach/labels', {method:'POST', token:host.data.token, body:{
  ...posted[0].body, format:'ua-v2-coach-label-v2', completed:false, winner:null, endReason:'interrupted'
 }});
 assert.equal(ended.status, 200, ended.text);
 const debug=makeUniversalPreviewReplay(packs, {decks:[deck.counts, deck.counts], seed:8675309, first:0, openingMulligan:true});
 const storedDebug=await api('/api/coach/debug-replays', {method:'POST', token:host.data.token, body:{accountId:posted[0].body.accountId, header:posted[0].body, replay:debug}});
 assert.equal(storedDebug.status, 200, storedDebug.text);
 const guestExport=await api('/api/coach/export.jsonl', {token:guest.data.token});
 assert.equal(guestExport.status, 200);
 assert.equal(guestExport.headers.get('content-type').includes('application/x-ndjson'), true);
 assert.equal(guestExport.text.includes('decision'), false);
 const exported=await api('/api/coach/export.jsonl', {token:host.data.token});
 assert.equal(exported.headers.get('content-disposition').includes('ua-v2-decisions.jsonl'), true);
 const lines=exported.text.trim().split('\n').map(line=>JSON.parse(line));
 assert.equal(lines[0].record, 'manifest');
 assert.equal(lines[1].record, 'decision');
 assert.equal(lines[1].source, 'human');
 assert.equal(lines[1].actor, 'human');
 assert.equal(lines.at(-1).record, 'result');
 assert.equal(lines.at(-1).endReason, 'interrupted');
 assert.equal(lines.at(-1).winner, null);
 assert.equal(lines.at(-1).unfinished, true);
 assert.equal(exported.text.includes('決策甲'), false);
 assert.equal(exported.text.includes(hostMe.data.id), false);
 assert.equal(exported.text.includes('8675309'), false);
 assert.equal(exported.text.includes('ua-universal-v2-preview'), false);
 assert.equal(exported.text.includes('"uid":"1-'), false);
 const denied=await api('/api/coach/matches/'+posted[0].body.matchId, {token:guest.data.token});
 assert.equal(denied.status, 404);
 const removed=await api('/api/coach/matches/'+posted[0].body.matchId, {method:'DELETE', token:host.data.token});
 assert.equal(removed.status, 200);
 const afterDelete=await api('/api/coach/export.jsonl', {token:host.data.token});
 assert.equal(afterDelete.text.includes(posted[0].body.matchId), false);
});

test('a delayed online reply keeps the account captured before the request', async()=>{
 const shared=consented();
 let who=ME;
 const posted=[];
 function collector(){
  return createOnlineCollector({
   storage:shared,
   schedule(){return 1;},
   deckById:()=>({title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}}),
   fetchImpl:async(path, options)=>{
    if(path==='/api/me')return meBody(who);
    posted.push(JSON.parse(options.body));
    return {ok:true, json:async()=>({duplicate:false})};
   }
  });
 }
 const hand=[{uid:'0-7', cardId:'BLC-1-034'}];
 const room={
  code:'ROOM2345', revision:2, seat:0, accountId:ME, yourTurn:true, status:'playing',
  you:{deckId:'d0123456789abcde'},
  view:{
   playerTitles:['bleach', 'bleach'], phase:'setup', turn:0,
   players:[
    {hand, handCount:1, lifeCount:0, deckCount:40, front:[], energy:[]},
    {hand:null, handCount:7, lifeCount:0, deckCount:43, front:[], energy:[]}
   ]
  },
  choices:[{index:0, type:'openingMulligan', mode:'keep', label:'保留'}]
 };
 const tab1=collector();
 tab1.start();
 assert.equal(tab1.arm({...room, accountId:undefined}, room.choices[0]), false);
 assert.match(tab1.lastError, /暫停上傳/);
 assert.equal(tab1.arm(room, room.choices[0]), true);
 who=OTHER;
 await tab1.settle({...room, seat:1, accountId:OTHER, revision:3});
 assert.equal(tab1.queued, 0);
 await tab1.settle({...room, revision:3, accountId:OTHER, yourTurn:false, choices:[]});
 assert.equal(tab1.queued, 1);
 const queued=readStoredQueue(shared)[0].body;
 assert.equal(queued.accountId, ME);
 assert.equal(queued.seat, 0);
 assert.equal(queued.observation.visible.players[0].hand[0].uid, '0-7');
 await tab1.result(room, 'interrupted', {completed:false, winner:null});
 const tab2=collector();
 tab2.start();
 await tab1.flush();
 await tab2.flush();
 assert.equal(posted.length, 0);
 who=ME;
 await tab2.flush();
 assert.equal(posted.length, 2);
 assert.equal(posted.every(item=>item.accountId===ME), true);
 await tab1.result({...room, accountId:OTHER, seat:1}, 'conceded', {completed:false, winner:0});
 const split=JSON.parse(shared.getItem('ua-v2-decision-online-v1'));
 assert.notEqual(split[OTHER+':1:'+room.code].matchId, split[ME+':0:'+room.code].matchId);
 who=OTHER;
 await tab1.flush();
 assert.equal(posted.at(-1).accountId, OTHER);
 assert.equal(posted.at(-1).matchId, split[OTHER+':1:'+room.code].matchId);
 const other=collector();
 other.start();
 who=OTHER;
 const otherRoom={...room, accountId:OTHER, seat:0};
 assert.equal(other.arm(otherRoom, otherRoom.choices[0]), true);
 await other.settle({...otherRoom, revision:3, yourTurn:false, choices:[]});
 const seatOne=collector();
 seatOne.start();
 who=ME;
 const firstSeat={...room, accountId:ME, seat:1, view:{
  ...room.view,
  players:[
   {hand:null, handCount:7, lifeCount:0, deckCount:43, front:[], energy:[]},
   {hand:[{uid:'1-7', cardId:'BLC-1-039'}], handCount:1, lifeCount:0, deckCount:40, front:[], energy:[]}
  ]
 }};
 assert.equal(seatOne.arm(firstSeat, firstSeat.choices[0]), true);
 await seatOne.settle({...firstSeat, revision:3, yourTurn:false, choices:[]});
 const sessions=JSON.parse(shared.getItem('ua-v2-decision-online-v1'));
 assert.equal(sessions[ME+':0:'+room.code].accountId, ME);
 assert.notEqual(sessions[OTHER+':0:'+room.code].matchId, sessions[ME+':0:'+room.code].matchId);
 assert.notEqual(sessions[ME+':1:'+room.code].matchId, sessions[ME+':0:'+room.code].matchId);
});

test('switching accounts while an online action is in flight does not give the hand to the other account', {timeout:180000}, async()=>{
 const first=await api('/api/register', {method:'POST', body:{username:'延遲甲', password}});
 const second=await api('/api/register', {method:'POST', body:{username:'延遲乙', password}});
 assert.equal(first.status, 201, first.text);
 assert.equal(second.status, 201, second.text);
 const firstDeck=await api('/api/decks', {method:'POST', token:first.data.token, body:{
  name:'延遲甲', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'delay-a'}});
 const secondDeck=await api('/api/decks', {method:'POST', token:second.data.token, body:{
  name:'延遲乙', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'delay-b'}});
 const created=await api('/api/rooms', {method:'POST', token:first.data.token, body:{deckId:firstDeck.data.deck.id, first:'me'}});
 const joined=await api('/api/rooms/'+created.data.code+'/join', {method:'POST', token:second.data.token, body:{deckId:secondDeck.data.deck.id}});
 assert.equal(joined.status, 200, joined.text);
 const firstMe=await api('/api/me', {token:first.data.token});
 const secondMe=await api('/api/me', {token:second.data.token});
 const shared=consented();
 let who=first.data;
 const posted=[];
 function collector(){
  return createOnlineCollector({
   storage:shared,
   schedule(){return 1;},
   deckById:()=>({title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}}),
   fetchImpl:async(path, options)=>{
    const response=await fetch(ctx.base+path, {
     method:options?.method||'GET',
     headers:{accept:'application/json', ...(options?.headers||{}), authorization:'Bearer '+who.token},
     body:options?.body
    });
    const data=await response.json().catch(()=>null);
    if(path!=='/api/me')posted.push({path, status:response.status, data, body:JSON.parse(options.body)});
    return {ok:response.ok, status:response.status, json:async()=>data};
   }
  });
 }
 const view=await api('/api/rooms/'+created.data.code, {token:first.data.token});
 assert.equal(view.data.accountId, firstMe.data.id);
 assert.equal(view.data.seat, 0);
 const otherView=await api('/api/rooms/'+created.data.code, {token:second.data.token});
 assert.equal(otherView.data.accountId, secondMe.data.id);
 assert.notEqual(otherView.data.seat, view.data.seat);
 const tab1=collector();
 tab1.start();
 assert.equal(tab1.arm(view.data, view.data.choices[0]), true);
 const acted=await api('/api/rooms/'+created.data.code+'/actions', {method:'POST', token:first.data.token, body:{index:0}});
 assert.equal(acted.status, 200, acted.text);
 who=second.data;
 await tab1.settle({...acted.data, accountId:secondMe.data.id});
 assert.equal(tab1.queued, 1);
 const queued=readStoredQueue(shared)[0].body;
 assert.equal(queued.accountId, firstMe.data.id);
 const handUid=queued.observation.visible.players[0].hand[0].uid;
 assert.equal(queued.observation.visible.players[0].hand.length, 7);
 await tab1.result(view.data, 'interrupted', {completed:false, winner:null});
 const tab2=collector();
 tab2.start();
 await tab1.flush();
 await tab2.flush();
 assert.equal(posted.length, 0);
 const hidden=await api('/api/coach/matches', {token:second.data.token});
 assert.equal(hidden.data.matches.length, 0);
 const hiddenDetail=await api('/api/coach/matches/'+queued.matchId, {token:second.data.token});
 assert.equal(hiddenDetail.status, 404);
 const hiddenExport=await api('/api/coach/export.jsonl', {token:second.data.token});
 assert.equal(hiddenExport.text.includes(queued.matchId), false);
 assert.equal(hiddenExport.text.includes(handUid), false);
 assert.equal(hiddenExport.text.includes(firstMe.data.id), false);
 who=first.data;
 await tab2.flush();
 assert.equal(posted.length, 2);
 assert.equal(posted.every(item=>item.body.accountId===firstMe.data.id), true);
 const listed=await api('/api/coach/matches', {token:first.data.token});
 assert.equal(listed.data.matches.length, 1);
 const detail=await api('/api/coach/matches/'+queued.matchId, {token:first.data.token});
 assert.equal(detail.status, 200, detail.text);
 assert.equal(detail.text.includes(handUid), true);
 const exported=await api('/api/coach/export.jsonl', {token:first.data.token});
 assert.equal(exported.text.includes(queued.matchId), true);
 assert.equal(exported.text.includes(handUid), true);
 assert.equal(exported.text.includes(firstMe.data.id), false);
 assert.equal(exported.text.includes(secondMe.data.id), false);
 const replay=await api('/api/coach/steps', {method:'POST', token:first.data.token, body:queued});
 assert.equal(replay.status, 200, replay.text);
 assert.equal(replay.data.duplicate, true);
 const again=await api('/api/coach/matches/'+queued.matchId, {token:first.data.token});
 assert.equal(again.text.split(handUid).length-1, detail.text.split(handUid).length-1);
 const stillHidden=await api('/api/coach/export.jsonl', {token:second.data.token});
 assert.equal(stillHidden.text.includes(handUid), false);
 const sessions=JSON.parse(shared.getItem('ua-v2-decision-online-v1'));
 assert.equal(Object.keys(sessions).some(key=>key===firstMe.data.id+':'+view.data.seat+':'+created.data.code), true);
 assert.equal(Object.keys(sessions).some(key=>key.startsWith(secondMe.data.id+':')), false);
});

test('a concede from the other seat stays on that seat and the first account can still finish', {timeout:180000}, async()=>{
 const first=await api('/api/register', {method:'POST', body:{username:'認輸甲', password}});
 const second=await api('/api/register', {method:'POST', body:{username:'認輸乙', password}});
 assert.equal(first.status, 201, first.text);
 assert.equal(second.status, 201, second.text);
 const firstDeck=await api('/api/decks', {method:'POST', token:first.data.token, body:{
  name:'認輸甲', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'concede-a'}});
 const secondDeck=await api('/api/decks', {method:'POST', token:second.data.token, body:{
  name:'認輸乙', title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}, localId:'concede-b'}});
 const created=await api('/api/rooms', {method:'POST', token:first.data.token, body:{deckId:firstDeck.data.deck.id, first:'me'}});
 const joined=await api('/api/rooms/'+created.data.code+'/join', {method:'POST', token:second.data.token, body:{deckId:secondDeck.data.deck.id}});
 assert.equal(joined.status, 200, joined.text);
 const firstMe=await api('/api/me', {token:first.data.token});
 const secondMe=await api('/api/me', {token:second.data.token});
 const shared=consented();
 let who=first.data;
 const posted=[];
 const tab=createOnlineCollector({
  storage:shared,
  schedule(){return 1;},
  deckById:()=>({title:'bleach', counts:{...BLEACH_PURPLE_V2_PILOT_COUNTS}}),
  fetchImpl:async(path, options)=>{
   const response=await fetch(ctx.base+path, {
    method:options?.method||'GET',
    headers:{accept:'application/json', ...(options?.headers||{}), authorization:'Bearer '+who.token},
    body:options?.body
   });
   const data=await response.json().catch(()=>null);
   if(path!=='/api/me')posted.push({path, status:response.status, data, body:JSON.parse(options.body)});
   return {ok:response.ok, status:response.status, json:async()=>data};
  }
 });
 tab.start();
 const view=await api('/api/rooms/'+created.data.code, {token:first.data.token});
 const otherView=await api('/api/rooms/'+created.data.code, {token:second.data.token});
 assert.equal(view.data.accountId, firstMe.data.id);
 assert.equal(view.data.seat, 0);
 assert.equal(otherView.data.accountId, secondMe.data.id);
 assert.equal(otherView.data.seat, 1);
 assert.equal(tab.arm(view.data, view.data.choices[0]), true);
 const acted=await api('/api/rooms/'+created.data.code+'/actions', {method:'POST', token:first.data.token, body:{index:0}});
 assert.equal(acted.status, 200, acted.text);
 await tab.settle(acted.data);
 assert.equal(tab.queued, 1);
 await tab.flush();
 assert.equal(posted.at(-1).status, 200);
 const sessionsBefore=JSON.parse(shared.getItem('ua-v2-decision-online-v1'));
 const firstKey=firstMe.data.id+':0:'+created.data.code;
 const firstMatch=sessionsBefore[firstKey].matchId;
 who=second.data;
 await tab.prepare(otherView.data);
 const prepared=JSON.parse(shared.getItem('ua-v2-decision-online-v1'));
 const secondKey=secondMe.data.id+':1:'+created.data.code;
 assert.equal(typeof prepared[secondKey].matchId, 'string');
 assert.notEqual(prepared[secondKey].matchId, firstMatch);
 assert.equal(prepared[firstKey].matchId, firstMatch);
 await tab.result(otherView.data, 'conceded', {completed:false, winner:0});
 await tab.flush();
 const concede=posted.at(-1);
 assert.equal(concede.status, 200, JSON.stringify(concede.data));
 assert.equal(concede.body.accountId, secondMe.data.id);
 assert.equal(concede.body.matchId, prepared[secondKey].matchId);
 assert.equal(concede.body.endReason, 'conceded');
 const secondList=await api('/api/coach/matches', {token:second.data.token});
 assert.equal(secondList.data.matches.length, 1);
 assert.equal(secondList.data.matches[0].id, prepared[secondKey].matchId);
 assert.equal(secondList.data.matches[0].label.endReason, 'conceded');
 const firstAfterConcede=await api('/api/coach/matches/'+firstMatch, {token:first.data.token});
 assert.equal(firstAfterConcede.status, 200, firstAfterConcede.text);
 assert.equal(firstAfterConcede.data.match.label, null);
 who=first.data;
 await tab.result(view.data, 'life-zero', {completed:true, winner:0});
 await tab.flush();
 const finished=posted.at(-1);
 assert.equal(finished.status, 200, JSON.stringify(finished.data));
 assert.notEqual(finished.status, 409);
 assert.equal(finished.body.accountId, firstMe.data.id);
 assert.equal(finished.body.matchId, firstMatch);
 assert.equal(finished.body.endReason, 'life-zero');
 assert.equal(finished.data.duplicate, false);
 const firstDone=await api('/api/coach/matches/'+firstMatch, {token:first.data.token});
 assert.equal(firstDone.data.match.label.endReason, 'life-zero');
 const secondStill=await api('/api/coach/matches/'+prepared[secondKey].matchId, {token:second.data.token});
 assert.equal(secondStill.data.match.label.endReason, 'conceded');
 const hidden=await api('/api/coach/matches/'+firstMatch, {token:second.data.token});
 assert.equal(hidden.status, 404);
});

function cloneStorage(source){
 const seed={};
 for(let index=0;index<source.length;index++){
  const key=source.key(index);
  seed[key]=source.getItem(key);
 }
 return memoryStorage(seed);
}
function apiFetch(token){
 return async(path, options={})=>{
  const response=await fetch(ctx.base+path, {
   method:options.method||'GET',
   headers:{
    accept:'application/json',
    authorization:'Bearer '+token,
    ...(options.body?{'content-type':'application/json'}:{}),
    ...(options.headers||{})
   },
   body:options.body
  });
  const data=await response.json().catch(()=>null);
  return {ok:response.ok, status:response.status, json:async()=>data};
 };
}
async function signedCoach(username){
 const registered=await api('/api/register', {method:'POST', body:{username, password}});
 assert.equal(registered.status, 201, registered.text);
 const me=await api('/api/me', {token:registered.data.token});
 assert.equal(me.status, 200, me.text);
 return {token:registered.data.token, accountId:me.data.id};
}
function mulligan(state, mode){
 const legal=legalUniversalActions(packs, state);
 const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===mode);
 assert.ok(action, mode);
 return {legal, action};
}
function respondUntilHuman(state){
 let current=state;
 let steps=0;
 while(current.status==='playing'&&universalActor(current)!==0&&steps<12){
  const legal=legalUniversalActions(packs, current);
  assert.ok(legal.length);
  const action=legal.find(item=>item.mode==='keep')||legal.find(item=>item.type==='next')||legal[0];
  current=dispatchUniversalAction(packs, current, action, {actor:universalActor(current)});
  steps+=1;
 }
 assert.equal(universalActor(current), 0);
 return {state:current, steps};
}
async function holdWrites(storage){
 const holder=createDecisionQueue({
  storage,
  consent:()=>true,
  schedule(){return 1;},
  async send(){return {ok:true};}
 });
 let release;
 let opened;
 const held=holder.exclusive(async()=>{
  opened();
  await new Promise(resolve=>{release=resolve;});
 });
 await new Promise(resolve=>{opened=resolve;});
 return {async release(){release();await held;}};
}
function collector(account, storage){
 const posts=[];
 const fetchImpl=async(path, options={})=>{
  const result=await apiFetch(account.token)(path, options);
  if(path==='/api/coach/steps'){
   const posted=JSON.parse(options.body);
   posts.push({status:result.status, step:posted.step, mode:posted.choice?.mode, clientKey:posted.clientKey, data:await result.json()});
  }
  return result;
 };
 const battle=createCoachBattle({storage, schedule(){return 1;}, fetchImpl});
 return {battle, posts};
}

test('undo while the write lock is held keeps the replacement at step 0', {timeout:180000}, async()=>{
 const account=await signedCoach('復原甲');
 const storage=consented();
 const header=headerFor();
 const {battle, posts}=collector(account, storage);
 await battle.begin(header, account.accountId);
 const state=opening();
 const keep=mulligan(state, 'keep');
 const redraw=mulligan(state, 'redraw');
 const lock=await holdWrites(storage);
 let original;
 let replacement;
 try{
  const started=performance.now();
  original=battle.noteHuman({packs, state, action:keep.action, replayIndex:0, legal:keep.legal});
  assert.equal(battle.session.humanStep, 1);
  assert.equal(battle.retractLast(), true);
  assert.equal(battle.session.humanStep, 0);
  replacement=battle.noteHuman({packs, state, action:redraw.action, replayIndex:0, legal:redraw.legal});
  const elapsed=performance.now()-started;
  assert.ok(elapsed<200, '復原與改選等待了 '+elapsed+' ms');
  assert.equal(battle.session.humanStep, 1);
  assert.equal(readStoredQueue(storage).length, 0);
  assert.equal(battle.snapshot().pending[0].body.choice.mode, 'redraw');
  await lock.release();
 }catch(error){
  await lock.release();
  throw error;
 }
 assert.equal((await original).skipped, 'cancelled');
 assert.equal((await replacement).queued, true);
 assert.equal(battle.session.humanStep, 1);
 const stored=readStoredQueue(storage);
 assert.equal(stored.length, 1);
 assert.equal(stored[0].body.step, 0);
 assert.equal(stored[0].body.choice.mode, 'redraw');
 const played=dispatchUniversalAction(packs, state, redraw.action, {actor:0});
 const next=respondUntilHuman(played);
 const follow=legalUniversalActions(packs, next.state);
 battle.noteHuman({packs, state:next.state, action:follow[0], replayIndex:1+next.steps, legal:follow});
 assert.equal(battle.session.humanStep, 2);
 assert.deepEqual(readStoredQueue(storage).map(item=>item.body.step), [0, 1]);
 await battle.flush();
 assert.deepEqual(posts.map(item=>item.status+':'+item.step), ['200:0', '200:1']);
 assert.equal(posts[0].mode, 'redraw');
 assert.equal(posts.every(item=>item.data?.duplicate!==true), true);
 const detail=await api('/api/coach/matches/'+header.matchId, {token:account.token});
 assert.equal(detail.status, 200, detail.text);
 assert.deepEqual(detail.data.steps.map(item=>item.step), [0, 1]);
 assert.equal(detail.data.steps[0].choice.mode, 'redraw');
 assert.equal(detail.data.match.steps, 2);
});

test('reload while the first step is waiting resumes a continuous record', {timeout:180000}, async()=>{
 const account=await signedCoach('續局甲');
 const storage=consented();
 const header=headerFor();
 const {battle}=collector(account, storage);
 await battle.begin(header, account.accountId);
 const state=opening();
 const keep=mulligan(state, 'keep');
 const lock=await holdWrites(storage);
 let saved;
 try{
  const pending=battle.noteHuman({packs, state, action:keep.action, replayIndex:0, legal:keep.legal});
  assert.equal(battle.session.humanStep, 1);
  assert.equal(readStoredQueue(storage).length, 0);
  saved=battle.snapshot();
  assert.equal(saved.humanStep, 1);
  assert.equal(saved.pending.length, 1);
  assert.equal(saved.pending[0].step, 0);
  assert.equal(saved.pending[0].body.choice.mode, 'keep');
  const resumedStorage=cloneStorage(storage);
  const resumed=collector(account, resumedStorage);
  await resumed.battle.restore(saved, header, account.accountId);
  assert.equal(resumed.battle.session.humanStep, 1);
  assert.equal(resumed.battle.session.lastError, '');
  assert.deepEqual(readStoredQueue(resumedStorage).map(item=>item.body.step+':'+item.body.choice.mode), ['0:keep']);
  const played=dispatchUniversalAction(packs, state, keep.action, {actor:0});
  const next=respondUntilHuman(played);
  const follow=legalUniversalActions(packs, next.state);
  resumed.battle.noteHuman({packs, state:next.state, action:follow[0], replayIndex:1+next.steps, legal:follow});
  assert.equal(resumed.battle.session.humanStep, 2);
  await resumed.battle.flush();
  assert.deepEqual(resumed.posts.map(item=>item.status+':'+item.step), ['200:0', '200:1']);
  const detail=await api('/api/coach/matches/'+header.matchId, {token:account.token});
  assert.equal(detail.status, 200, detail.text);
  assert.deepEqual(detail.data.steps.map(item=>item.step), [0, 1]);
  assert.equal(detail.data.steps[0].choice.mode, 'keep');
  await lock.release();
  assert.equal((await pending).queued, true);
 }catch(error){
  await lock.release();
  throw error;
 }
});

test('a missing pending step is marked unstored and the next upload continues', {timeout:180000}, async()=>{
 const account=await signedCoach('缺口甲');
 const header=headerFor();
 const {battle}=collector(account, consented());
 await battle.begin(header, account.accountId);
 const state=opening();
 const keep=mulligan(state, 'keep');
 battle.noteHuman({packs, state, action:keep.action, replayIndex:0, legal:keep.legal});
 const saved=battle.snapshot();
 const resumed=collector(account, consented());
 await resumed.battle.restore({...saved, pending:[], confirmedThrough:0}, header, account.accountId);
 assert.equal(resumed.battle.session.humanStep, 0);
 assert.equal(resumed.battle.session.lastError, '紀錄尚未儲存');
 resumed.battle.noteHuman({packs, state, action:keep.action, replayIndex:0, legal:keep.legal});
 assert.equal(resumed.battle.session.humanStep, 1);
 await resumed.battle.flush();
 assert.deepEqual(resumed.posts.map(item=>item.status+':'+item.step), ['200:0']);
 const detail=await api('/api/coach/matches/'+header.matchId, {token:account.token});
 assert.equal(detail.status, 200, detail.text);
 assert.deepEqual(detail.data.steps.map(item=>item.step), [0]);
});

test('resume does not reuse a step the server already accepted', {timeout:180000}, async()=>{
 const account=await signedCoach('已存甲');
 const storage=consented();
 const header=headerFor();
 const {battle, posts}=collector(account, storage);
 await battle.begin(header, account.accountId);
 const state=opening();
 const keep=mulligan(state, 'keep');
 battle.noteHuman({packs, state, action:keep.action, replayIndex:0, legal:keep.legal});
 const original=readStoredQueue(storage)[0].body;
 await battle.flush();
 assert.deepEqual(posts.map(item=>item.status+':'+item.step), ['200:0']);
 const saved=battle.snapshot();
 assert.equal(saved.confirmedThrough, 1);
 assert.equal(readStoredQueue(storage).length, 0);
 const stale={...saved, confirmedThrough:0, pending:[]};
 const resumedStorage=consented();
 const resumed=collector(account, resumedStorage);
 await resumed.battle.restore(stale, header, account.accountId);
 assert.equal(resumed.battle.session.humanStep, 1);
 assert.equal(resumed.battle.session.lastError, '');
 const played=dispatchUniversalAction(packs, state, keep.action, {actor:0});
 const next=respondUntilHuman(played);
 const follow=legalUniversalActions(packs, next.state);
 resumed.battle.noteHuman({packs, state:next.state, action:follow[0], replayIndex:1+next.steps, legal:follow});
 assert.equal(resumed.battle.session.humanStep, 2);
 assert.deepEqual(readStoredQueue(resumedStorage).map(item=>item.body.step), [1]);
 await resumed.battle.flush();
 assert.deepEqual(resumed.posts.map(item=>item.status+':'+item.step), ['200:1']);
 const detail=await api('/api/coach/matches/'+header.matchId, {token:account.token});
 assert.equal(detail.status, 200, detail.text);
 assert.deepEqual(detail.data.steps.map(item=>item.step), [0, 1]);
 const replay=await api('/api/coach/steps', {method:'POST', token:account.token, body:original});
 assert.equal(replay.status, 200, replay.text);
 assert.equal(replay.data.duplicate, true);
 const again=await api('/api/coach/matches/'+header.matchId, {token:account.token});
 assert.equal(again.data.match.steps, 2);
});
