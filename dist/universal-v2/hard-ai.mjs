// Strengthened Hard policy for the live V2 reducer.
// The frozen heuristic remains chooseLegacyHardAiAction in ai.mjs.
// Every action dispatched here is taken from legalUniversalActions.
// Deck order, unrevealed LIFE identities and the opponent's hidden hand
// are not read. A line that would reveal them is scored from public
// deltas plus the deck-list average, then the search stops.
import {legalUniversalActions,dispatchUniversalAction,universalBp,
 universalEnergy,universalEnergyByColor,universalAttackDamage,universalImpact,
 universalImpactNull} from './engine.mjs';
import {chooseLegacyHardAiAction} from './ai.mjs';

export const HARD_AI_POLICY='hard-search-1';
const ORDER_KINDS=new Set(['phase-order','retirement-order','effect-move-order',
 'effect-top-order','effect-raid-witness-order','effect-raid-witness-move',
 'life-batch-order']);
const ROOT_MARGIN=7;
const emptyReport=()=>({decisions:0,forced:0,deferred:0,overrides:0,kept:0,
 budgetExhausted:0,exceptions:0,unsupported:0,legacyMiss:0,uncompared:0,
 ms:0,maxMs:0,nodes:0});
let report=emptyReport();
let lastTrace=null;
const packsOf=pack=>Array.isArray(pack)?pack:[pack,pack];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const ownerOf=uid=>Number(String(uid).split('-')[0]);
const squash=s=>String(s||'').replace(/\s+/g,'');
const idKey=list=>(list||[]).map(c=>c?.uid||'').sort().join('|');

export function resetHardAiReport(){report=emptyReport();lastTrace=null;}
export function hardAiReport(){return {...report};}
export function lastHardAiTrace(){return lastTrace?{...lastTrace}:null;}

function printed(pack,owner,card){
 return packsOf(pack)[owner]?.cards?.[card?.cardId]||null;
}
function onBoard(state,uid){
 if(!uid)return null;
 for(const pl of state.players){
  for(const c of [...pl.front,...pl.energy])if(c?.uid===uid)return c;
 }
 return null;
}
function collectUids(value,into){
 if(typeof value==='string'&&/^[01]-\d+$/.test(value))into.add(value);
 else if(Array.isArray(value))for(const v of value)collectUids(v,into);
 else if(value&&typeof value==='object')
  for(const v of Object.values(value))collectUids(v,into);
}
function authorizedSet(state){
 const ids=new Set();
 if(state.pending)collectUids(state.pending,ids);
 return ids;
}
function knownIds(state,actor){
 const ids=authorizedSet(state);
 for(let p=0;p<2;p++){
  const pl=state.players[p];
  for(const c of [...pl.front,...pl.energy,...pl.outside,...pl.removed])if(c)ids.add(c.uid);
  if(p===actor)for(const c of pl.hand)ids.add(c.uid);
 }
 return ids;
}
function leaks(before,after,actor){
 if(idKey(before.players[0].life)!==idKey(after.players[0].life))return 'life';
 if(idKey(before.players[1].life)!==idKey(after.players[1].life))return 'life';
 if(idKey(before.players[1-actor].hand)!==idKey(after.players[1-actor].hand))return 'opp-hand';
 const known=knownIds(before,actor);
 for(let p=0;p<2;p++){
  const pl=after.players[p];
  for(const c of [...pl.front,...pl.energy,...pl.outside,...pl.removed])
   if(c&&!known.has(c.uid))return 'public-new';
 }
 for(const c of after.players[actor].hand)if(!known.has(c.uid))return 'draw';
 return null;
}
function lifeScore(n){
 if(n<=0)return -90000;
 const table=[0,40,130,190,235,270,295,315,330];
 return table[n]??315+(n-7)*8;
}
function terminal(state,actor){
 if(state.status==='finished'){
  if(state.winner===actor)return 100000;
  if(state.winner===1-actor)return -100000;
  return 0;
 }
 const mine=state.players[actor].life.length,opp=state.players[1-actor].life.length;
 if(opp<=0&&mine>0)return 90000;
 if(mine<=0&&opp>0)return -90000;
 return null;
}
function safeNum(fn,fallback=0){
 try{const n=fn();return Number.isFinite(n)?n:fallback;}catch{return fallback;}
}
function readyPortion(pack,state,c){
 const dmg=safeNum(()=>universalAttackDamage(pack,state,c),1);
 const impact=safeNum(()=>universalImpact(pack,state,c),0);
 return 8+dmg*12+impact*9;
}
function presence(pack,state,c){
 const bp=safeNum(()=>universalBp(pack,state,c),0);
 const owner=ownerOf(c.uid);
 const d=printed(pack,owner,c);
 let v=10+bp/200+(d?.gen||0)*1.5;
 if(safeNum(()=>universalImpactNull(pack,state,c)?1:0,0))v+=4;
 if(c.ready)v+=state.active===owner?readyPortion(pack,state,c):7+
  safeNum(()=>universalAttackDamage(pack,state,c),1)*13+
  safeNum(()=>universalImpact(pack,state,c),0)*6;
 const threat=state.players[1-owner].front.some(f=>f?.ready&&
  safeNum(()=>universalAttackDamage(pack,state,f),1)>=2);
 if(c.ready&&threat)v+=22;
 // Attacker wins a tie, so only the side that can attack now is credited.
 let wins=0,ties=0;
 for(const foe of state.players[1-owner].front){
  if(!foe)continue;
  const foeBp=safeNum(()=>universalBp(pack,state,foe),0);
  if(foeBp<=0)continue;
  if(bp>foeBp)wins++;
  else if(c.ready&&state.active===owner&&bp===foeBp)ties++;
 }
 if(wins)v+=4*wins;
 if(ties)v+=16;
 return v;
}
function handContext(pack,state,player){
 const pl=state.players[player];
 const colors=universalEnergyByColor(pack,state,player);
 const fieldNames=new Set(),raidNeeds=new Set();
 for(const c of [...pl.front,...pl.energy].filter(Boolean)){
  const d=printed(pack,player,c);
  if(d?.name)fieldNames.add(squash(d.name));
  if(d?.raidName)fieldNames.add(squash(d.raidName));
 }
 for(const c of pl.hand){
  const d=printed(pack,player,c);
  if(d?.raidName)raidNeeds.add(squash(d.raidName));
 }
 return {colors,fieldNames,raidNeeds};
}
function rough(d,ctx){
 if(!d)return 3;
 if(d.type==='event')return 5.5+((ctx.colors[d.color]||0)>=(d.energy||0)?1.5:0);
 if(d.type!=='character')return 3;
 let v=2.2+(d.bp||0)/2200+(d.gen||0)*2.4;
 const have=ctx.colors[d.color]||0;
 if((d.energy||0)<=have)v+=2.2;
 else if((d.energy||0)<=have+2)v+=0.6;
 else v-=0.8;
 const name=squash(d.name);
 if(d.raidName&&ctx.fieldNames.has(squash(d.raidName)))v+=8;
 else if(d.raidName)v+=7;
 if(ctx.raidNeeds.has(name)||(d.raidName&&ctx.raidNeeds.has(squash(d.raidName))))v+=7;
 return v;
}
function handCardValue(pack,state,player,card){
 const d=printed(pack,player,card);
 const copies=state.players[player].hand.filter(c=>c.cardId===card.cardId).length;
 let v=rough(d,handContext(pack,state,player));
 if(copies>=3)v*=0.6;
 else if(copies===2)v*=0.85;
 return v;
}
function curveTarget(pack,state,player){
 const catalog=packsOf(pack)[player].cards;
 const counts=state.initialCounts?.[player]||{};
 const costs=[];
 for(const [id,n] of Object.entries(counts)){
  const d=catalog[id];
  if(d?.type==='character'&&d.energy>0)for(let i=0;i<n;i++)costs.push(d.energy);
 }
 if(!costs.length)return 3;
 costs.sort((a,b)=>a-b);
 return Math.max(2,Math.min(5,costs[Math.floor((costs.length-1)*0.8)]));
}
function resourceScore(pack,state,player){
 const energy=safeNum(()=>universalEnergy(pack,state,player),0);
 const deficit=Math.max(0,curveTarget(pack,state,player)-energy);
 let score=0;
 const colors=universalEnergyByColor(pack,state,player);
 const catalog=packsOf(pack)[player].cards;
 for(const c of state.players[player].hand){
  const d=catalog[c.cardId];
  if(d&&(d.energy||0)>(colors[d.color]||0))score-=2.4;
 }
 // One missing energy while already short has to outweigh moving that
 // generator forward and swinging once. 3.2 made a 1500 on 1 energy
 // look like a profitable attack and the deck never reached its curve.
 score-=deficit*deficit*8;
 score+=state.players[player].apCards.filter(a=>a.ready).length*4.2;
 const n=state.players[player].hand.length;
 score+=n<=1?0:n===2?1.5:n===3?2.5:n===4?3:3.2-(n-4)*1.2;
 return score;
}
function boardScore(pack,state,player){
 let score=0;
 const pl=state.players[player];
 for(const c of pl.front)if(c)score+=presence(pack,state,c);
 for(const c of pl.energy)if(c){
  const d=printed(pack,player,c);
  score+=6+(d?.gen||0)*6+Math.min(d?.bp||0,3000)/500;
 }
 return score;
}
function evaluate(pack,state,actor,hidden=null,blindValue=null){
 const done=terminal(state,actor);
 if(done!==null)return done;
 const opp=1-actor;
 let score=lifeScore(state.players[actor].life.length)-lifeScore(state.players[opp].life.length);
 score+=boardScore(pack,state,actor)-boardScore(pack,state,opp);
 let hand=0;
 const mystery=Number.isFinite(blindValue)?blindValue:4;
 for(const c of state.players[actor].hand)
  hand+=hidden?.has(c.uid)?mystery:handCardValue(pack,state,actor,c);
 score+=hand-state.players[opp].hand.length*3.4;
 score+=resourceScore(pack,state,actor)-resourceScore(pack,state,opp)*0.45;
 return score;
}
function subtractKnown(state,player,handKnown){
 const counts={...(state.initialCounts?.[player]||{})};
 const pl=state.players[player];
 for(const c of [...pl.front,...pl.energy,...pl.outside,...pl.removed])
  if(c&&counts[c.cardId])counts[c.cardId]--;
 if(handKnown)for(const c of pl.hand)if(counts[c.cardId])counts[c.cardId]--;
 return counts;
}
function unknownAverage(pack,state,player){
 const catalog=packsOf(pack)[player].cards;
 const counts=subtractKnown(state,player,true);
 const ctx=handContext(pack,state,player);
 let total=0,n=0;
 for(const [id,k] of Object.entries(counts)){
  if(k>0){total+=rough(catalog[id],ctx)*k;n+=k;}
 }
 return n?total/n:4;
}
function triggerRate(pack,state,player,handKnown){
 const catalog=packsOf(pack)[player].cards;
 const counts=subtractKnown(state,player,handKnown);
 let n=0,t=0;
 for(const [id,k] of Object.entries(counts)){
  if(k>0){n+=k;if(catalog[id]?.trigger)t+=k;}
 }
 return n?t/n:0.25;
}
function combatDelta(pack,before,after,actor,action){
 const ids=[];
 if(action.type==='attack'){
  if(action.uid)ids.push(action.uid);
  if(action.targetUid)ids.push(action.targetUid);
 }else if(action.type==='chooseBlock'){
  if(before.pending?.attackerUid)ids.push(before.pending.attackerUid);
  if(action.uid)ids.push(action.uid);
 }else return 0;
 let delta=0;
 for(const uid of ids){
  const was=onBoard(before,uid);
  if(!was)continue;
  const now=onBoard(after,uid);
  const sign=ownerOf(uid)===actor?1:-1;
  if(!now)delta-=sign*presence(pack,before,was);
  else if(was.ready&&!now.ready)delta-=sign*readyPortion(pack,before,was);
 }
 return delta;
}
function hiddenDraws(before,after,actor,hidden){
 const known=knownIds(before,actor);
 const next=new Set(hidden||[]);
 for(const c of after.players[actor].hand)if(!known.has(c.uid))next.add(c.uid);
 return next;
}
function scorePublic(pack,before,after,actor,hidden,blindValue){
 // A resolved play can mill or reveal. Those identities stay masked.
 // The card that was already in hand and is now on the field still counts;
 // otherwise a raid or an on-play mill scores as losing the hand card only.
 const known=knownIds(before,actor);
 const cover=hiddenDraws(before,after,actor,hidden);
 let state=after,mystery=0,cloned=false;
 for(let p=0;p<2;p++)for(const line of ['front','energy']){
  after.players[p][line].forEach((c,i)=>{
   if(!c||known.has(c.uid)||cover.has(c.uid))return;
   if(!cloned){state=structuredClone(after);cloned=true;}
   state.players[p][line][i]=null;
   mystery++;
  });
 }
 const blind=Number.isFinite(blindValue)?blindValue:unknownAverage(pack,before,actor);
 return evaluate(pack,state,actor,cover,blind)+mystery*8;
}
function leakedScore(pack,before,after,actor,action){
 const done=terminal(after,actor);
 if(done!==null)return done;
 const myAfter=after.players[actor].life.length;
 const oppAfter=after.players[1-actor].life.length;
 let score=evaluate(pack,before,actor);
 score+=lifeScore(myAfter)-lifeScore(before.players[actor].life.length);
 score-=lifeScore(oppAfter)-lifeScore(before.players[1-actor].life.length);
 score+=combatDelta(pack,before,after,actor,action);
 const afterHand=new Set(after.players[actor].hand.map(c=>c.uid));
 for(const c of before.players[actor].hand)
  if(!afterHand.has(c.uid))score-=handCardValue(pack,before,actor,c);
 const auth=authorizedSet(before);
 let blind=0;
 for(const c of after.players[actor].hand)
  if(!before.players[actor].hand.some(h=>h.uid===c.uid)&&!auth.has(c.uid))blind++;
 if(blind)score+=blind*unknownAverage(pack,before,actor);
 const oppLost=before.players[1-actor].life.length-oppAfter;
 const myLost=before.players[actor].life.length-myAfter;
 if(oppLost>0)score-=oppLost*triggerRate(pack,before,1-actor,false)*9;
 if(myLost>0)score+=myLost*triggerRate(pack,before,actor,true)*6;
 if(action.type==='chooseBlock'&&!action.uid&&before.pending?.player===actor){
  let extra=0;
  for(const c of before.players[before.active].front)
   if(c?.ready&&c.uid!==before.pending.attackerUid)
    extra+=safeNum(()=>universalAttackDamage(pack,before,c),1);
  const per=lifeScore(myAfter)-lifeScore(Math.max(0,myAfter-1));
  score-=extra*Math.max(12,per)*0.55;
 }
 return score;
}
function combatSwing(pack,state,card,bonus){
 const now=safeNum(()=>universalBp(pack,state,card),0);
 const later=now+bonus;
 const owner=ownerOf(card.uid);
 let gain=0;
 for(const foe of state.players[1-owner].front){
  if(!foe)continue;
  const bp=safeNum(()=>universalBp(pack,state,foe),0);
  if(now<bp&&later>=bp)gain+=18+presence(pack,state,foe);
 }
 return gain;
}
function rank(pack,state,actor,action){
 if(state.pending?.kind==='effect-buff-own'&&action.uid){
  const card=onBoard(state,action.uid);
  if(card&&ownerOf(card.uid)===actor)
   return 48+combatSwing(pack,state,card,state.pending.bp||0)+(card.ready?12:0)+
    safeNum(()=>universalBp(pack,state,card),0)/400;
 }
 if(state.pending?.kind==='effect-top-filter-choice'&&action.uid){
  const card=visibleCard(state,actor,action.uid);
  if(card)return 28+handCardValue(pack,state,actor,card);
 }
 if((state.pending?.kind==='effect-discard'||state.pending?.kind==='effect-discard-gate'||
  state.pending?.kind==='effect-discard-cost')&&action.uid){
  const card=state.players[actor].hand.find(c=>c.uid===action.uid);
  if(card)return 36-handCardValue(pack,state,actor,card);
 }
 if(action.type==='attack'){
  const c=onBoard(state,action.uid);
  const dmg=c?safeNum(()=>universalAttackDamage(pack,state,c),1):1;
  const bp=c?safeNum(()=>universalBp(pack,state,c),0):0;
  return 120+dmg*20+bp/80+(action.targetUid?45:0);
 }
 if(action.type==='raid')return 74;
 if(action.type==='activate'||action.type==='handActivate'||action.type==='event')return 64;
 if(action.type==='play'&&action.line==='energy')return 56;
 if(action.type==='play')return 48;
 if(action.type==='next')return 2;
 if(action.mode==='skip'||action.mode==='decline'||action.uid===null)return 12;
 const card=visibleCard(state,actor,action.uid);
 if(card&&onBoard(state,card.uid)&&ownerOf(card.uid)!==actor)
  return 30+safeNum(()=>presence(pack,state,card),0);
 if(card&&state.players[actor].hand.some(c=>c.uid===card.uid))
  return 16+handCardValue(pack,state,actor,card);
 return 18;
}
function visibleCard(state,actor,uid){
 if(!uid)return null;
 for(let p=0;p<2;p++){
  const pl=state.players[p];
  for(const zone of ['front','energy','outside','removed']){
   const c=(pl[zone]||[]).find(x=>x?.uid===uid);
   if(c)return c;
  }
  if(p===actor){
   const c=pl.hand.find(x=>x?.uid===uid);
   if(c)return c;
  }
 }
 if(authorizedSet(state).has(uid)){
  for(const pl of state.players){
   const c=[...pl.deck,...pl.life,...pl.hand].find(x=>x?.uid===uid);
   if(c)return c;
  }
 }
 return null;
}
function dedupe(state,actor,legal){
 const seen=new Set(),out=[];
 for(const action of legal){
  let key=JSON.stringify(action);
  if(['play','raid','move','step'].includes(action.type)&&Number.isInteger(action.slot)&&!action.replaceUid){
   const occ=state.players[actor][action.line]?.[action.slot];
   if(!occ)key=JSON.stringify({...action,slot:'*empty*'});
  }
  if(seen.has(key))continue;
  seen.add(key);
  out.push(action);
 }
 return out;
}
function developBias(pack,state,action){
 // A rested high-BP enter is a next-turn threat. The shallow skip line
 // does not see that turn, so credit the printed body once at the root.
 if(action?.mode!=='enter'&&state.pending?.kind!=='effect-buff-own')return 0;
 if(action?.mode==='enter'&&action.uid){
  const who=state.pending?.player??state.active;
  const card=state.players[who]?.hand?.find(c=>c.uid===action.uid);
  const d=printed(pack,who,card);
  return d&&d.type==='character'&&(d.bp||0)>=3000?10:0;
 }
 if(state.pending?.kind==='effect-buff-own'&&action?.uid){
  const card=onBoard(state,action.uid);
  if(!card)return 0;
  // The shallow tree often ends before the tying attack. Credit the cross.
  return combatSwing(pack,state,card,state.pending.bp||0)*0.35;
 }
 return 0;
}
function isBaselineAction(action){
 // Passing, declining and skipping must stay in the search even when a
 // higher-ranked line uses the time budget. Otherwise the first attack or
 // event vetoes the heuristic without ever being compared to it.
 return action.type==='next'||action.mode==='skip'||action.mode==='decline'||
  action.uid===null;
}
function partitionBeam(pack,state,who,legal){
 const beam=selectBeam(pack,state,who,legal)
  .sort((a,b)=>rank(pack,state,who,b)-rank(pack,state,who,a));
 const primary=[],baseline=[];
 for(const action of beam)(isBaselineAction(action)?baseline:primary).push(action);
 return {primary,baseline};
}
function reserveNodesFor(budget){
 return Math.min(8,Math.max(0,Math.floor(budget.nodes*0.25)));
}
function selectBeam(pack,state,actor,legal){
 const list=dedupe(state,actor,legal);
 if(list.length<=14)return list;
 const ranked=[...list].sort((a,b)=>rank(pack,state,actor,b)-rank(pack,state,actor,a));
 const picked=new Set(),out=[];
 const take=action=>{
  const key=JSON.stringify(action);
  if(picked.has(key))return;
  picked.add(key);
  out.push(action);
 };
 for(const action of list)
  if(action.type==='next'||action.type==='attack'||action.type==='raid'||
   action.mode==='skip'||action.mode==='decline'||action.uid===null)take(action);
 for(const action of ranked.slice(0,8))take(action);
 if(state.pending)for(const action of ranked.slice(-3))take(action);
 return out;
}
function continuedDepth(before,after,depth){
 const beforeWho=before.pending?.player??before.active;
 const afterWho=after.pending?.player??after.active;
 if(after.pending&&afterWho===beforeWho)return depth;
 if(before.phase!=='attack'&&after.phase==='attack'&&after.active===before.active&&!after.pending)
  return Math.max(depth-1,2);
 return depth-1;
}
function actionUsesHidden(action,hidden){
 if(!hidden?.size)return false;
 const ids=new Set();
 collectUids(action,ids);
 for(const uid of ids)if(hidden.has(uid))return true;
 return false;
}
const BLIND_KINDS=new Set(['private-top-place','private-top-choice']);
function futureLook(after,rootKnown,hidden){
 if(!after.pending)return false;
 // A simulated look at deck order is not information the current decision has.
 if(BLIND_KINDS.has(after.pending.kind))return true;
 const ids=new Set();
 collectUids(after.pending,ids);
 for(const uid of ids)if(!rootKnown.has(uid)&&!hidden.has(uid))return true;
 return false;
}
function settleLife(pack,state,budget){
 let follow=state,guard=0;
 while(follow.status==='playing'&&guard++<6&&budget.nodes>0){
  const kind=follow.pending?.kind;
  if(kind!=='life-trigger'&&kind!=='life-batch-order')break;
  let choices;
  try{choices=legalUniversalActions(pack,follow);}
  catch{budget.unsupported++;break;}
  const action=kind==='life-trigger'?
   choices.find(a=>a.type==='chooseTrigger'&&a.mode==='skip'):choices[0];
  if(!action)break;
  try{follow=dispatchUniversalAction(pack,follow,action,{actor:follow.pending.player});}
  catch{budget.unsupported++;break;}
  budget.nodes--;
 }
 return follow;
}
function dispatchScore(pack,state,actor,action,budget,depth,chain,rootKnown,hidden,blindValue){
 if(actionUsesHidden(action,hidden))
  return evaluate(pack,state,actor,hidden,blindValue);
 const who=state.pending?.player??state.active;
 let after;
 try{after=dispatchUniversalAction(pack,state,action,{actor:who});}
 catch{budget.unsupported++;return -Infinity;}
 budget.nodes--;
 const leak=leaks(state,after,actor);
 if(leak==='life'){
  const follow=settleLife(pack,after,budget);
  const doneLife=terminal(follow,actor);
  if(doneLife!==null)return doneLife;
  if(follow.pending?.kind==='life-trigger'||follow.pending?.kind==='life-batch-order')
   return leakedScore(pack,state,after,actor,action);
  return minimax(pack,follow,actor,budget,continuedDepth(state,follow,depth),chain+1,
   rootKnown,hidden,blindValue);
 }
 if(leak&&leak!=='draw')return scorePublic(pack,state,after,actor,hidden,blindValue);
 let hiddenNext=hidden,blind=blindValue;
 if(leak==='draw'){
  hiddenNext=new Set(hidden);
  for(const c of after.players[actor].hand)
   if(!rootKnown.has(c.uid))hiddenNext.add(c.uid);
  if(!Number.isFinite(blind))blind=unknownAverage(pack,state,actor);
 }
 if(futureLook(after,rootKnown,hiddenNext)){
  if(!Number.isFinite(blind))blind=unknownAverage(pack,state,actor);
  // The look stays hidden. The public result that opened it still counts:
  // a body on the energy line, the energy it produces, and a paid cost.
  // Scoring only the pre-look state made every on-play peek look like a
  // discarded card, so generators never entered.
  return evaluate(pack,after,actor,hiddenNext,blind)+blind*0.35;
 }
 const done=terminal(after,actor);
 if(done!==null)return done;
 return minimax(pack,after,actor,budget,continuedDepth(state,after,depth),chain+1,
  rootKnown,hiddenNext,blind);
}
function minimax(pack,state,actor,budget,depth,chain,rootKnown,hidden,blindValue){
 const done=terminal(state,actor);
 if(done!==null)return done;
 if(chain>8)return evaluate(pack,state,actor,hidden,blindValue);
 // Node count is the deterministic budget. The root applies the time cap
 // between lines so two calls on the same state expand the same tree.
 if(budget.nodes<=0){
  budget.exhausted=true;
  return evaluate(pack,state,actor,hidden,blindValue);
 }
 const who=state.pending?.player??state.active;
 const ourTurn=who===actor;
 const theirCombat=!ourTurn&&(state.pending?.kind==='block'||
  state.pending?.kind==='effect-block-floor'||(!state.pending&&state.phase==='attack'));
 if(!ourTurn&&!theirCombat)return evaluate(pack,state,actor,hidden,blindValue);
 if(!ourTurn&&!state.pending&&depth<=0)return evaluate(pack,state,actor,hidden,blindValue);
 if(ourTurn&&!state.pending&&depth<=0)return evaluate(pack,state,actor,hidden,blindValue);
 let legal;
 try{legal=legalUniversalActions(pack,state);}
 catch{budget.unsupported++;return evaluate(pack,state,actor,hidden,blindValue);}
 if(!legal.length)return evaluate(pack,state,actor,hidden,blindValue);
 if(ourTurn&&state.pending&&ORDER_KINDS.has(state.pending.kind)){
  return dispatchScore(pack,state,actor,legal[0],budget,depth,chain,rootKnown,hidden,blindValue);
 }
 const {primary,baseline}=partitionBeam(pack,state,who,legal);
 const hold=reserveNodesFor(budget);
 let best=ourTurn?-Infinity:Infinity,seen=false,won=false;
 const visit=(list,soft)=>{
  for(const action of list){
   if(budget.nodes<=(soft?hold:0)){budget.exhausted=true;break;}
   const parked=soft?Math.min(hold,budget.nodes):0;
   budget.nodes-=parked;
   const score=dispatchScore(pack,state,actor,action,budget,depth,chain,rootKnown,hidden,blindValue);
   budget.nodes+=parked;
   if(!Number.isFinite(score))continue;
   seen=true;
   if(ourTurn?score>best:score<best)best=score;
   if(ourTurn&&score>=50000){won=true;break;}
  }
 };
 visit(primary,true);
 if(!won)visit(baseline,false);
 return seen?best:evaluate(pack,state,actor,hidden,blindValue);
}
function limitsFor(state,options){
 const combat=state.phase==='attack'||state.pending?.kind==='block'||
  state.pending?.kind==='effect-block-floor';
 return {
  nodes:options.nodes??(combat?64:48),
  // Soft deadline only. One primary line can run past it; node count is the cap.
  ms:options.ms??(combat?64:48),
  depth:options.depth??3
 };
}
export function chooseStrengthenedHardAction(pack,state,options={}){
 const started=performance.now();
 report.decisions++;
 const actor=state.pending?.player??state.active;
 const finish=(action,extra)=>{
  const ms=performance.now()-started;
  report.ms+=ms;
  report.maxMs=Math.max(report.maxMs,ms);
  lastTrace={policy:HARD_AI_POLICY,actor,kind:state.pending?.kind||state.phase,
   ms,action:action?.type||null,...extra};
  return action;
 };
 try{
  if(!state||state.status!=='playing')return finish(null,{reason:'idle'});
  const legal=legalUniversalActions(pack,state);
  if(!legal.length)return finish(null,{reason:'no-legal'});
  if(legal.length===1){report.forced++;return finish(legal[0],{reason:'forced'});}
  if(state.pending?.kind==='opening-mulligan'||ORDER_KINDS.has(state.pending?.kind)){
   report.deferred++;
   const legacy=chooseLegacyHardAiAction(pack,state);
   const exact=legal.find(a=>same(a,legacy))||legal[0];
   return finish(exact,{reason:'deferred'});
  }
  const legacyRaw=chooseLegacyHardAiAction(pack,state);
  const legacy=legal.find(a=>same(a,legacyRaw))||null;
  if(!legacy)report.legacyMiss++;
  const limits=limitsFor(state,options);
  const budget={nodes:limits.nodes,deadline:started+limits.ms,depth:limits.depth,
   exhausted:false,unsupported:0};
  const rootKnown=knownIds(state,actor);
  const wide=!state.pending||['block','effect-block-floor','life-trigger',
   'life-batch-order'].includes(state.pending.kind);
  const {primary,baseline}=partitionBeam(pack,state,actor,legal);
  const hold=reserveNodesFor(budget);
  let best=null,legacyScore=null;
  const scored=new Set();
  const visit=(action,soft)=>{
   if(soft&&performance.now()>budget.deadline){budget.exhausted=true;return false;}
   if(budget.nodes<=(soft?hold:0)){budget.exhausted=true;return false;}
   const parked=soft?Math.min(hold,budget.nodes):0;
   budget.nodes-=parked;
   const score=dispatchScore(pack,state,actor,action,budget,limits.depth,0,
    rootKnown,new Set(),null)+developBias(pack,state,action);
   budget.nodes+=parked;
   scored.add(JSON.stringify(action));
   if(!Number.isFinite(score))return true;
   if(legacy&&same(action,legacy))legacyScore=score;
   // End of turn readies a rested attacker. A swing that changes nothing
   // therefore ties with passing; keep the pass so a battle win is not
   // handed over for free. Effect choices keep the first strict gain.
   const idleWide=wide&&isBaselineAction(action)&&!!best&&score===best.score;
   if(!best||score>best.score||idleWide)best={action,score};
   return score<50000;
  };
  for(const action of primary)if(!visit(action,true))break;
  if(!(best&&best.score>=50000)){
   const tail=[];
   if(legacy&&!scored.has(JSON.stringify(legacy)))tail.push(legacy);
   for(const action of baseline)if(!scored.has(JSON.stringify(action)))tail.push(action);
   for(const action of tail)if(!visit(action,false))break;
  }
  report.nodes+=limits.nodes-budget.nodes;
  report.unsupported+=budget.unsupported;
  if(budget.exhausted)report.budgetExhausted++;
  if(!best){
   report.exceptions++;
   return finish(legacy||legal[0],{reason:'empty-search',budget:budget.exhausted});
  }
  // Effect choices use any measured gain: the frozen heuristic often
  // follows list order. Phase, block and life lines keep a margin, and a
  // line that was never compared does not replace that heuristic.
  const margin=wide?ROOT_MARGIN:0;
  const uncompared=!!legacy&&legacyScore==null&&best.score<50000;
  if(uncompared)report.uncompared++;
  const idleTie=wide&&!!legacy&&legacyScore!=null&&isBaselineAction(best.action)&&
   !same(best.action,legacy)&&best.score===legacyScore;
  const chosen=best.score>=50000?best.action
   :uncompared?(wide?legacy:best.action)
   :idleTie?best.action
   :legacy&&legacyScore!=null&&!same(best.action,legacy)&&
    best.score<legacyScore+margin?legacy:best.action;
  if(legacy&&same(chosen,legacy))report.kept++;
  else report.overrides++;
  const exact=legal.find(a=>same(a,chosen))||legacy||legal[0];
  return finish(exact,{reason:budget.exhausted?'budget':'search',
   score:best.score,legacyScore,override:legacy? !same(exact,legacy):true});
 }catch{
  report.exceptions++;
  try{
   const legal=legalUniversalActions(pack,state);
   const legacy=chooseLegacyHardAiAction(pack,state);
   return finish(legal.find(a=>same(a,legacy))||legal[0]||null,{reason:'exception'});
  }catch{return finish(null,{reason:'exception'});}
 }
}
