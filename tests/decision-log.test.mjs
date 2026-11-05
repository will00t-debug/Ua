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
import {createDecisionQueue} from '../dist/universal-v2/coach-queue.mjs';
import {createCoachBattle} from '../dist/universal-v2/coach-battle.mjs';
import {createOnlineCollector} from '../dist/universal-v2/coach-online.mjs';
import {COACH_CONSENT_KEY} from '../dist/universal-v2/coach-client.mjs';
import {createHandler} from '../server/http.mjs';

const deck=verifiedBleachPurplePilotDeck();
const packs=[deck.pack, deck.pack];
const password='correct-horse-1';

function memoryStorage(seed={}){
 const data=new Map(Object.entries(seed));
 return {
  getItem(key){return data.has(key)?data.get(key):null;},
  setItem(key, value){data.set(String(key), String(value));},
  removeItem(key){data.delete(key);}
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
  fetchImpl:async path=>{paths.push(path);return {ok:true, json:async()=>({})};}
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
   if(path==='/api/me')return Promise.resolve({ok:true, json:async()=>({})});
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
  fetchImpl:async path=>path==='/api/me'
   ?{ok:true, json:async()=>({})}
   :{ok:true, json:async()=>({duplicate:false})}
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

test('reloading the same match drops the interrupt label before it can upload', async()=>{
 const header=headerFor();
 const paths=[];
 const storage=consented();
 const battle=createCoachBattle({
  storage,
  schedule(){return 1;},
  fetchImpl:async path=>{
   paths.push(path);
   return {ok:true, json:async()=>({})};
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
   return {ok:true, json:async()=>({})};
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
  const human=preview.split('function applyAction(a){')[1]?.split('function undoMove(){')[0];
  assert.ok(human,'human action handler exists');
  const dispatch=human.indexOf('const nextState=dispatchUniversalAction(app.packs,app.state,a,{actor:0});');
  const checked=human.indexOf('assertUniversalMatch(app.packs,nextState);');
  const replay=human.indexOf('const nextReplay=appendUniversalReplay(');
  const committed=human.indexOf('app.state=nextState;');
  const recorded=human.indexOf('rememberHuman(a,previous,replayIndex,legal)');
  assert.ok(dispatch>=0&&checked>dispatch&&replay>checked&&committed>replay&&recorded>committed,
   'V2 reducer and replay are validated before recording an accepted decision');
 assert.match(preview, /endReason:'abandoned'/);
 assert.match(preview, /endReason:'interrupted'/);
 assert.match(online, /提供對戰紀錄改善 AI/);
 const choiceGuard=online.indexOf('if(!choice)return;');
 const freshGuard=online.indexOf('if(!app.room||app.room.code!==snapshot.code||');
 const arm=online.indexOf('decisions().arm(app.room,choice)');
 assert.ok(choiceGuard>0&&freshGuard>choiceGuard&&arm>freshGuard,
  'online decision is recorded only after a present, fresh, legal choice is checked');
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
  code:'ABCD2345', revision:3, seat:0, yourTurn:true, status:'playing',
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
 const body=JSON.parse(hostStorage.getItem('ua-v2-coach-queue-v1'))[0].body;
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
    method:options.method,
    headers:{...options.headers, authorization:'Bearer '+host.data.token},
    body:options.body
   });
   const data=await response.json().catch(()=>null);
   posted.push({path, status:response.status, data, body:JSON.parse(options.body)});
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
 const storedDebug=await api('/api/coach/debug-replays', {method:'POST', token:host.data.token, body:{header:posted[0].body, replay:debug}});
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
