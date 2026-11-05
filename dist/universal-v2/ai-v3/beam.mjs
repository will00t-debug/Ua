// Full-turn beam. Forced phase passes and order windows are resolution,
// not extra depth. A voluntary choice or an answer to the opponent is a
// decision. Once the actor yields, the opponent plays one turn and the
// actor answers blocks and triggers along the way.
import {legalUniversalActions,dispatchUniversalAction} from '../engine.mjs';
import {evaluate,terminalValue,keepScore} from './eval.mjs';
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
 return [...list].sort((a,b)=>{
  const delta=rank(b)-rank(a);
  if(delta)return delta;
  // Equal discards keep the card we want. A raid bonus must not make the
  // core the first thing thrown away.
  if(a.type==='chooseDiscard'&&a.type===b.type){
   const hand=state.players[viewer]?.hand||[];
   const left=keepScore(pack,state,viewer,hand.find(card=>card?.uid===a.uid));
   const right=keepScore(pack,state,viewer,hand.find(card=>card?.uid===b.uid));
   if(left!==right)return left-right;
  }
  return byText(a,b);
 });
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
const CONTINUATION=new Set(['effect-discard','effect-recover-ap','effect-recover-outside','effect-optional-mill']);
function continuationAction(pack,state,actor,legal){
 const kind=state.pending?.kind;
 if(!CONTINUATION.has(kind))return null;
 if((state.pending.player??state.active)!==actor)return null;
 if(kind==='effect-optional-mill')return legal.find(action=>action.mode==='mill')||legal[0];
 const cards=[];
 const zone=kind==='effect-recover-outside'?'outside':'hand';
 for(const action of legal){
  if(!action.uid)continue;
  const card=(state.players[actor][zone]||[]).find(item=>item?.uid===action.uid)
   ||(kind==='effect-recover-ap'?null:state.players[actor].hand.find(item=>item?.uid===action.uid));
  if(card)cards.push({action,score:keepScore(pack,state,actor,card)});
 }
 if(kind==='effect-recover-ap')return legal.find(action=>action.uid)||null;
 if(!cards.length)return legal.find(action=>action.uid)||null;
 cards.sort((a,b)=>a.score-b.score||(a.action.uid<b.action.uid?-1:1));
 // A discard pays with the card we least want. A recovery takes the best one.
 return kind==='effect-discard'?cards[0].action:cards[cards.length-1].action;
}
function noteLeaf(ctx,state){
 ctx.stats.leafPending=state.pending?.kind||null;
 ctx.stats.leafPhase=state.phase;
 ctx.stats.leafOwnTurns=state.players?.map(player=>player.ownTurns??0)||null;
 ctx.stats.leafTurn=state.turn??null;
 ctx.stats.leafActive=state.active;
}
// A line is settled only when the game is over, or the actor has handed the
// turn to the opponent and come back to that actor's next turn start.
// Still being the active player with an empty pending is the same turn.
function classifyLine(ctx,cursor,actor){
 const origin=ctx.origin;
 const terminal=cursor.status==='finished'||terminalValue(cursor,actor)!==null;
 const ownTurns=cursor.players?.[actor]?.ownTurns??0;
 const handed=ctx.stats.opponentTurns>0;
 const returned=!terminal&&handed&&!cursor.pending&&cursor.active===actor&&cursor.phase==='start'&&
  !!origin&&ownTurns>origin.ownTurns;
 let boundary='open';
 if(terminal)boundary='terminal';
 else if(returned)boundary='returned';
 else if(cursor.pending)boundary='pending';
 else if(handed)boundary='yielded';
 ctx.stats.boundary=boundary;
 ctx.stats.handedOff=handed;
 ctx.stats.returned=returned;
 ctx.stats.settled=terminal||returned;
 const outOfNodes=!(ctx.pool.n>0&&ctx.lineSpent<ctx.lineCap);
 const outOfTime=performance.now()>ctx.deadline;
 ctx.stats.exhausted=outOfNodes?'nodes':outOfTime?'time':null;
 if(ctx.stats.settled)ctx.stats.cut=null;
 else if(cursor.pending)ctx.stats.cut='pending';
 else if(outOfNodes)ctx.stats.cut='nodes';
 else if(outOfTime)ctx.stats.cut='time';
 else ctx.stats.cut='open';
 noteLeaf(ctx,cursor);
}
function attackOrEnd(pack,state,actor,legal){
 const pending=continuationAction(pack,state,actor,legal);
 if(pending)return pending;
 if(state.pending)return null;
 const attack=legal.filter(action=>action.type==='attack');
 if(attack.length){
  attack.sort((a,b)=>keepScore(pack,state,actor,state.players[actor].front.find(card=>card?.uid===b.uid)||{})
   -keepScore(pack,state,actor,state.players[actor].front.find(card=>card?.uid===a.uid)||{}));
  return attack[0];
 }
 return legal.find(action=>action.type==='next')||null;
}
function fastOpponent(pack,cursor,actor,ctx){
 for(let step=0;step<12&&room(ctx)&&cursor.status==='playing';step++){
  if(!cursor.pending&&cursor.active===actor)break;
  let legal;
  try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;break;}
  const seat=who(cursor);
  const ranked=rankLegal(pack,cursor,seat,legal);
  const action=ranked[0];
  if(!action||!room(ctx)){ctx.stats.budget++;break;}
  try{cursor=dispatch(pack,cursor,action);}catch{ctx.stats.unsupported++;break;}
  if(!spend(ctx)){ctx.stats.budget++;break;}
  cursor=settleBattle(pack,autoAdvance(pack,cursor,ctx),actor,ctx);
 }
 noteLeaf(ctx,cursor);
 return cursor;
}
function greedyAction(pack,state,actor,legal){
 const pending=continuationAction(pack,state,actor,legal);
 if(pending)return pending;
 if(state.pending)return null;
 const attack=legal.filter(action=>action.type==='attack');
 if(attack.length){
  attack.sort((a,b)=>keepScore(pack,state,actor,state.players[actor].front.find(card=>card?.uid===b.uid)||{})
   -keepScore(pack,state,actor,state.players[actor].front.find(card=>card?.uid===a.uid)||{}));
  return attack[0];
 }
 if((state.phase==='main'||state.phase==='attack')&&legal.some(action=>action.type==='next')&&
  (state.phase==='attack'||state.players[actor].front.some(card=>card?.ready)))
  return legal.find(action=>action.type==='next');
 return null;
}
function roll(pack,cursor,actor,ctx,pick){
 for(let step=0;step<8&&room(ctx)&&cursor.status==='playing';step++){
  if((cursor.pending?.player??cursor.active)!==actor)break;
  let legal;
  try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;break;}
  const action=pick(pack,cursor,actor,legal);
  if(!action)break;
  if(!room(ctx)){ctx.stats.budget++;break;}
  try{cursor=dispatch(pack,cursor,action);}catch{ctx.stats.unsupported++;break;}
  if(!spend(ctx)){ctx.stats.budget++;break;}
  cursor=settleBattle(pack,autoAdvance(pack,cursor,ctx),actor,ctx);
 }
 noteLeaf(ctx,cursor);
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
 if(!room(ctx)){
  ctx.stats.budget++;
  if(ctx.finish&&ctx.origin)classifyLine(ctx,state,actor);
  else noteLeaf(ctx,state);
  return evaluate(pack,state,actor);
 }
 if(ctx.finish&&mode==='us'){
  let cursor=roll(pack,state,actor,ctx,continuationAction);
  cursor=roll(pack,cursor,actor,ctx,attackOrEnd);
  const mid=terminalValue(cursor,actor);
  if(mid===null&&!cursor.pending&&cursor.active!==actor){
   ctx.stats.opponentTurns++;
   cursor=fastOpponent(pack,cursor,actor,ctx);
  }
  classifyLine(ctx,cursor,actor);
  const end=terminalValue(cursor,actor);
  return end!==null?end:evaluate(pack,cursor,actor);
 }
 const mark=ctx.stats.budget;
 let cursor=roll(pack,settleBattle(pack,autoAdvance(pack,state,ctx),actor,ctx),actor,ctx,continuationAction);
 const after=terminalValue(cursor,actor);
 if(after!==null){ctx.stats.settled=true;return remember(ctx,key,after,mark);}
 if(mode==='us'&&left<=0)cursor=roll(pack,cursor,actor,ctx,greedyAction);
 const yielded=terminalValue(cursor,actor);
 if(yielded!==null){ctx.stats.settled=true;return remember(ctx,key,yielded,mark);}
 if(mode==='them'&&!cursor.pending&&cursor.active===actor){
  noteLeaf(ctx,cursor);
  ctx.stats.settled=true;
  return remember(ctx,key,evaluate(pack,cursor,actor),mark);
 }
 if(mode==='us'&&!cursor.pending&&cursor.active!==actor){
  ctx.stats.opponentTurns++;
  noteLeaf(ctx,cursor);
  const held=ctx.stats.settled;
  ctx.stats.settled=false;
  const value=searchFrom(pack,cursor,actor,ctx,'them',ctx.opponentLeft);
  ctx.stats.settled=held||ctx.stats.settled;
  return remember(ctx,key,value,mark);
 }
 noteLeaf(ctx,cursor);
 if(left<=0)return remember(ctx,key,evaluate(pack,cursor,actor),mark);
 const seat=who(cursor);
 let legal;
 try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return evaluate(pack,cursor,actor);}
 if(!legal.length)return evaluate(pack,cursor,actor);
 const candidates=selectCandidates(pack,cursor,seat,legal,ctx.beam);
 const finishRank=action=>action.type==='attack'?0:action.type==='next'?1:2;
 const ordered=[...candidates].sort((a,b)=>finishRank(a)-finishRank(b)||byText(a,b));
 const maximize=seat===actor;
 let best=maximize?-Infinity:Infinity,compared=0,bestOk=false;
 let bestPending=ctx.stats.leafPending,bestPhase=ctx.stats.leafPhase;
 for(let i=0;i<ordered.length;i++){
  const action=ordered[i];
  if(!room(ctx)){ctx.stats.budget++;break;}
  let next;
  try{next=dispatch(pack,cursor,action);}catch{ctx.stats.unsupported++;continue;}
  if(!spend(ctx)){ctx.stats.budget++;break;}
  try{next=settleBattle(pack,next,actor,ctx);}catch{ctx.stats.unsupported++;continue;}
  compared++;
  if(seat===actor)ctx.stats.actorDecisions++;
  else ctx.stats.responses++;
  const savedCap=ctx.lineCap;
  const roomNodes=Math.min(ctx.pool.n,Math.max(0,ctx.lineCap-ctx.lineSpent));
  const share=Math.max(1,Math.ceil(roomNodes/Math.max(1,ordered.length-i)));
  ctx.lineCap=Math.min(savedCap,ctx.lineSpent+share);
  const held=ctx.stats.settled;
  ctx.stats.settled=false;
  const value=searchFrom(pack,next,actor,ctx,mode,left-1);
  const ok=!!ctx.stats.settled;
  ctx.stats.settled=held;
  ctx.lineCap=savedCap;
  if(compared===1||(maximize?value>best:value<best)){
   best=value;bestOk=ok;bestPending=ctx.stats.leafPending;bestPhase=ctx.stats.leafPhase;
  }
 }
 ctx.stats.leafPending=bestPending;
 ctx.stats.leafPhase=bestPhase;
 if(!compared)best=evaluate(pack,cursor,actor);
 if(bestOk)ctx.stats.settled=true;
 return remember(ctx,key,best,mark);
}
function lineView(ctx,search){
 return {search,nodes:ctx.lineSpent,settled:!!ctx.stats.settled,
  boundary:ctx.stats.boundary||'open',handedOff:!!ctx.stats.handedOff,returned:!!ctx.stats.returned,
  cut:ctx.stats.cut||null,pending:ctx.stats.leafPending||null,phase:ctx.stats.leafPhase||null,
  startOwnTurns:ctx.origin?.ownTurns??null,
  leafOwnTurns:ctx.stats.leafOwnTurns?.[ctx.origin?.actor]??null,
  ...ctx.stats};
}
export function scoreLine(pack,state,actor,action,limits){
 const pool=limits.pool||{n:limits.nodes};
 const lineCap=Math.min(limits.nodes,pool.n);
 const ctx={
  pool,lineCap,lineSpent:0,
  deadline:limits.deadline??Infinity,
  finish:limits.finish!==false,
  beam:limits.beam,
  opponentLeft:limits.opponentDecisions,
  origin:{turn:state.turn,ownTurns:state.players[actor].ownTurns,phase:state.phase,actor},
  tt:limits.tt||new Map(),
  stats:{orderSteps:0,transpositionHits:0,unsupported:0,budget:0,opponentTurns:0,responses:0,actorDecisions:0,
   boundary:'open',handedOff:false,returned:false,cut:null}
 };
 if(!room(ctx)){
  classifyLine(ctx,state,actor);
  if(!(pool.n>0))ctx.stats.cut='nodes';
  else if(performance.now()>ctx.deadline)ctx.stats.cut='time';
  ctx.stats.settled=false;
  return lineView(ctx,evaluate(pack,state,actor));
 }
 let next;
 try{next=dispatch(pack,state,action);}catch{return null;}
 if(!spend(ctx)){
  classifyLine(ctx,next,actor);
  ctx.stats.settled=false;
  ctx.stats.cut=performance.now()>ctx.deadline?'time':'nodes';
  return lineView(ctx,evaluate(pack,next,actor));
 }
 ctx.stats.actorDecisions++;
 const value=searchFrom(pack,next,actor,ctx,'us',limits.actorDecisions);
 return lineView(ctx,value);
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
