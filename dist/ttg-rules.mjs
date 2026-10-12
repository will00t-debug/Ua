// Isolated UNION ARENA UA56BT rulings. These pure helpers do not yet make cards playable.
// Source: official QA Q2264/Q2265, Q2272, Q2293/Q2294, Q2392-Q2395.
const positiveInteger=n=>Number.isInteger(n)&&n>=0;
export function ttgEnergyTotal(cards,{frontGenerates=false,doublings=0}={}){
 if(!positiveInteger(doublings)||doublings>12)throw new RangeError('Invalid energy multiplier count');
 return cards.reduce((sum,c)=>{
  const produces=c.line==='energy'||frontGenerates||c.frontGenerates===true;
  if(!produces)return sum;
  const value=(c.gen||0)+(c.energyBonus||0);
  if(!Number.isFinite(value)||value<0)throw new RangeError('Invalid produced energy');
  return sum+value;
 },0)*(2**doublings);
}
// Q2392: after giving Viral front-line generation, immediately recheck the 8-energy condition.
export function resolveViralEnergy(cards,viralUid,{doublings=0}={}){
 const copy=cards.map(c=>({...c}));
 const viral=copy.find(c=>c.uid===viralUid&&c.line==='front');
 if(!viral)throw new Error('Viral must be on the front line');
 const before=ttgEnergyTotal(copy,{doublings});
 if(before<6)return {before,after:before,frontGenerates:false,cards:copy};
 viral.frontGenerates=true;
 const intermediate=ttgEnergyTotal(copy,{doublings});
 const frontGenerates=intermediate>=8;
 return {before,after:ttgEnergyTotal(copy,{doublings,frontGenerates}),frontGenerates,cards:copy};
}
// Q2293/Q2294: one or two different printed choices, always resolved in printed order.
export function orderedNiaOptions(chosen,{deckCount}){
 const options=['recoverSimon','deploySimon'];
 if(!Array.isArray(chosen)||!positiveInteger(deckCount))throw new Error('Invalid options');
 const max=deckCount<=20?2:1;
 if(chosen.length<1||chosen.length>max||new Set(chosen).size!==chosen.length||chosen.some(x=>!options.includes(x)))throw new Error('Invalid or repeated mode');
 return options.filter(x=>chosen.includes(x));
}
// Q2272: a mandatory target must exist before activation costs may be paid.
export const canActivateWithMandatoryTarget=(targets)=>Array.isArray(targets)&&targets.length>0;
// Q2393-Q2395: a replaced RAID top becomes facedown below its original base.
// Keep each physical card UID exactly once, without inheriting the old top's REST state.
export function upgradeRaidTopToFacedown(current,next,{previousName,allowedBases,forbidRaidedThisTurn=false,turn=null}={}){
 if(!current||!next||!Array.isArray(current.stack)||current.stack.length!==1)throw new Error('No single RAID base');
 if(current.name!==previousName)throw new Error('Wrong previous RAID top');
 if(!allowedBases?.includes(current.stack[0].name))throw new Error('Ineligible underlying base');
 if(forbidRaidedThisTurn&&current.raidedTurn===turn)throw new Error('Current top RAIDs this turn');
 const base=structuredClone(current.stack[0]);
 const oldUnder=(current.under||[]).map(x=>structuredClone(x));
 const converted={uid:current.uid,cardId:current.cardId,name:current.name,faceDown:true};
 const upgraded={...structuredClone(next),ready:true,stack:[base],under:[...oldUnder,converted]};
 if(turn!=null)upgraded.raidedTurn=turn;
 const ids=[upgraded.uid,base.uid,...upgraded.under.map(x=>x.uid)];
 if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw new Error('Card identity duplication or loss');
 return upgraded;
}
// Q2262, Q2273, Q2281, Q2282, Q2279: only the owner can inspect facedown identities.
export function inspectFacedownUnder(character,{viewer,owner}){
 const under=character?.under||[];
 if(viewer===owner)return under.map(x=>({uid:x.uid,cardId:x.cardId,name:x.name}));
 return under.map(()=>({faceDown:true}));
}
