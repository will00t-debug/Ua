// Experimental features taken from the ideas in the frozen hard policy:
// energy curve, whether the hand can be paid, raid material already on
// the field, a ready front that can threaten, and a block that survives.
// This module does not import or call the frozen search. Card numbers are
// not special cases. The three callers turn on one feature at a time.
import {universalBp,universalEnergy,universalEnergyByColor} from '../engine.mjs';
import {packOf} from './observation.mjs';

function squash(value){return String(value||'').replace(/\s+/g,'');}
function energyOf(pack,state,player){
 try{
  const value=universalEnergy(pack,state,player);
  return Number.isFinite(value)?value:0;
 }catch{return 0;}
}
function colorsOf(pack,state,player){
 try{return universalEnergyByColor(pack,state,player)||{};}
 catch{return {};}
}
function bpOf(pack,state,card){
 try{
  const value=universalBp(pack,state,card);
  return Number.isFinite(value)?value:0;
 }catch{return 0;}
}
function curveTarget(catalog,counts){
 const costs=[];
 for(const [id,copies] of Object.entries(counts||{})){
  const printed=catalog[id];
  if(printed?.type==='character'&&printed.energy>0)for(let i=0;i<copies;i++)costs.push(printed.energy);
 }
 if(!costs.length)return 3;
 costs.sort((a,b)=>a-b);
 return Math.max(2,Math.min(5,costs[Math.floor((costs.length-1)*0.8)]));
}
function raidReady(catalog,printed,mine){
 if(!printed?.raidName)return false;
 const wanted=new Set([printed.raidName,...(printed.raidBaseNames||[])].map(squash));
 for(const line of ['front','energy'])for(const body of mine?.[line]||[]){
  if(body&&wanted.has(squash(catalog[body.cardId]?.name)))return true;
 }
 return false;
}
function handView(pack,state,player){
 const catalog=packOf(pack,player).cards;
 const colors=colorsOf(pack,state,player);
 const mine=state.players[player];
 let playable=0,stranded=0,raids=0;
 for(const card of mine?.hand||[]){
  const printed=catalog[card?.cardId];
  if(!printed)continue;
  if((printed.energy||0)<=(colors[printed.color]||0))playable++;
  else stranded++;
  if(raidReady(catalog,printed,mine))raids++;
 }
 return {playable,stranded,raids};
}
function threatOf(pack,state,player){
 let best=0;
 for(const card of state.players[player].front){
  if(!card?.ready)continue;
  const bp=bpOf(pack,state,card);
  const walls=state.players[1-player].front.filter(Boolean);
  let value=0;
  if(!walls.length)value=bp>=2000?6:3;
  else if(walls.some(wall=>bp>bpOf(pack,state,wall)))value=8;
  else if(walls.some(wall=>bp===bpOf(pack,state,wall)))value=4;
  if(value>best)best=value;
 }
 return best;
}
function attackerCard(state){
 const uid=state.pending?.attackerUid;
 if(!uid)return null;
 for(const player of state.players){
  const card=player.front.find(item=>item?.uid===uid);
  if(card)return card;
 }
 return null;
}
function liveBlockers(pack,state,player){
 const attacker=attackerCard(state);
 const threats=attacker?[attacker]:state.players[1-player].front.filter(card=>card?.ready);
 if(!threats.length)return 0;
 let live=0;
 for(const card of state.players[player].front){
  if(!card)continue;
  if(state.pending?.kind!=='block'&&!card.ready)continue;
  const bp=bpOf(pack,state,card);
  if(threats.some(body=>bp>=bpOf(pack,state,body)))live++;
 }
 return live;
}
export function strategyParts(pack,state,actor){
 const catalog=packOf(pack,actor).cards;
 const energy=energyOf(pack,state,actor);
 const curve=curveTarget(catalog,state.initialCounts?.[actor]);
 const hand=handView(pack,state,actor);
 const opp=1-actor;
 return {
  energy,curve,deficit:Math.max(0,curve-energy),
  playable:hand.playable,stranded:hand.stranded,raids:hand.raids,
  threat:threatOf(pack,state,actor),opposingThreat:threatOf(pack,state,opp),
  blocks:liveBlockers(pack,state,actor)
 };
}
// Weights are an experiment. They are not the frozen heuristic's numbers.
export function strategyScore(pack,state,actor){
 const parts=strategyParts(pack,state,actor);
 return -parts.deficit*parts.deficit*4+parts.playable*1.2-Math.min(parts.stranded,4)*0.3+
  parts.raids*3+parts.threat*2-parts.opposingThreat+parts.blocks*3;
}
function cardPrint(pack,state,viewer,uid){
 if(!uid)return null;
 const catalog=packOf(pack,viewer).cards;
 for(const zone of ['hand','front','energy','outside']){
  const card=(state.players[viewer][zone]||[]).find(item=>item?.uid===uid);
  if(card)return catalog[card.cardId]||null;
 }
 return null;
}
function blockerLives(pack,state,viewer,action){
 if(action?.type!=='chooseBlock'||!action.uid)return false;
 const card=state.players[viewer].front.find(item=>item?.uid===action.uid);
 const attacker=attackerCard(state);
 if(!card||!attacker)return false;
 return bpOf(pack,state,card)>=bpOf(pack,state,attacker);
}
export function strategyOrder(pack,state,viewer,action){
 const parts=strategyParts(pack,state,viewer);
 if(action.type==='chooseBlock'&&action.uid)return blockerLives(pack,state,viewer,action)?16:1;
 if(action.type==='chooseBlock')return 2;
 if(action.type==='play'&&action.line==='energy'){
  const printed=cardPrint(pack,state,viewer,action.uid);
  return parts.deficit>0&&(printed?.gen||0)>0?20+parts.deficit:4;
 }
 if(action.type==='raid')return parts.raids>0?18:8;
 if(action.type==='attack')return parts.threat?12:3;
 if(action.type==='play'&&action.line==='front')return 6;
 if(action.type==='activate'||action.type==='event'||action.type==='handActivate')return 5;
 if(action.type==='next')return 0;
 return 1;
}
function replyRank(pack,state,action){
 const seat=state.pending?.player??state.active;
 if(action.type==='chooseBlock'&&action.uid)return blockerLives(pack,state,seat,action)?50:4;
 if(action.type==='chooseBlock'||action.mode==='skip'||action.mode==='decline'||action.uid==null&&action.type!=='next'&&action.type!=='play'&&action.type!=='attack')return 6;
 const parts=strategyParts(pack,state,seat);
 if(action.type==='play'&&action.line==='energy'&&parts.deficit>0)return 40;
 if(action.type==='raid')return 36;
 if(action.type==='attack')return 30;
 if(action.type==='play')return 24;
 if(action.type==='activate'||action.type==='event'||action.type==='handActivate')return 20;
 if(action.type==='next')return 2;
 return 8;
}
export function replyAction(pack,state,legal){
 const seat=state.pending?.player??state.active;
 if(state.pending?.kind==='block'){
  const live=legal.filter(action=>action.type==='chooseBlock'&&blockerLives(pack,state,seat,action));
  live.sort((a,b)=>{
   const left=state.players[seat].front.find(card=>card?.uid===a.uid);
   const right=state.players[seat].front.find(card=>card?.uid===b.uid);
   return bpOf(pack,state,left)-bpOf(pack,state,right);
  });
  if(live.length)return live[0];
  return legal.find(action=>action.uid==null)||legal[0]||null;
 }
 const ranked=[...legal].sort((a,b)=>replyRank(pack,state,b)-replyRank(pack,state,a));
 return ranked[0]||null;
}
export function replyOrder(pack,state,legal){
 return [...legal].sort((a,b)=>replyRank(pack,state,b)-replyRank(pack,state,a)||
  (JSON.stringify(a)<JSON.stringify(b)?-1:1));
}
