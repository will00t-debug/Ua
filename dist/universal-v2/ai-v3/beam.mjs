// Full-turn beam. Forced phase passes and order windows are resolution,
// not extra depth. A voluntary choice or an answer to the opponent is a
// decision. Once the actor yields, the opponent plays one turn and the
// actor answers blocks and triggers along the way.
import {legalUniversalActions,dispatchUniversalAction} from '../engine.mjs';
import {evaluate,terminalValue} from './eval.mjs';
import {archetypeRank,actionGroup} from './archetype.mjs';
import {combatRank} from './combat.mjs';

const ORDER_KINDS=new Set(['phase-order','retirement-order','effect-move-order',
 'effect-top-order','effect-raid-witness-order','effect-raid-witness-move',
 'life-batch-order']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function who(state){return state.pending?.player??state.active;}
function dedupe(state,actor,legal){
 const seen=new Set(),out=[];
 for(const action of legal){
  let key=JSON.stringify(action);
  if(['play','raid','move','step'].includes(action.type)&&Number.isInteger(action.slot)&&!action.replaceUid){
   const occupied=state.players[actor]?.[action.line]?.[action.slot];
   if(!occupied)key=JSON.stringify({...action,slot:'*empty*'});
  }
  if(seen.has(key))continue;
  seen.add(key);
  out.push(action);
 }
 return out;
}
export function isSafeAction(action){
 return action.type==='next'||action.mode==='skip'||action.mode==='decline'||action.uid==null;
}
function byText(a,b){
 const left=JSON.stringify(a),right=JSON.stringify(b);
 return left<right?-1:left>right?1:0;
}
export function rankLegal(pack,state,viewer,legal){
 const list=dedupe(state,viewer,legal);
 const rank=action=>archetypeRank(pack,state,viewer,action)+combatRank(pack,state,viewer,action);
 return [...list].sort((a,b)=>rank(b)-rank(a)||byText(a,b));
}
export function selectCandidates(pack,state,viewer,legal,beam){
 const ranked=rankLegal(pack,state,viewer,legal);
 const width=Math.max(1,beam||1);
 const picked=[],seen=new Set(),groups=new Set();
 const take=action=>{
  const key=JSON.stringify(action);
  if(seen.has(key))return;
  seen.add(key);
  picked.push(action);
 };
 for(const action of ranked){
  const group=actionGroup(state,viewer,action);
  if(groups.has(group))continue;
  groups.add(group);
  take(action);
  if(picked.length>=width)break;
 }
 for(const action of ranked){
  if(picked.length>=width)break;
  take(action);
 }
 const safe=ranked.find(isSafeAction);
 if(safe&&!picked.some(action=>same(action,safe))){
  if(picked.length<width)picked.push(safe);
  else picked[picked.length-1]=safe;
 }
 // Energy outranks a front play, and a width of four then never looks at the
 // front. Keep one front play so the search can compare it with energy.
 const front=ranked.find(action=>action.type==='play'&&action.line==='front');
 if(front&&!picked.some(action=>action.type==='play'&&action.line==='front')){
  if(picked.length<width)picked.push(front);
  else{
   const spare=picked.findIndex(action=>!isSafeAction(action));
   if(spare>=0)picked[spare]=front;
  }
 }
 const rank=action=>archetypeRank(pack,state,viewer,action)+combatRank(pack,state,viewer,action);
 picked.sort((a,b)=>rank(b)-rank(a)||byText(a,b));
 return picked;
}
function plain(value){
 if(value==null)return '';
 const kind=typeof value;
 if(kind==='string'||kind==='number'||kind==='boolean')return String(value);
 if(kind!=='object')return '';
 if(Array.isArray(value))return value.map(plain).join(',');
 return Object.keys(value).filter(key=>typeof value[key]!=='function').sort()
  .map(key=>key+'='+plain(value[key])).join(',');
}
function layerBits(card){
 if(!card)return '-';
 const stack=(card.stack||[]).map(layer=>layer?layer.uid+':'+layer.cardId+':'+(layer.faceDown?'d':'u')+':'+plain(layer.buffs):'-').join('>');
 const under=(card.under||[]).map(layer=>layer?layer.uid+':'+(layer.faceDown?'d':'u')+':'+plain(layer.buffs):'-').join('>');
 return [card.uid,card.cardId,card.ready?'r':'t',card.faceDown?'d':'u',card.fieldEntryStamp??'',
  plain(card.buffs),stack,under,card.raidBaseUid||'',plain(card.energyPlusUntil),plain(card.frontEnergyUntil)].join('~');
}
export function positionKey(state,actor,mode,left){
 const pending=plain(state.pending);
 const parts=[mode,left,state.status,state.phase,state.active,state.turn,state.attacksThisTurn??'',
  actor,pending,plain(state.onceEffectUses),plain(state.mainAbilityUsedUids),plain(state.delayedEffects),
  plain((state.effectQueue||[]).map(job=>job&&(job.op+':'+job.sourceUid+':'+plain(job.bp)))),
  plain(state.raidCount),plain(state.energyDoubles),plain(state.allFrontEnergy)];
 for(let p=0;p<2;p++){
  const player=state.players[p];
  parts.push(player.life.length,player.ownTurns??'',player.hand.length,player.deck.length,
   player.hand.map(card=>card.uid+':'+card.cardId).sort().join(','),
   player.deck.map(card=>card.cardId).join(','),
   (player.life||[]).map(card=>card?.cardId||'-').join(','),
   (player.apCards||[]).map(card=>card.cardId+':'+(card.ready?'r':'t')).join(','),
   plain((player.outside||[]).map(card=>card.cardId).sort()),
   plain((player.removed||[]).map(card=>card.cardId).sort()));
  for(const line of ['front','energy'])
   parts.push(player[line].map(layerBits).join('|'));
 }
 return parts.join(';');
}
function dispatch(pack,state,action){
 return dispatchUniversalAction(pack,state,action,{actor:who(state)});
}
const BATTLE_KINDS=new Set(['block','effect-block-floor','life-trigger']);
function room(ctx){
 return ctx.pool.n>0&&ctx.lineSpent<ctx.lineCap&&performance.now()<=ctx.deadline;
}
function spend(ctx){
 if(!room(ctx))return false;
 ctx.pool.n--;
 ctx.lineSpent++;
 return true;
}
function settleBattle(pack,state,actor,ctx){
 let cursor=state;
 for(let guard=0;guard<6&&cursor.status==='playing'&&cursor.pending&&
  BATTLE_KINDS.has(cursor.pending.kind)&&room(ctx);guard++){
  const seat=who(cursor);
  let legal;
  try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
  if(!legal.length)return cursor;
  const candidates=selectCandidates(pack,cursor,seat,legal,Math.min(4,ctx.beam));
  const maximize=seat===actor;
  let best=maximize?-Infinity:Infinity,chosen=null;
  for(const action of candidates){
   if(!room(ctx)){ctx.stats.budget++;break;}
   let next;
   try{next=dispatch(pack,cursor,action);}catch{ctx.stats.unsupported++;continue;}
   if(!spend(ctx)){ctx.stats.budget++;break;}
   const done=terminalValue(next,actor);
   const value=done!==null?done:evaluate(pack,next,actor);
   if(chosen===null||(maximize?value>best:value<best)){best=value;chosen=next;}
  }
  if(!chosen)return cursor;
  cursor=chosen;
  ctx.stats.responses++;
 }
 return cursor;
}
function autoAdvance(pack,state,ctx){
 let cursor=state;
 for(let guard=0;guard<10&&room(ctx)&&cursor.status==='playing';guard++){
  if(cursor.pending&&ORDER_KINDS.has(cursor.pending.kind)){
   let legal;
   try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
   if(!legal.length)return cursor;
   if(!room(ctx)){ctx.stats.budget++;return cursor;}
   try{cursor=dispatch(pack,cursor,legal[0]);}
   catch{ctx.stats.unsupported++;return cursor;}
   if(!spend(ctx)){ctx.stats.budget++;return cursor;}
   ctx.stats.orderSteps++;
   continue;
  }
  if(cursor.pending)break;
  let legal;
  try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
  if(legal.length===1&&legal[0].type==='next'){
   if(!room(ctx)){ctx.stats.budget++;return cursor;}
   try{cursor=dispatch(pack,cursor,legal[0]);}
   catch{ctx.stats.unsupported++;return cursor;}
   if(!spend(ctx)){ctx.stats.budget++;return cursor;}
   ctx.stats.orderSteps++;
   continue;
  }
  break;
 }
 return cursor;
}
function remember(ctx,key,value,mark){
 if(ctx.stats.budget===mark)ctx.tt.set(key,value);
 return value;
}
function searchFrom(pack,state,actor,ctx,mode,left){
 const done=terminalValue(state,actor);
 if(done!==null)return done;
 const key=positionKey(state,actor,mode,left);
 if(ctx.tt.has(key)){ctx.stats.transpositionHits++;return ctx.tt.get(key);}
 if(!room(ctx)){ctx.stats.budget++;return evaluate(pack,state,actor);}
 const mark=ctx.stats.budget;
 const cursor=settleBattle(pack,autoAdvance(pack,state,ctx),actor,ctx);
 const after=terminalValue(cursor,actor);
 if(after!==null)return remember(ctx,key,after,mark);
 if(mode==='them'&&!cursor.pending&&cursor.active===actor){
  return remember(ctx,key,evaluate(pack,cursor,actor),mark);
 }
 if(mode==='us'&&!cursor.pending&&cursor.active!==actor){
  ctx.stats.opponentTurns++;
  return remember(ctx,key,searchFrom(pack,cursor,actor,ctx,'them',ctx.opponentLeft),mark);
 }
 if(left<=0)return remember(ctx,key,evaluate(pack,cursor,actor),mark);
 const seat=who(cursor);
 let legal;
 try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return evaluate(pack,cursor,actor);}
 if(!legal.length)return evaluate(pack,cursor,actor);
 const candidates=selectCandidates(pack,cursor,seat,legal,ctx.beam);
 const maximize=seat===actor;
 let best=maximize?-Infinity:Infinity,compared=0;
 for(const action of candidates){
  if(!room(ctx)){ctx.stats.budget++;break;}
  let next;
  try{next=dispatch(pack,cursor,action);}catch{ctx.stats.unsupported++;continue;}
  if(!spend(ctx)){ctx.stats.budget++;break;}
  try{next=settleBattle(pack,next,actor,ctx);}catch{ctx.stats.unsupported++;continue;}
  compared++;
  if(seat===actor)ctx.stats.actorDecisions++;
  else ctx.stats.responses++;
  const value=searchFrom(pack,next,actor,ctx,mode,left-1);
  if(maximize?value>best:value<best)best=value;
 }
 if(!compared)best=evaluate(pack,cursor,actor);
 return remember(ctx,key,best,mark);
}
export function scoreLine(pack,state,actor,action,limits){
 const pool=limits.pool||{n:limits.nodes};
 const lineCap=Math.min(limits.nodes,pool.n);
 const ctx={
  pool,lineCap,lineSpent:0,
  deadline:limits.deadline??Infinity,
  beam:limits.beam,
  opponentLeft:limits.opponentDecisions,
  tt:limits.tt||new Map(),
  stats:{orderSteps:0,transpositionHits:0,unsupported:0,budget:0,opponentTurns:0,responses:0,actorDecisions:0}
 };
 if(!room(ctx))return {search:evaluate(pack,state,actor),nodes:0,...ctx.stats};
 let next;
 try{next=dispatch(pack,state,action);}catch{return null;}
 if(!spend(ctx))return {search:evaluate(pack,next,actor),nodes:0,...ctx.stats};
 ctx.stats.actorDecisions++;
 const value=searchFrom(pack,next,actor,ctx,'us',limits.actorDecisions);
 return {search:value,nodes:ctx.lineSpent,...ctx.stats};
}
export function searchPosition(pack,state,actor,limits={},table=null){
 const pool={n:limits.nodes??48};
 const ctx={
  pool,lineCap:pool.n,lineSpent:0,
  deadline:limits.deadline??Infinity,
  beam:limits.beam??4,
  opponentLeft:limits.opponentDecisions??2,
  tt:table||new Map(),
  stats:{orderSteps:0,transpositionHits:0,unsupported:0,budget:0,opponentTurns:0,responses:0,actorDecisions:0}
 };
 const left=limits.actorDecisions??2;
 const value=searchFrom(pack,state,actor,ctx,'us',left);
 return {value,hits:ctx.stats.transpositionHits,nodes:ctx.lineSpent,
  key:positionKey(state,actor,'us',left)};
}
export {same};
