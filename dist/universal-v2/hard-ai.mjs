// Strengthened Hard policy for the live V2 reducer.
// The frozen heuristic remains chooseLegacyHardAiAction in ai.mjs.
// Every action dispatched here is taken from legalUniversalActions.
// Scoring and search see only universalPublicView plus the controller's
// universalPrivateChoices. Opponent hand identities, both deck orders,
// unrevealed LIFE and unauthorized pending UIDs are replaced with a
// triggerless filler before any dispatch or helper reads them. The actor's
// own registered list is used only as a probability, never as a deck order.
import {legalUniversalActions,dispatchUniversalAction,universalBp,
 universalEnergy,universalEnergyByColor,universalAttackDamage,universalImpact,
 universalImpactNull,universalPublicView,universalPrivateChoices} from './engine.mjs';
import {chooseLegacyHardAiAction} from './ai.mjs';

export const HARD_AI_POLICY='hard-search-2';
const ORDER_KINDS=new Set(['phase-order','retirement-order','effect-move-order',
 'effect-top-order','effect-raid-witness-order','effect-raid-witness-move',
 'life-batch-order']);
const ROOT_MARGIN=7;
const emptyReport=()=>({decisions:0,forced:0,deferred:0,overrides:0,kept:0,
 budgetExhausted:0,exceptions:0,unsupported:0,legacyMiss:0,uncompared:0,
 passed:0,ms:0,maxMs:0,nodes:0,byKind:{}});
let report=emptyReport();
let lastTrace=null;
const packsOf=pack=>Array.isArray(pack)?pack:[pack,pack];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const ownerOf=uid=>Number(String(uid).split('-')[0]);
const squash=s=>String(s||'').replace(/\s+/g,'');
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
function addLayerUids(layers,into){
 for(const layer of layers||[]){
  if(!layer||typeof layer!=='object')continue;
  if(layer.uid&&layer.cardId)into.add(layer.uid);
  addLayerUids(layer.stack,into);
  addLayerUids(layer.under,into);
 }
}
// Permissions come from the public view and the controller-only choice
// accessor. A UID that merely appears inside pending is not visible.
function visibleUidSet(pack,state,actor){
 const view=universalPublicView(pack,state,actor);
 const ids=new Set();
 const mine=view.players[actor];
 for(const c of mine?.hand||[])if(c?.uid)ids.add(c.uid);
 for(const pl of view.players){
  for(const line of ['front','energy'])for(const c of pl[line]||[])if(c?.uid){
   ids.add(c.uid);
   addLayerUids(c.raidLayers,ids);
   addLayerUids(c.underLayers,ids);
  }
  for(const c of [...(pl.outside||[]),...(pl.removed||[]),...(pl.faceUpLife||[]),...(pl.publicLife||[])])
   if(c?.uid)ids.add(c.uid);
 }
 for(const r of view.publicReveals||[])if(r?.uid)ids.add(r.uid);
 for(const t of view.openTriggers||[])if(t?.uid)ids.add(t.uid);
 const priv=universalPrivateChoices(pack,state,actor);
 if(priv?.player===actor){
  for(const card of priv.inspected||[])if(card?.uid)ids.add(card.uid);
  for(const opt of priv.options||[])if(opt?.card?.cardId&&opt.action?.uid)ids.add(opt.action.uid);
  // These looks show the controller the top card without putting its UID
  // on the action. The reveal-before-name effect is not in this list.
  if(['private-top-place','private-top-choice','effect-top-trait-hand','effect-peek-top-place'].includes(priv.kind)){
   const top=state.players[actor].deck[0];
   if(top?.uid)ids.add(top.uid);
  }
 }
 return ids;
}
const vanillaCache=new WeakMap();
function vanillaIds(catalog){
 let ids=vanillaCache.get(catalog);
 if(ids)return ids;
 ids=Object.keys(catalog).filter(id=>{
  const d=catalog[id];
  return d&&!d.trigger;
 }).sort();
 vanillaCache.set(catalog,ids);
 return ids;
}
function hiddenSlots(player,visible){
 const slots=[];
 const walk=c=>{
  if(!c)return;
  if(c.uid&&!visible.has(c.uid))slots.push(c);
  for(const layer of [...(c.stack||[]),...(c.under||[])])walk(layer);
 };
 for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
  for(const c of player[zone]||[])walk(c);
 for(const line of ['front','energy'])for(const c of player[line]||[])walk(c);
 return slots;
}
function visibleBodies(player,visible){
 const bodies=[];
 const walk=c=>{
  if(!c)return;
  if(c.uid&&visible.has(c.uid))bodies.push(c);
  for(const layer of [...(c.stack||[]),...(c.under||[])])walk(layer);
 };
 for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
  for(const c of player[zone]||[])walk(c);
 for(const line of ['front','energy'])for(const c of player[line]||[])walk(c);
 return bodies;
}
function allBodies(player){
 const bodies=[];
 const walk=c=>{
  if(!c)return;
  if(c.uid&&c.cardId)bodies.push(c);
  for(const layer of [...(c.stack||[]),...(c.under||[])])walk(layer);
 };
 for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
  for(const c of player[zone]||[])walk(c);
 for(const line of ['front','energy'])for(const c of player[line]||[])walk(c);
 return bodies;
}
// Hidden slots become triggerless filler. The filler depends on the visible
// cards and the catalog, not on the hidden identities or their order.
function fillerFor(catalog,visibleBodies,slots){
 const counts=Object.create(null);
 for(const c of visibleBodies)counts[c.cardId]=(counts[c.cardId]||0)+1;
 const pool=vanillaIds(catalog);
 if(!pool.length)return null;
 const filler=[];
 let guard=0;
 while(filler.length<slots&&guard++<slots*pool.length+2){
  let added=false;
  for(const id of pool){
   if(filler.length>=slots)break;
   const limit=Number.isInteger(catalog[id].maxCopies)?catalog[id].maxCopies:4;
   if((counts[id]||0)>=limit)continue;
   counts[id]=(counts[id]||0)+1;
   filler.push(id);
   added=true;
  }
  if(!added)return null;
 }
 return filler.length===slots?filler:null;
}
function hypothetical(pack,state,visible){
 const copy=structuredClone(state);
 for(let p=0;p<2;p++){
  const pl=copy.players[p];
  const slots=hiddenSlots(pl,visible);
  const ids=fillerFor(packsOf(pack)[p].cards,visibleBodies(pl,visible),slots.length);
  if(!ids)return null;
  slots.forEach((c,i)=>{c.cardId=ids[i];delete c.chantName;});
  const counts=Object.create(null);
  for(const c of allBodies(pl))counts[c.cardId]=(counts[c.cardId]||0)+1;
  copy.initialCounts[p]=counts;
 }
 if(copy.pending)scrubSnapshot(copy.pending,visible,copy);
 return copy;
}
function scrubSnapshot(value,visible,state){
 if(!value||typeof value!=='object')return;
 if(typeof value.uid==='string'&&typeof value.cardId==='string'&&!visible.has(value.uid)){
  const owner=ownerOf(value.uid);
  const found=owner===0||owner===1?allBodies(state.players[owner]).find(c=>c.uid===value.uid):null;
  if(found)value.cardId=found.cardId;
 }
 const list=Array.isArray(value)?value:Object.values(value);
 for(const v of list)if(v&&typeof v==='object')scrubSnapshot(v,visible,state);
}
function seen(card,visible){
 return !!card?.uid&&visible.has(card.uid);
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
function presence(pack,state,c,visible){
 if(!seen(c,visible))return 12;
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
  if(!seen(foe,visible))continue;
  const foeBp=safeNum(()=>universalBp(pack,state,foe),0);
  if(foeBp<=0)continue;
  if(bp>foeBp)wins++;
  else if(c.ready&&state.active===owner&&bp===foeBp)ties++;
 }
 if(wins)v+=4*wins;
 if(ties)v+=16;
 return v;
}
function handContext(pack,state,player,visible){
 const pl=state.players[player];
 const colors=universalEnergyByColor(pack,state,player);
 const fieldNames=new Set(),raidNeeds=new Set();
 for(const c of [...pl.front,...pl.energy].filter(c=>seen(c,visible))){
  const d=printed(pack,player,c);
  if(d?.name)fieldNames.add(squash(d.name));
  if(d?.raidName)fieldNames.add(squash(d.raidName));
 }
 if(visible)for(const c of pl.hand){
  if(!seen(c,visible))continue;
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
function handCardValue(pack,state,player,card,visible){
 if(!seen(card,visible))return 4;
 const d=printed(pack,player,card);
 const copies=state.players[player].hand.filter(c=>seen(c,visible)&&c.cardId===card.cardId).length;
 let v=rough(d,handContext(pack,state,player,visible));
 if(copies>=3)v*=0.6;
 else if(copies===2)v*=0.85;
 return v;
}
function curveTarget(catalog,counts){
 const costs=[];
 for(const [id,n] of Object.entries(counts)){
  const d=catalog[id];
  if(d?.type==='character'&&d.energy>0)for(let i=0;i<n;i++)costs.push(d.energy);
 }
 if(!costs.length)return 3;
 costs.sort((a,b)=>a-b);
 return Math.max(2,Math.min(5,costs[Math.floor((costs.length-1)*0.8)]));
}
function resourceScore(pack,state,player,actor,visible,belief){
 const energy=safeNum(()=>universalEnergy(pack,state,player),0);
 let score=0;
 if(player===actor){
  const colors=universalEnergyByColor(pack,state,player);
  for(const c of state.players[player].hand){
   if(!seen(c,visible))continue;
   const d=printed(pack,player,c);
   if(d&&(d.energy||0)>(colors[d.color]||0))score-=2.4;
  }
  // One missing energy while already short has to outweigh moving that
  // generator forward and swinging once. 3.2 made a 1500 on 1 energy
  // look like a profitable attack and the deck never reached its curve.
  // The curve is the actor's own registered list, captured before filler.
  const deficit=Math.max(0,curveTarget(packsOf(pack)[player].cards,belief)-energy);
  score-=deficit*deficit*8;
 }else score-=Math.max(0,3-energy)**2*3;
 score+=state.players[player].apCards.filter(a=>a.ready).length*4.2;
 const n=state.players[player].hand.length;
 score+=n<=1?0:n===2?1.5:n===3?2.5:n===4?3:3.2-(n-4)*1.2;
 return score;
}
function boardScore(pack,state,player,visible){
 let score=0;
 const pl=state.players[player];
 for(const c of pl.front)if(c)score+=presence(pack,state,c,visible);
 for(const c of pl.energy)if(c){
  if(!seen(c,visible)){score+=6;continue;}
  const d=printed(pack,player,c);
  score+=6+(d?.gen||0)*6+Math.min(d?.bp||0,3000)/500;
 }
 return score;
}
let evalCache=null;
function evalKey(pack,state,actor,visible){
 const parts=[state.status,state.phase,state.active,state.turn,state.pending?.kind||'',actor,
  safeNum(()=>universalEnergy(pack,state,0),0),safeNum(()=>universalEnergy(pack,state,1),0)];
 for(let p=0;p<2;p++){
  const pl=state.players[p];
  parts.push(pl.life.length,pl.hand.length,pl.deck.length,pl.apCards.filter(a=>a.ready).length);
  if(p===actor)parts.push(pl.hand.filter(c=>seen(c,visible)).map(c=>c.uid+c.cardId).sort().join(','));
  for(const line of ['front','energy'])
   parts.push(pl[line].map(c=>!c?'-':seen(c,visible)?
    c.uid+c.cardId+(c.ready?'r':'t')+(c.buffs||[]).map(b=>b.bp||0).join('.'):'?').join('|'));
 }
 return parts.join(';');
}
function evaluate(pack,state,actor,visible,blindValue,belief){
 const key=evalCache?evalKey(pack,state,actor,visible):null;
 if(key&&evalCache.has(key))return evalCache.get(key);
 const done=terminal(state,actor);
 if(done!==null){if(key)evalCache.set(key,done);return done;}
 const opp=1-actor;
 let score=lifeScore(state.players[actor].life.length)-lifeScore(state.players[opp].life.length);
 score+=boardScore(pack,state,actor,visible)-boardScore(pack,state,opp,visible);
 let hand=0;
 const mystery=Number.isFinite(blindValue)?blindValue:4;
 for(const c of state.players[actor].hand)
  hand+=seen(c,visible)?handCardValue(pack,state,actor,c,visible):mystery;
 score+=hand-state.players[opp].hand.length*3.4;
 score+=resourceScore(pack,state,actor,actor,visible,belief)-
  resourceScore(pack,state,opp,actor,visible,belief)*0.45;
 if(key)evalCache.set(key,score);
 return score;
}
function ownRemainder(pack,state,actor,visible){
 const catalog=packsOf(pack)[actor].cards;
 const counts={...(state.initialCounts?.[actor]||{})};
 for(const c of visibleBodies(state.players[actor],visible))
  if(counts[c.cardId])counts[c.cardId]--;
 return {catalog,counts};
}
function unknownAverage(pack,state,actor,visible){
 const {catalog,counts}=ownRemainder(pack,state,actor,visible);
 const ctx=handContext(pack,state,actor,visible);
 let total=0,n=0;
 for(const [id,k] of Object.entries(counts)){
  if(k>0){total+=rough(catalog[id],ctx)*k;n+=k;}
 }
 return n?total/n:4;
}
function triggerRate(pack,state,actor,visible){
 const {catalog,counts}=ownRemainder(pack,state,actor,visible);
 let n=0,t=0;
 for(const [id,k] of Object.entries(counts)){
  if(k>0){n+=k;if(catalog[id]?.trigger)t+=k;}
 }
 return n?t/n:0.25;
}
function triggerExpect(before,after,actor,ownRate,oppRate){
 const oppLost=before.players[1-actor].life.length-after.players[1-actor].life.length;
 const myLost=before.players[actor].life.length-after.players[actor].life.length;
 let score=0;
 if(oppLost>0)score-=oppLost*oppRate*9;
 if(myLost>0)score+=myLost*ownRate*6;
 return score;
}
function combatSwing(pack,state,card,bonus,visible){
 if(!seen(card,visible))return 0;
 const now=safeNum(()=>universalBp(pack,state,card),0);
 const later=now+bonus;
 const owner=ownerOf(card.uid);
 let gain=0;
 for(const foe of state.players[1-owner].front){
  if(!seen(foe,visible))continue;
  const bp=safeNum(()=>universalBp(pack,state,foe),0);
  if(now<bp&&later>=bp)gain+=18+presence(pack,state,foe,visible);
 }
 return gain;
}
function rank(pack,state,actor,action,visible){
 if(state.pending?.kind==='effect-buff-own'&&action.uid){
  const card=onBoard(state,action.uid);
  if(seen(card,visible)&&ownerOf(card.uid)===actor)
   return 48+combatSwing(pack,state,card,state.pending.bp||0,visible)+(card.ready?12:0)+
    safeNum(()=>universalBp(pack,state,card),0)/400;
 }
 if(state.pending?.kind==='effect-top-filter-choice'&&action.uid){
  const card=visibleCard(state,action.uid,visible);
  if(card)return 28+handCardValue(pack,state,actor,card,visible);
 }
 if((state.pending?.kind==='effect-discard'||state.pending?.kind==='effect-discard-gate'||
  state.pending?.kind==='effect-discard-cost')&&action.uid){
  const card=state.players[actor].hand.find(c=>c.uid===action.uid);
  if(seen(card,visible))return 36-handCardValue(pack,state,actor,card,visible);
 }
 if(action.type==='attack'){
  const c=onBoard(state,action.uid);
  if(!seen(c,visible))return 120;
  const dmg=safeNum(()=>universalAttackDamage(pack,state,c),1);
  const bp=safeNum(()=>universalBp(pack,state,c),0);
  return 120+dmg*20+bp/80+(action.targetUid?45:0);
 }
 if(action.type==='raid')return 74;
 if(action.type==='activate'||action.type==='handActivate'||action.type==='event')return 64;
 if(action.type==='play'&&action.line==='energy')return 56;
 if(action.type==='play')return 48;
 if(action.type==='next')return 2;
 if(action.mode==='skip'||action.mode==='decline'||action.uid===null)return 12;
 const card=visibleCard(state,action.uid,visible);
 if(card&&onBoard(state,card.uid)&&ownerOf(card.uid)!==actor)
  return 30+presence(pack,state,card,visible);
 if(card&&state.players[actor].hand.some(c=>c.uid===card.uid))
  return 16+handCardValue(pack,state,actor,card,visible);
 return 18;
}
function visibleCard(state,uid,visible){
 if(!seen({uid},visible))return null;
 for(const pl of state.players){
  for(const zone of ['front','energy','outside','removed','hand','deck','life','lifeRevealed']){
   const c=(pl[zone]||[]).find(x=>x?.uid===uid);
   if(c)return c;
  }
  for(const line of ['front','energy'])for(const top of pl[line]||[]){
   if(!top)continue;
   const walk=layer=>{
    if(!layer)return null;
    if(layer.uid===uid)return layer;
    for(const child of [...(layer.stack||[]),...(layer.under||[])]){
     const hit=walk(child);
     if(hit)return hit;
    }
    return null;
   };
   const hit=walk(top);
   if(hit)return hit;
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
function developBias(pack,state,action,visible){
 // A rested high-BP enter is a next-turn threat. The shallow skip line
 // does not see that turn, so credit the printed body once at the root.
 if(action?.mode!=='enter'&&state.pending?.kind!=='effect-buff-own')return 0;
 if(action?.mode==='enter'&&action.uid){
  const who=state.pending?.player??state.active;
  const card=state.players[who]?.hand?.find(c=>c.uid===action.uid);
  if(!seen(card,visible))return 0;
  const d=printed(pack,who,card);
  return d&&d.type==='character'&&(d.bp||0)>=3000?10:0;
 }
 if(state.pending?.kind==='effect-buff-own'&&action?.uid){
  const card=onBoard(state,action.uid);
  if(!seen(card,visible))return 0;
  // The shallow tree often ends before the tying attack. Credit the cross.
  return combatSwing(pack,state,card,state.pending.bp||0,visible)*0.35;
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
function partitionBeam(pack,state,who,legal,visible){
 const beam=selectBeam(pack,state,who,legal,visible)
  .sort((a,b)=>rank(pack,state,who,b,visible)-rank(pack,state,who,a,visible));
 const primary=[],baseline=[];
 for(const action of beam)(isBaselineAction(action)?baseline:primary).push(action);
 return {primary,baseline};
}
function reserveNodesFor(budget){
 return Math.min(8,Math.max(0,Math.floor(budget.nodes*0.25)));
}
function selectBeam(pack,state,actor,legal,visible){
 const list=dedupe(state,actor,legal);
 if(list.length<=14)return list;
 const ranked=[...list].sort((a,b)=>rank(pack,state,actor,b,visible)-rank(pack,state,actor,a,visible));
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
function actionUsesHidden(action,visible){
 const ids=new Set();
 collectUids(action,ids);
 for(const uid of ids)if(!visible.has(uid))return true;
 return false;
}
const BLIND_KINDS=new Set(['private-top-place','private-top-choice']);
function futureLook(after,visible){
 if(!after.pending)return false;
 // A simulated look at deck order is not information the current decision has.
 if(BLIND_KINDS.has(after.pending.kind))return true;
 const ids=new Set();
 collectUids(after.pending,ids);
 for(const uid of ids)if(!visible.has(uid))return true;
 return false;
}
function dispatchScore(pack,state,actor,action,budget,depth,chain,view){
 if(actionUsesHidden(action,view.visible))
  return evaluate(pack,state,actor,view.visible,view.blind,view.belief);
 const who=state.pending?.player??state.active;
 let after;
 try{after=dispatchUniversalAction(pack,state,action,{actor:who});}
 catch{budget.unsupported++;return -Infinity;}
 budget.nodes--;
 const done=terminal(after,actor);
 if(done!==null)return done;
 const expect=triggerExpect(state,after,actor,view.ownTrigger,view.oppTrigger);
 if(futureLook(after,view.visible)){
  // The look stays hidden. The public result that opened it still counts:
  // a body on the energy line, the energy it produces, and a paid cost.
  // Scoring only the pre-look state made every on-play peek look like a
  // discarded card, so generators never entered.
  return evaluate(pack,after,actor,view.visible,view.blind,view.belief)+
   view.blind*0.35+expect;
 }
 return minimax(pack,after,actor,budget,continuedDepth(state,after,depth),chain+1,view)+expect;
}
function minimax(pack,state,actor,budget,depth,chain,view){
 const done=terminal(state,actor);
 if(done!==null)return done;
 const scoreNow=()=>evaluate(pack,state,actor,view.visible,view.blind,view.belief);
 if(chain>8)return scoreNow();
 // Node count is the deterministic budget. The root applies the time cap
 // between lines so two calls on the same state expand the same tree.
 if(budget.nodes<=0){
  budget.exhausted=true;
  return scoreNow();
 }
 const who=state.pending?.player??state.active;
 const ourTurn=who===actor;
 const theirCombat=!ourTurn&&(state.pending?.kind==='block'||
  state.pending?.kind==='effect-block-floor'||(!state.pending&&state.phase==='attack'));
 if(!ourTurn&&!theirCombat)return scoreNow();
 if(!ourTurn&&!state.pending&&depth<=0)return scoreNow();
 if(ourTurn&&!state.pending&&depth<=0)return scoreNow();
 let legal;
 try{legal=legalUniversalActions(pack,state);}
 catch{budget.unsupported++;return scoreNow();}
 if(!legal.length)return scoreNow();
 if(ourTurn&&state.pending&&ORDER_KINDS.has(state.pending.kind)){
  return dispatchScore(pack,state,actor,legal[0],budget,depth,chain,view);
 }
 const {primary,baseline}=partitionBeam(pack,state,who,legal,view.visible);
 const hold=reserveNodesFor(budget);
 let best=ourTurn?-Infinity:Infinity,seen=false,won=false;
 const visit=(list,soft)=>{
  for(const action of list){
   if(budget.nodes<=(soft?hold:0)){budget.exhausted=true;break;}
   const parked=soft?Math.min(hold,budget.nodes):0;
   budget.nodes-=parked;
   const score=dispatchScore(pack,state,actor,action,budget,depth,chain,view);
   budget.nodes+=parked;
   if(!Number.isFinite(score))continue;
   seen=true;
   if(ourTurn?score>best:score<best)best=score;
   if(ourTurn&&score>=50000){won=true;break;}
  }
 };
 visit(primary,true);
 if(!won)visit(baseline,false);
 return seen?best:scoreNow();
}
function limitsFor(state,options){
 const combat=state.phase==='attack'||state.pending?.kind==='block'||
  state.pending?.kind==='effect-block-floor';
 const fixedNodes=Number.isInteger(options.nodes);
 return {
  nodes:fixedNodes?options.nodes:(combat?64:48),
  // Soft deadline only. One primary line can run past it; node count is the
  // cap. A caller that pins nodes and omits ms gets a clock-free tree, so
  // the same seed and node budget replay the same candidates.
  ms:options.ms??(fixedNodes?1e9:(combat?64:48)),
  depth:options.depth??3
 };
}
export function chooseStrengthenedHardAction(pack,state,options={}){
 const started=performance.now();
 report.decisions++;
 const actor=state.pending?.player??state.active;
 const finish=(action,extra)=>{
  evalCache=null;
  const ms=performance.now()-started;
  report.ms+=ms;
  report.maxMs=Math.max(report.maxMs,ms);
  if(Number.isFinite(ms)){
   report.samples=report.samples||[];
   if(report.samples.length<4000)report.samples.push(Math.round(ms*10)/10);
  }
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
   exhausted:false,unsupported:0,byKind:{}};
  const visible=visibleUidSet(pack,state,actor);
  const belief={...(state.initialCounts?.[actor]||{})};
  const view={
   visible,belief,
   blind:unknownAverage(pack,state,actor,visible),
   ownTrigger:triggerRate(pack,state,actor,visible),
   oppTrigger:0.25,
   seed:Number.isInteger(options.seed)?options.seed:0
  };
  const model=hypothetical(pack,state,visible);
  if(!model){
   report.unsupported++;
   return finish(legacy||legal[0],{reason:'unobserved',seed:view.seed,nodesBudget:limits.nodes});
  }
  evalCache=new Map();
  const wide=!state.pending||['block','effect-block-floor','life-trigger',
   'life-batch-order'].includes(state.pending.kind);
  const {primary,baseline}=partitionBeam(pack,model,actor,legal,visible);
  let best=null,legacyScore=null;
  const seen=new Set();
  const candidates=[];
  const queue=[];
  let compared=0;
  const push=action=>{
   const key=JSON.stringify(action);
   if(seen.has(key))return;
   seen.add(key);
   queue.push(action);
  };
  // Pass, block, attack and the legacy line each get a slice before the
  // first long branch can spend the whole node budget.
  for(const action of baseline)push(action);
  if(legacy)push(legacy);
  for(const action of primary)if(action.type==='attack'||action.type==='chooseBlock')push(action);
  for(const action of primary)push(action);
  const protectedCount=queue.filter(action=>isBaselineAction(action)||
   action.type==='attack'||action.type==='chooseBlock'||(legacy&&same(action,legacy))).length;
  const visit=(action,index)=>{
   const left=queue.length-index;
   const slice=Math.max(4,Math.ceil(budget.nodes/left));
   if(performance.now()>budget.deadline&&index>=protectedCount){budget.exhausted=true;return false;}
   if(budget.nodes<=0){budget.exhausted=true;return false;}
   const snapshot=budget.nodes;
   budget.nodes=Math.min(snapshot,slice);
   const kind=state.pending?.kind||state.phase;
   budget.byKind[kind]=(budget.byKind[kind]||0)+1;
   compared++;
   const score=dispatchScore(pack,model,actor,action,budget,limits.depth,0,view)+
    developBias(pack,model,action,visible);
   const used=Math.min(snapshot,slice)-Math.max(0,budget.nodes);
   budget.nodes=snapshot-used;
   if(!Number.isFinite(score))return true;
   candidates.push({action,score});
   if(legacy&&same(action,legacy))legacyScore=score;
   // End of turn readies a rested attacker. A swing that changes nothing
   // therefore ties with passing; keep the pass so a battle win is not
   // handed over for free. Effect choices keep the first strict gain.
   const idleWide=wide&&isBaselineAction(action)&&!!best&&score===best.score;
   if(!best||score>best.score||idleWide)best={action,score};
   return score<50000;
  };
  for(let i=0;i<queue.length;i++)if(!visit(queue[i],i))break;
  report.nodes+=limits.nodes-budget.nodes;
  report.unsupported+=budget.unsupported;
  report.rootCandidates=(report.rootCandidates||0)+queue.length;
  report.rootCompared=(report.rootCompared||0)+compared;
  // Budget means the root queue was cut. Using the node cap inside a line
  // that was still scored is a normal search, not a fallback.
  const rootCut=compared<queue.length;
  if(rootCut)report.budgetExhausted++;
  for(const [kind,n] of Object.entries(budget.byKind)){
   report.byKind=report.byKind||{};
   report.byKind[kind]=(report.byKind[kind]||0)+n;
  }
  const ranked=[...candidates].sort((a,b)=>b.score-a.score||
   (JSON.stringify(a.action)<JSON.stringify(b.action)?-1:1));
  const traceBase={seed:view.seed,nodesBudget:limits.nodes,
   nodesUsed:limits.nodes-budget.nodes,candidates:ranked,
   rootCandidates:queue.length,rootCompared:compared,rootCut};
  if(!best){
   report.exceptions++;
   return finish(legacy||legal[0],{reason:'empty-search',budget:budget.exhausted,...traceBase});
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
  if(exact?.type==='next'||exact?.mode==='skip'||exact?.mode==='decline')report.passed= (report.passed||0)+1;
  return finish(exact,{reason:rootCut?'budget':'search',
   score:best.score,legacyScore,override:legacy? !same(exact,legacy):true,...traceBase});
 }catch{
  report.exceptions++;
  try{
   const legal=legalUniversalActions(pack,state);
   const legacy=chooseLegacyHardAiAction(pack,state);
   return finish(legal.find(a=>same(a,legacy))||legal[0]||null,{reason:'exception'});
  }catch{return finish(null,{reason:'exception'});}
 }
}
