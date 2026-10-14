// A common, deterministic Beta AI policy. Native title cores remain the only
// authority for legal actions and card effects. Hard prioritises sustainable
// energy development, not 0-energy early front deployment.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {ttgExecutableActions} from './ttg-browser.mjs';
import {ttgCoreAiChoice} from './ttg-core-match.mjs';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {soloEnergy,soloTrainingLegalActions,soloTrainingBotAction} from './solo-match.mjs';

export const BETA_AI_LEVELS=Object.freeze(['easy','normal','hard']);
const slgCards=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const bySeries=Object.freeze({
 'gurren-lagann':Object.freeze({
  card:card=>TTG_BY_ID[card?.cardId],
  actions:ttgExecutableActions,
  native:ttgCoreAiChoice,
  energy:(s,p)=>(s.players[p].energyProduced?.green||0)+(s.players[p].energyProduced?.red||0)
 }),
 'solo-leveling':Object.freeze({
  card:card=>slgCards[card?.cardId],
  actions:soloTrainingLegalActions,
  native:soloTrainingBotAction,
  energy:soloEnergy
 })
});
const findHand=(pl,uid)=>pl.hand.find(c=>c.uid===uid);
const value=(d)=>(Number(d?.gen)||0)*12-(Number(d?.energy)||0)*0.55-(Number(d?.bp)||0)/3600;
// Never move resources forward unless the projected energy line can still
// support our own deck curve in the next rounds.
function targetEnergy(s,p,series){
 const pl=s.players[p],known=[...pl.deck,...pl.hand].map(series.card).filter(Boolean);
 const maxCost=Math.max(2,...known.map(c=>Number(c.energy)||0));
 const turn=Number(pl.turnCount??pl.ownTurns??1);
 return Math.min(6,maxCost,Math.max(2,Math.min(6,turn+2)));
}
function hardChoice(s,series,native){
 if(s.pending||s.pendingTtgLife||s.pendingTtgTrigger||s.pendingDamage||s.status!=='playing')return native;
 const p=s.active,pl=s.players[p],energy=series.energy(s,p),target=targetEnergy(s,p,series);
 const actions=series.actions(s),next=actions.find(a=>a.type==='next');
 if(s.phase==='move'){
  const moves=actions.filter(a=>a.type==='move');
  if(moves.length&&energy>=target+1&&pl.front.filter(Boolean).length<3){
   const candidates=moves.filter(a=>{
    const c=pl.energy.find(c=>c?.uid===a.uid),d=series.card(c);
    return c&&d&&Number(d.bp)>=2000&&energy-(Number(d.gen)||0)>=target;
   });
   if(candidates.length)return candidates.sort((a,b)=>
    (Number(series.card(pl.energy.find(c=>c?.uid===b.uid))?.bp)||0)-
    (Number(series.card(pl.energy.find(c=>c?.uid===a.uid))?.bp)||0))[0];
  }
  return next||native;
 }
 if(s.phase!=='main')return native;
 const energyPlays=actions.filter(a=>a.type==='play'&&a.line==='energy'&&
  (series.card(findHand(pl,a.handUid??a.uid))?.gen||0)>0);
 if(energy<target&&energyPlays.length){
  return energyPlays.sort((a,b)=>{
   const da=series.card(findHand(pl,a.handUid??a.uid)),db=series.card(findHand(pl,b.handUid??b.uid));
   return value(db)-value(da);
  })[0];
 }
 // Below two generated energy, putting another cheap character on front
 // generally traps our own next turn, even if native AI requests it.
 if(energy<2&&native?.type==='play'&&native.line==='front'&&next)return next;
 // Do not override title-specific Raid/trigger/ability priority after the
 // resource goal is reached; these are better handled by its specialist AI.
 return native;
}
function easyChoice(s,series,native){
 if(s.pending||s.pendingTtgLife||s.pendingTtgTrigger||s.pendingDamage)return native;
 if(s.phase!=='main')return native;
 const plays=series.actions(s).filter(a=>a.type==='play');
 // Deliberately basic strategy; never synthesize an action.
 return plays.find(a=>a.line==='front')||plays[0]||native;
}
export function chooseBetaAiAction(title,s,{difficulty='normal'}={}){
 const series=bySeries[title];
 if(!series)throw new Error('Unsupported Beta AI title: '+title);
 if(!BETA_AI_LEVELS.includes(difficulty))throw new Error('Unknown AI difficulty: '+difficulty);
 const native=series.native(s);
 if(difficulty==='normal')return native;
 return difficulty==='hard'?hardChoice(s,series,native):easyChoice(s,series,native);
}
