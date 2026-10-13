import {TTG_BY_ID} from './ttg-builder.mjs';
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
 return (card.currentBp??card.bp??TTG_BY_ID[card.cardId]?.bp)+(ownerTurn&&energy>=6?1000:0);
}
// TTG-1-059: Main, REST this Nia to give 1000 BP to an own Simon or Simon Raid.
export function resolveTtgNia059(state,{player,uid,targetUid}={}){
 const source=assertSource(state,player,uid,'TTG-1-059');
 if(!source.card.ready)throw new Error('Nia must be ACTIVE to pay REST');
 const target=find(state.players[player],targetUid);
 if(!target||!isSimon(target.card))throw new Error('Target must be an own Simon or Simon RAID');
 const result=copy(state),src=find(result.players[player],uid),dst=find(result.players[player],targetUid);
 src.card.ready=false;
 dst.card.currentBp=(dst.card.currentBp??dst.card.bp??TTG_BY_ID[dst.card.cardId]?.bp)+1000;
 dst.card.buffs??=[];
 dst.card.buffs.push({sourceUid:uid,turn:state.turn,bp:1000,until:'endTurn'});
 return result;
}
// TTG-1-063: Main, REST itself to produce +1 extra energy for this turn;
// mandatory retirement at end of the main phase, NOT immediately on REST.
export function resolveTtgButa063(state,{player,uid}={}){
 const source=assertSource(state,player,uid,'TTG-1-063');
 if(!source.card.ready||source.card.ttg063ActivatedTurn===state.turn)throw new Error('Buta must be ACTIVE and not used this turn');
 const result=copy(state),c=find(result.players[player],uid).card;
 c.ready=false;
 c.ttg063ActivatedTurn=state.turn;
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


// TTG-1-002 official print checked 2026-10-14: REST cost + once per turn.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT/TTG-1-002
// REST this source as the activation cost, then REST a separate ACTIVE own FRONT
// character. Only successful second REST grants +1 green energy for this turn.
export function eligibleTtgViral002Targets(state,{player,uid}={}){
 if(!validMain(state,player))return [];
 const source=find(state.players[player],uid);
 if(!source||source.card.cardId!=='TTG-1-002'||!source.card.ready||source.card.viral002UsedTurn===state.turn)return [];
 return (state.players[player].front||[]).filter(c=>c?.ready&&c.uid!==uid).map(c=>c.uid);
}
export function resolveTtgViral002(state,{player,uid,targetUid}={}){
 const source=assertSource(state,player,uid,'TTG-1-002');
 if(!source.card.ready||!eligibleTtgViral002Targets(state,{player,uid}).includes(targetUid))
  throw new Error('Viral needs a different ACTIVE own front-line target');
 const result=copy(state),owner=result.players[player],self=find(owner,uid).card,target=find(owner,targetUid).card;
 self.ready=false;
 self.viral002UsedTurn=state.turn;
 target.ready=false;
 self.energyBonus=(self.energyBonus||0)+1;
 self.temporaryEnergyUntilTurn=state.turn;
 self.temporaryEnergyBonusCount=(self.temporaryEnergyBonusCount||0)+1;
 return result;
}
// Expire energy bonuses granted by Viral without removing bonuses from other
// cards or effects (e.g. Buta already retires at main-phase end).
export function resolveTtgTemporaryEnergyEndTurn(state){
 if(!Number.isInteger(state?.turn))throw new Error('Turn index required');
 const result=copy(state);
 for(const pl of result.players)for(const loc of field(pl)){
  const c=loc.card;
  if(c.temporaryEnergyUntilTurn!==state.turn)continue;
  c.energyBonus=Math.max(0,(c.energyBonus||0)-(c.temporaryEnergyBonusCount||1));
  delete c.temporaryEnergyUntilTurn;
  delete c.temporaryEnergyBonusCount;
 }
 return result;
}
// TTG-1-049 Gimmy & Darry. The on-entry return is mandatory. If there are
// no eligible OTHER <=1-energy characters on the owner's field, return SELF.
// Raid piles are deliberately blocked until the full pile-return rule exists.
export function eligibleTtg049ReturnTargets(state,{player,uid}={}){
 if(![0,1].includes(player))return [];
 const pl=state?.players?.[player],self=find(pl,uid);
 if(!self||self.card.cardId!=='TTG-1-049')return [];
 const other=field(pl).filter(x=>x.card.uid!==uid);
 const cost=c=>c.energy??TTG_BY_ID[c.cardId]?.energy;
 // A card whose printed cost cannot be established must not be returned automatically.
 return other.filter(x=>Number.isInteger(cost(x.card))&&cost(x.card)<=1).map(x=>x.card.uid);
}
export function resolveTtg049Entry(state,{player,uid,targetUid=null}={}){
 if(![0,1].includes(player)||!state?.players?.[player])throw new Error('Invalid entry owner');
 const pl=state.players[player],source=find(pl,uid);
 if(!source||source.card.cardId!=='TTG-1-049')throw new Error('Incorrect entering character');
 const eligible=eligibleTtg049ReturnTargets(state,{player,uid});
 const unknown=field(pl).some(x=>x.card.uid!==uid&&!Number.isInteger(x.card.energy??TTG_BY_ID[x.card.cardId]?.energy));
 if(!eligible.length&&unknown)throw new Error('Unverified printed energy blocks a mandatory return');
 if(eligible.length&&(!targetUid||!eligible.includes(targetUid)))throw new Error('Must choose an eligible other character');
 if(!eligible.length&&targetUid)throw new Error('No return target may be chosen');
 const selected=targetUid||uid,location=find(pl,selected);
 if((location.card.stack||[]).length||(location.card.under||[]).length)
  throw new Error('Returning a raid pile requires full rule support');
 const result=copy(state),owner=result.players[player],current=find(owner,selected);
 owner[current.line][current.slot]=null;
 owner.hand??=[];
 if(owner.hand.some(c=>c.uid===selected))throw new Error('Card UID duplication');
 owner.hand.push(current.card);
 return result;
}
// TTG-1-071 King Kittan DX: first allied attack of this turn may choose
// one OTHER ally to gain +2000 BP until end of turn. Raid and combat are
// resolved by the eventual full combat engine, not by this helper.
export function eligibleTtg071AttackBuffTargets(state,{player,uid}={}){
 if(![0,1].includes(player)||state?.active!==player||state?.phase!=='attack')return [];
 if(state.attackingUid!==uid||state.characterAttacksThisTurn!==1)return [];
 if(state.usedTtgAttackTriggers?.[state.turn+':'+uid])return [];
 const source=find(state.players[player],uid);
 if(!source||source.line!=='front'||source.card.cardId!=='TTG-1-071')return [];
 return field(state.players[player]).filter(x=>x.card.uid!==uid).map(x=>x.card.uid);
}
export function resolveTtg071FirstAttack(state,{player,uid,targetUid=null}={}){
 const targets=eligibleTtg071AttackBuffTargets(state,{player,uid});
 if(![0,1].includes(player)||state?.attackingUid!==uid||state.characterAttacksThisTurn!==1||
   find(state.players[player],uid)?.card.cardId!=='TTG-1-071')
  throw new Error('Only the first own attack by King Kittan DX can grant its buff');
 if(targetUid!=null&&!targets.includes(targetUid))throw new Error('Not a legal other character');
 const result=copy(state);
 result.usedTtgAttackTriggers??={};
 result.usedTtgAttackTriggers[state.turn+':'+uid]=true;
 if(targetUid!=null){
  const c=find(result.players[player],targetUid).card;
  c.currentBp=(c.currentBp??c.bp)+2000;
  c.buffs??=[];
  c.buffs.push({sourceUid:uid,turn:state.turn,bp:2000,until:'endTurn'});
 }
 return result;
}
