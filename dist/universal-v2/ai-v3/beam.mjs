// Full-turn beam. Forced phase passes and order windows are resolution,
// not extra depth. A voluntary choice or an answer to the opponent is a
// decision. Once the actor yields, the opponent plays one turn and the
// actor answers blocks and triggers along the way.
import {evaluate as staticValue,terminalValue,keepScore,battleActionValue,blankSwingAdjustment,raidStranded,filterEnergyFirst,lastApLineSwitch,recoversActionPoints,payableRefundOnTop} from './eval.mjs';
import {archetypeRank,actionGroup,entryNoise} from './archetype.mjs';
import {combatRank} from './combat.mjs';
import {strategyOrder,replyAction,replyOrder,moveDevelopment,bindProbeBudget,noteDispatch,cachedLegal,engineDispatch} from './strategy.mjs';
import {packOf,visibleUidSet} from './observation.mjs';

function evaluate(pack,state,actor,ctx){
 return staticValue(pack,state,actor,ctx?.strategy);
}

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
 // extraDraw spends an action point and draws. It has no uid, but it is not
 // a pass: folding it into the one safe slot kept only next.
 if(action?.type==='extraDraw')return false;
 return action.type==='next'||action.mode==='skip'||action.mode==='decline'||action.uid==null;
}
function byText(a,b){
 const left=JSON.stringify(a),right=JSON.stringify(b);
 return left<right?-1:left>right?1:0;
}
function actionRank(pack,state,viewer,action,strategy){
 let score=archetypeRank(pack,state,viewer,action)+combatRank(pack,state,viewer,action)+
  (strategy==='order'?strategyOrder(pack,state,viewer,action):0);
 if(action?.type==='event'&&action.uid){
  const card=(state.players?.[viewer]?.hand||[]).find(item=>item?.uid===action.uid);
  const printed=card&&packOf(pack,viewer).cards[card.cardId];
  if(recoversActionPoints(printed))score+=6;
 }
 // The default order never sees the strategy switch. A move that strips a
 // color the hand and curve still need has to fall behind passing here too,
 // or an unfinished search keeps the old move-first backup.
 if(action.type==='move'&&moveDevelopment(pack,state,viewer,action)?.strip)score-=8;
 return score;
}
function compareRanked(pack,state,viewer,a,b,strategy){
 const delta=actionRank(pack,state,viewer,b,strategy)-actionRank(pack,state,viewer,a,strategy);
 if(delta)return delta;
 // A deck-look that raises a line-switch comes before another energy play.
 // Once that color is paid, the last action point keeps the line-switch
 // ahead of a generic energy play. Score can still pick a finished line.
 const link=(filterEnergyFirst(pack,state,viewer,a)?0:lastApLineSwitch(pack,state,viewer,a)?1:2)-
  (filterEnergyFirst(pack,state,viewer,b)?0:lastApLineSwitch(pack,state,viewer,b)?1:2);
 if(link)return link;
 if(a.type==='chooseTopCard'&&b.type==='chooseTopCard'&&payableRefundOnTop(pack,state,viewer)){
  const place=action=>action.mode==='top'?0:1;
  const placed=place(a)-place(b);
  if(placed)return placed;
 }
 // Equal energy plays: resolve the one with no printed on-play first.
 // The on-play stays in the beam; a finished line can still outscore this one.
 const noise=entryNoise(pack,state,viewer,a)-entryNoise(pack,state,viewer,b);
 if(noise)return noise;
 // Equal discards keep the card we want. A raid bonus must not make the
 // core the first thing thrown away. The optional gate and the end-of-turn
 // hand limit use the same order. String order was discarding the cheap
 // generator, or the raid piece with the lowest uid, and never reaching the
 // event the keep-order would spend.
 if((a.type==='chooseDiscard'||a.type==='chooseDiscardGate'||a.type==='chooseHandLimit')&&a.type===b.type&&a.uid&&b.uid){
  const hand=state.players[viewer]?.hand||[];
  const left=keepScore(pack,state,viewer,hand.find(card=>card?.uid===a.uid));
  const right=keepScore(pack,state,viewer,hand.find(card=>card?.uid===b.uid));
  if(left!==right)return left-right;
 }
 return byText(a,b);
}
export function rankLegal(pack,state,viewer,legal,strategy){
 const list=dedupe(state,viewer,legal);
 return [...list].sort((a,b)=>compareRanked(pack,state,viewer,a,b,strategy));
}
export function selectCandidates(pack,state,viewer,legal,beam,strategy){
 const ranked=rankLegal(pack,state,viewer,legal,strategy);
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
   // The front comparison takes one slot. A deck-look that is what makes a
   // line-switch payable stays; the next play gives up the slot instead.
   const keep=action=>{
    if(filterEnergyFirst(pack,state,viewer,action)||lastApLineSwitch(pack,state,viewer,action))return true;
    if(action?.type!=='event'||!action.uid)return false;
    const card=(state.players?.[viewer]?.hand||[]).find(item=>item?.uid===action.uid);
    return recoversActionPoints(card&&packOf(pack,viewer).cards[card.cardId]);
   };
   let spare=picked.findIndex(action=>!isSafeAction(action)&&!keep(action));
   if(spare<0)spare=picked.findIndex(action=>!isSafeAction(action));
   if(spare>=0)picked[spare]=front;
  }
 }
 picked.sort((a,b)=>compareRanked(pack,state,viewer,a,b,strategy));
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
 const next=engineDispatch(pack,state,action,{actor:who(state)});
 noteDispatch();
 return next;
}
const BATTLE_KINDS=new Set(['block','effect-block-floor','life-trigger']);
function nowOf(ctx){
 return ctx.now?ctx.now():performance.now();
}
function room(ctx){
 return ctx.pool.n>0&&ctx.lineSpent<ctx.lineCap&&nowOf(ctx)<=ctx.deadline;
}
function spend(ctx){
 if(!room(ctx))return false;
 ctx.pool.n--;
 ctx.lineSpent++;
 return true;
}
// Charge the node before the transition. The clock can move inside the
// transition; billing afterwards dropped that step from the record while
// the transition had already happened. A failed transition returns the node.
function billedStep(ctx,pack,state,action){
 if(!spend(ctx))return {budget:true};
 try{return {state:dispatch(pack,state,action)};}
 catch{
  ctx.pool.n++;
  ctx.lineSpent--;
  return {error:true};
 }
}
function settleBattle(pack,state,actor,ctx){
 let cursor=state;
 for(let guard=0;guard<6&&cursor.status==='playing'&&cursor.pending&&
  BATTLE_KINDS.has(cursor.pending.kind)&&room(ctx);guard++){
  const seat=who(cursor);
  let legal;
  try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
  if(!legal.length)return cursor;
  const maximize=seat===actor;
  const candidates=ctx.strategy==='reply'&&!maximize
   ?replyCandidates(pack,cursor,legal,Math.min(4,ctx.beam))
   :selectCandidates(pack,cursor,seat,legal,Math.min(4,ctx.beam),maximize?ctx.strategy:null);
  let best=maximize?-Infinity:Infinity,chosen=null;
  for(const action of candidates){
   const stepped=billedStep(ctx,pack,cursor,action);
   if(stepped.budget){ctx.stats.budget++;break;}
   if(stepped.error){ctx.stats.unsupported++;continue;}
   const next=stepped.state;
   const done=terminalValue(next,actor);
   const value=done!==null?done:evaluate(pack,next,actor,ctx);
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
   try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
   if(!legal.length)return cursor;
   const ordered=billedStep(ctx,pack,cursor,legal[0]);
   if(ordered.budget){ctx.stats.budget++;return cursor;}
   if(ordered.error){ctx.stats.unsupported++;return cursor;}
   cursor=ordered.state;
   ctx.stats.orderSteps++;
   continue;
  }
  if(cursor.pending)break;
  let legal;
  try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
  if(legal.length===1&&legal[0].type==='next'){
   const forced=billedStep(ctx,pack,cursor,legal[0]);
   if(forced.budget){ctx.stats.budget++;return cursor;}
   if(forced.error){ctx.stats.unsupported++;return cursor;}
   cursor=forced.state;
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
 const pending=state.pending;
 ctx.stats.leafPending=pending?.kind||null;
 ctx.stats.leafPendingPlayer=Number.isInteger(pending?.player)?pending.player:null;
 ctx.stats.leafSource=pending?.sourceUid||null;
 ctx.stats.leafProgress=pending?[pending.index??'',pending.step??'',
  Array.isArray(pending.choices)?pending.choices.length:'',
  Array.isArray(pending.entries)?pending.entries.length:'',
  pending.sourceStamp??''].join('.'):'';
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
 const outOfTime=nowOf(ctx)>ctx.deadline;
 ctx.stats.exhausted=outOfNodes?'nodes':outOfTime?'time':null;
 if(!ctx.stats.limit){
  if(outOfNodes)ctx.stats.limit='nodes';
  else if(outOfTime)ctx.stats.limit='time';
  else if(ctx.stats.depthHit)ctx.stats.limit='depth';
 }
 // Life is still unchosen, so the attack's damage has not been scored.
 ctx.stats.damageOpen=!terminal&&cursor.pending?.kind==='attack-life-target';
 ctx.stats.stopPending=cursor.pending?.kind||null;
 ctx.stats.stopPlayer=Number.isInteger(cursor.pending?.player)?cursor.pending.player:null;
 if(ctx.stats.settled){
  ctx.stats.cut=null;
  ctx.stats.stopReason=null;
 }else if(outOfNodes){
  ctx.stats.cut='nodes';
  ctx.stats.stopReason='nodes';
 }else if(outOfTime){
  ctx.stats.cut='time';
  ctx.stats.stopReason='time';
 }else if(ctx.stats.unhandled&&cursor.pending){
  // The clock and the node pool still had room. The continuation had no
  // rule for this window, so the attack is not finished.
  ctx.stats.cut='unhandled';
  ctx.stats.stopReason='unhandled';
  if(!ctx.stats.limit||ctx.stats.limit==='depth')ctx.stats.limit='unhandled';
 }else if(ctx.stats.depthHit){
  ctx.stats.cut='depth';
  ctx.stats.stopReason='depth';
 }else if(cursor.pending){
  ctx.stats.cut='pending';
  ctx.stats.stopReason='pending';
 }else{
  ctx.stats.cut='open';
  ctx.stats.stopReason='open';
 }
 ctx.stats.leafState=cursor;
 noteLeaf(ctx,cursor);
}
function declines(action){
 return action?.mode==='skip'||action?.mode==='decline';
}
function indexKey(action){
 return (action?.indices||[]).map(index=>String(index).padStart(2,'0')).join(',');
}
function bodyOf(state,uid){
 if(!uid)return null;
 for(const player of state.players||[]){
  for(const zone of ['hand','front','energy','outside','removed']){
   const card=(player[zone]||[]).find(item=>item?.uid===uid);
   if(card)return card;
  }
 }
 return null;
}
// One legal action is the resolution, not a plan. A real choice uses the
// legal list only. Hidden LIFE ids are not a tie-break.
function necessaryChoice(pack,state,actor,legal){
 if(legal.length===1)return legal[0];
 const kind=state.pending?.kind||'';
 if(legal.some(declines))return null;
 if(kind==='attack-life-target'){
  return [...legal].filter(action=>action.type==='chooseAttackLife').sort((a,b)=>indexKey(a)<indexKey(b)?-1:1)[0]||null;
 }
 const visible=visibleUidSet(pack,state,actor);
 const discard=kind==='end-hand-limit'||kind.startsWith('effect-discard');
 const score=action=>{
  if(!action?.uid||!visible.has(action.uid))return 0;
  const card=bodyOf(state,action.uid);
  return card?keepScore(pack,state,actor,card):0;
 };
 return [...legal].sort((a,b)=>{
  const delta=score(a)-score(b);
  if(delta)return discard?delta:-delta;
  return byText(a,b);
 })[0]||null;
}
function attackOrEnd(pack,state,actor,legal){
 const pending=continuationAction(pack,state,actor,legal);
 if(pending)return pending;
 if(state.pending){
  if((state.pending.player??state.active)!==actor)return null;
  return necessaryChoice(pack,state,actor,legal);
 }
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
  try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;break;}
  const seat=who(cursor);
  const action=ctx.strategy==='reply'&&seat!==actor
   ?replyAction(pack,cursor,legal)
   :rankLegal(pack,cursor,seat,legal,seat===actor?ctx.strategy:null)[0];
  if(!action){ctx.stats.budget++;break;}
  const stepped=billedStep(ctx,pack,cursor,action);
  if(stepped.budget){ctx.stats.budget++;break;}
  if(stepped.error){ctx.stats.unsupported++;break;}
  cursor=stepped.state;
  if(legal.length>1&&seat!==actor)ctx.stats.responses++;
  noteStep(ctx,action,'script');
  cursor=settleBattle(pack,autoAdvance(pack,cursor,ctx),actor,ctx);
 }
 noteLeaf(ctx,cursor);
 return cursor;
}
function greedyAction(pack,state,actor,legal){
 const pending=continuationAction(pack,state,actor,legal);
 if(pending)return pending;
 if(state.pending){
  if((state.pending.player??state.active)!==actor)return null;
  return necessaryChoice(pack,state,actor,legal);
 }
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
function brief(action,kind){
 const row={type:action.type,uid:action.uid??null,line:action.line||null,baseUid:action.baseUid||null,mode:action.mode||null,kind};
 if(Array.isArray(action.indices))row.indices=action.indices.slice();
 return row;
}
function noteStep(ctx,action,kind){
 if(ctx.stats.sequence)ctx.stats.sequence.push(brief(action,kind));
}
function roll(pack,cursor,actor,ctx,pick){
 let halted=false;
 for(let step=0;step<8&&room(ctx)&&cursor.status==='playing';step++){
  if((cursor.pending?.player??cursor.active)!==actor)break;
  let legal;
  try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;break;}
  const action=pick(pack,cursor,actor,legal);
  if(!action){
   if(cursor.pending)halted=true;
   break;
  }
  const stepped=billedStep(ctx,pack,cursor,action);
  if(stepped.budget){ctx.stats.budget++;break;}
  if(stepped.error){ctx.stats.unsupported++;break;}
  cursor=stepped.state;
  noteStep(ctx,action,'script');
  cursor=settleBattle(pack,autoAdvance(pack,cursor,ctx),actor,ctx);
 }
 ctx.stats.unhandled=halted;
 noteLeaf(ctx,cursor);
 return cursor;
}
function leafSnap(ctx){
 return {
  boundary:ctx.stats.boundary,handedOff:ctx.stats.handedOff,returned:ctx.stats.returned,
  settled:ctx.stats.settled,cut:ctx.stats.cut,exhausted:ctx.stats.exhausted,
  limit:ctx.stats.limit,depthHit:ctx.stats.depthHit,
  leafPending:ctx.stats.leafPending,leafPendingPlayer:ctx.stats.leafPendingPlayer??null,
  leafSource:ctx.stats.leafSource??null,leafProgress:ctx.stats.leafProgress??'',
  leafPhase:ctx.stats.leafPhase,
  leafOwnTurns:ctx.stats.leafOwnTurns,leafTurn:ctx.stats.leafTurn,leafActive:ctx.stats.leafActive,
  opponentTurns:ctx.stats.opponentTurns,responses:ctx.stats.responses,
  sequence:ctx.stats.sequence?ctx.stats.sequence.slice():[],
  refuted:!!ctx.stats.refuted,unexplored:(ctx.stats.unexplored||[]).slice(),
  damageOpen:!!ctx.stats.damageOpen,stopPending:ctx.stats.stopPending??null,
  stopPlayer:ctx.stats.stopPlayer??null,stopReason:ctx.stats.stopReason??null,unhandled:!!ctx.stats.unhandled,
  followSeen:(ctx.stats.followSeen||[]).slice(),leafState:ctx.stats.leafState||null
 };
}
function applyLeaf(ctx,snap){
 ctx.stats.boundary=snap.boundary;ctx.stats.handedOff=snap.handedOff;ctx.stats.returned=snap.returned;
 ctx.stats.settled=snap.settled;ctx.stats.cut=snap.cut;ctx.stats.exhausted=snap.exhausted;
 ctx.stats.limit=snap.limit;ctx.stats.depthHit=snap.depthHit;
 ctx.stats.leafPending=snap.leafPending;ctx.stats.leafPendingPlayer=snap.leafPendingPlayer??null;
 ctx.stats.leafSource=snap.leafSource??null;ctx.stats.leafProgress=snap.leafProgress??'';
 ctx.stats.leafPhase=snap.leafPhase;
 ctx.stats.leafOwnTurns=snap.leafOwnTurns;ctx.stats.leafTurn=snap.leafTurn;ctx.stats.leafActive=snap.leafActive;
 ctx.stats.opponentTurns=snap.opponentTurns;ctx.stats.responses=snap.responses;
 ctx.stats.sequence=snap.sequence.slice();
 ctx.stats.refuted=!!snap.refuted;
 ctx.stats.unexplored=snap.unexplored?snap.unexplored.slice():[];
 ctx.stats.damageOpen=!!snap.damageOpen;
 ctx.stats.stopPending=snap.stopPending??null;
 ctx.stats.stopPlayer=snap.stopPlayer??null;
 ctx.stats.stopReason=snap.stopReason??null;
 ctx.stats.unhandled=!!snap.unhandled;
 ctx.stats.followSeen=snap.followSeen?snap.followSeen.slice():[];
 ctx.stats.leafState=snap.leafState||null;
}
function advanceForced(pack,cursor,ctx){
 for(let guard=0;guard<12&&room(ctx)&&cursor.status==='playing';guard++){
  let legal;
  try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
  const ordered=cursor.pending&&ORDER_KINDS.has(cursor.pending.kind);
  if(!ordered&&legal.length!==1)return cursor;
  if(!legal.length)return cursor;
  const action=legal[0];
  const stepped=billedStep(ctx,pack,cursor,action);
  if(stepped.budget){ctx.stats.budget++;return cursor;}
  if(stepped.error){ctx.stats.unsupported++;return cursor;}
  cursor=stepped.state;
  noteStep(ctx,action,'forced');
  if(ordered)ctx.stats.orderSteps++;
 }
 return cursor;
}
function replyCandidates(pack,state,legal,beam){
 const width=Math.max(1,beam||1);
 const ordered=replyOrder(pack,state,legal);
 const picked=[];
 const take=action=>{
  if(action&&!picked.some(item=>same(item,action))&&picked.length<width)picked.push(action);
 };
 take(legal.find(action=>action.type==='next'||action.uid==null));
 take(replyAction(pack,state,legal));
 for(const action of ordered)take(action);
 return picked.length?picked:ordered.slice(0,width);
}
function planCandidates(pack,state,seat,legal,beam,strategy){
 const picked=selectCandidates(pack,state,seat,legal,beam,strategy);
 const next=legal.find(action=>action.type==='next');
 if(next&&!picked.some(action=>same(action,next))){
  if(picked.length<beam)picked.push(next);
  else{
   const spare=picked.findIndex(action=>action.type!=='play'&&action.type!=='raid'&&action.type!=='attack'&&action.type!=='next');
   picked[spare>=0?spare:picked.length-1]=next;
  }
 }
 return picked;
}
function replyFrom(pack,state,actor,ctx,left){
 if(!room(ctx)||state.status!=='playing')return state;
 if(!state.pending&&state.active===actor)return state;
 let cursor=advanceForced(pack,state,ctx);
 if(!room(ctx)||cursor.status!=='playing'||(!cursor.pending&&cursor.active===actor))return cursor;
 if(left<=0)return fastOpponent(pack,cursor,actor,ctx);
 let legal;
 try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;return cursor;}
 const seat=who(cursor);
 const candidates=ctx.strategy==='reply'
  ?replyCandidates(pack,cursor,legal,2)
  :planCandidates(pack,cursor,seat,legal,2,null);
 if(candidates.length<=1)return fastOpponent(pack,cursor,actor,ctx);
 ctx.stats.followBranches+=candidates.length;
 ctx.stats.maxDepth=Math.max(ctx.stats.maxDepth||1,(ctx.replyDepth||0)+1);
 const maximize=seat===actor;
 const mark=ctx.stats.sequence.length;
 let best=null;
 for(const action of candidates){
  ctx.stats.sequence.length=mark;
  const stepped=billedStep(ctx,pack,cursor,action);
  if(stepped.budget){ctx.stats.budget++;break;}
  if(stepped.error){ctx.stats.unsupported++;continue;}
  const next=stepped.state;
  noteStep(ctx,action,'reply');
  if(seat!==actor)ctx.stats.responses++;
  const saved=ctx.replyDepth||0;
  ctx.replyDepth=saved+1;
  const after=replyFrom(pack,next,actor,ctx,left-1);
  ctx.replyDepth=saved;
  const value=terminalValue(after,actor)??evaluate(pack,after,actor,ctx);
  if(!best||(maximize?value>best.value:value<best.value))best={value,state:after,sequence:ctx.stats.sequence.slice()};
 }
 if(!best)return cursor;
 ctx.stats.sequence=best.sequence;
 return best.state;
}
function certainLoss(value,settled){return !!settled&&value<=-90000;}
// A finished loss does not hide an unfinished alternative. A finished
// non-loss still outranks an unfinished score, so an open +20 cannot
// replace a line that already came home.
function preferOurLine(candidate,current){
 if(!current)return true;
 if(certainLoss(candidate.value,candidate.settled)&&!current.settled)return false;
 if(certainLoss(current.value,current.settled)&&!candidate.settled)return true;
 if(candidate.settled!==current.settled)return candidate.settled;
 return candidate.value>current.value;
}
export function keepBest(best,value,snap,settled,maximize){
 if(!best)return {value,snap,settled};
 // The opponent minimizes our score. A settled win for us must not outrank
 // the block, trigger, or other answer that keeps them alive.
 if(!maximize)return value<best.value?{value,snap,settled}:best;
 return preferOurLine({value,settled},{value:best.value,settled:best.settled})?{value,snap,settled}:best;
}
function answerOpponent(pack,cursor,actor,ctx,left,depth){
 const budget=ctx.replyLeft??(ctx.opponentLeft??2);
 if(ctx.replyStuck){
  classifyLine(ctx,cursor,actor);
  return terminalValue(cursor,actor)??evaluate(pack,cursor,actor,ctx);
 }
 if(ctx.plan==='tree-replies'){
  const after=replyFrom(pack,cursor,actor,ctx,Math.max(1,budget));
  if(after===cursor){
   classifyLine(ctx,cursor,actor);
   return terminalValue(cursor,actor)??evaluate(pack,cursor,actor,ctx);
  }
  return planFrom(pack,after,actor,ctx,left,depth);
 }
 if(budget<=0){
  ctx.replyStuck=true;
  const after=fastOpponent(pack,cursor,actor,ctx);
  const value=after===cursor
   ?evaluate(pack,cursor,actor,ctx)
   :planFrom(pack,after,actor,ctx,left,depth);
  ctx.replyStuck=false;
  return value;
 }
 let legal;
 try{legal=cachedLegal(pack,cursor);}catch{
  ctx.stats.unsupported++;
  classifyLine(ctx,cursor,actor);
  return evaluate(pack,cursor,actor,ctx);
 }
 const seat=who(cursor);
 const candidates=planCandidates(pack,cursor,seat,legal,2);
 ctx.stats.followBranches+=candidates.length;
 const before=leafSnap(ctx);
 const saved=ctx.replyLeft;
 ctx.replyLeft=budget-1;
 let best=null;
 let sawWin=false;
 for(let index=0;index<candidates.length;index++){
  const action=candidates[index];
  if(!room(ctx)){
   ctx.stats.budget++;
   const skipped=candidates.slice(index).map(item=>brief(item,'unexplored'));
   ctx.stats.unexplored=(ctx.stats.unexplored||[]).concat(skipped);
   break;
  }
  applyLeaf(ctx,before);
  const stepped=billedStep(ctx,pack,cursor,action);
  if(stepped.budget){ctx.stats.budget++;break;}
  if(stepped.error){ctx.stats.unsupported++;continue;}
  const next=stepped.state;
  noteStep(ctx,action,'reply');
  ctx.stats.responses++;
  const value=planFrom(pack,next,actor,ctx,left,depth+1);
  if(value>=90000)sawWin=true;
  best=keepBest(best,value,leafSnap(ctx),!!ctx.stats.settled,false);
 }
 if(sawWin&&best&&best.value<90000){
  ctx.stats.refuted=true;
  best.snap.refuted=true;
 }
 ctx.replyLeft=saved;
 const branches=ctx.stats.followBranches;
 const deepest=ctx.stats.maxDepth;
 if(!best){
  applyLeaf(ctx,before);
  classifyLine(ctx,cursor,actor);
  ctx.stats.followBranches=branches;
  ctx.stats.maxDepth=deepest;
  return evaluate(pack,cursor,actor,ctx);
 }
 applyLeaf(ctx,best.snap);
 ctx.stats.followBranches=branches;
 ctx.stats.maxDepth=Math.max(deepest,depth+1);
 return best.value;
}
// The script passes once the attacks are done. The next play, raid, or pass
// is a normal decision: printed energy, an on-play, and a busy front stay
// in the candidate list. One level shares this line's node cap. Anything
// the cap does not reach stays unexplored.
function followRank(action){
 if(action?.type==='raid'&&action.line!=='energy')return 0;
 if(action?.type==='play'&&action.line==='front')return 1;
 if(action?.type==='raid')return 2;
 if(action?.type==='play')return 3;
 return 4;
}
function discardRoot(ctx){
 const kind=ctx.stats.sequence?.[0]?.type||'';
 return kind==='chooseDiscard'||kind==='chooseDiscardGate';
}
function clockLeft(ctx,deadline){
 if(typeof ctx.now!=='function'||!Number.isFinite(deadline)||deadline===Infinity)return Infinity;
 return deadline-nowOf(ctx);
}
// The 8ms margin is the whole decision's deadline. A root slice is only the
// share kept for a later root; it is not a reason to skip a follow-up while
// the shared clock and the shared node pool can still run it.
function followClock(ctx){
 const deadline=Number.isFinite(ctx.parentDeadline)?ctx.parentDeadline:ctx.deadline;
 const left=clockLeft(ctx,deadline);
 return !Number.isFinite(left)||left>8;
}
function noteFollow(ctx,reason,extra){
 if(!ctx.profile)return;
 const now=nowOf(ctx);
 const parent=ctx.parentDeadline;
 ctx.profile.follows.push({
  reason,sliceLeft:Number.isFinite(ctx.deadline)?ctx.deadline-now:null,
  parentLeft:Number.isFinite(parent)?parent-now:null,
  nodes:ctx.pool.n,lineSpent:ctx.lineSpent,root:ctx.stats.sequence?.[0]?.type||null,
  rootLine:ctx.stats.sequence?.[0]?.line||null,rootUid:ctx.stats.sequence?.[0]?.uid??null,
  ...extra
 });
}
function canBranchDevelopment(state,actor,legal){
 if(!state||state.pending||state.active!==actor||state.phase!=='main')return false;
 if(legal.some(action=>action.type==='attack'))return false;
 return legal.some(action=>action.type==='play'||action.type==='raid');
}
function developmentCandidates(pack,state,actor,legal,ctx){
 if(!canBranchDevelopment(state,actor,legal))return null;
 const relevant=legal.filter(action=>action.type==='play'||action.type==='raid'||action.type==='next');
 const width=Math.max(1,ctx.beam||1);
 const picked=planCandidates(pack,state,actor,relevant,width,ctx.strategy);
 const ordered=picked.slice().sort((a,b)=>followRank(a)-followRank(b)||byText(a,b));
 if(ordered.length<=1||!ordered.some(action=>action.type==='play'||action.type==='raid'))return null;
 return ordered;
}
function branchDevelopment(pack,state,actor,ctx,choices){
 ctx.stats.followSeen=(ctx.stats.followSeen||[]).concat(choices.map(action=>brief(action,'follow')));
 ctx.stats.followBranches+=choices.length;
 const before=leafSnap(ctx);
 let best=null;
 let skipped=[];
 for(let index=0;index<choices.length;index++){
  const action=choices[index];
  if(!room(ctx)){
   ctx.stats.budget++;
   skipped=choices.slice(index).map(item=>({...brief(item,'unexplored'),reason:ctx.pool.n>0&&ctx.lineSpent<ctx.lineCap?'time':'nodes'}));
   break;
  }
  applyLeaf(ctx,before);
  const stepped=billedStep(ctx,pack,state,action);
  if(stepped.budget){
   ctx.stats.budget++;
   skipped=choices.slice(index).map(item=>({...brief(item,'unexplored'),reason:nowOf(ctx)>ctx.deadline?'time':'nodes'}));
   break;
  }
  if(stepped.error){ctx.stats.unsupported++;continue;}
  noteStep(ctx,action,'choice');
  ctx.stats.actorDecisions++;
  const value=finishLine(pack,stepped.state,actor,ctx);
  best=keepBest(best,value,leafSnap(ctx),!!ctx.stats.settled,true);
 }
 const branches=ctx.stats.followBranches;
 const deepest=ctx.stats.maxDepth;
 if(!best){
  applyLeaf(ctx,before);
  classifyLine(ctx,state,actor);
  ctx.stats.followBranches=branches;
  ctx.stats.maxDepth=deepest;
  if(skipped.length)ctx.stats.unexplored=(ctx.stats.unexplored||[]).concat(skipped);
  return evaluate(pack,state,actor,ctx);
 }
 applyLeaf(ctx,best.snap);
 ctx.stats.followBranches=Math.max(branches,ctx.stats.followBranches||0);
 ctx.stats.maxDepth=Math.max(deepest,ctx.stats.maxDepth||1);
 if(skipped.length)ctx.stats.unexplored=(ctx.stats.unexplored||[]).concat(skipped);
 return best.value;
}
// After the decision cap, every line walks the same attack-or-end script
// so a combo can still reach the boundary a bare next already reached.
function finishLine(pack,cursor,actor,ctx){
 ctx.stats.depthHit=true;
 if(!ctx.stats.limit)ctx.stats.limit='depth';
 if((ctx.finishGuard||0)>6){
  classifyLine(ctx,cursor,actor);
  return terminalValue(cursor,actor)??evaluate(pack,cursor,actor,ctx);
 }
 ctx.finishGuard=(ctx.finishGuard||0)+1;
 if(ctx.pass==='basic'&&(ctx.plan==='tree'||ctx.plan==='tree-replies')&&!ctx.developed&&!discardRoot(ctx)&&room(ctx)){
  let legal=null;
  try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;legal=null;}
  const choices=legal&&developmentCandidates(pack,cursor,actor,legal,ctx);
  if(!choices)noteFollow(ctx,'no-candidate');
  else if(!followClock(ctx)){
   // Listed, not dispatched. The one-card script may still get home. That
   // return is not a comparison of these choices.
   noteFollow(ctx,'parent-clock',{listed:choices.length});
   ctx.stats.followSeen=(ctx.stats.followSeen||[]).concat(choices.map(action=>brief(action,'follow')));
   ctx.stats.unexplored=(ctx.stats.unexplored||[]).concat(choices.map(action=>({...brief(action,'unexplored'),reason:'clock'})));
  }else{
   const sliceLeft=clockLeft(ctx,ctx.deadline);
   const parentLeft=clockLeft(ctx,ctx.parentDeadline);
   // A slice that is already most of the way through the 8ms margin can
   // finish the follow-up if it is allowed to reach that margin. A nearly
   // empty slice is not extended, and the decision deadline is never moved.
   const margin=nowOf(ctx)+8;
   const raised=Number.isFinite(ctx.parentDeadline)&&margin<ctx.parentDeadline?margin:ctx.parentDeadline;
   const widen=Number.isFinite(sliceLeft)&&sliceLeft>4&&sliceLeft<=8&&parentLeft>8&&
    Number.isFinite(raised)&&raised>ctx.deadline;
   noteFollow(ctx,widen?'branch-parent':'branch',{listed:choices.length,sliceLeft,parentLeft});
   const saved=ctx.deadline;
   if(widen)ctx.deadline=raised;
   ctx.developed=true;
   let value;
   try{value=branchDevelopment(pack,cursor,actor,ctx,choices);}
   finally{ctx.deadline=saved;ctx.developed=false;ctx.finishGuard--;}
   return value;
  }
 }else if(ctx.pass==='basic'&&!ctx.developed&&ctx.profile){
  noteFollow(ctx,!room(ctx)?'no-room':discardRoot(ctx)?'discard':'closed');
 }
 let state=cursor;
 if(room(ctx)&&state.status==='playing')state=roll(pack,state,actor,ctx,attackOrEnd);
 const mid=terminalValue(state,actor);
 if(mid!==null){ctx.finishGuard--;classifyLine(ctx,state,actor);return mid;}
 if(state.status==='playing'&&state.pending&&who(state)!==actor){
  const value=answerOpponent(pack,state,actor,ctx,0,ctx.stats.maxDepth||1);
  ctx.finishGuard--;
  return value;
 }
 if(state.status==='playing'&&!state.pending&&state.active!==actor){
  ctx.stats.opponentTurns++;
  state=ctx.plan==='tree-replies'
   ?replyFrom(pack,state,actor,ctx,ctx.opponentLeft??2)
   :fastOpponent(pack,state,actor,ctx);
 }
 ctx.finishGuard--;
 classifyLine(ctx,state,actor);
 return terminalValue(state,actor)??evaluate(pack,state,actor,ctx);
}
function planFrom(pack,state,actor,ctx,left,depth){
 ctx.stats.maxDepth=Math.max(ctx.stats.maxDepth||1,depth);
 const done=terminalValue(state,actor);
 if(done!==null){classifyLine(ctx,state,actor);return done;}
 if(!room(ctx)){classifyLine(ctx,state,actor);return evaluate(pack,state,actor,ctx);}
 let cursor=advanceForced(pack,state,ctx);
 const mid=terminalValue(cursor,actor);
 if(mid!==null){classifyLine(ctx,cursor,actor);return mid;}
 if(left<=0){
  ctx.stats.depthHit=true;
  if(!ctx.stats.limit)ctx.stats.limit='depth';
 }
 if(!cursor.pending&&cursor.active!==actor){
  ctx.stats.opponentTurns++;
  cursor=ctx.plan==='tree-replies'?replyFrom(pack,cursor,actor,ctx,ctx.opponentLeft??2):fastOpponent(pack,cursor,actor,ctx);
  classifyLine(ctx,cursor,actor);
  const end=terminalValue(cursor,actor);
  return end!==null?end:evaluate(pack,cursor,actor,ctx);
 }
 if(cursor.pending&&who(cursor)!==actor)return answerOpponent(pack,cursor,actor,ctx,left,depth);
 if(left<=0)return finishLine(pack,cursor,actor,ctx);
 let legal;
 try{legal=cachedLegal(pack,cursor);}catch{
  ctx.stats.unsupported++;
  classifyLine(ctx,cursor,actor);
  return evaluate(pack,cursor,actor,ctx);
 }
 if(!legal.length){classifyLine(ctx,cursor,actor);return evaluate(pack,cursor,actor,ctx);}
 const seat=who(cursor);
 const maximize=seat===actor;
 const width=Math.max(1,ctx.beam||1);
 const candidates=ctx.strategy==='reply'&&!maximize
  ?replyCandidates(pack,cursor,legal,width)
  :planCandidates(pack,cursor,seat,legal,width,maximize?ctx.strategy:null);
 ctx.stats.followBranches+=candidates.length;
 const before=leafSnap(ctx);
 let best=null;
 for(let index=0;index<candidates.length;index++){
  const action=candidates[index];
  if(!room(ctx)){
   ctx.stats.budget++;
   const skipped=candidates.slice(index).map(item=>brief(item,'unexplored'));
   ctx.stats.unexplored=(ctx.stats.unexplored||[]).concat(skipped);
   break;
  }
  applyLeaf(ctx,before);
  const stepped=billedStep(ctx,pack,cursor,action);
  if(stepped.budget){ctx.stats.budget++;break;}
  if(stepped.error){ctx.stats.unsupported++;continue;}
  const next=stepped.state;
  noteStep(ctx,action,maximize?'choice':'reply');
  if(maximize)ctx.stats.actorDecisions++;
  else ctx.stats.responses++;
  const value=planFrom(pack,next,actor,ctx,maximize?left-1:left,depth+1);
  best=keepBest(best,value,leafSnap(ctx),!!ctx.stats.settled,maximize);
 }
 const branches=ctx.stats.followBranches;
 const deepest=ctx.stats.maxDepth;
 if(!best){
  applyLeaf(ctx,before);
  classifyLine(ctx,cursor,actor);
  ctx.stats.followBranches=branches;
  ctx.stats.maxDepth=deepest;
  return evaluate(pack,cursor,actor,ctx);
 }
 applyLeaf(ctx,best.snap);
 ctx.stats.followBranches=branches;
 ctx.stats.maxDepth=Math.max(deepest,depth+1);
 return best.value;
}
function layered(pack,state,actor,ctx,base){
 if(!room(ctx)){
  classifyLine(ctx,state,actor);
  return terminalValue(state,actor)??evaluate(pack,state,actor,ctx);
 }
 const ceiling=base+3;
 let layer=Math.max(0,base);
 let best=null;
 const rootSeq=ctx.stats.sequence.slice();
 const rootTurns=ctx.stats.opponentTurns;
 const rootResponses=ctx.stats.responses;
 const rootDecisions=ctx.stats.actorDecisions;
 while(layer<=ceiling&&room(ctx)){
  ctx.stats.sequence=rootSeq.slice();
  ctx.stats.opponentTurns=rootTurns;
  ctx.stats.responses=rootResponses;
  ctx.stats.actorDecisions=rootDecisions;
  ctx.stats.depthHit=false;
  ctx.stats.limit=null;
  const value=planFrom(pack,state,actor,ctx,layer,1);
  const snap=leafSnap(ctx);
  const settled=!!ctx.stats.settled;
  ctx.stats.layers=(ctx.stats.layers||0)+1;
  const candidate={value,snap,settled,depth:ctx.stats.maxDepth,branches:ctx.stats.followBranches};
  if(preferOurLine(candidate,best))best=candidate;
  if(!room(ctx)||ctx.stats.exhausted==='nodes'||ctx.stats.exhausted==='time')break;
  if(ctx.pool.n<16||ctx.lineSpent>ctx.lineCap*0.7)break;
  layer++;
 }
 if(!best)return evaluate(pack,state,actor,ctx);
 const depth=Math.max(ctx.stats.maxDepth||1,best.depth||1);
 const branches=Math.max(ctx.stats.followBranches||0,best.branches||0);
 applyLeaf(ctx,best.snap);
 ctx.stats.maxDepth=depth;
 ctx.stats.followBranches=branches;
 ctx.stats.settled=best.settled;
 return best.value;
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
  return evaluate(pack,state,actor,ctx);
 }
 if(ctx.finish&&mode==='us'){
  ctx.stats.maxDepth=1;
  ctx.stats.followBranches=0;
  let cursor=roll(pack,state,actor,ctx,continuationAction);
  cursor=roll(pack,cursor,actor,ctx,attackOrEnd);
  const mid=terminalValue(cursor,actor);
  if(mid===null&&!cursor.pending&&cursor.active!==actor){
   ctx.stats.opponentTurns++;
   cursor=fastOpponent(pack,cursor,actor,ctx);
  }
  classifyLine(ctx,cursor,actor);
  const end=terminalValue(cursor,actor);
  return end!==null?end:evaluate(pack,cursor,actor,ctx);
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
  return remember(ctx,key,evaluate(pack,cursor,actor,ctx),mark);
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
 if(left<=0)return remember(ctx,key,evaluate(pack,cursor,actor,ctx),mark);
 const seat=who(cursor);
 let legal;
 try{legal=cachedLegal(pack,cursor);}catch{ctx.stats.unsupported++;return evaluate(pack,cursor,actor,ctx);}
 if(!legal.length)return evaluate(pack,cursor,actor,ctx);
 const candidates=selectCandidates(pack,cursor,seat,legal,ctx.beam);
 const finishRank=action=>action.type==='attack'?0:action.type==='next'?1:2;
 const ordered=[...candidates].sort((a,b)=>finishRank(a)-finishRank(b)||byText(a,b));
 const maximize=seat===actor;
 let best=maximize?-Infinity:Infinity,compared=0,bestOk=false;
 let bestPending=ctx.stats.leafPending,bestPhase=ctx.stats.leafPhase;
 for(let i=0;i<ordered.length;i++){
  const action=ordered[i];
  const stepped=billedStep(ctx,pack,cursor,action);
  if(stepped.budget){ctx.stats.budget++;break;}
  if(stepped.error){ctx.stats.unsupported++;continue;}
  let next=stepped.state;
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
 if(!compared)best=evaluate(pack,cursor,actor,ctx);
 if(bestOk)ctx.stats.settled=true;
 return remember(ctx,key,best,mark);
}
function lineView(ctx,search){
 const finite=Number.isFinite(search);
 return {...ctx.stats,
  search:finite?search:null,nodes:ctx.lineSpent,executed:!!ctx.stats.executed,settled:!!ctx.stats.settled,
  boundary:ctx.stats.boundary||'open',handedOff:!!ctx.stats.handedOff,returned:!!ctx.stats.returned,
  cut:ctx.stats.cut||null,pending:ctx.stats.leafPending||null,phase:ctx.stats.leafPhase||null,
  damageOpen:!!ctx.stats.damageOpen,stopPending:ctx.stats.stopPending??null,
  stopPlayer:ctx.stats.stopPlayer??null,stopReason:ctx.stats.stopReason??null,
  startOwnTurns:ctx.origin?.ownTurns??null,
  leafTurn:ctx.stats.leafTurn??null,leafActive:ctx.stats.leafActive??null,
  refuted:!!ctx.stats.refuted,unexplored:ctx.stats.unexplored||[]};
}
export function scoreLine(pack,state,actor,action,limits){
 const pool=limits.pool||{n:limits.nodes};
 const lineCap=Math.min(limits.nodes,pool.n);
 const parent=Number.isFinite(limits.parentDeadline)?limits.parentDeadline:Infinity;
 const requested=Number.isFinite(limits.deadline)?limits.deadline:parent;
 const ctx={
  pool,lineCap,lineSpent:0,
  now:limits.now,
  deadline:Math.min(requested,parent),
  parentDeadline:parent,
  profile:limits.profile||null,
  legalCache:limits.legalCache||new WeakMap(),
  plan:limits.plan||(limits.finish===false?'tree':'rollout'),
  strategy:limits.strategy||null,
  beam:limits.beam,
  opponentLeft:limits.opponentDecisions,
  origin:{turn:state.turn,ownTurns:state.players[actor].ownTurns,phase:state.phase,actor},
  tt:limits.tt||new Map(),
  stats:{orderSteps:0,transpositionHits:0,unsupported:0,budget:0,opponentTurns:0,responses:0,actorDecisions:0,
   boundary:'open',handedOff:false,returned:false,cut:null,limit:null,depthHit:false,layers:0,
   followBranches:0,maxDepth:1,sequence:[],executed:false,refuted:false,unexplored:[],
   damageOpen:false,stopPending:null,stopPlayer:null,stopReason:null,unhandled:false,
   plan:limits.plan||(limits.finish===false?'tree':'rollout')}
 };
 ctx.finish=ctx.plan==='rollout';
 ctx.pass=limits.pass||null;
 return bindProbeBudget(ctx,()=>finishScore(pack,state,actor,action,limits,ctx));
}
function finishScore(pack,state,actor,action,limits,ctx){
 if(!room(ctx)){
  ctx.stats.executed=false;
  ctx.stats.settled=false;
  ctx.stats.cut=!(ctx.pool.n>0)?'nodes':'time';
  ctx.stats.limit=ctx.stats.cut;
  ctx.stats.boundary='open';
  return lineView(ctx,null);
 }
 const opened=state.pending?.kind;
 if(opened==='block'||opened==='effect-block-floor'){
  const battle=battleActionValue(pack,state,actor,action);
  if(Number.isFinite(battle))ctx.stats.battleScore=battle;
 }
 const swing=blankSwingAdjustment(pack,state,actor,action);
 if(swing)ctx.stats.swing=swing;
 const stepped=billedStep(ctx,pack,state,action);
 if(stepped.error)return null;
 if(stepped.budget){
  ctx.stats.executed=false;
  ctx.stats.settled=false;
  ctx.stats.cut=nowOf(ctx)>ctx.deadline?'time':'nodes';
  ctx.stats.limit=ctx.stats.cut;
  ctx.stats.boundary='open';
  return lineView(ctx,null);
 }
 const next=stepped.state;
 ctx.stats.executed=true;
 ctx.stats.actorDecisions++;
 noteStep(ctx,action,'root');
 const raw=limits.pass==='basic'?finishLine(pack,next,actor,ctx):ctx.plan==='rollout'
  ?searchFrom(pack,next,actor,ctx,'us',limits.actorDecisions)
  :layered(pack,next,actor,ctx,limits.actorDecisions??2);
 const swingValue=ctx.stats.swing||0;
 const stranded=raidStranded(pack,state,actor,action,ctx.stats.leafState||next);
 if(stranded)ctx.stats.stranded=stranded;
 const value=Number.isFinite(raw)&&Math.abs(raw)<90000?raw+swingValue-stranded:raw;
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
