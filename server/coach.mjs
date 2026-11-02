// Login-protected storage for solo-vs-computer training rows.
// Debug replays live in their own table and are never part of the export.
import {randomBytes} from 'node:crypto';
import {ApiError} from './domain.mjs';
import {DECISION_CLASSES,UNFINISHED_ENDINGS,classifyDecision} from '../dist/universal-v2/coach-format.mjs';
import {readPolicy,trainPolicy} from '../dist/universal-v2/learn-policy.mjs';

const MATCH_ID=/^m[a-f0-9]{32}$/;
const LINK_ID=/^k[a-f0-9]{32}$/;
const CLIENT_KEY=/^[a-z0-9:-]{8,80}$/;
const END_REASONS=new Set(['life-zero','unblocked-attack','required-draw-empty','finished','conceded',...UNFINISHED_ENDINGS]);
const UNFINISHED=new Set(UNFINISHED_ENDINGS);
const CLASSES=new Set(DECISION_CLASSES);
const REASONS=new Set(['','energy','base','clear','attack-order']);
const BANNED=/^(password|username|chat|token|cookie|authorization|secret|deckorder)$/i;
const MAX_MATCHES=40;
const MAX_STEPS=1500;
const MAX_DEMOS=80;
const MAX_REPLAYS=10;
const MAX_PAYLOAD=180000;
const MAX_REPLAY=900000;

const id=prefix=>prefix+randomBytes(8).toString('hex');
const iso=now=>new Date(now).toISOString();
const same=a=>JSON.stringify(a);

function banned(value,seen=new Set()){
 if(value===null||typeof value!=='object')return;
 if(seen.has(value))throw new ApiError(400,'紀錄無法讀取。');
 seen.add(value);
 if(Array.isArray(value)){
  if(value.length>800)throw new ApiError(400,'紀錄太長。');
  for(const item of value)banned(item,seen);
  return;
 }
 for(const [key,child] of Object.entries(value)){
  if(BANNED.test(key))throw new ApiError(400,'紀錄不能包含帳號、密碼或聊天內容。');
  if((key==='deck'||key==='life')&&Array.isArray(child))
   throw new ApiError(400,'訓練紀錄不能包含牌序或未公開生命。');
  banned(child,seen);
 }
}
function trainingShape(value,seen=new Set()){
 banned(value,seen);
 if(value===null||typeof value!=='object')return;
 if(Array.isArray(value)){
  for(const item of value)trainingShape(item);
  return;
 }
 for(const [key,child] of Object.entries(value)){
  if(key==='winner'||key==='endReason'||key==='completed'||key==='initialCounts'||key==='seed')
   throw new ApiError(400,'勝敗只能作為對局標籤，不能放進模型輸入。');
  trainingShape(child);
 }
}
function text(value,max,label){
 if(typeof value!=='string'||value.length<1||value.length>max||!/^[\w.+-]+$/.test(value))
  throw new ApiError(400,label+'不正確。');
 return value;
}
function deckOf(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'牌組不正確。');
 const title=text(input.title,40,'牌組作品');
 if(!input.counts||typeof input.counts!=='object'||Array.isArray(input.counts))
  throw new ApiError(400,'牌組張數不正確。');
 const counts={};
 let total=0;
 for(const key of Object.keys(input.counts).sort()){
  if(!/^[A-Z0-9][A-Z0-9-]{1,24}$/.test(key))throw new ApiError(400,'牌組卡號不正確。');
  const n=input.counts[key];
  if(!Number.isInteger(n)||n<1||n>4)throw new ApiError(400,'牌組張數不正確。');
  counts[key]=n;
  total+=n;
 }
 if(total<1||total>50||Object.keys(counts).length>50)throw new ApiError(400,'牌組張數不正確。');
 return {title,counts};
}
function poolOf(input){
 if(!input||!Array.isArray(input.titles)||!Array.isArray(input.versions)||
  input.titles.length!==2||input.versions.length!==2)
  throw new ApiError(400,'卡池不正確。');
 return {
  titles:input.titles.map(title=>text(title,40,'卡池')),
  versions:input.versions.map(version=>text(version,80,'卡池版本'))
 };
}
function headerOf(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'紀錄不正確。');
 if(body.channel!=='solo'&&body.channel!=='online')throw new ApiError(400,'對局模式不正確。');
 if(typeof body.matchId!=='string'||!MATCH_ID.test(body.matchId))throw new ApiError(400,'對局編號不正確。');
 const header={
  matchId:body.matchId,
  channel:body.channel,
  engine:text(body.engine,40,'引擎'),
  engineVersion:text(body.engineVersion,40,'引擎版本'),
  pool:poolOf(body.pool),
  aiVersion:text(body.aiVersion,40,'AI 版本'),
  deck:deckOf(body.deck)
 };
 if(header.engine!=='universal-v2')throw new ApiError(400,'引擎不正確。');
 if(body.mode!=null){
  if(body.mode!==body.channel)throw new ApiError(400,'對局模式不正確。');
  header.mode=body.mode;
 }
 if(body.matchLink!=null){
  const own=body.matchLink===body.matchId;
  const shared=typeof body.matchLink==='string'&&LINK_ID.test(body.matchLink);
  if(!own&&!shared)throw new ApiError(400,'對局連結不正確。');
  if(body.channel==='online'&&!shared)throw new ApiError(400,'對局連結不正確。');
  header.matchLink=body.matchLink;
 }else if(body.channel==='online')throw new ApiError(400,'對局連結不正確。');
 if(body.channel==='online'&&header.aiVersion!=='none')throw new ApiError(400,'線上對戰沒有電腦版本。');
 return header;
}
function actionOf(input,label){
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.type!=='string'||
  input.type.length<1||input.type.length>60)throw new ApiError(400,label+'不正確。');
 const encoded=JSON.stringify(input);
 if(encoded.length>4000)throw new ApiError(400,label+'太長。');
 banned(input);
 return input;
}
function handOf(value,visible){
 if(!visible){
  if(value!==null)throw new ApiError(400,'訓練紀錄不能包含對手的隱藏手牌。');
  return null;
 }
 if(!Array.isArray(value)||value.length>60)throw new ApiError(400,'手牌紀錄不正確。');
 return value.map(card=>{
  if(!card||typeof card.uid!=='string'||typeof card.cardId!=='string'||
   !/^[\w-]{1,40}$/.test(card.uid)||!/^[A-Z0-9][A-Z0-9-]{1,24}$/.test(card.cardId)||
   Object.keys(card).some(key=>key!=='uid'&&key!=='cardId'))
   throw new ApiError(400,'手牌紀錄不正確。');
  return {uid:card.uid,cardId:card.cardId};
 });
}
function observationOf(input,seat){
 if(!input||typeof input!=='object'||!input.visible||typeof input.visible!=='object')
  throw new ApiError(400,'可見場面不正確。');
 if('winner' in input.visible||'endReason' in input||'completed' in input||
  'initialCounts' in input.visible||'seed' in input.visible)
  throw new ApiError(400,'勝敗只能作為對局標籤，不能放進模型輸入。');
 const players=input.visible.players;
 if(!Array.isArray(players)||players.length!==2)throw new ApiError(400,'可見場面不正確。');
 const visible={...input.visible,players:players.map((player,index)=>({
  ...player,
  hand:handOf(player?.hand,index===seat)
 }))};
 const observation={visible,private:null};
 if(input.private!=null){
  if(typeof input.private!=='object'||Array.isArray(input.private))throw new ApiError(400,'可見選牌不正確。');
  const priv={kind:text(String(input.private.kind||'').length?input.private.kind:'look',60,'選牌')};
  if(input.private.step!=null)priv.step=text(String(input.private.step),40,'選牌階段');
  if(input.private.inspected!=null){
   if(!Array.isArray(input.private.inspected)||input.private.inspected.length>60)
    throw new ApiError(400,'可見選牌不正確。');
   priv.inspected=input.private.inspected.map(card=>{
    if(!card||typeof card.uid!=='string'||typeof card.cardId!=='string')throw new ApiError(400,'可見選牌不正確。');
    return {uid:String(card.uid).slice(0,40),cardId:String(card.cardId).slice(0,40),
     name:String(card.name||'').slice(0,80),color:String(card.color||'').slice(0,20)};
   });
  }
  if(input.private.options!=null){
   if(!Array.isArray(input.private.options)||input.private.options.length>400)
    throw new ApiError(400,'可見選牌不正確。');
   priv.options=input.private.options.map(option=>({action:actionOf(option?.action,'選牌')}));
  }
  observation.private=priv;
 }
 trainingShape(observation);
 return observation;
}
function previousOf(input){
 if(input==null)return null;
 if(!input||typeof input!=='object'||!Number.isInteger(input.step)||input.step<0||input.step>=MAX_STEPS||
  typeof input.type!=='string'||input.type.length<1||input.type.length>60)
  throw new ApiError(400,'前一步紀錄不正確。');
 const out={step:input.step,type:input.type};
 if(input.replayIndex!=null){
  if(!Number.isInteger(input.replayIndex)||input.replayIndex<0||input.replayIndex>15000)
   throw new ApiError(400,'前一步紀錄不正確。');
  out.replayIndex=input.replayIndex;
 }
 if(input.clientKey!=null){
  if(typeof input.clientKey!=='string'||!CLIENT_KEY.test(input.clientKey))
   throw new ApiError(400,'前一步紀錄不正確。');
  out.clientKey=input.clientKey;
 }
 if(out.replayIndex==null&&out.clientKey==null)throw new ApiError(400,'前一步紀錄不正確。');
 return out;
}
function historyOf(input){
 if(input==null)return [];
 if(!Array.isArray(input)||input.length>40)throw new ApiError(400,'公開歷史不正確。');
 return input.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw new ApiError(400,'公開歷史不正確。');
  const out={};
  for(const [key,value] of Object.entries(item)){
   if(value!==null&&typeof value==='object')throw new ApiError(400,'公開歷史不能包含隱藏牌表。');
   if(BANNED.test(key)||key==='seed'||key==='initialCounts'||key==='winner')
    throw new ApiError(400,'公開歷史不能包含隱藏資訊或勝敗。');
   out[key]=typeof value==='string'?value.slice(0,80):value;
  }
  return out;
 });
}
function chainOf(body,clientKey){
 const chain=body.chain;
 if(!chain||chain.matchId!==body.matchId||chain.step!==body.step||chain.clientKey!==clientKey)
  throw new ApiError(400,'步驟串接不正確。');
 const previousStep=body.previous?body.previous.step:null;
 if(chain.previousStep!==previousStep)throw new ApiError(400,'步驟串接不正確。');
 return {matchId:body.matchId,step:body.step,previousStep,clientKey};
}
function anonymousId(repos,user,now){
 const existing=repos.coachIdentity(user.id);
 if(existing)return existing;
 const created=id('a');
 repos.insertCoachIdentity(user.id,created,iso(now));
 return created;
}
function ensureMatch(repos,user,anonymous,header,now){
 const stamp=iso(now);
 const existing=repos.coachMatch(user.id,header.matchId);
 const headerJson=JSON.stringify(header);
 if(!existing){
  if(repos.coachMatchCount(user.id)>=MAX_MATCHES)
   throw new ApiError(400,'紀錄已達 40 場，請先刪除舊資料。');
  repos.insertCoachMatch({
   id:header.matchId,userId:user.id,anonymousId:anonymous,engine:header.engine,
   engineVersion:header.engineVersion,poolJson:JSON.stringify(header.pool),
   aiVersion:header.aiVersion,deckJson:JSON.stringify(header.deck),headerJson,
   createdAt:stamp,updatedAt:stamp
  });
  return;
 }
 if(existing.headerJson!==headerJson)
  throw new ApiError(409,'這場對局的牌組或版本與已保存的紀錄不同。');
 repos.touchCoachMatch(user.id,header.matchId,stamp);
}
function stored(payload){
 const text=JSON.stringify(payload);
 if(text.length>MAX_PAYLOAD)throw new ApiError(413,'這一筆訓練紀錄太大。');
 return text;
}

const LEARN_STEP_LIMIT=4000;
function loadPolicy(repos,userId){
 const row=repos.coachPolicy(userId);
 if(!row?.policyJson)return null;
 try{return readPolicy(JSON.parse(row.policyJson));}
 catch{return null;}
}
function learningRows(repos,userId){
 const rows=[];
 for(const step of repos.listCoachTrainingSteps(userId,LEARN_STEP_LIMIT)){
  try{rows.push(JSON.parse(step.payloadJson));}catch{/* A damaged row is ignored. */}
 }
 for(const demo of repos.listCoachDemos(userId)){
  let body=null;
  try{body=JSON.parse(demo.payloadJson);}catch{continue;}
  if(!body?.correction||!Array.isArray(body.legal)||body.legal.length<2||!body.observation)continue;
  rows.push({
   source:'human',actor:'human',seat:body.seat===0?0:1,matchId:body.matchId,
   forced:false,legal:body.legal,choice:body.correction,observation:body.observation
  });
 }
 return rows;
}
function learnPolicy(repos,user,now){
 let policy;
 try{policy=trainPolicy(learningRows(repos,user.id));}
 catch(error){throw new ApiError(400,error?.message||'這些紀錄還不夠學習。');}
 const storedPolicy={...policy,createdAt:iso(now)};
 const encoded=JSON.stringify(storedPolicy);
 if(encoded.length>200000)throw new ApiError(413,'學習結果太大。');
 repos.saveCoachPolicy(user.id,encoded,storedPolicy.createdAt);
 return {policy:storedPolicy};
}

export function coachHttp(method,path){
 if(path==='/api/coach/learn'&&method==='POST')return {op:'coachLearn'};
 if(path==='/api/coach/policy'&&method==='GET')return {op:'coachPolicy'};
 if(path==='/api/coach/policy'&&method==='DELETE')return {op:'coachDeletePolicy'};
 if(path==='/api/coach/steps'&&method==='POST')return {op:'coachStep'};
 if(path==='/api/coach/labels'&&method==='POST')return {op:'coachLabel'};
 if(path==='/api/coach/matches'&&method==='GET')return {op:'coachList'};
 if(path==='/api/coach/export'&&method==='GET')return {op:'coachExport'};
 if(path==='/api/coach/export.jsonl'&&method==='GET')return {op:'coachExport',format:'jsonl'};
 if(path==='/api/coach'&&method==='DELETE')return {op:'coachDeleteAll'};
 if(path==='/api/coach/demos'&&method==='GET')return {op:'coachListDemos'};
 if(path==='/api/coach/demos'&&method==='POST')return {op:'coachDemo'};
 if(path==='/api/coach/debug-replays'&&method==='POST')return {op:'coachDebug',limit:MAX_REPLAY+4096};
 const match=path.match(/^\/api\/coach\/matches\/(m[a-f0-9]{32})$/);
 if(match&&method==='GET')return {op:'coachMatch',matchId:match[1]};
 if(match&&method==='DELETE')return {op:'coachDeleteMatch',matchId:match[1]};
 const demo=path.match(/^\/api\/coach\/demos\/(c[a-f0-9]{16})$/);
 if(demo&&method==='GET')return {op:'coachDemoOne',demoId:demo[1]};
 if(demo&&method==='DELETE')return {op:'coachDeleteDemo',demoId:demo[1]};
 const replay=path.match(/^\/api\/coach\/debug-replays\/(r[a-f0-9]{16})$/);
 if(replay&&method==='GET')return {op:'coachDebugOne',replayId:replay[1]};
 if(replay&&method==='DELETE')return {op:'coachDeleteDebug',replayId:replay[1]};
 return null;
}

export function dispatchCoach(repos,user,message,now){
 const anonymous=anonymousId(repos,user,now);
 switch(message.op){
  case 'coachStep':return saveStep(repos,user,anonymous,message.body,now);
  case 'coachLabel':return saveLabel(repos,user,anonymous,message.body,now);
  case 'coachDemo':return saveDemo(repos,user,anonymous,message.body,now);
  case 'coachDebug':return saveDebug(repos,user,anonymous,message.body,now);
  case 'coachList':return listMatches(repos,user,anonymous);
  case 'coachMatch':return matchDetail(repos,user,anonymous,message.matchId);
  case 'coachExport':return message.format==='jsonl'
    ?{jsonl:exportJsonl(repos,user,anonymous)}
    :exportTraining(repos,user,anonymous);
  case 'coachListDemos':return {anonymousId:anonymous,demonstrations:repos.listCoachDemos(user.id).map(publicDemo)};
  case 'coachDemoOne':return oneDemo(repos,user,message.demoId);
  case 'coachDebugOne':return oneDebug(repos,user,message.replayId);
  case 'coachDeleteMatch':{
   if(!repos.coachMatch(user.id,message.matchId))throw new ApiError(404,'找不到這場紀錄。');
   repos.deleteCoachMatch(user.id,message.matchId);
   return {ok:true};
  }
  case 'coachDeleteDemo':{
   if(!repos.coachDemo(user.id,message.demoId))throw new ApiError(404,'找不到這段示範。');
   repos.deleteCoachDemo(user.id,message.demoId);
   return {ok:true};
  }
  case 'coachDeleteDebug':{
   if(!repos.coachDebug(user.id,message.replayId))throw new ApiError(404,'找不到這份除錯重播。');
   repos.deleteCoachDebug(user.id,message.replayId);
   return {ok:true};
  }
  case 'coachDeleteAll':
   repos.deleteCoachUser(user.id);
   return {ok:true};
  case 'coachLearn':return learnPolicy(repos,user,now);
  case 'coachPolicy':return {policy:loadPolicy(repos,user.id)};
  case 'coachDeletePolicy':
   repos.deleteCoachPolicy(user.id);
   return {ok:true};
  default:throw new ApiError(404,'找不到這個功能。');
 }
}

function saveStep(repos,user,anonymous,body,now){
 banned(body);
 if(body?.format==='ua-v2-coach-step-v2')return saveStepV2(repos,user,anonymous,body,now);
 const header=headerOf(body);
 if(body.format!=='ua-v2-coach-step-v1')throw new ApiError(400,'決策格式不正確。');
 if(body.actor!=='human'||body.seat!==0||body.source==='ai')throw new ApiError(400,'AI 操作不能當成玩家示範。');
 if(!Number.isInteger(body.step)||body.step<0||body.step>=MAX_STEPS)throw new ApiError(400,'步驟編號不正確。');
 if(!Number.isInteger(body.replayIndex)||body.replayIndex<0||body.replayIndex>15000)
  throw new ApiError(400,'步驟順序不正確。');
 const clientKey=header.matchId+':'+body.step+':human';
 if(body.clientKey!==clientKey||!CLIENT_KEY.test(clientKey))throw new ApiError(400,'步驟編號不正確。');
 const choice=actionOf(body.choice,'玩家選擇');
 if(!Array.isArray(body.legal)||body.legal.length<1||body.legal.length>500)
  throw new ApiError(400,'合法操作紀錄不正確。');
 const legal=body.legal.map(action=>actionOf(action,'合法操作'));
 const choiceIndex=legal.findIndex(action=>same(action)===same(choice));
 if(choiceIndex<0)throw new ApiError(400,'玩家選擇不在當時的合法操作裡。');
 const payload={
  format:'ua-v2-coach-step-v1',clientKey,step:body.step,replayIndex:body.replayIndex,
  actor:'human',seat:0,...header,observation:observationOf(body.observation,0),
  legal,choice,choiceIndex,previous:previousOf(body.previous)
 };
 const encoded=stored(payload);
 ensureMatch(repos,user,anonymous,header,now);
 const prior=repos.coachStepByKey(user.id,clientKey);
 if(prior){
  if(prior.payloadJson!==encoded)throw new ApiError(409,'同一步驟已經有不同的紀錄。');
  return {id:prior.id,matchId:header.matchId,step:body.step,anonymousId:anonymous,duplicate:true};
 }
 if(body.step!==repos.coachStepCount(user.id,header.matchId))
  throw new ApiError(409,'步驟順序不連續。');
 const rowId=id('s');
 repos.insertCoachStep({id:rowId,matchId:header.matchId,userId:user.id,step:body.step,clientKey,payloadJson:encoded,createdAt:iso(now)});
 return {id:rowId,matchId:header.matchId,step:body.step,anonymousId:anonymous,duplicate:false};
}

function saveStepV2(repos,user,anonymous,body,now){
 const header=headerOf(body);
 if(body.source!=='human'||body.actor!=='human')throw new ApiError(400,'AI 操作不能當成玩家示範。');
 if(body.channel==='solo'&&body.seat!==0)throw new ApiError(400,'單人對戰只記錄玩家自己的座位。');
 if(body.channel==='online'&&body.seat!==0&&body.seat!==1)throw new ApiError(400,'線上對戰的座位不正確。');
 if('seed' in body||'initialCounts' in body||'replay' in body||'winner' in body||'endReason' in body)
  throw new ApiError(400,'訓練紀錄不能包含牌序、種子或勝敗。');
 if(!Number.isInteger(body.step)||body.step<0||body.step>=MAX_STEPS)throw new ApiError(400,'步驟編號不正確。');
 let clientKey=header.matchId+':'+body.step+':human';
 if(body.channel==='online'){
  if(!Number.isInteger(body.engineRevision)||body.engineRevision<0||body.engineRevision>20000)
   throw new ApiError(400,'步驟順序不正確。');
  clientKey=header.matchId+':r'+body.engineRevision+':human';
 }else if(!Number.isInteger(body.replayIndex)||body.replayIndex<0||body.replayIndex>15000)
  throw new ApiError(400,'步驟順序不正確。');
 if(body.clientKey!==clientKey||!CLIENT_KEY.test(clientKey))throw new ApiError(400,'步驟編號不正確。');
 if(!CLASSES.has(body.decisionClass))throw new ApiError(400,'決策類型不正確。');
 const choice=actionOf(body.choice,'玩家選擇');
 if(classifyDecision(choice)!==body.decisionClass)throw new ApiError(400,'決策類型和實際選擇不一致。');
 if(!Array.isArray(body.legal)||body.legal.length<1||body.legal.length>500)
  throw new ApiError(400,'合法操作紀錄不正確。');
 const legal=body.legal.map(action=>actionOf(action,'合法操作'));
 if(body.forced!==(legal.length===1))throw new ApiError(400,'唯一合法選項的標記不正確。');
 const choiceIndex=legal.findIndex(action=>same(action)===same(choice));
 if(choiceIndex<0)throw new ApiError(400,'玩家選擇不在當時的合法操作裡。');
 const observation=observationOf(body.observation,body.seat);
 if(body.turn!==observation.visible.turn||body.phase!==observation.visible.phase)
  throw new ApiError(400,'回合或階段和當時的場面不一致。');
 const publicHistory=historyOf(body.publicHistory);
 const previous=previousOf(body.previous);
 const payload={
  format:'ua-v2-coach-step-v2',clientKey,step:body.step,source:'human',actor:'human',seat:body.seat,
  anonymousId:anonymous,...header,turn:body.turn,phase:body.phase,
  ...(body.channel==='solo'?{replayIndex:body.replayIndex}:{engineRevision:body.engineRevision}),
  observation,publicHistory,legal,choice,choiceIndex,forced:body.forced,decisionClass:body.decisionClass,
  previous,chain:chainOf({...body,previous},clientKey)
 };
 const encoded=stored(payload);
 ensureMatch(repos,user,anonymous,header,now);
 const prior=repos.coachStepByKey(user.id,clientKey);
 if(prior){
  if(prior.payloadJson!==encoded)throw new ApiError(409,'同一步驟已經有不同的紀錄。');
  return {id:prior.id,matchId:header.matchId,step:body.step,anonymousId:anonymous,duplicate:true};
 }
 if(body.step!==repos.coachStepCount(user.id,header.matchId))
  throw new ApiError(409,'步驟順序不連續。');
 const rowId=id('s');
 repos.insertCoachStep({id:rowId,matchId:header.matchId,userId:user.id,step:body.step,clientKey,payloadJson:encoded,createdAt:iso(now)});
 return {id:rowId,matchId:header.matchId,step:body.step,anonymousId:anonymous,duplicate:false};
}

function saveLabel(repos,user,anonymous,body,now){
 banned(body);
 const header=headerOf(body);
 if(body.format!=='ua-v2-coach-label-v1'&&body.format!=='ua-v2-coach-label-v2')
  throw new ApiError(400,'對局結果格式不正確。');
 if(typeof body.completed!=='boolean'||!END_REASONS.has(body.endReason))
  throw new ApiError(400,'對局結果不正確。');
 if(UNFINISHED.has(body.endReason)){
  if(body.completed!==false||body.winner!==null)
   throw new ApiError(400,'中斷、放棄、錯誤或未完成不能記成勝敗。');
 }else if(body.endReason==='conceded'){
  if(body.completed!==false||(body.winner!==0&&body.winner!==1))
   throw new ApiError(400,'認輸結果不正確。');
 }else if(body.completed!==true||(body.winner!==0&&body.winner!==1))
  throw new ApiError(400,'對局結果缺少勝敗。');
 const label={completed:body.completed,winner:body.winner,endReason:body.endReason};
 ensureMatch(repos,user,anonymous,header,now);
 const existing=repos.coachMatch(user.id,header.matchId);
 if(existing.endReason){
  const current={completed:!!existing.completed,winner:existing.winner,endReason:existing.endReason};
  if(same(current)!==same(label))throw new ApiError(409,'這場對局的結果已經保存。');
  return {matchId:header.matchId,anonymousId:anonymous,duplicate:true,label};
 }
 repos.labelCoachMatch(user.id,header.matchId,label,iso(now));
 return {matchId:header.matchId,anonymousId:anonymous,duplicate:false,label};
}

function demoPayload(body,header){
 if(body.format!=='ua-v2-coach-demo-v1')throw new ApiError(400,'示範格式不正確。');
 if(body.seat!==1)throw new ApiError(400,'示範必須使用電腦當時自己的可見場面。');
 if(!Number.isInteger(body.step)||body.step<0||body.step>=MAX_STEPS)throw new ApiError(400,'步驟編號不正確。');
 if(!Number.isInteger(body.replayIndex)||body.replayIndex<0||body.replayIndex>15000)
  throw new ApiError(400,'步驟順序不正確。');
 const clientKey=header.matchId+':ai:'+body.replayIndex;
 if(body.clientKey!==clientKey)throw new ApiError(400,'示範編號不正確。');
 if(!REASONS.has(body.reason||''))throw new ApiError(400,'理由不正確。');
 const original=actionOf(body.original,'電腦原選擇');
 const legal=Array.isArray(body.legal)?body.legal.map(action=>actionOf(action,'合法操作')):[];
 if(legal.length<1||legal.length>500||!legal.some(action=>same(action)===same(original)))
  throw new ApiError(400,'電腦原選擇不在當時的合法操作裡。');
 let correction=null,demonstration=[];
 if(body.correction!=null){
  correction=actionOf(body.correction,'修正');
  if(!Array.isArray(body.demonstration)||body.demonstration.length<1||body.demonstration.length>8)
   throw new ApiError(400,'示範序列不正確。');
  demonstration=body.demonstration.map(action=>actionOf(action,'示範'));
  if(same(demonstration[0])!==same(correction))throw new ApiError(400,'示範必須從修正的那一步開始。');
  if(demonstration.length===1&&same(correction)===same(original))
   throw new ApiError(400,'請改一個做法，或接上後續操作。');
 }
 const payload={
  format:'ua-v2-coach-demo-v1',clientKey,step:body.step,replayIndex:body.replayIndex,seat:1,
  ...header,observation:observationOf(body.observation,1),legal,original,correction,
  demonstration,reason:body.reason||''
 };
 return {clientKey,payload,encoded:stored(payload)};
}
function saveDemo(repos,user,anonymous,body,now){
 banned(body);
 const header=headerOf(body);
 const built=demoPayload(body,header);
 ensureMatch(repos,user,anonymous,header,now);
 const prior=repos.coachDemoByKey(user.id,built.clientKey);
 if(prior){
  if(prior.payloadJson===built.encoded)
   return {id:prior.id,matchId:header.matchId,anonymousId:anonymous,duplicate:true};
  const old=JSON.parse(prior.payloadJson);
  if(old.correction==null&&built.payload.correction!=null){
   repos.updateCoachDemo(user.id,built.clientKey,built.encoded);
   return {id:prior.id,matchId:header.matchId,anonymousId:anonymous,duplicate:false,updated:true};
  }
  throw new ApiError(409,'這一步的示範已經保存。');
 }
 if(repos.coachDemoCount(user.id)>=MAX_DEMOS)throw new ApiError(400,'示範已達 80 筆，請先刪除舊資料。');
 const rowId=id('c');
 repos.insertCoachDemo({id:rowId,matchId:header.matchId,userId:user.id,step:body.step,clientKey:built.clientKey,payloadJson:built.encoded,createdAt:iso(now)});
 return {id:rowId,matchId:header.matchId,anonymousId:anonymous,duplicate:false};
}

function saveDebug(repos,user,anonymous,body,now){
 banned(body);
 const header=headerOf(body.header||body);
 const replay=body.replay;
 if(!replay||replay.format!=='ua-universal-v2-preview'||replay.version!==1||!Array.isArray(replay.actions))
  throw new ApiError(400,'除錯重播格式不正確。');
 banned(replay);
 const encoded=JSON.stringify(replay);
 if(encoded.length>MAX_REPLAY)throw new ApiError(413,'除錯重播太大。訓練步驟請分開保存。');
 const clientKey=header.matchId+':debug';
 ensureMatch(repos,user,anonymous,header,now);
 const prior=repos.coachDebugByKey(user.id,clientKey);
 if(prior){
  if(prior.payloadJson!==encoded)throw new ApiError(409,'這場除錯重播已經保存。');
  return {id:prior.id,matchId:header.matchId,anonymousId:anonymous,duplicate:true};
 }
 if(repos.coachDebugCount(user.id)>=MAX_REPLAYS)throw new ApiError(400,'除錯重播已達 10 份，請先刪除舊檔。');
 const rowId=id('r');
 repos.insertCoachDebug({id:rowId,matchId:header.matchId,userId:user.id,clientKey,payloadJson:encoded,createdAt:iso(now)});
 return {id:rowId,matchId:header.matchId,anonymousId:anonymous,duplicate:false};
}

function publicMatch(row){
 const deck=JSON.parse(row.deckJson);
 let channel='solo',mode='solo';
 if(row.headerJson){
  try{
   const header=JSON.parse(row.headerJson);
   channel=header.channel||channel;
   mode=header.mode||channel;
  }catch{/* Older rows still list without a mode. */}
 }
 const unfinished=UNFINISHED.has(row.endReason);
 return {id:row.id,createdAt:row.createdAt,updatedAt:row.updatedAt,engine:row.engine||'universal-v2',
  channel,mode,aiVersion:row.aiVersion,title:deck.title,steps:Number(row.steps||0),demos:Number(row.demos||0),
  label:row.endReason?{completed:!!row.completed,winner:unfinished?null:row.winner,endReason:row.endReason,unfinished}:null};
}
function publicDemo(row){
 const payload=JSON.parse(row.payloadJson);
 return {id:row.id,matchId:row.matchId,step:row.step,createdAt:row.createdAt,
  replayIndex:payload.replayIndex,reason:payload.reason,original:payload.original,
  correction:payload.correction,demonstration:payload.demonstration,
  observation:payload.observation,aiVersion:payload.aiVersion};
}
function listMatches(repos,user,anonymous){
 return {anonymousId:anonymous,matches:repos.listCoachMatches(user.id).map(publicMatch)};
}
function matchDetail(repos,user,anonymous,matchId){
 const row=repos.coachMatch(user.id,matchId);
 if(!row)throw new ApiError(404,'找不到這場紀錄。');
 const debug=repos.coachDebugForMatch(user.id,matchId);
 return {
  anonymousId:anonymous,
  match:{...publicMatch({...row,engine:row.engine,steps:repos.coachStepCount(user.id,matchId),demos:repos.listCoachDemos(user.id,matchId).length}),
   engineVersion:row.engineVersion,pool:JSON.parse(row.poolJson),deck:JSON.parse(row.deckJson)},
  steps:repos.listCoachSteps(user.id,matchId).map(step=>({id:step.id,createdAt:step.createdAt,...JSON.parse(step.payloadJson)})),
  demonstrations:repos.listCoachDemos(user.id,matchId).map(publicDemo),
  debugReplay:debug?{id:debug.id,bytes:debug.bytes,createdAt:debug.createdAt}:null
 };
}
function exportTraining(repos,user,anonymous){
 const matches=repos.listCoachMatches(user.id).map(row=>{
  const full=repos.coachMatch(user.id,row.id);
  return {
   matchId:row.id,anonymousId:anonymous,engine:full.engine,engineVersion:full.engineVersion,
   pool:JSON.parse(full.poolJson),aiVersion:full.aiVersion,deck:JSON.parse(full.deckJson),
   label:full.endReason?{completed:!!full.completed,winner:UNFINISHED.has(full.endReason)?null:full.winner,endReason:full.endReason,unfinished:UNFINISHED.has(full.endReason)}:null,
   steps:repos.listCoachSteps(user.id,row.id).map(step=>JSON.parse(step.payloadJson)).filter(step=>step.source!=='ai'&&step.actor!=='ai')
  };
 });
 return {
  format:'ua-v2-coach-export-v1',anonymousId:anonymous,
  note:'模型輸入是每步的 observation、legal 與 choice。label 只放在對局層。此檔不含除錯重播。AI 原操作不在 steps。上傳這些資料不會讓目前的 AI 變強。',
  matches,
  demonstrations:repos.listCoachDemos(user.id).map(publicDemo)
 };
}
function exportJsonl(repos,user,anonymous){
 const lines=[JSON.stringify({
  record:'manifest',format:'ua-v2-coach-jsonl-v1',anonymousId:anonymous,
  note:'每一行是同意玩家自己的決策，或對局結果標籤。不含除錯重播、對手隱藏手牌、未知牌序、未公開生命或可還原牌序的種子。AI 操作與賽後修正不在這個檔案。收集完成不等於模型已經訓練。'
 })];
 for(const row of repos.listCoachMatches(user.id)){
  const full=repos.coachMatch(user.id,row.id);
  const header=JSON.parse(full.headerJson);
  const steps=repos.listCoachSteps(user.id,row.id).map(step=>JSON.parse(step.payloadJson))
   .filter(step=>step.source!=='ai'&&step.actor!=='ai');
  for(const step of steps)lines.push(JSON.stringify({...step,record:'decision',anonymousId:anonymous}));
  const unfinished=UNFINISHED.has(full.endReason);
  lines.push(JSON.stringify({
   record:'result',matchId:row.id,anonymousId:anonymous,channel:header.channel||'solo',
   mode:header.mode||header.channel||'solo',engine:full.engine,engineVersion:full.engineVersion,
   pool:JSON.parse(full.poolJson),deck:JSON.parse(full.deckJson),aiVersion:full.aiVersion,
   seat:steps[0]?.seat??null,
   completed:full.endReason?!!full.completed:null,
   winner:full.endReason&&!unfinished?full.winner:null,
   endReason:full.endReason||null,unfinished
  }));
 }
 return lines.join('\n')+'\n';
}
function oneDemo(repos,user,demoId){
 const row=repos.coachDemo(user.id,demoId);
 if(!row)throw new ApiError(404,'找不到這段示範。');
 return publicDemo(row);
}
function oneDebug(repos,user,replayId){
 const row=repos.coachDebug(user.id,replayId);
 if(!row)throw new ApiError(404,'找不到這份除錯重播。');
 return {id:row.id,matchId:row.matchId,createdAt:row.createdAt,replay:JSON.parse(row.payloadJson),
  warning:'這是除錯重播，含有牌序與私密選牌，不是訓練輸入。'};
}
