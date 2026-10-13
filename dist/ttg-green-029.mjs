// UA56BT/TTG-1-029 green Gurren Lagann.
// Printed normal Raid Simon/Viral, ACTIVE. If entered into Front:
// optional retrieve one <=3-energy, 1-AP, GREEN Team Dai-Gurren from OWN
// outside to hand; with >=6 energy AFTER this RAID, instead may place it
// REST in own field. Chain-triggered entries are never silently skipped.
// The RAID LIFE trigger is not implemented here.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from './ttg-energy-snapshot.mjs';
import {spendTtgApCards} from './ttg-actions.mjs';
import {TTG_GREEN_ENTRY_IDS} from './ttg-green-entry.mjs';

const field=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const nameOf=c=>c?.nameJa||TTG_BY_ID[c?.cardId]?.nameJa;
const legitBase=c=>c&&['シモン','ヴィラル'].includes(nameOf(c))&&!c.stack?.length&&!c.under?.length;
const all=pl=>{
 const expand=c=>[c.uid,...(c.stack||[]).flatMap(expand),...(c.under||[]).flatMap(expand)];
 return [...pl.hand,...pl.deck,...pl.life,...pl.outside,...(pl.removed||[]),...field(pl).map(x=>x.card)].flatMap(expand).sort();
};
const eligible=c=>{
 const d=TTG_BY_ID[c.cardId];
 return d?.type==='character'&&d.color==='green'&&d.ap===1&&d.energy<=3&&
  d.traits?.some(t=>String(t).includes('大グレン団'))&&
  !(c.stack||[]).length&&!(c.under||[]).length;
};
export function legalTtgGreen029Raids(s,p){
 if(![0,1].includes(p)||s?.active!==p||s.phase!=='main'||s.pending||
  s.pendingTtgLife||s.pendingTtgTrigger)return [];
 const pl=s.players?.[p],d=TTG_BY_ID['TTG-1-029'];
 if(!pl?.apCards||!pl.hand||!pl.front||!pl.energy||
   calculateTtgEnergyByColor(s,p).green<d.energy||pl.apCards.filter(a=>a.ready).length<d.ap)return [];
 if(pl.front.some(c=>c?.cardId==='TTG-1-004'))return []; // simultaneous Q2260 still unimplemented
 const options=[];
 for(const hand of pl.hand.filter(x=>x.cardId==='TTG-1-029')){
  for(const src of field(pl).filter(x=>legitBase(x.card))){
   const choices=[{line:src.line,slot:src.slot}];
   if(src.line==='energy')for(let slot=0;slot<4;slot++)if(!pl.front[slot])
    choices.push({line:'front',slot});
   for(const pos of choices)options.push({type:'ttgGreen029Raid',player:p,
    handUid:hand.uid,baseUid:src.card.uid,line:pos.line,slot:pos.slot,requiredAp:d.ap});
  }
 }
 return options;
}
export function dispatchTtgGreen029Raid(s,action){
 const {player,handUid,baseUid,line,slot,payApUids=[]}=action||{};
 const opt=legalTtgGreen029Raids(s,player).find(x=>
  x.handUid===handUid&&x.baseUid===baseUid&&x.line===line&&x.slot===slot);
 if(!opt||!Array.isArray(payApUids)||payApUids.length!==opt.requiredAp||
    new Set(payApUids).size!==payApUids.length)throw new Error('Illegal 029 RAID source, position or AP');
 const before=all(s.players[player]);
 if(before.length!==new Set(before).size)throw new Error('Duplicate card UID before 029');
 const result=spendTtgApCards(s,{player,apUids:payApUids,count:opt.requiredAp});
 const pl=result.players[player],src=field(pl).find(x=>x.card.uid===baseUid),
  handIndex=pl.hand.findIndex(x=>x.uid===handUid);
 if(!src||handIndex<0)throw new Error('029 Raid base / hand disappeared');
 const top=pl.hand.splice(handIndex,1)[0],base=src.card;
 pl[src.line][src.slot]=null;
 if(pl[line][slot])throw new Error('029 cannot overwrite a field card');
 pl[line][slot]={...top,ready:true,stack:[base],under:[],enteredTurn:s.turn,raidedTurn:s.turn};
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('029 physical card conservation failed');
 if(line==='front')result.pending={kind:'ttgGreen029Entry',player,uid:handUid};
 result.log??=[];
 result.log.push({type:'ttgGreen029Raid',player,uid:handUid,baseUid,line,slot});
 return withTtgDerivedEnergy(result,player);
}
export function legalTtgGreen029EntryChoices(s){
 const q=s?.pending;
 if(q?.kind!=='ttgGreen029Entry'||![0,1].includes(q.player))return [];
 const pl=s.players[q.player];
 if(!pl.front.some(c=>c?.uid===q.uid&&c.cardId==='TTG-1-029'))return [];
 const base={type:'ttgGreen029Entry',player:q.player,uid:q.uid};
 const candidates=pl.outside.filter(eligible),more=calculateTtgEnergyByColor(s,q.player).green>=6;
 const choices=[{...base,mode:'decline'}];
 for(const card of candidates){
  choices.push({...base,mode:'hand',outsideUid:card.uid});
  if(more)for(const line of ['energy','front'])for(let slot=0;slot<4;slot++)
   if(!pl[line][slot])choices.push({...base,mode:'restPlay',outsideUid:card.uid,line,slot});
 }
 return choices;
}
export function resolveTtgGreen029Entry(s,action){
 const q=s?.pending,legal=legalTtgGreen029EntryChoices(s);
 if(q?.player!==action?.player||q.uid!==action.uid||!legal.some(x=>x.mode===action.mode&&
  x.outsideUid===action.outsideUid&&x.line===action.line&&x.slot===action.slot))
  throw new Error('029 must choose a valid outside green <=3 AP1 character and field slot');
 const result=structuredClone(s),pl=result.players[action.player],before=all(pl);
 if(action.mode!=='decline'){
  const index=pl.outside.findIndex(c=>c.uid===action.outsideUid);
  if(index<0)throw new Error('029 recovery target changed');
  const recovered=pl.outside.splice(index,1)[0];
  if(action.mode==='hand')pl.hand.push(recovered);
  else{
   if(pl[action.line][action.slot])throw new Error('029 recovered card destination occupied');
   pl[action.line][action.slot]={...recovered,ready:false,enteredTurn:s.turn};
   if(TTG_GREEN_ENTRY_IDS.includes(recovered.cardId))
    result.pending={kind:'ttgGreenEntry',player:action.player,sourceUid:recovered.uid};
  }
 }
 if(result.pending?.kind==='ttgGreen029Entry')result.pending=null;
 if(JSON.stringify(all(pl))!==JSON.stringify(before))throw new Error('029 recovered card conservation violated');
 result.log??=[];
 result.log.push({type:'ttgGreen029EntryResolved',player:action.player,
  raidUid:action.uid,mode:action.mode,outsideUid:action.outsideUid||null});
 return withTtgDerivedEnergy(result,action.player);
}
