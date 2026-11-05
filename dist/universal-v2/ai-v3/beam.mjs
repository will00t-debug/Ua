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
function baseline(action){
 return action.type==='next'||action.mode==='skip'||action.mode==='decline'||action.uid==null;
}
export function selectCandidates(pack,state,viewer,legal,beam){
 const list=dedupe(state,viewer,legal);
 const rank=action=>archetypeRank(pack,state,viewer,action)+combatRank(pack,state,viewer,action);
 const ranked=[...list].sort((a,b)=>rank(b)-rank(a)||(JSON.stringify(a)<JSON.stringify(b)?-1:1));
 const picked=[],seen=new Set();
 const take=action=>{
  const key=JSON.stringify(action);
  if(seen.has(key))return;
  seen.add(key);
  picked.push(action);
 };
 for(const action of list)if(baseline(action))take(action);
 const groups=new Set();
 for(const action of ranked){
  const group=actionGroup(state,viewer,action);
  if(groups.has(group))continue;
  groups.add(group);
  take(action);
  if(picked.length>=beam)break;
 }
 for(const action of ranked){
  if(picked.length>=beam)break;
  take(action);
 }
 return picked.slice(0,Math.max(beam,Math.min(picked.length,beam+1)));
}
function stateKey(state,actor,mode,left){
 const parts=[mode,left,state.status,state.phase,state.active,state.turn,state.pending?.kind||'',
  state.pending?.player??'',actor];
 for(let p=0;p<2;p++){
  const player=state.players[p];
  parts.push(player.life.length,player.hand.length,player.deck.length,
   player.apCards.filter(card=>card.ready).length);
  if(p===actor)parts.push(player.hand.map(card=>card.uid+':'+card.cardId).sort().join(','));
  for(const line of ['front','energy'])
   parts.push(player[line].map(card=>!card?'-':card.uid+':'+card.cardId+(card.ready?'r':'t')).join('|'));
 }
 return parts.join(';');
}
function dispatch(pack,state,action){
 return dispatchUniversalAction(pack,state,action,{actor:who(state)});
}
const BATTLE_KINDS=new Set(['block','effect-block-floor','life-trigger']);
function settleBattle(pack,state,actor,ctx){
 let cursor=state;
 for(let guard=0;guard<6&&cursor.status==='playing'&&cursor.pending&&
  BATTLE_KINDS.has(cursor.pending.kind)&&ctx.budget.n>0;guard++){
  const seat=who(cursor);
  let legal;
  try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
  if(!legal.length)return cursor;
  const candidates=selectCandidates(pack,cursor,seat,legal,Math.min(4,ctx.beam));
  const maximize=seat===actor;
  let best=maximize?-Infinity:Infinity,chosen=null;
  for(const action of candidates){
   let next;
   try{next=dispatch(pack,cursor,action);}catch{ctx.stats.unsupported++;continue;}
   const done=terminalValue(next,actor);
   const value=done!==null?done:evaluate(pack,next,actor);
   if(chosen===null||(maximize?value>best:value<best)){best=value;chosen=next;}
  }
  if(!chosen)return cursor;
  cursor=chosen;
  ctx.budget.n--;
  ctx.stats.responses++;
 }
 return cursor;
}
function autoAdvance(pack,state,ctx){
 let cursor=state;
 for(let guard=0;guard<10&&ctx.budget.n>0&&cursor.status==='playing';guard++){
  if(cursor.pending&&ORDER_KINDS.has(cursor.pending.kind)){
   let legal;
   try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
   if(!legal.length)return cursor;
   try{cursor=dispatch(pack,cursor,legal[0]);}
   catch{ctx.stats.unsupported++;return cursor;}
   ctx.budget.n--;
   ctx.stats.orderSteps++;
   continue;
  }
  if(cursor.pending)break;
  let legal;
  try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
  if(legal.length===1&&legal[0].type==='next'){
   try{cursor=dispatch(pack,cursor,legal[0]);}
   catch{ctx.stats.unsupported++;return cursor;}
   ctx.budget.n--;
   ctx.stats.orderSteps++;
   continue;
  }
  break;
 }
 return cursor;
}
function searchFrom(pack,state,actor,ctx,mode,left){
 const done=terminalValue(state,actor);
 if(done!==null)return done;
 if(ctx.budget.n<=0||ctx.deadline<performance.now()){ctx.stats.budget++;return evaluate(pack,state,actor);}
 const key=stateKey(state,actor,mode,left);
 if(ctx.tt.has(key)){ctx.stats.transpositionHits++;return ctx.tt.get(key);}
 const cursor=settleBattle(pack,autoAdvance(pack,state,ctx),actor,ctx);
 const after=terminalValue(cursor,actor);
 if(after!==null){ctx.tt.set(key,after);return after;}
 if(mode==='them'&&!cursor.pending&&cursor.active===actor){
  const value=evaluate(pack,cursor,actor);
  ctx.tt.set(key,value);
  return value;
 }
 if(mode==='us'&&!cursor.pending&&cursor.active!==actor){
  ctx.stats.opponentTurns++;
  const value=searchFrom(pack,cursor,actor,ctx,'them',ctx.opponentLeft);
  ctx.tt.set(key,value);
  return value;
 }
 if(left<=0){
  const value=evaluate(pack,cursor,actor);
  ctx.tt.set(key,value);
  return value;
 }
 const seat=who(cursor);
 let legal;
 try{legal=legalUniversalActions(pack,cursor);}catch{ctx.stats.unsupported++;return evaluate(pack,cursor,actor);}
 if(!legal.length)return evaluate(pack,cursor,actor);
 const candidates=selectCandidates(pack,cursor,seat,legal,ctx.beam);
 const maximize=seat===actor;
 let best=maximize?-Infinity:Infinity,compared=0;
 for(const action of candidates){
  if(ctx.budget.n<=0||ctx.deadline<performance.now()){ctx.stats.budget++;break;}
  let next;
  try{next=settleBattle(pack,dispatch(pack,cursor,action),actor,ctx);}catch{ctx.stats.unsupported++;continue;}
  ctx.budget.n--;
  compared++;
  if(seat===actor)ctx.stats.actorDecisions++;
  else ctx.stats.responses++;
  const value=searchFrom(pack,next,actor,ctx,mode,left-1);
  if(maximize?value>best:value<best)best=value;
 }
 if(!compared)best=evaluate(pack,cursor,actor);
 ctx.tt.set(key,best);
 return best;
}
export function scoreLine(pack,state,actor,action,limits){
 const ctx={
  budget:{n:limits.nodes},
  deadline:limits.deadline,
  beam:limits.beam,
  opponentLeft:limits.opponentDecisions,
  tt:new Map(),
  stats:{orderSteps:0,transpositionHits:0,unsupported:0,budget:0,opponentTurns:0,responses:0,actorDecisions:0}
 };
 let next;
 try{next=dispatch(pack,state,action);}catch{return null;}
 ctx.budget.n--;
 ctx.stats.actorDecisions++;
 const value=searchFrom(pack,next,actor,ctx,'us',limits.actorDecisions);
 return {search:value,nodes:limits.nodes-ctx.budget.n,...ctx.stats};
}
export {same};
