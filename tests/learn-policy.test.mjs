import test, {after,before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {chooseProgressSafeAiAction,aiPolicyFor} from '../dist/universal-v2/ai-driver-safety.mjs';
import {buildHumanStep,coachHeader,coachObservation,newCoachMatchId} from '../dist/universal-v2/coach-record.mjs';
import {LEARN_AI_VERSION,LEARN_FORMAT,chooseLearnedAction,learnReport,trainPolicy} from '../dist/universal-v2/learn-policy.mjs';
import {createHandler} from '../server/http.mjs';

const deck=verifiedBleachPurplePilotDeck();
const packs=[deck.pack,deck.pack];

function keepRow(matchId='m'+'a'.repeat(32)){
 const state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:11,first:0,openingMulligan:true});
 const legal=legalUniversalActions(packs,state);
 const choice=legal.find(action=>action.mode==='keep');
 return {
  source:'human',actor:'human',seat:0,matchId,forced:false,
  observation:coachObservation(packs,state,0),legal,choice
 };
}
function playRow(cardId,matchId){
 const observation={visible:{phase:'main',turn:2,actor:0,status:'playing',players:[
  {hand:[{uid:'0-1',cardId}],handCount:1,front:[null,null,null,null],energy:[],apReady:2,apTotal:2,energyTotal:3,energyByColor:{purple:3},lifeCount:4,deckCount:40},
  {hand:null,handCount:4,front:[null,null,null,null],energy:[],apReady:1,apTotal:1,energyTotal:1,energyByColor:{},lifeCount:5,deckCount:40}
 ]}};
 const choice={type:'play',mode:'enter',uid:'0-1'};
 return {source:'human',actor:'human',seat:0,matchId,forced:false,observation,legal:[{type:'next'},choice],choice};
}

test('a learned policy copies a repeated human choice and ignores hidden, forced and AI rows',()=>{
 const rows=[];
 for(let i=0;i<10;i++)rows.push(playRow('BLC-1-064','m'+String(i).padStart(32,'b')));
 rows.push({record:'result',winner:0,endReason:'life-zero'});
 rows.push({source:'ai',actor:'ai',forced:false,legal:[{type:'next'},{type:'play'}],choice:{type:'play'}});
 rows.push({...playRow('BLC-1-064','m'+'c'.repeat(32)),forced:true,legal:[{type:'play',mode:'enter',uid:'0-1'}]});
 const leaked=playRow('BLC-1-064','m'+'d'.repeat(32));
 leaked.observation.visible.players[1].hand=[{uid:'1-1',cardId:'BLC-1-067'}];
 rows.push(leaked);
 const labeled=playRow('BLC-1-064','m'+'e'.repeat(32));
 labeled.observation.visible.winner=0;
 rows.push(labeled);
 const policy=trainPolicy(rows);
 assert.equal(policy.format,LEARN_FORMAT);
 assert.equal(policy.skipped.ai,1);
 assert.equal(policy.skipped.forced,1);
 assert.equal(policy.skipped.leak,2);
 assert.equal(policy.skipped.result,1);
 assert.equal(policy.support.play>=2,true);
 assert.equal(JSON.stringify(policy).includes('"matchId"'),false);
 assert.equal(JSON.stringify(policy).includes('"winner"'),false);
 const fresh=playRow('BLC-1-064','held');
 const picked=chooseLearnedAction(policy,fresh.observation,fresh.legal,0);
 assert.equal(picked.action.uid,'0-1');
 const unseen=playRow('BLC-9-999','held');
 assert.equal(chooseLearnedAction(policy,unseen.observation,unseen.legal,0),null);
 const text=learnReport(policy);
 assert.match(text,/已用/);
 assert.match(text,/勝率要在對戰裡另外看/);
});

test('learned difficulty falls back to hard when the policy is missing or old',()=>{
 assert.equal(aiPolicyFor('learned'),LEARN_AI_VERSION);
 const state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:11,first:0,openingMulligan:true});
 const clock={ms:1e9};
 const hard=chooseStrengthenedHardAction(packs,state,clock);
 const fallback=chooseProgressSafeAiAction(packs,state,{difficulty:'learned',policy:null,...clock});
 assert.equal(fallback.learned,false);
 assert.deepEqual(fallback.action,hard);
 assert.equal(fallback.diagnosis.reason,'fallback-no-policy');
 assert.equal(fallback.diagnosis.changed,false);
 const old={format:'ua-v2-learn-v1',dim:512,weights:[0],support:{mulligan:4},cards:{},profiles:{}};
 const stale=chooseProgressSafeAiAction(packs,state,{difficulty:'learned',policy:old,...clock});
 assert.equal(stale.learned,false);
 assert.deepEqual(stale.action,hard);
 assert.equal(stale.diagnosis.reason,'fallback-old-model');
 const text=learnReport(trainPolicy(Array.from({length:12},(_,i)=>keepRow('m'+String(i).padStart(32,'a')))));
 assert.match(text,/勝率要在對戰裡另外看/);
 assert.doesNotMatch(text,/信心/);
});

let ctx;
async function listen(handler){
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,base:'http://127.0.0.1:'+server.address().port,handler};
}
async function api(path,{method='GET',token,body}={}){
 const response=await fetch(ctx.base+path,{
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
 return {status:response.status,data,text};
}
function uploadedStep(){
 const state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:11,first:0,openingMulligan:true});
 const action=legalUniversalActions(packs,state).find(item=>item.mode==='keep');
 const header=coachHeader({matchId:newCoachMatchId(),packs,counts:deck.counts,aiVersion:'normal'});
 return buildHumanStep({packs,state,action,step:0,replayIndex:0,previous:null,header});
}

before(async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-learn-'));
 const started=await listen(await createHandler({dataFile:join(dir,'store.sqlite'),staticRoot:null}));
 ctx={...started,dir};
});
after(async()=>{
 if(!ctx)return;
 await new Promise(resolve=>ctx.server.close(resolve));
 ctx.handler.close();
 await rm(ctx.dir,{recursive:true,force:true});
});

test('learning is stored for the logged-in account and removed with that account data',async()=>{
 const guest=await api('/api/coach/learn',{method:'POST',body:{}});
 assert.equal(guest.status,401);
 const owner=await api('/api/register',{method:'POST',body:{username:'learn_owner',password:'correct-horse-1'}});
 const other=await api('/api/register',{method:'POST',body:{username:'learn_other',password:'correct-horse-1'}});
 assert.equal(owner.status,201,owner.text);
 const tooFew=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(tooFew.status,400);
 for(let i=0;i<12;i++){
  const saved=await api('/api/coach/steps',{method:'POST',token:owner.data.token,body:uploadedStep()});
  assert.equal(saved.status,200,saved.text);
 }
 const learned=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(learned.status,200,learned.text);
 assert.equal(learned.data.replaced,true);
 assert.equal(learned.data.policy.format,LEARN_FORMAT);
 assert.equal(learned.data.policy.validation.reliable,true);
 assert.equal(learned.data.policy.trainedSamples>=8,true);
 assert.equal(JSON.stringify(learned.data.policy).includes('correct-horse'),false);
 assert.equal(JSON.stringify(learned.data.policy).includes('信心'),false);
 const mine=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(mine.data.policy.weights.length,learned.data.policy.weights.length);
 const theirs=await api('/api/coach/policy',{token:other.data.token});
 assert.equal(theirs.data.policy,null);
 const removed=await api('/api/coach/policy',{method:'DELETE',token:owner.data.token});
 assert.equal(removed.status,200);
 const gone=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(gone.data.policy,null);
 for(let i=0;i<12;i++){
  const saved=await api('/api/coach/steps',{method:'POST',token:owner.data.token,body:uploadedStep()});
  assert.equal(saved.status,200,saved.text);
 }
 const again=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(again.status,200,again.text);
 const wiped=await api('/api/coach',{method:'DELETE',token:owner.data.token});
 assert.equal(wiped.status,200);
 const after=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(after.data.policy,null);
});

test('an unverified retrain does not replace a stored model',async()=>{
 const owner=await api('/api/register',{method:'POST',body:{username:'learn_keep',password:'correct-horse-1'}});
 assert.equal(owner.status,201,owner.text);
 const ids=[];
 for(let i=0;i<12;i++){
  const step=uploadedStep();
  ids.push(step.matchId);
  const saved=await api('/api/coach/steps',{method:'POST',token:owner.data.token,body:step});
  assert.equal(saved.status,200,saved.text);
 }
 const learned=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(learned.status,200,learned.text);
 const weights=learned.data.policy.weights;
 for(const matchId of ids){
  const removed=await api('/api/coach/matches/'+matchId,{method:'DELETE',token:owner.data.token});
  assert.equal(removed.status,200,removed.text);
 }
 const matchId=newCoachMatchId();
 let previous=null;
 for(let i=0;i<10;i++){
  const state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:11,first:0,openingMulligan:true});
  const action=legalUniversalActions(packs,state).find(item=>item.mode==='keep');
  const header=coachHeader({matchId,packs,counts:deck.counts,aiVersion:'normal'});
  const step=buildHumanStep({packs,state,action,step:i,replayIndex:i,previous,header});
  previous={step:step.step,type:step.choice.type,replayIndex:step.replayIndex,clientKey:step.clientKey};
  const saved=await api('/api/coach/steps',{method:'POST',token:owner.data.token,body:step});
  assert.equal(saved.status,200,saved.text);
 }
 const again=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(again.status,200,again.text);
 assert.equal(again.data.replaced,false);
 assert.match(again.data.notice,/沒有覆蓋/);
 assert.deepEqual(again.data.policy.weights,weights);
 const reloaded=await api('/api/coach/policy',{token:owner.data.token});
 assert.deepEqual(reloaded.data.policy.weights,weights);
 assert.equal(reloaded.data.policy.previous,undefined);
});
