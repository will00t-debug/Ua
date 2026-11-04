import test, {after,before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {chooseProgressSafeAiAction,aiPolicyFor} from '../dist/universal-v2/ai-driver-safety.mjs';
import {buildHumanStep,coachHeader,coachObservation,newCoachMatchId} from '../dist/universal-v2/coach-record.mjs';
import {LEARN_AI_VERSION,LEARN_DIM,LEARN_FORMAT,LEARN_FORMAT_V2,LEARN_FORMAT_V3,chooseLearnedAction,learnReport,trainPolicy} from '../dist/universal-v2/learn-policy.mjs';
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
 const retired={format:LEARN_FORMAT_V2,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(0),support:{mulligan:4},cards:{},profiles:{}};
 const staleV2=chooseProgressSafeAiAction(packs,state,{difficulty:'learned',policy:retired,...clock});
 assert.equal(staleV2.learned,false);
 assert.deepEqual(staleV2.action,hard);
 assert.equal(staleV2.diagnosis.reason,'fallback-old-model');
 const retiredV3={format:LEARN_FORMAT_V3,dim:LEARN_DIM,weights:Array(LEARN_DIM).fill(0),support:{mulligan:4},cards:{},profiles:{}};
 const staleV3=chooseProgressSafeAiAction(packs,state,{difficulty:'learned',policy:retiredV3,...clock});
 assert.equal(staleV3.learned,false);
 assert.deepEqual(staleV3.action,hard);
 assert.equal(staleV3.diagnosis.reason,'fallback-old-model');
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
function mulliganStep(mode){
 const state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:11,first:0,openingMulligan:true});
 const action=legalUniversalActions(packs,state).find(item=>item.mode===mode);
 assert.ok(action,mode);
 const header=coachHeader({matchId:newCoachMatchId(),packs,counts:deck.counts,aiVersion:'normal'});
 return buildHumanStep({packs,state,action,step:0,replayIndex:0,previous:null,header});
}
function phaseState(){
 let state=newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:11,first:0,openingMulligan:true});
 const act=action=>{
  const actor=state.pending?.player??state.active;
  state=dispatchUniversalAction(packs,state,action,{actor});
 };
 const keep=()=>legalUniversalActions(packs,state).find(action=>action.mode==='keep');
 act(keep());
 act(keep());
 return state;
}
function phaseStep(type){
 const state=phaseState();
 const legal=legalUniversalActions(packs,state);
 const action=legal.find(item=>item.type===type);
 assert.ok(action,type);
 assert.equal(legal.length>=2,true);
 assert.equal(state.pending,null);
 const header=coachHeader({matchId:newCoachMatchId(),packs,counts:deck.counts,aiVersion:'normal'});
 return buildHumanStep({packs,state,action,step:0,replayIndex:0,previous:null,header});
}
const accountIds=new Map();
async function accountIdFor(token){
 if(accountIds.has(token))return accountIds.get(token);
 const me=await api('/api/me',{token});
 assert.equal(me.status,200,me.text);
 assert.match(me.data.id,/^u[a-f0-9]{16}$/);
 accountIds.set(token,me.data.id);
 return me.data.id;
}
async function uploadSteps(token,count,stepFor){
 const accountId=await accountIdFor(token);
 const ids=[];
 for(let i=0;i<count;i++){
  const step=stepFor();
  step.accountId=accountId;
  ids.push(step.matchId);
  const saved=await api('/api/coach/steps',{method:'POST',token,body:step});
  assert.equal(saved.status,200,saved.text);
 }
 return ids;
}
async function uploadMode(token,count,mode){
 return uploadSteps(token,count,()=>mulliganStep(mode));
}
async function uploadPhase(token,count,type){
 return uploadSteps(token,count,()=>phaseStep(type));
}
async function removeMatches(token,ids){
 for(const matchId of ids){
  const removed=await api('/api/coach/matches/'+matchId,{method:'DELETE',token});
  assert.equal(removed.status,200,removed.text);
 }
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
 await uploadPhase(owner.data.token,16,'next');
 const learned=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(learned.status,200,learned.text);
 assert.equal(learned.data.replaced,true);
 assert.equal(learned.data.activated,true);
 assert.equal(learned.data.policy.validation.intervenableSamples>=8,true);
 assert.equal(learned.data.policy.format,LEARN_FORMAT);
 assert.equal(learned.data.policy.validation.accepted,true);
 assert.equal(learned.data.policy.trainedSamples>=8,true);
 assert.equal(JSON.stringify(learned.data.policy).includes('correct-horse'),false);
 assert.equal(JSON.stringify(learned.data.policy).includes('信心'),false);
 assert.equal(JSON.stringify(learned.data.policy).includes('"previous"'),false);
 const mine=await api('/api/coach/policy',{token:owner.data.token});
 assert.deepEqual(mine.data.policy.weights,learned.data.policy.weights);
 const theirs=await api('/api/coach/policy',{token:other.data.token});
 assert.equal(theirs.data.policy,null);
 const removed=await api('/api/coach/policy',{method:'DELETE',token:owner.data.token});
 assert.equal(removed.status,200);
 const gone=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(gone.data.policy,null);
 const wiped=await api('/api/coach',{method:'DELETE',token:owner.data.token});
 assert.equal(wiped.status,200);
 const after=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(after.data.policy,null);
 const otherStill=await api('/api/coach/policy',{token:other.data.token});
 assert.equal(otherStill.data.policy,null);
});

test('a one-match holdout is saved but does not replace the active model',async()=>{
 const owner=await api('/api/register',{method:'POST',body:{username:'learn_low',password:'correct-horse-1'}});
 const other=await api('/api/register',{method:'POST',body:{username:'learn_low_side',password:'correct-horse-1'}});
 assert.equal(owner.status,201,owner.text);
 await uploadPhase(owner.data.token,8,'next');
 await uploadPhase(owner.data.token,1,'extraDraw');
 const learned=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(learned.status,200,learned.text);
 assert.equal(learned.data.replaced,false);
 assert.equal(learned.data.activated,false);
 assert.equal(learned.data.savedCandidate,true);
 assert.equal(learned.data.policy,null);
 assert.equal(learned.data.candidate.validation.splitValid,true);
 assert.equal(learned.data.candidate.validation.heldoutSamples,1);
 assert.equal(learned.data.candidate.validation.intervenableSamples,1);
 assert.equal(learned.data.candidate.validation.evaluationSufficient,false);
 assert.equal(learned.data.candidate.validation.accepted,false);
 assert.equal(learned.data.candidate.validation.reliable,undefined);
 const reloaded=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(reloaded.data.policy,null);
 assert.equal(reloaded.data.inactive,true);
 const side=await api('/api/coach/policy',{token:other.data.token});
 assert.equal(side.data.policy,null);
});

test('mulligan records at full agreement do not activate by themselves',async()=>{
 const owner=await api('/api/register',{method:'POST',body:{username:'learn_mull',password:'correct-horse-1'}});
 const other=await api('/api/register',{method:'POST',body:{username:'learn_mull_side',password:'correct-horse-1'}});
 assert.equal(owner.status,201,owner.text);
 await uploadPhase(other.data.token,16,'next');
 const sideLearned=await api('/api/coach/learn',{method:'POST',token:other.data.token,body:{}});
 assert.equal(sideLearned.data.activated,true);
 const sideWeights=sideLearned.data.policy.weights;
 await uploadMode(owner.data.token,16,'keep');
 const learned=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(learned.status,200,learned.text);
 assert.equal(learned.data.activated,false);
 assert.equal(learned.data.savedCandidate,true);
 assert.equal(learned.data.policy,null);
 assert.equal(learned.data.candidate.validation.overallAgreement,1);
 assert.equal(learned.data.candidate.validation.intervenableSamples,0);
 assert.equal(learned.data.candidate.validation.evaluationReason,'insufficient-intervenable');
 assert.equal(learned.data.candidate.validation.accepted,false);
 assert.match(learned.data.report,/整體模仿吻合率/);
 assert.match(learned.data.report,/可能介入/);
 assert.match(learned.data.report,/實戰改選率/);
 const reloaded=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(reloaded.data.policy,null);
 assert.equal(reloaded.data.inactive,true);
 const side=await api('/api/coach/policy',{token:other.data.token});
 assert.deepEqual(side.data.policy.weights,sideWeights);
});

test('agreement below the threshold does not replace a stored model',async()=>{
 const owner=await api('/api/register',{method:'POST',body:{username:'learn_keep',password:'correct-horse-1'}});
 assert.equal(owner.status,201,owner.text);
 const first=await uploadPhase(owner.data.token,16,'next');
 const learned=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(learned.status,200,learned.text);
 assert.equal(learned.data.activated,true);
 const weights=learned.data.policy.weights;
 await removeMatches(owner.data.token,first);
 await uploadPhase(owner.data.token,8,'next');
 await uploadPhase(owner.data.token,8,'extraDraw');
 const again=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(again.status,200,again.text);
 assert.equal(again.data.replaced,false);
 assert.equal(again.data.activated,false);
 assert.match(again.data.notice,/沒有覆蓋/);
 assert.equal(again.data.candidate.validation.evaluationSufficient,true);
 assert.equal(again.data.candidate.validation.accepted,false);
 assert.equal(again.data.candidate.validation.acceptReason,'agreement-below-threshold');
 assert.deepEqual(again.data.policy.weights,weights);
 const reloaded=await api('/api/coach/policy',{token:owner.data.token});
 assert.deepEqual(reloaded.data.policy.weights,weights);
 assert.equal(reloaded.data.policy.previous,undefined);
});

test('a passed model stays after reload and restoring it leaves another account alone',async()=>{
 const owner=await api('/api/register',{method:'POST',body:{username:'learn_swap',password:'correct-horse-1'}});
 const other=await api('/api/register',{method:'POST',body:{username:'learn_swap_side',password:'correct-horse-1'}});
 assert.equal(owner.status,201,owner.text);
 assert.equal(other.status,201,other.text);
 const sideIds=await uploadPhase(other.data.token,16,'next');
 const sideLearned=await api('/api/coach/learn',{method:'POST',token:other.data.token,body:{}});
 assert.equal(sideLearned.data.activated,true);
 const sideWeights=sideLearned.data.policy.weights;
 const firstIds=await uploadPhase(owner.data.token,16,'next');
 const first=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(first.data.activated,true);
 assert.equal(first.data.policy.validation.accepted,true);
 const weights=first.data.policy.weights;
 const loaded=await api('/api/coach/policy',{token:owner.data.token});
 assert.deepEqual(loaded.data.policy.weights,weights);
 assert.equal(loaded.data.canRestore,false);
 await removeMatches(owner.data.token,firstIds);
 await uploadPhase(owner.data.token,16,'extraDraw');
 const second=await api('/api/coach/learn',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(second.data.replaced,true);
 assert.equal(second.data.activated,true);
 assert.notDeepEqual(second.data.policy.weights,weights);
 const beforeRestore=await api('/api/coach/policy',{token:owner.data.token});
 assert.equal(beforeRestore.data.canRestore,true);
 assert.equal(beforeRestore.data.policy.previous,undefined);
 const restored=await api('/api/coach/policy/restore',{method:'POST',token:owner.data.token,body:{}});
 assert.equal(restored.status,200,restored.text);
 assert.equal(restored.data.restored,true);
 assert.deepEqual(restored.data.policy.weights,weights);
 assert.equal(restored.data.policy.previous,undefined);
 const after=await api('/api/coach/policy',{token:owner.data.token});
 assert.deepEqual(after.data.policy.weights,weights);
 const sideAfter=await api('/api/coach/policy',{token:other.data.token});
 assert.deepEqual(sideAfter.data.policy.weights,sideWeights);
 const sideMatches=await api('/api/coach/matches',{token:other.data.token});
 assert.equal(sideMatches.data.matches.length,sideIds.length);
});
