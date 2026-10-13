// TTG-1-025 Lordgenome printed [Activate: Main] ruling Q2272.
// Verified Japanese/English official UA56BT cardlist: choose one visible
// own <Simon> target, REST and sideline this front-line Lordgenome, give
// Simon three GREEN generators this turn, and ready one physical AP.
// A mandatory target must exist BEFORE any cost is paid.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
const own=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const isSimon=c=>(c?.nameJa||TTG_BY_ID[c?.cardId]?.nameJa)==='シモン';
const physical=c=>[c.uid,...(c.stack||[]).flatMap(physical),...(c.under||[]).flatMap(physical)];
const all=s=>s.players.map(pl=>[...pl.hand,...pl.deck,...pl.life,...pl.outside,...(pl.removed||[]),...own(pl).map(x=>x.card)].flatMap(physical).sort());
const activeCost=s=>{const e=calculateTtgEnergyByColor(s,0);return e.red+e.green;};
export function legalGreen025Actions(state,player){
 if(![0,1].includes(player)||state?.active!==player||state?.phase!=='main'||
  state.pending||state.pendingTtgLife||state.pendingTtgTrigger)return [];
 const pl=state.players?.[player];
 if(!pl?.front||!Array.isArray(pl.apCards)||!pl.apCards.length)return [];
 const energy=calculateTtgEnergyByColor(state,player);
 if(energy.green+energy.red<6)return [];
 const targets=own(pl).filter(x=>isSimon(x.card));
 if(!targets.length)return []; // Q2272: cannot activate without Simon
 const result=[];
 for(const c of pl.front.filter(x=>x?.cardId==='TTG-1-025'&&x.ready&&
   !(x.stack||[]).length&&!(x.under||[]).length))
  for(const target of targets)for(const ap of pl.apCards)
   result.push({type:'green025Lordgenome',player,uid:c.uid,targetUid:target.card.uid,apUid:ap.uid});
 return result;
}
export function resolveGreen025(state,action){
 const options=legalGreen025Actions(state,action?.player);
 if(!options.some(x=>x.uid===action.uid&&x.targetUid===action.targetUid&&x.apUid===action.apUid))
  throw new Error('TTG-1-025 Q2272: needs REST front Lordgenome, 6 energy, own Simon target and AP');
 const before=all(state);
 const result=structuredClone(state),pl=result.players[action.player];
 const at=pl.front.findIndex(x=>x?.uid===action.uid),source=pl.front[at];
 if(at<0||!source.ready||source.stack?.length||source.under?.length)throw new Error('Invalid physical Lordgenome');
 const target=own(pl).find(x=>x.card.uid===action.targetUid)?.card;
 if(!target||!isSimon(target))throw new Error('Simon left the field');
 const ap=pl.apCards.find(x=>x.uid===action.apUid);
 if(!ap)throw new Error('AP token not owned');
 // REST and sideline are mandatory costs, paid atomically after validating targets.
 source.ready=false;
 pl.outside.push(source);
 pl.front[at]=null;
 target.energyBonus=(target.energyBonus||0)+3;
 target.green025EnergyUntilTurn=state.turn;
 target.green025BonusCount=(target.green025BonusCount||0)+3;
 ap.ready=true;
 const after=all(result);
 if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('025 physical UID conservation violated');
 result.log??=[];
 result.log.push({type:'green025Lordgenome',player:action.player,uid:source.uid,targetUid:target.uid,apUid:ap.uid});
 return withTtgDerivedEnergy(result,action.player);
}
export function resolveGreen025TurnEnd(state){
 const result=structuredClone(state);
 for(const pl of result.players)for(const x of own(pl)){
  const c=x.card;
  if(c.green025EnergyUntilTurn===state.turn){
   c.energyBonus=Math.max(0,(c.energyBonus||0)-(c.green025BonusCount||0));
   delete c.green025BonusCount;delete c.green025EnergyUntilTurn;
  }
 }
 return result;
}
