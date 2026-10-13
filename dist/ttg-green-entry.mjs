// UA56BT green: deterministic printed ON-ENTRY abilities with explicit choices.
// Every action is atomic: illegal decisions never draw, reorder, move or discard.
// These reducers are used from a TTG-specific match, not the BLEACH engine.
import {TTG_BY_ID} from './ttg-builder.mjs';

export const TTG_GREEN_ENTRY_IDS=Object.freeze([
 'TTG-1-001','TTG-1-007','TTG-1-009','TTG-1-010','TTG-1-013','TTG-1-014',
 'TTG-1-016','TTG-1-017','TTG-1-023','TTG-1-026'
]);
const entrySet=new Set(TTG_GREEN_ENTRY_IDS);
const ownField=pl=>['front','energy'].flatMap(line=>(pl?.[line]||[]).map((card,slot)=>({card,line,slot}))).filter(x=>x.card);
const traitsOf=c=>TTG_BY_ID[c.cardId]?.traits||c.traits||[];
const named=(c,text)=>{const d=TTG_BY_ID[c.cardId];return [c.nameJa,d?.nameJa,d?.nameZh,d?.name].some(v=>v===text);};
const gunmen=c=>traitsOf(c).some(t=>String(t).includes('ガンメン'));
const great=c=>traitsOf(c).some(t=>String(t).includes('大グレン団'));
const ark=c=>named(c,'アークグレン');
const objectHasUniqueUids=(pl)=>{
 const walk=c=>[c.uid,...(c.stack||[]).flatMap(walk),...(c.under||[]).flatMap(walk)];
 const ids=[...(pl.deck||[]),...(pl.hand||[]),...(pl.life||[]),...(pl.outside||[]),...ownField(pl).map(x=>x.card)].flatMap(walk);
 return ids.every(Boolean)&&new Set(ids).size===ids.length;
};
const printedCost=c=>c.energy??TTG_BY_ID[c.cardId]?.energy;
const isSafeStandalone=c=>!(c.stack||[]).length&&!(c.under||[]).length;
function context(state,player,sourceUid){
 if(![0,1].includes(player)||!state?.players?.[player])throw new Error('Invalid TTG green entry owner');
 const pl=state.players[player],entry=ownField(pl).find(x=>x.card.uid===sourceUid);
 if(!entry||!entrySet.has(entry.card.cardId))throw new Error('Entry card not on owner field');
 if(!Array.isArray(pl.deck)||!Array.isArray(pl.hand)||!Array.isArray(pl.outside))throw new Error('Missing TTG zones');
 if(!objectHasUniqueUids(pl))throw new Error('Physical UID duplication before entry');
 return {pl,entry,id:entry.card.cardId};
}
function reorder(revealed,order){
 if(!Array.isArray(order)||new Set(order).size!==order.length||order.length!==revealed.length||
   !revealed.every(c=>order.includes(c.uid)))throw new Error('Revealed cards must be ordered exactly once');
 return order.map(uid=>revealed.find(c=>c.uid===uid));
}
const available=(s,p,c)=>legalTtgGreenEntryDecisions(s,{player:p,sourceUid:c.uid});
export function legalTtgGreenEntryDecisions(state,{player,sourceUid}={}){
 const {pl,entry,id}=context(state,player,sourceUid);
 if(state.pending&&state.pending.kind!=='ttgGreenEntry')return [];
 if(state.pending?.kind==='ttgGreenEntry'&&(state.pending.player!==player||state.pending.sourceUid!==sourceUid))return [];
 const top=pl.deck;
 switch(id){
 case 'TTG-1-001':
  return top.length?[{type:'greenEntry',player,sourceUid,mode:'keepTop'},{type:'greenEntry',player,sourceUid,mode:'outsideTop'}]:
   [{type:'greenEntry',player,sourceUid,mode:'emptyDeck'}];
 case 'TTG-1-007':case 'TTG-1-013':{
  const partner=id==='TTG-1-007'?'ダリー':'ギミー';
  const targets=pl.outside.filter(c=>named(c,partner)&&isSafeStandalone(c)&&
   Number.isInteger(printedCost(c))&&(pl.energyProduced?.green??0)>=printedCost(c));
  return [{type:'greenEntry',player,sourceUid,mode:'partnerRecover',
   candidateUids:targets.map(c=>c.uid),readyApUids:(pl.apCards||[]).filter(x=>x.ready).map(x=>x.uid),canSkip:true}];
 }
 case 'TTG-1-009':
  return top.length||pl.hand.length? [{type:'greenEntry',player,sourceUid,mode:'drawThenDiscard',discardUids:[...pl.hand.map(c=>c.uid),...(top.length?[top[0].uid]:[])]}]:
   [{type:'greenEntry',player,sourceUid,mode:'emptyDeck'}];
 case 'TTG-1-010':case 'TTG-1-023':{
  const n=id.endsWith('010')?3:5,revealed=top.slice(0,n);
  const candidates=revealed.filter(id.endsWith('010')?great:gunmen);
  return [{type:'greenEntry',player,sourceUid,mode:'search',revealed:revealed.map(c=>c.uid),
   candidateUids:candidates.map(c=>c.uid),canSkip:true,
   mustDiscardOnTake:true}];
 }
 case 'TTG-1-016':return [{type:'greenEntry',player,sourceUid,mode:'niaDiscardDraw',max:Math.min(2,pl.hand.length,pl.deck.length),candidateUids:pl.hand.map(c=>c.uid)}];
 case 'TTG-1-017':{
  const match=c=>named(c,'シモン')||Number.isInteger(printedCost(c))&&printedCost(c)>=8;
  return [
   {type:'greenEntry',player,sourceUid,mode:'niaSearch',revealed:top.slice(0,4).map(c=>c.uid),candidateUids:top.slice(0,4).filter(match).map(c=>c.uid),canSkip:true,mustDiscardOnTake:true},
   {type:'greenEntry',player,sourceUid,mode:'niaOutsideToTop',candidateUids:pl.outside.filter(match).map(c=>c.uid),canSkip:true}
  ];
 }
 case 'TTG-1-014':{
  const candidates=ownField(pl).filter(x=>x.card.uid!==sourceUid&&isSafeStandalone(x.card)&&
    Number.isInteger(printedCost(x.card))&&printedCost(x.card)<=1);
  const unknown=ownField(pl).filter(x=>x.card.uid!==sourceUid).some(x=>!Number.isInteger(printedCost(x.card)));
  if(!candidates.length&&unknown)return [];
  return [{type:'greenEntry',player,sourceUid,mode:'mandatoryBounce',
   candidateUids:candidates.map(x=>x.card.uid),selfIfEmpty:candidates.length===0}];
 }
 case 'TTG-1-026':{
  const candidates=top.slice(0,7).filter(ark);
  const outside=pl.outside.filter(ark);
  return [{type:'greenEntry',player,sourceUid,mode:'arkChoice',
   revealed:top.slice(0,7).map(c=>c.uid),candidateUids:candidates.map(c=>c.uid),
   outsideUids:outside.map(c=>c.uid),canSkip:true}];
 }
 default:return [];
 }
}
export function resolveTtgGreenEntry(state,{player,sourceUid,mode,takeUid=null,discardUid=null,discardUids=[],bottomOrderUids=[],returnUid=null,apUid=null,line=null,slot=null}={}){
 const {pl,id,entry}=context(state,player,sourceUid);
 const options=available(state,player,entry.card);
 const rule=options.find(x=>x.mode===mode);
 if(!rule)throw new Error('Unsupported or ill-timed green entry decision');
 const result=structuredClone(state),owner=result.players[player];
 const found=(zone,uid)=>zone.findIndex(c=>c.uid===uid);
 const from=(zone,uid)=>{const i=found(zone,uid);if(i<0)throw new Error('Physical card missing');return zone.splice(i,1)[0];};
 if(mode==='keepTop'||mode==='emptyDeck'){
  if(takeUid||discardUid||returnUid||bottomOrderUids.length)throw new Error('Illegal no-op entry choice');
 }else if(mode==='outsideTop'){
  if(takeUid||discardUid||returnUid||bottomOrderUids.length)throw new Error('No extra card moves');
  owner.outside.push(owner.deck.shift());
 }else if(mode==='partnerRecover'){
  if(discardUid||returnUid||discardUids.length||bottomOrderUids.length)throw new Error('No extra partner-effect costs');
  if(takeUid!==null){
   if(!rule.candidateUids.includes(takeUid)||!rule.readyApUids.includes(apUid))throw new Error('Partner needs own ACTIVE physical AP');
   if(!['front','energy'].includes(line)||!Number.isInteger(slot)||slot<0||slot>3||owner[line][slot])throw new Error('Partner needs empty destination');
   owner.apCards.find(x=>x.uid===apUid).ready=false;
   const x=from(owner.outside,takeUid);owner[line][slot]={...x,ready:false,enteredTurn:state.turn};
  }else if(apUid||line!==null||slot!==null)throw new Error('Skip partner recovery without paying AP');
 }else if(mode==='drawThenDiscard'){
  if(takeUid||returnUid||bottomOrderUids.length||!discardUid||!rule.discardUids.includes(discardUid))throw new Error('Illegal mandatory discard');
  if(owner.deck.length)owner.hand.push(owner.deck.shift());
  owner.outside.push(from(owner.hand,discardUid));
 }else if(mode==='search'){
  const n=id.endsWith('010')?3:5,revealed=owner.deck.splice(0,n);
  if(takeUid!==null&&!rule.candidateUids.includes(takeUid))throw new Error('Invalid reveal target');
  if(takeUid){
   if(!discardUid||!([...owner.hand.map(c=>c.uid),takeUid].includes(discardUid)))throw new Error('Must discard one hand card when taking');
   owner.hand.push(from(revealed,takeUid));
  }else if(discardUid)throw new Error('Cannot discard without adding a card');
  if(bottomOrderUids.length!==revealed.length)throw new Error('Bottom order required');
  owner.deck.push(...reorder(revealed,bottomOrderUids));
  if(takeUid)owner.outside.push(from(owner.hand,discardUid));
 }else if(mode==='niaDiscardDraw'){
  const ids=discardUids;
  if(!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!rule.candidateUids.includes(id))||owner.deck.length<ids.length)throw new Error('Nia discard/draw is optional up to two cards');
  owner.outside.push(...ids.map(id=>from(owner.hand,id)));
  owner.hand.push(...owner.deck.splice(0,ids.length));
 }else if(mode==='niaSearch'){
  const revealed=owner.deck.splice(0,4);
  if(takeUid!==null&&!rule.candidateUids.includes(takeUid))throw new Error('Nia searched only Simon or energy>=8');
  if(takeUid){
   if(!discardUid||![...owner.hand.map(c=>c.uid),takeUid].includes(discardUid))throw new Error('Nia must discard after taking');
   owner.hand.push(from(revealed,takeUid));
  }else if(discardUid)throw new Error('Nia did not search a card');
  if(bottomOrderUids.length!==revealed.length)throw new Error('Nia bottom order incomplete');
  owner.deck.push(...reorder(revealed,bottomOrderUids));
  if(takeUid)owner.outside.push(from(owner.hand,discardUid));
 }else if(mode==='niaOutsideToTop'){
  if(discardUid||returnUid||bottomOrderUids.length||takeUid!==null&&!rule.candidateUids.includes(takeUid))throw new Error('Illegal Nia outside recovery');
  if(takeUid)owner.deck.unshift(from(owner.outside,takeUid));
 }else if(mode==='mandatoryBounce'){
  if(takeUid||discardUid||bottomOrderUids.length)throw new Error('Illegal bounce extras');
  const chosen=rule.selfIfEmpty?sourceUid:returnUid;
  if(!chosen||(!rule.selfIfEmpty&&!rule.candidateUids.includes(chosen)))throw new Error('Mandatory return target required');
  const target=ownField(owner).find(x=>x.card.uid===chosen);
  if(!target||!isSafeStandalone(target.card))throw new Error('Unimplemented RAID pile return');
  owner[target.line][target.slot]=null;
  owner.hand.push(target.card);
 }else if(mode==='arkChoice'){
  if(discardUid||returnUid)throw new Error('No discard or bounce on Ark selection');
  if(takeUid===null){
   const revealed=owner.deck.splice(0,7);
   if(bottomOrderUids.length!==revealed.length)throw new Error('Bottom order required');
   owner.deck.push(...reorder(revealed,bottomOrderUids));
  }else if(rule.outsideUids.includes(takeUid)){
   if(bottomOrderUids.length)throw new Error('Outside Ark recovery never inspects deck');
   owner.hand.push(from(owner.outside,takeUid));
  }else{
   if(!rule.candidateUids.includes(takeUid))throw new Error('Only Ark can be searched');
   const revealed=owner.deck.splice(0,7);
   owner.hand.push(from(revealed,takeUid));
   if(bottomOrderUids.length!==revealed.length)throw new Error('Bottom order required');
   owner.deck.push(...reorder(revealed,bottomOrderUids));
  }
 }
 if(!objectHasUniqueUids(owner))throw new Error('Green entry caused UID duplication');
 if(result.pending?.kind==='ttgGreenEntry')result.pending=null;
 result.log??=[];
 result.log.push({type:'ttgGreenEntryResolved',player,cardId:id,sourceUid,mode,takeUid,discardUid,returnUid});
 return result;
}
