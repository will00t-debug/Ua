// v3.3 experimental tactical residual. Deliberately NOT a new model head:
// every value depends only on actor-visible observation + an already-legal
// action. It never evaluates unrevealed LIFE, enemy hand or deck identities.
// This is a small, bounded tie-break inside Hard Search 2's 7-point root cap.
import {assertObservationSafe} from './observe.mjs';

export const TEMPO_LIMIT=1.8;
export const TEMPO_VERSION='white-sword-v3.3-visible-tempo-pilot';
const number=(v,otherwise=0)=>Number.isFinite(Number(v))?Number(v):otherwise;
const list=a=>Array.isArray(a)?a:[];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function ownCard(observation,seat,uid){
 const me=observation.visible.players[seat];
 if(!uid)return null;
 for(const zone of ['hand','front','energy']){
  for(const card of list(me[zone]))if(card?.uid===uid)return card;
 }
 return null;
}
function printed(catalogs,seat,card){
 return card?.cardId?catalogs?.[seat]?.[card.cardId]||null:null;
}
function boardReady(player){
 return list(player?.front).filter(card=>card?.uid&&card.ready===true).length;
}
/**
 * Report a *heuristic*, NOT provable lethal. LIFE triggers, blockers and
 * post-attack effects can change the actual outcome. "closingPressure" uses
 * public remaining LIFE and currently ready attackers only.
 */
export function tacticalTempoScore({observation,seat,action,legal,catalogs}){
 assertObservationSafe(observation,seat);
 if(!action||!Array.isArray(legal)||!catalogs)return {bonus:0,reasons:[]};
 const state=observation.visible;
 if(state.pending||!['main','attack'].includes(state.phase))return {bonus:0,reasons:[]};
 const me=state.players[seat],op=state.players[1-seat];
 const ap=Math.max(0,number(me.apReady));
 const hand=list(me.hand),front=list(me.front).filter(Boolean);
 const oppReadyBlockers=boardReady(op);
 const myReadyAttackers=boardReady(me);
 const oppLife=Math.max(0,number(op.lifeCount,7));
 const myEnergy=Math.max(0,number(me.energyTotal));
 let score=0;
 const reasons=[];
 const add=(reason,value)=>{
  if(!Number.isFinite(value)||value===0)return;
  score+=value;reasons.push({reason,value});
 };
 if(state.phase==='main'){
  const alternatives=legal.filter(a=>['play','raid','event','activate'].includes(a?.type));
  if(action.type==='next'&&ap>=1&&alternatives.length){
   // Prefer using AP only when *legal* development actually exists.
   // The prior hard lookahead still dominates because the penalty is < 1.
   add('unused-AP-with-legal-development',-Math.min(.65,.22*alternatives.length));
  }
  if(action.type==='play'){
   const card=ownCard(observation,seat,action.uid);
   const d=printed(catalogs,seat,card);
   const need=Math.max(0,number(d?.ap,1));
   if(need>0&&ap>=need){
    add('paid-board-development',Math.min(.32,.11*need));
   }
   if(action.line==='energy'&&myEnergy<5&&number(d?.gen)>0)
    add('early-energy-development',myEnergy<3?.48:.26);
   if(action.line==='front'&&front.length<=2&&oppLife<=3)
    add('late-board-development',.22);
  }
  if(action.type==='raid'){
   // An already-legal Raid cannot be scored with hypothetical hidden cards.
   // Public low LIFE + a legal Raid is a pressure hint, not guaranteed damage.
   if(oppLife<=3)add('raid-closing-pressure',oppLife<=1?.65:.42);
   if(ap>=2)add('raid-AP-availability',.14);
  }
  if(action.type==='extraDraw'&&hand.length<=2&&ap>=1)
   add('low-hand-recovery',.16);
 }
 if(state.phase==='attack'){
  const anyAttack=legal.some(a=>a.type==='attack');
  if(action.type==='attack'){
   if(oppLife<=3){
    if(oppReadyBlockers===0){
     add('unblocked-closing-pressure',myReadyAttackers>=oppLife?1.25:.65);
    }else if(oppReadyBlockers<myReadyAttackers){
     add('attacker-advantage-pressure',.42);
    }else add('contest-low-LIFE',.16);
   }
  }
  if(action.type==='next'&&anyAttack&&oppLife<=2&&oppReadyBlockers===0)
   add('forgone-closing-attack',-.45);
 }
 return {bonus:clamp(score,-TEMPO_LIMIT,TEMPO_LIMIT),reasons};
}
export function applyTempoToCappedRows(rows,{observation,seat,legal,catalogs,enabled=false}={}){
 if(!enabled)return rows;
 if(!Array.isArray(rows)||!rows.length)return rows;
 // Search's decisive terminal outcome is worth >=50,000. Never add any
 // hand-crafted bonus in those positions.
 if(rows.some(row=>row.measured&&row.hardScore>=50000))return rows;
 return rows.map(row=>{
  const tempo=tacticalTempoScore({observation,seat,action:row.action,legal,catalogs});
  return {...row,tempo,score:row.score+tempo.bonus};
 });
}
