// Read-only replay of a saved specialist. It does not update weights.
import {performance} from 'node:perf_hooks';
import {dispatchUniversalAction,legalUniversalActions,universalEnergy} from '../engine.mjs';
import {chooseStrengthenedHardAction,lastHardAiTrace} from '../hard-ai.mjs';
import {newComparedMatch,matchRules,cloneMatch} from '../ai-v3/opening.mjs';
import {HARD_OPTIONS,LOOP_LIMIT,MAX_STEPS,ORDER_KINDS,WHITE_SWORD_DECK} from './constants.mjs';
import {chooseWhiteSwordAction} from './choose.mjs';
import {getDeck} from './deck.mjs';
import {emptyAnomalies,positionKey} from './runner.mjs';

const RULES=matchRules('official');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const PRIMARY=['block','raid','attack','effect','energy','ap','mulligan','other'];

function cardOf(state,actor,uid){
 if(!uid)return null;
 const take=(player,own)=>{
  const found=[];
  if(own)for(const card of player.hand||[])if(card?.uid)found.push(card);
  for(const line of ['front','energy'])for(const card of player[line]||[]){
   if(!card)continue;
   found.push(card);
   for(const layer of card.stack||[])if(layer?.uid)found.push(layer);
  }
  for(const card of player.outside||[])if(card?.uid)found.push(card);
  return found;
 };
 for(const card of take(state.players[actor],true))if(card.uid===uid)return card;
 for(const card of take(state.players[actor===0?1:0],false))if(card.uid===uid)return card;
 return null;
}
function printed(pack,card){
 if(!card?.cardId)return null;
 return pack[0]?.cards?.[card.cardId]||pack[1]?.cards?.[card.cardId]||null;
}
export function describeAction(state,actor,action){
 const card=cardOf(state,actor,action?.uid);
 const base=cardOf(state,actor,action?.baseUid);
 const bottom=base?.stack?.[0]||base;
 return {
  type:action?.type||null,mode:action?.mode??null,line:action?.line??null,
  slot:Number.isInteger(action?.slot)?action.slot:null,
  cardId:card?.cardId||null,baseId:bottom?.cardId||base?.cardId||null,
  uid:action?.uid??null
 };
}
function showLine(cards){
 return (cards||[]).map(card=>card?.cardId?(card.cardId+(card.ready===false?'*':'')):'-');
}
function snapshot(pack,state,actor){
 const me=state.players[actor];
 const opp=state.players[actor===0?1:0];
 let energy=null;
 try{energy=universalEnergy(pack,state,actor);}catch{energy=null;}
 return {
  turn:state.turn,phase:state.phase,pending:state.pending?.kind||null,
  ap:me.apCards.filter(card=>card?.ready).length,
  myLife:me.life.length,oppLife:opp.life.length,energy,
  myHand:me.hand.map(card=>card.cardId),
  myFront:showLine(me.front),myEnergy:showLine(me.energy),
  oppFront:showLine(opp.front),oppEnergy:showLine(opp.energy)
 };
}
function scoreOf(trace,action){
 const row=(trace?.candidates||[]).find(item=>same(item.action,action));
 return row&&Number.isFinite(row.score)?row.score:null;
}
export function decisionTags({state,actor,legal,chosen,hard,pack}){
 const tags=[];
 const me=state.players[actor];
 const opp=state.players[actor===0?1:0];
 const energyCards=me.energy.filter(card=>card?.cardId).length;
 const chosenId=describeAction(state,actor,chosen);
 const hardId=describeAction(state,actor,hard);
 const ids=new Set([chosenId.cardId,hardId.cardId]);
 const pending=state.pending?.kind||'';
 if(chosen?.type==='chooseBlock'||hard?.type==='chooseBlock')tags.push('block');
 if(chosen?.type==='attack'||hard?.type==='attack')tags.push('attack');
 if(chosen?.type==='raid'||hard?.type==='raid')tags.push('raid');
 if(chosen?.type==='openingMulligan'||hard?.type==='openingMulligan')tags.push('mulligan');
 if(pending.startsWith('effect-')||['chooseRetireBp','chooseTopFilteredMany','chooseRestLock','chooseTarget','chooseDiscard','chooseTopCard','chooseEffectMode'].includes(chosen?.type)||['chooseRetireBp','chooseTopFilteredMany','chooseRestLock','chooseTarget','chooseDiscard','chooseTopCard','chooseEffectMode'].includes(hard?.type))
  tags.push('effect');
 if(chosen?.line==='energy'||hard?.line==='energy'||chosen?.mode==='restTwoMove'||hard?.mode==='restTwoMove'||chosen?.type==='move'||hard?.type==='move')
  tags.push('energy');
 if(chosen?.type==='event'||hard?.type==='event'||ids.has('BLC-4-080')||ids.has('BLC-2-073'))tags.push('ap');
 if((chosen?.type==='next'||chosen?.type==='extraDraw')&&legal.some(action=>action&&action.type!=='next'&&action.type!=='extraDraw'))
  tags.push('ap');
 if(ids.has('BLC-2-067'))tags.push('raid-067');
 if(ids.has('BLC-1-085'))tags.push('raid-085');
 if(ids.has('BLC-1-070'))tags.push('raid-070');
 if(ids.has('BLC-4-060'))tags.push('aizen');
 if(ids.has('BLC-2-073'))tags.push('noshaba');
 if(ids.has('BLC-4-080'))tags.push('bankai');
 if(chosen?.type==='raid'&&chosenId.cardId==='BLC-2-067'){
  const base=cardOf(state,actor,chosen.baseUid);
  const bottom=base?.stack?.[0]||base;
  const cost=Number(printed(pack,bottom)?.energy)||0;
  if(cost<4)tags.push('raid-067-low-base');
 }
 if((chosen?.mode==='restTwoMove'||chosen?.type==='move')&&energyCards<=2)tags.push('energy-early-front');
 if(chosen?.line==='energy'&&energyCards>=3&&hard?.line!=='energy')tags.push('energy-hoard');
 if(hard?.type==='attack'&&chosen?.type!=='attack'&&!opp.front.some(card=>card?.cardId))tags.push('missed-open-attack');
 if(chosen?.type==='chooseBlock'&&chosen.uid!=null&&hard?.type==='chooseBlock'&&hard.uid==null)tags.push('wasted-block');
 if(chosen?.type==='chooseBlock'&&chosen.uid==null&&hard?.type==='chooseBlock'&&hard.uid!=null)tags.push('missed-block');
 return tags;
}
export function primaryLabel(tags){
 for(const name of PRIMARY)if(tags.includes(name))return name;
 return 'other';
}
function chooseSeat(pack,state,actor,seat,spec,step){
 if(seat.policy==='hard-search-2'){
  const action=chooseStrengthenedHardAction(pack,state,{...HARD_OPTIONS,seed:spec.seed});
  return {action,source:'hard-search-2'};
 }
 if(seat.policy==='white-sword'){
  return chooseWhiteSwordAction(pack,state,{
   actor,model:seat.model,mode:seat.mode||'blend',explore:0,scale:seat.scale??6,
   hardCap:Number.isFinite(seat.hardCap)?seat.hardCap:null,
   step,seed:spec.seed
  });
 }
 throw Error('Diagnosis only compares white-sword with hard-search-2');
}
export function diagnoseGame(spec){
 const started=performance.now();
 if(spec.seats.some(seat=>seat.policy==='white-sword'&&seat.deckId!==WHITE_SWORD_DECK))
  throw Error('White Sword specialist deck is fixed');
 const decks=spec.seats.map(seat=>getDeck(seat.deckId));
 const packs=[decks[0].pack,decks[1].pack];
 let state=newComparedMatch(packs,[decks[0].counts,decks[1].counts],spec.seed,spec.first,RULES);
 const anomalies=emptyAnomalies();
 const actions=[];
 const disagreements=[];
 let steps=0,lastKey='',repeats=0,error=null;
 while(state.status==='playing'&&steps<MAX_STEPS){
  const actor=state.pending?.player??state.active;
  let legal;
  try{legal=legalUniversalActions(packs,state);}
  catch(cause){anomalies.engineError++;error=cause.message;break;}
  if(!legal.length){anomalies.illegal++;error='no legal action';break;}
  const key=positionKey(state);
  repeats=key===lastKey?repeats+1:0;
  lastKey=key;
  if(repeats>=LOOP_LIMIT){anomalies.deadLoop++;error='repeated position';break;}
  const seat=spec.seats[actor];
  let picked;
  let hardAction=null,trace=null,sacrifice=null;
  const compare=actor===spec.specialistSeat&&legal.length>1&&!ORDER_KINDS.has(state.pending?.kind);
  if(compare){
   try{
    hardAction=chooseStrengthenedHardAction(packs,state,{...HARD_OPTIONS,seed:spec.seed});
    trace=lastHardAiTrace();
   }catch(cause){hardAction=null;error=cause.message;}
  }
  try{picked=chooseSeat(packs,state,actor,seat,spec,steps);}
  catch(cause){anomalies.fallback++;error=cause.message;break;}
  const action=legal.find(item=>item===picked?.action||same(item,picked?.action));
  if(!action){
   if(actor===spec.specialistSeat){anomalies.illegal++;anomalies.fallback++;error=picked?.reason||'illegal action';break;}
   anomalies.opponentFallback++;
   picked={action:legal[0],source:'opponent-fallback'};
  }
  const played=action||picked.action;
  if(compare&&hardAction&&!same(played,hardAction)){
   const hardScore=scoreOf(trace,hardAction);
   const chosenScore=scoreOf(trace,played);
   sacrifice=hardScore==null||chosenScore==null?null:hardScore-chosenScore;
   const tags=decisionTags({state,actor,legal,chosen:played,hard:hardAction,pack:packs});
   if(sacrifice!=null&&sacrifice>7)tags.push('model');
   if(chosenScore==null)tags.push('outside-search');
   disagreements.push({
    step:steps,turn:state.turn,actor,tags,primary:primaryLabel(tags),sacrifice,
    hardScore,chosenScore,
    position:snapshot(packs,state,actor),
    chosen:describeAction(state,actor,played),
    hard:describeAction(state,actor,hardAction),
    chosenAction:played,hardAction,
    legal:legal.map(item=>describeAction(state,actor,item))
   });
  }
  actions.push(played);
  try{state=dispatchUniversalAction(packs,state,played,{actor});}
  catch(cause){anomalies.engineError++;error=cause.message;break;}
  steps++;
 }
 if(steps>=MAX_STEPS&&state.status==='playing'){anomalies.deadLoop++;error=error||'step-cap';}
 const loss=state.winner!==spec.specialistSeat;
 return {
  seed:spec.seed,first:spec.first,specialistSeat:spec.specialistSeat,
  specialistIsFirst:spec.specialistSeat===spec.first,
  status:state.status,winner:state.winner,endReason:state.endReason,error,
  steps,turn:state.turn,anomalies,ms:performance.now()-started,
  decisions:actions.length,overrides:disagreements.length,
  disagreements:loss?disagreements:disagreements.map(row=>({step:row.step,primary:row.primary,tags:row.tags,sacrifice:row.sacrifice})),
  actions:loss?actions:null
 };
}
export function replayTo(spec,actions,index){
 const decks=spec.seats.map(seat=>getDeck(seat.deckId));
 const packs=[decks[0].pack,decks[1].pack];
 let state=newComparedMatch(packs,[decks[0].counts,decks[1].counts],spec.seed,spec.first,RULES);
 for(let i=0;i<index;i++){
  const actor=state.pending?.player??state.active;
  state=dispatchUniversalAction(packs,state,actions[i],{actor});
 }
 return {packs,state:cloneMatch(state)};
}
export function continueMatch(packs,state,spec,firstAction){
 let cursor=state;
 const actor0=cursor.pending?.player??cursor.active;
 cursor=dispatchUniversalAction(packs,cursor,firstAction,{actor:actor0});
 let steps=1,lastKey='',repeats=0;
 while(cursor.status==='playing'&&steps<MAX_STEPS){
  const actor=cursor.pending?.player??cursor.active;
  const legal=legalUniversalActions(packs,cursor);
  if(!legal.length)break;
  const key=positionKey(cursor);
  repeats=key===lastKey?repeats+1:0;
  lastKey=key;
  if(repeats>=LOOP_LIMIT)break;
  const seat=spec.seats[actor];
  const picked=chooseSeat(packs,cursor,actor,seat,spec,steps);
  const action=legal.find(item=>item===picked?.action||same(item,picked?.action))||legal[0];
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
  steps++;
 }
 return {status:cursor.status,winner:cursor.winner,endReason:cursor.endReason,steps};
}
