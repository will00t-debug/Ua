// Stable, perspective-safe state/action encoding for the learnable AI.
// Never inspect the identities/order of either deck, life, or enemy hand.
// Card identity is used only for the acting player's hand or public zones.
import {cardOf,controller,energy,bp,generated,locate} from './engine.mjs';

export const FEATURE_VERSION='ua-v3-f96-2';
export const FEATURE_DIM=96;
const PHASES=['mulligan','start','move','main','attack'];
const ACTIONS=['next','play','raid','move','step','ability','handAbility','attack','snipe','choose','extraDraw','keep','redraw'];
const cap=(x,scale=1)=>Math.max(-1,Math.min(1,(Number(x)||0)/scale));
const oneHot=(values,current)=>values.map(v=>Number(v===current));
const fieldCards=pl=>[...pl.front,...pl.energy].filter(Boolean);
const publicCard=(s,uid)=>{
 const l=locate(s,uid);
 if(l)return l.card;
 return null;
};
export function encodeAction(s,action,p=controller(s)){
 if(p!==controller(s))throw Error('Only current actor observations may be encoded');
 const own=s.players[p],other=s.players[1-p];
 const ownFront=own.front.filter(Boolean),theirFront=other.front.filter(Boolean);
 const ownEnergy=own.energy.filter(Boolean),theirEnergy=other.energy.filter(Boolean);
 const f=[];
 f.push(...oneHot(PHASES,s.phase));
 f.push(cap(own.life.length,7),cap(other.life.length,7),
  cap(own.hand.length,10),cap(other.hand.length,10),
  cap(own.deck.length,50),cap(other.deck.length,50),
  cap(own.ap,3),cap(other.ap,3),
  cap(energy(s,p),8),cap(energy(s,1-p),8),
  cap(own.outside.length,50),cap(other.outside.length,50),
  cap(own.removed.length,50),cap(other.removed.length,50));
 for(const cards of [ownFront,theirFront,ownEnergy,theirEnergy]){
  f.push(cap(cards.length,4),
   cap(cards.filter(c=>c.ready).length,4),
   cap(cards.reduce((n,c)=>n+(cardOf(c)?.type==='character'?bp(s,c):0),0),20000),
   cap(cards.filter(c=>c.stack?.length).length,4));
 }
 f.push(...oneHot(ACTIONS,action.type));
 const userCard=own.hand.find(c=>c.uid===action.uid)||publicCard(s,action.uid);
 const target=publicCard(s,action.target);
 const d=userCard?cardOf(userCard):null;
 const t=target?cardOf(target):null;
 f.push(
  cap(d?.energy,8), cap(d?.ap,3), cap(d?.bp,6000),cap(d?.gen,3),
  Number(d?.type==='character'),Number(d?.type==='event'),Number(d?.type==='field'),
  Number(!!d?.raid),Number(!!userCard?.ready),
  Number(action.line==='front'),Number(action.line==='energy'),
  cap(t?.bp,6000),
  Number(!!target),Number(!!target?.ready),
  Number(!!target?.stack?.length),
  Number(action.type==='choose'&&action.ids?.includes('pass')),
  cap(action.ids?.length||0,4)
 );
 // Additional rule-aware signals distinguish plays of similarly-costed
 // characters; all fields are printed card text or public/own state.
 f.push(
  ...oneHot(['green','blue','purple','yellow','red'],d?.color),
  ...oneHot(['draw','get','active','raid','color','special','final'],d?.trigger),
  cap(own.turnCount,10),cap(other.turnCount,10),
  cap(energy(s,p,d?.color)-Number(d?.energy||0),8),
  Number(!!(d?.doubleBlock||d?.rules?.doubleBlock)),
  Number(!!(d?.impact||d?.rules?.impact||d?.rules?.raidImpact)),
  Number(!!(d?.rules?.damage===2||d?.rules?.raidDamageIfOppReduced)),
  Number(!!(d?.rules?.entry||d?.rules?.onPlay)),
  Number(!!(d?.rules?.abilities)),
  cap(own.hand.filter(h=>cardOf(h)?.energy===0).length,7),
  cap(own.hand.filter(h=>cardOf(h)?.energy<=2).length,7),
  cap(own.front.filter(c=>c?.ready).length,4),
  cap(other.front.filter(c=>c?.ready).length,4),
  cap(own.front.filter(c=>!c).length,4),
  cap(own.energy.filter(c=>!c).length,4)
 );
 // Do not use action IDs, opponent secret card IDs or deck identities as
 // numeric features. Padding remains fixed across versions.
 if(f.length>FEATURE_DIM)throw Error('AI feature dimension overflow: '+f.length);
 while(f.length<FEATURE_DIM)f.push(0);
 return f;
}
