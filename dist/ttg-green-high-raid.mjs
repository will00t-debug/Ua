// UA56BT green 004/027/031/032 and linked 033/034 effect timing.
// Physical multi-Raid transition: Q2393-2395; ordered optional triggers:
// Q2260-2262 (Viral), Q2273-2279 (high Raid), Q2280-2282 (sites).
// A single pending queue offers the player ANY legal next effect so
// attachments and on-entry thresholds can deliberately resolve in either order.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {legalTtgChainRaids,dispatchTtgChainRaid} from './ttg-chain-raid.mjs';
import {legalGreen033AfterRaid,resolveGreen033AfterRaid,legalGreen034AfterRaid,resolveGreen034AfterRaid} from './ttg-green-fields.mjs';
import {greenTtgCurrentBp} from './ttg-green-passives.mjs';
import {sidelineGreen030} from './ttg-green-030.mjs';
import {beginGreen034Sidelined} from './ttg-green-fields.mjs';
import {flattenSidelinedPile} from './ttg-green-retirement.mjs';
const allowed=new Set(['TTG-1-027','TTG-1-031','TTG-1-032']);
const own=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const name=c=>c?.nameJa||TTG_BY_ID[c?.cardId]?.nameJa||'';
const base=c=>['シモン','ヴィラル'].includes(name(c))&&!c.stack?.length&&!c.under?.length;
const total=(s,p)=>Object.values(calculateTtgEnergyByColor(s,p)).reduce((a,b)=>a+b,0);
const physical=c=>[c.uid,...(c.stack||[]).flatMap(physical),...(c.under||[]).flatMap(physical)];
const inventory=p=>[...p.hand,...p.deck,...p.life,...p.outside,...(p.removed||[]),...own(p).map(x=>x.card)].flatMap(physical).sort();
const faceCount=c=>(c?.under||[]).filter(x=>x.faceDown).length;
const validOpp=c=>c&&!c.cannotBeChosen&&!c.protectedFromEffects;
const same=(a,b)=>['type','step','player','raidUid','mode','siteUid','sourceUid','targetUid','apUid']
 .every(k=>a[k]===b[k])&&JSON.stringify(a.takeUids||[])===JSON.stringify(b.takeUids||[]);
const find=(s,p,uid)=>own(s.players[p]).find(x=>x.card.uid===uid);
export function legalGreenHighRaids(state,player){
 if(![0,1].includes(player)||state.active!==player||state.phase!=='main'||state.pending||
    state.pendingTtgLife||state.pendingTtgTrigger)return [];
 const pl=state.players[player],result=[];
 for(const h of pl.hand.filter(c=>allowed.has(c.cardId))){
  const printed=TTG_BY_ID[h.cardId];
  if(calculateTtgEnergyByColor(state,player).green<printed.energy||
    pl.apCards.filter(x=>x.ready).length<printed.ap)continue;
  if(h.cardId!=='TTG-1-032'){
   for(const source of own(pl).filter(x=>base(x.card))){
    const positions=[{line:source.line,slot:source.slot}];
    if(source.line==='energy')for(let slot=0;slot<4;slot++)if(!pl.front[slot])
      positions.push({line:'front',slot});
    for(const pos of positions)result.push({type:'greenHighRaid',player,handUid:h.uid,sourceUid:source.card.uid,
     cardId:h.cardId,...pos,raidKind:'base',requiredAp:printed.ap});
   }
  }
 }
 // Special ascending Raid consumes only the top card (facedown) and preserves
 // the original Simon/Viral base. The legacy physical engine handles UIDs.
 for(const c of legalTtgChainRaids(withTtgDerivedEnergy(state,player),player)){
  if(!allowed.has(c.cardId))continue;
  result.push({type:'greenHighRaid',player,handUid:c.handUid,sourceUid:c.sourceUid,
   cardId:c.cardId,line:c.line,slot:c.slot,raidKind:'chain',requiredAp:c.requiredAp});
 }
 return result;
}
export function resolveGreenHighRaid(state,action={}){
 const {player,handUid,sourceUid,line,slot,raidKind,payApUids=[]}=action;
 const choice=legalGreenHighRaids(state,player).find(x=>x.handUid===handUid&&x.sourceUid===sourceUid&&
   x.line===line&&x.slot===slot&&x.raidKind===raidKind);
 if(!choice||!Array.isArray(payApUids)||payApUids.length!==choice.requiredAp||
   new Set(payApUids).size!==payApUids.length)throw new Error('Illegal high green Raid or physical AP payment');
 const before=inventory(state.players[player]),old=find(state,player,sourceUid);
 const triggered004=state.players[player].front.some(c=>c?.cardId==='TTG-1-004')&&
    state.players[player].green004UsedTurn!==state.turn; // evaluate BEFORE source leaves Front
 let result;
 if(raidKind==='chain'){
  result=dispatchTtgChainRaid(withTtgDerivedEnergy(state,player),{
   player,handUid,sourceUid,line,slot,payApUids});
 }else{
  result=spendTtgApCards(state,{player,apUids:payApUids,count:choice.requiredAp});
  const pl=result.players[player],old=find(result,player,sourceUid),index=pl.hand.findIndex(x=>x.uid===handUid);
  if(!old||index<0||(!base(old.card)))throw new Error('Raid base changed');
  const top=pl.hand.splice(index,1)[0],original=old.card;
  pl[old.line][old.slot]=null;
  if(pl[line][slot])throw new Error('Raid destination occupied');
  pl[line][slot]={...top,ready:true,stack:[original],under:[],raidedTurn:state.turn,enteredTurn:state.turn};
 }
 const pl=result.players[player],raider=find(result,player,handUid)?.card;
 if(!raider)throw new Error('RAID physically missing after transition');
 if(raider.cardId==='TTG-1-032')raider.protectedFromEffects=true;
 const effects=[];
 if(triggered004)effects.push('viral004');
 if(choice.cardId==='TTG-1-027'){effects.push('entry027');if(pl.energy.some(c=>c?.cardId==='TTG-1-033'&&pl.green033UsedTurn!==state.turn))effects.push('site033');}
 if(choice.cardId==='TTG-1-031'){effects.push('entry031');if(pl.energy.some(c=>c?.cardId==='TTG-1-034'))effects.push('site034');}
 if(choice.cardId==='TTG-1-032')effects.push('entry032');
 result.pending={kind:'greenHighRaidQueue',player,raidUid:handUid,remaining:effects};
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('High RAID physical card conservation');
 result.log??=[];result.log.push({type:'greenHighRaid',player,uid:handUid,cardId:choice.cardId,raidKind,sourceUid});
 return withTtgDerivedEnergy(result,player);
}
function stageChoices(s,tag,q){
 const p=q.player,pl=s.players[p],source=find(s,p,q.raidUid)?.card;
 if(!source)throw new Error('High Raid left play mid entry queue');
 const item=(more={})=>({type:'greenHighEffect',player:p,raidUid:q.raidUid,step:tag,...more});
 if(tag==='viral004'){
  const nm=name(source.stack?.[0]);
  const desired=nm==='シモン'?'ヴィラル':nm==='ヴィラル'?'シモン':null;
  if(!desired)return [item({mode:'decline'})];
  const choices=[item({mode:'decline'})];
  for(const zone of ['hand','outside'])for(const c of pl[zone].filter(c=>name(c)===desired))
   choices.push(item({mode:'attach',sourceUid:c.uid,zone}));
  return choices;
 }
 if(tag==='site033'){
  return legalGreen033AfterRaid({...s,pending:{kind:'green033RaidOrder'}},{player:p,raidUid:q.raidUid})
    .map(a=>item({siteUid:a.siteUid}));
 }
 if(tag==='site034'){
  return legalGreen034AfterRaid({...s,pending:{kind:'green034RaidOrder'}},{player:p,raidUid:q.raidUid})
    .map(a=>item({siteUid:a.siteUid}));
 }
 if(tag==='entry027'){
  const n=faceCount(source),opp=s.players[1-p].front.filter(c=>validOpp(c)&&greenTtgCurrentBp(s,1-p,c)<=5000);
  const targets=n>=1?[null,...opp.map(x=>x.uid)]:[null];
  const aps=n>=3?pl.apCards.map(x=>x.uid):[null];
  return targets.flatMap(targetUid=>aps.map(apUid=>item({targetUid,apUid})));
 }
 if(tag==='entry031'){
  if(pl.green031UsedTurn===s.turn)return [item({mode:'skipped'})];
  const e=total(s,p);
  return (e>=20?pl.apCards.map(x=>x.uid):[null]).map(apUid=>item({apUid}));
 }
 if(tag==='entry032'){
  const choices=pl.front.filter(c=>c&&c.uid!==q.raidUid);
  // In the UI select any subset; each whole Raid pile stays physically intact
  // and is face-down so it cannot be publicly inspected by the opponent.
  const result=[[]];for(const c of choices){result.push(...result.map(x=>[...x,c.uid]));}
  return result.map(takeUids=>item({takeUids}));
 }
 throw new Error('Unrecognized printed high-Raid effect '+tag);
}
export function legalGreenHighRaidChoices(s){
 const q=s.pending;
 if(q?.kind!=='greenHighRaidQueue')return [];
 if(!q.remaining?.length)return [];
 return q.remaining.flatMap(tag=>stageChoices(s,tag,q));
}
export function resolveGreenHighRaidChoice(state,action={}){
 const q=state?.pending,options=legalGreenHighRaidChoices(state);
 if(!options.some(x=>same(x,action)))throw new Error('Illegal high Raid target, choice or resolution order');
 const {player:p,raidUid,step}=action,prev=inventory(state.players[p]);
 let r=structuredClone(state),pl=r.players[p],source=find(r,p,raidUid)?.card;
 const beforeOpp=inventory(state.players[1-p]);
 if(step==='viral004'){
  if(action.mode==='attach'){
   const zone=action.zone,items=pl[zone],i=items.findIndex(x=>x.uid===action.sourceUid);
   if(!['hand','outside'].includes(zone)||i<0)throw new Error('Viral face-down source missing');
   const card=items.splice(i,1)[0];source.under??=[];source.under.push({...card,faceDown:true});
   if(zone==='hand'){
    if(pl.deck.length)pl.hand.push(pl.deck.shift());
    else{r.status='finished';r.winner=1-p;r.endReason='requiredDrawEmpty';}
   }
   pl.green004UsedTurn=state.turn;
  }
 }else if(step==='site033'){
  const temp={...r,pending:{kind:'green033RaidOrder'}};
  r=resolveGreen033AfterRaid(temp,{player:p,raidUid,siteUid:action.siteUid});
 }else if(step==='site034'){
  const temp={...r,pending:{kind:'green034RaidOrder'}};
  r=resolveGreen034AfterRaid(temp,{player:p,raidUid,siteUid:action.siteUid});
 }else if(step==='entry027'){
  if(action.apUid)pl.apCards.find(x=>x.uid===action.apUid).ready=true;
  if(action.targetUid){
   const opp=r.players[1-p],i=opp.front.findIndex(c=>c?.uid===action.targetUid);
   if(i<0||!validOpp(opp.front[i]))throw new Error('027 target left Front');
   opp.outside.push(opp.front[i]);opp.front[i]=null;
  }
 }else if(step==='entry031'){
  if(action.mode!=='skipped'){
   source.currentBp=(source.currentBp??TTG_BY_ID[source.cardId].bp)+5000;
   source.buffs??=[];source.buffs.push({bp:5000,until:'ownNextStart'});
   source.protectedFromEffects=true;
   source.green031ProtectedUntilOwnStart=pl.turnCount+1;
   if(action.apUid)pl.apCards.find(x=>x.uid===action.apUid).ready=true;
   if(total(r,p)>=50)for(let i=0;i<2;i++){
    if(pl.deck.length)pl.hand.push(pl.deck.shift());
    else{r.status='finished';r.winner=1-p;r.endReason='requiredDrawEmpty';break;}
   }
   pl.green031UsedTurn=state.turn;
  }
 }else if(step==='entry032'){
  for(const uid of action.takeUids){
   const index=pl.front.findIndex(c=>c?.uid===uid);
   if(index<0||uid===raidUid)throw new Error('032 absorption illegal');
   const card=pl.front[index];pl.front[index]=null;
   source.under??[];source.under.push({...card,faceDown:true});
  }
 }
 pl=r.players[p];source=find(r,p,raidUid)?.card;
 if(JSON.stringify(inventory(pl))!==JSON.stringify(prev))throw new Error('High Raid effect player UID conservation '+step);
 if(JSON.stringify(inventory(r.players[1-p]))!==JSON.stringify(beforeOpp))throw new Error('High Raid effect opponent UID conservation '+step);
 const left=q.remaining.filter(x=>x!==step);
 r.pending=left.length?{...q,remaining:left}:null;
 r.log??=[];r.log.push({type:'greenHighRaidEffect',player:p,raidUid,step,mode:action.mode??null});
 return withTtgDerivedEnergy(r,p);
}
export function expireGreen031AtOwnStart(s,p){
 const r=structuredClone(s),pl=r.players[p];
 for(const x of own(pl)){
  const c=x.card;
  if(c.green031ProtectedUntilOwnStart!=null&&pl.turnCount>=c.green031ProtectedUntilOwnStart){
   delete c.protectedFromEffects;delete c.green031ProtectedUntilOwnStart;
  }
 }
 return r;
}
export const greenHighRaidFacedownCount=faceCount;
export function greenHighRaidCombatValue(s,p,c){
 if(c?.cardId==='TTG-1-027')return {impact:1,damage:c.green027DamageUntilTurn===s.turn?2:1};
 if(c?.cardId==='TTG-1-031')return {impact:0,damage:2};
 if(c?.cardId==='TTG-1-032')return {impact:s.active===p?4:0,damage:s.active===p?7:1};
 return {impact:0,damage:1};
}
export function legalHighRaidAttackEffects(s,p,uid){
 const c=s.players?.[p]?.front?.find(c=>c?.uid===uid);
 if(!c||!['TTG-1-027','TTG-1-032'].includes(c.cardId))return [];
 const facedown=(c.under||[]).filter(x=>x.faceDown).map(x=>x.uid);
 const choices=[{type:'greenHighAttack',player:p,uid,spendUids:[],targetUid:null}];
 for(let i=0;i<facedown.length;i++)for(let j=i+1;j<facedown.length;j++){
  const spendUids=[facedown[i],facedown[j]];
  const targets=c.cardId==='TTG-1-032'?s.players[1-p].front.filter(validOpp):[];
  choices.push({type:'greenHighAttack',player:p,uid,spendUids,targetUid:null});
  for(const target of targets)choices.push({type:'greenHighAttack',player:p,uid,spendUids,targetUid:target.uid});
 }
 return choices;
}
export function resolveHighRaidAttackEffect(state,action={}){
 const {player:p,uid,spendUids=[],targetUid=null}=action;
 if(!Array.isArray(spendUids)||!legalHighRaidAttackEffects(state,p,uid)
   .some(x=>JSON.stringify(x.spendUids)===JSON.stringify(spendUids)&&x.targetUid===targetUid))
  throw new Error('Illegal high Raid attack under-card cost / enemy target');
 const r=structuredClone(state),c=r.players[p].front.find(c=>c?.uid===uid),pl=r.players[p];
 const original=inventory(pl),oppOriginal=inventory(r.players[1-p]);
 if(spendUids.length){
  for(const sub of spendUids){
   const i=c.under.findIndex(x=>x.uid===sub&&x.faceDown);
   if(i<0)throw new Error('Face-down source disappeared');
   const card=c.under.splice(i,1)[0];
   pl.outside.push({...card,faceDown:false});
  }
  if(c.cardId==='TTG-1-027')c.green027DamageUntilTurn=state.turn;
  if(c.cardId==='TTG-1-032'&&targetUid){
   const opponent=r.players[1-p],i=opponent.front.findIndex(x=>x?.uid===targetUid);
   if(i<0)throw new Error('Attack target left Front');
   if(opponent.front[i].cardId==='TTG-1-030'){
    Object.assign(r,sidelineGreen030({...r,pending:null},{player:1-p,uid:targetUid}));
   }else{
    opponent.outside.push(...flattenSidelinedPile(opponent.front[i]));opponent.front[i]=null;
    if(opponent.energy.some(x=>x?.cardId==='TTG-1-034'&&x.green034UsedTurn!==state.turn))
     Object.assign(r,beginGreen034Sidelined({...r,pending:null},{player:1-p,retiredUid:targetUid}));
   }
  }
 }
 if(JSON.stringify(inventory(r.players[p]))!==JSON.stringify(original)||
    JSON.stringify(inventory(r.players[1-p]))!==JSON.stringify(oppOriginal))
    throw new Error('High Raid attack physical UID conservation');
 return r;
}

// Raid trigger (027/031) from LIFE: opponent-turn, no AP expenditure.
// This calls the SAME ordered on-entry resolver as a normal/chain Raid.
export function legalGreenHighLifeRaids(s,{player,cardUid}={}){
 if(![0,1].includes(player)||!s.pendingTtgLife||s.pendingTtgLife.player!==player||
   s.pendingTtgLife.cardUid!==cardUid)return [];
 const pl=s.players[player],card=pl.outside.find(x=>x.uid===cardUid);
 if(!card||!['TTG-1-027','TTG-1-031'].includes(card.cardId))return [];
 if(calculateTtgEnergyByColor(s,player).green<TTG_BY_ID[card.cardId].energy)return [];
 const result=[],expected=card.cardId==='TTG-1-027'?'グレンラガン':'アークグレンラガン';
 for(const source of own(pl)){
  const normal=base(source.card);
  const chain=name(source.card)===expected&&source.card.stack?.length===1&&
   base(source.card.stack[0])&&(source.card.under||[]).every(x=>x.faceDown);
  if(!normal&&!chain)continue;
  const choices=[{line:source.line,slot:source.slot}];
  if(source.line==='energy')for(let slot=0;slot<4;slot++)if(!pl.front[slot])choices.push({line:'front',slot});
  for(const loc of choices)result.push({sourceUid:source.card.uid,raidKind:chain?'chain':'base',...loc});
 }
 return result;
}
export function resolveGreenHighLifeRaid(state,{player,cardUid,sourceUid,raidKind,line,slot}={}){
 const choices=legalGreenHighLifeRaids(state,{player,cardUid});
 if(!choices.some(x=>x.sourceUid===sourceUid&&x.line===line&&x.slot===slot&&x.raidKind===raidKind))
  throw new Error('Illegal free 027/031 life Raid or insufficient energy');
 const before=inventory(state.players[player]),wasFrontViral=state.players[player].front.some(c=>c?.cardId==='TTG-1-004')&&
  state.players[player].green004UsedTurn!==state.turn;
 const r=structuredClone(state),pl=r.players[player],i=pl.outside.findIndex(x=>x.uid===cardUid),old=find(r,player,sourceUid);
 if(i<0||!old)throw new Error('Life Raid physical card missing');
 const top=pl.outside.splice(i,1)[0],prior=old.card;
 pl[old.line][old.slot]=null;
 if(pl[line][slot])throw new Error('Life Raid destination occupied');
 const baseCard=raidKind==='chain'?prior.stack[0]:prior;
 const underneath=raidKind==='chain'?[...(prior.under||[]),{uid:prior.uid,cardId:prior.cardId,faceDown:true}]:[];
 pl[line][slot]={...top,stack:[baseCard],under:underneath,ready:true,raidedTurn:state.turn,enteredTurn:state.turn};
 const steps=[];
 if(wasFrontViral)steps.push('viral004');
 if(top.cardId==='TTG-1-027'){
  steps.push('entry027');
  if(pl.energy.some(c=>c?.cardId==='TTG-1-033'&&pl.green033UsedTurn!==state.turn))steps.push('site033');
 }else{
  steps.push('entry031');
  if(pl.energy.some(c=>c?.cardId==='TTG-1-034'))steps.push('site034');
 }
 r.pending={kind:'greenHighRaidQueue',player,raidUid:top.uid,remaining:steps};
 r.pendingTtgLife=null;
 if(!pl.life.length)r.pendingLifeOutcome={player};
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('Life Raid UID conservation');
 return withTtgDerivedEnergy(r,player);
}
