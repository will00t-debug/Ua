// Independently verified printed abilities on four UA56BT cards whose remaining
// numeric catalogue fields still need official confirmation. Not a playable match engine.
// Input state uses players[0..1].front/energy[4], active, phase, turn, outside.
const lanes=['front','energy'];
const field=(pl)=>lanes.flatMap(line=>(pl[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const find=(pl,uid)=>field(pl).find(x=>x.card.uid===uid);
const isSimon=(c)=>c&&(c.nameJa==='シモン'||c.name==='シモン'||(c.stack||[]).some(isSimon));
const copy=state=>structuredClone(state);
function validMain(state,player){return state?.active===player&&state.phase==='main'&&[0,1].includes(player)&&!state.pending;}
function assertSource(state,player,uid,id){
 if(!validMain(state,player))throw new Error('Ability only available during your main phase');
 const source=find(state.players[player],uid);
 if(!source||source.card.cardId!==id)throw new Error('Wrong printed ability source');
 return source;
}
// TTG-1-006: printed passive BP+1000 during its own turn only if energy >=6.
export function ttgKittan006Bp(card,{ownerTurn=false,energy}={}){
 if(card?.cardId!=='TTG-1-006')throw new Error('Not Kittan 006');
 if(!Number.isFinite(energy)||energy<0)throw new Error('Live energy required');
 return (card.currentBp??card.bp)+(ownerTurn&&energy>=6?1000:0);
}
// TTG-1-059: Main, REST this Nia to give 1000 BP to an own Simon or Simon Raid.
export function resolveTtgNia059(state,{player,uid,targetUid}={}){
 const source=assertSource(state,player,uid,'TTG-1-059');
 if(!source.card.ready)throw new Error('Nia must be ACTIVE to pay REST');
 const target=find(state.players[player],targetUid);
 if(!target||!isSimon(target.card))throw new Error('Target must be an own Simon or Simon RAID');
 const result=copy(state),src=find(result.players[player],uid),dst=find(result.players[player],targetUid);
 src.card.ready=false;
 dst.card.currentBp=(dst.card.currentBp??dst.card.bp)+1000;
 dst.card.buffs??=[];
 dst.card.buffs.push({sourceUid:uid,turn:state.turn,bp:1000,until:'endTurn'});
 return result;
}
// TTG-1-063: Main, REST itself to produce +1 extra energy for this turn;
// mandatory retirement at end of the main phase, NOT immediately on REST.
export function resolveTtgButa063(state,{player,uid}={}){
 const source=assertSource(state,player,uid,'TTG-1-063');
 if(!source.card.ready)throw new Error('Buta must be ACTIVE to pay REST');
 const result=copy(state),c=find(result.players[player],uid).card;
 c.ready=false;
 c.energyBonus=(c.energyBonus||0)+1;
 c.retireAtMainEndTurn=state.turn;
 return result;
}
export function resolveTtgMainEndRetire(state){
 if(state?.phase!=='main'||![0,1].includes(state.active))throw new Error('Only at main phase end');
 const result=copy(state);
 for(const pl of result.players){
  for(const loc of field(pl)){
   if(loc.card.retireAtMainEndTurn!==state.turn)continue;
   if((loc.card.stack||[]).length||(loc.card.under||[]).length)throw new Error('Stacked pending character needs full RAID lifecycle handling');
   pl[loc.line][loc.slot]=null;
   pl.outside??=[];
   if(pl.outside.some(x=>x.uid===loc.card.uid))throw new Error('Duplicate UID on retirement');
   pl.outside.push({...loc.card,energyBonus:0,retireAtMainEndTurn:null});
  }
 }
 return result;
}
// At end of the current turn, remove only BP changes tagged by this module.
// Other effects with different lifetimes remain intact.
export function resolveTtgPendingEndTurn(state){
 if(!Number.isInteger(state?.turn))throw new Error('Turn index required');
 const result=copy(state);
 for(const pl of result.players){
  for(const loc of field(pl)){
   const c=loc.card,prior=c.buffs||[];
   const expired=prior.filter(b=>b.until==='endTurn'&&b.turn===state.turn);
   if(!expired.length)continue;
   const amount=expired.reduce((n,b)=>n+(b.bp||0),0);
   if(Number.isFinite(c.currentBp))c.currentBp-=amount;
   c.buffs=prior.filter(b=>!expired.includes(b));
  }
 }
 return result;
}
// TTG-1-065 STEP: legal front -> empty energy-slot movement in own movement
// phase, without accidentally reactivating a REST character.
export function resolveTtgYoko065Step(state,{player,uid,toSlot}={}){
 if(state?.active!==player||state.phase!=='move'||![0,1].includes(player))throw new Error('STEP only in your movement phase');
 const pl=state.players[player],src=find(pl,uid);
 if(!src||src.line!=='front'||src.card.cardId!=='TTG-1-065')throw new Error('Wrong STEP source');
 if(!Number.isInteger(toSlot)||toSlot<0||toSlot>=pl.energy.length||pl.energy[toSlot])throw new Error('STEP needs an empty energy slot');
 const result=copy(state);
 const moved=result.players[player].front[src.slot];
 result.players[player].front[src.slot]=null;
 result.players[player].energy[toSlot]=moved;
 return result;
}
