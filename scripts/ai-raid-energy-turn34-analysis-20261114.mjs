// Research-only: identical-deck mirrored games; inspect turns 3-4 energy/raid.
// Fixed 48-node decisions with no soft wall-clock for repeatability.
// A one-step legal raid after an alternative play is an opportunity, NOT proof
// that the alternative would have won the match.
import {writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,effectiveHandRequiredEnergy} from '../dist/universal-v2/engine.mjs';

const shard=Number(process.env.SHARD||0);
const baseNames=['white-sword','sword-art-online-raid'];
const pool=battleDecks(),decks=baseNames.map(id=>pool.find(x=>x.id===id)).filter(Boolean);
const LIMIT=1200,SETTINGS={nodes:48,ms:1e9,seed:1};
if(decks.length!==baseNames.length)throw Error('Missing tested decks: '+baseNames.filter(id=>!decks.some(d=>d.id===id)));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const squash=value=>String(value||'').replace(/\s+/g,'');
const actorOf=s=>s.pending?.player??s.active;
const printed=(pack,card)=>card?pack.cards[card.cardId]:null;
const safeColors=(packs,s,actor)=>{try{return universalEnergyByColor(packs,s,actor)||{};}catch{return {}};};
const costOf=(packs,s,actor,card)=>{
 const p=printed(packs[actor],card);
 if(!p)return null;
 try{return effectiveHandRequiredEnergy(packs,s,actor,p,card);}
 catch{return Number(p.energy)||0;}
};
function raidState(packs,s,actor,legal){
 const mine=s.players[actor],hand=mine.hand||[],catalog=packs[actor].cards;
 const colors=safeColors(packs,s,actor);
 const board=[...(mine.front||[]),...(mine.energy||[])].filter(Boolean);
 const found=[];
 for(const card of hand){
  const p=printed(packs[actor],card);
  if(!p?.raidName)continue;
  const wanted=new Set([p.raidName,...(p.raidBaseNames||[])].map(squash));
  const base=board.filter(c=>wanted.has(squash(catalog[c.cardId]?.name)));
  const required=costOf(packs,s,actor,card);
  const have=colors[p.color]||0;
  const legalRaids=legal.filter(a=>a.type==='raid'&&a.uid===card.uid);
  found.push({
   id:p.id,name:p.name,color:p.color,printedCost:p.energy,required,
   have,shortfall:Math.max(0,required-have),ap:p.ap||0,
   availableAp:mine.apCards.filter(c=>c?.ready).length,
   baseCount:base.length,baseZones:base.map(c=>
    (mine.front||[]).some(x=>x?.uid===c.uid)?'front':'energy'),
   legalRaidCount:legalRaids.length
  });
 }
 return {raidHand:found,readyMaterial:found.filter(x=>x.baseCount>0),
   payableMaterial:found.filter(x=>x.baseCount>0&&x.shortfall===0),
   legalRaidTypes:new Set(legal.filter(a=>a.type==='raid').map(a=>a.uid)).size,
   colors};
}
function postRaidOptions(packs,state,actor,action){
 try{
  const next=dispatchUniversalAction(packs,structuredClone(state),action,{actor});
  const candidates=next.status==='playing'&&!next.pending&&next.phase==='main'
   ?legalUniversalActions(packs,next):[];
  return {count:new Set(candidates.filter(a=>a.type==='raid').map(a=>a.uid)).size,
   pending:next.pending?.kind||null,phase:next.phase,
   ap:next.players[actor].apCards.filter(c=>c?.ready).length,
   colors:safeColors(packs,next,actor)};
 }catch(e){return {count:null,error:e?.message||String(e)};}
}
function energyAlternatives(packs,s,actor,chosen,legal,raid){
 if(chosen.type!=='play'||chosen.line!=='energy'||!raid.readyMaterial.length)
  return null;
 const energies=legal.filter(a=>a.type==='play'&&a.line==='energy');
 if(energies.length<2)return null;
 const selected=postRaidOptions(packs,s,actor,chosen);
 if(selected.count==null)return null;
 const variants=energies.filter(a=>!same(a,chosen)).slice(0,40).map(a=>{
  const after=postRaidOptions(packs,s,actor,a);
  const hand=s.players[actor].hand.find(c=>c.uid===a.uid);
  const card=printed(packs[actor],hand);
  return {
   cardId:card?.id||null,color:card?.color||null,gen:card?.gen||0,
   postRaidTypes:after.count,postAp:after.ap,pending:after.pending,
   postColors:after.colors,actionType:a.type,line:a.line,slot:a.slot
  };
 }).filter(x=>x.postRaidTypes!=null);
 const enabled=variants.filter(x=>x.postRaidTypes>selected.count);
 return enabled.length?{chosenRaidTypes:selected.count,selectedColors:selected.colors,
  chosenAp:selected.ap,altCount:energies.length,improving:enabled.slice(0,4)}:null;
}
function choose(packs,s,step,actor,hybridSeat,phaseCount){
 const legal=legalUniversalActions(packs,s);
 const autoNext=!s.pending?legal.find(a=>a.type==='next'):null;
 let action,problem=null;
 if(phaseCount>=72&&autoNext){action=autoNext;problem='phase-budget';}
 else if(actor===hybridSeat){
  const requestId=step+1,stateVersion=step+1;
  const req=buildAiV3Request(packs,s,actor,{...SETTINGS,requestId,stateVersion,policy:HYBRID_START_HARD_POLICY});
  const ans=req?handleAiV3Request(req):null;
  const ok=acceptAiV3Result({requestId,stateVersion,actor,legal},ans);
  if(!ok.ok)throw Error('Hybrid invalid: '+ok.reason);
  action=ok.action;
 }else action=chooseStrengthenedHardAction(packs,s,SETTINGS);
 const exact=legal.find(x=>same(x,action));
 if(!exact)throw Error('Illegal action '+problem+' '+(action?.type||'null'));
 return {action:exact,legal,problem};
}
const results=[],errors=[];
for(const deck of decks){
 const packs=[deck.pack,deck.pack];
 for(let i=0;i<12;i++){
  if(i%4!==shard)continue;
  const seed=(deck.id==='white-sword'?9600:9700)+i;
  for(const first of [0,1])for(const hybridSeat of [0,1]){
   let s=applySharedOpening(packs,newComparedMatch(packs,
    [deck.counts,deck.counts],seed,first)).state;
   const phases=['',''],counts=[0,0],turnTag=null,events=[];
   let ownTurn=0,startTag=null,step=0,playedRaid=0,handRaidSeen=0,matched=0,legalRaidWindow=0;
   let missedLegalRaid=0,energyWrongColor=0,energyAlternative=0,notes=0;
   const colorsAtStart={},raidAtStart={};
   try{
    while(s.status==='playing'&&step<LIMIT){
     const actor=actorOf(s);
     if(actor===hybridSeat&&s.phase==='start'&&!s.pending){
      const tag=s.turn+'|'+s.active;
      if(tag!==startTag){ownTurn++;startTag=tag;}
     }
     const phaseKey=s.turn+'|'+s.active+'|'+s.phase;
     if(phases[actor]!==phaseKey){phases[actor]=phaseKey;counts[actor]=0;}
     const {action,legal}=choose(packs,s,step,actor,hybridSeat,counts[actor]);
     if(actor===hybridSeat&&!s.pending&&s.phase==='main'&&(ownTurn===3||ownTurn===4)){
      const raid=raidState(packs,s,actor,legal);
      const tag=String(ownTurn);
      if(!Object.prototype.hasOwnProperty.call(colorsAtStart,tag)){
       colorsAtStart[tag]={...raid.colors};
       raidAtStart[tag]=raid.raidHand;
      }
      if(raid.raidHand.length)handRaidSeen++;
      if(raid.readyMaterial.length)matched++;
      if(raid.legalRaidTypes>0)legalRaidWindow++;
      if(action.type==='raid')playedRaid++;
      const skipped=raid.legalRaidTypes>0&&action.type==='next';
      if(skipped)missedLegalRaid++;
      if(action.type==='play'&&action.line==='energy'&&raid.readyMaterial.some(x=>x.shortfall>0)){
       const p=printed(packs[actor],s.players[actor].hand.find(c=>c.uid===action.uid));
       const isDifferent=raid.readyMaterial.some(x=>x.shortfall>0&&p?.color!==x.color);
       if(isDifferent)energyWrongColor++;
      }
      let alternative=null;
      if(action.type==='play'&&action.line==='energy')
       alternative=energyAlternatives(packs,s,actor,action,legal,raid);
      if(alternative)energyAlternative++;
      if(events.length<18&&(skipped||alternative||(raid.readyMaterial.length&&action.type==='next'))){
       const player=s.players[actor];
       events.push({ownTurn,step,life:player.life.length,oppLife:s.players[1-actor].life.length,
        ap:player.apCards.filter(c=>c?.ready).length,
        decision:{type:action.type,line:action.line||null,
         card:action.uid?printed(packs[actor],player.hand.find(c=>c.uid===action.uid))?.id||null:null},
        legalRaidTypes:raid.legalRaidTypes,readyMaterial:raid.readyMaterial,
        alternative,colors:raid.colors});
      }
     }
     s=dispatchUniversalAction(packs,s,action,{actor});
     counts[actor]++;step++;
    }
    const finished=s.status==='finished';
    results.push({deck:deck.id,seed,first,hybridSeat,hybridIsFirst:hybridSeat===first,
     hybridWon:finished&&s.winner===hybridSeat,finished,step,ownTurn,
     playedRaid,handRaidSeen,matched,legalRaidWindow,missedLegalRaid,
     energyWrongColor,energyAlternative,colorsAtStart,raidAtStart,events});
    console.log('RAID_GAME '+JSON.stringify({deck:deck.id,seed,first,hybridSeat,
     won:finished&&s.winner===hybridSeat,finished,step,
     playedRaid,matched,legalRaidWindow,missedLegalRaid,energyWrongColor,energyAlternative}));
   }catch(e){
    errors.push({deck:deck.id,seed,first,hybridSeat,step,error:e?.stack||String(e)});
    console.error('RAID_ERROR '+JSON.stringify(errors.at(-1)));
   }
  }
 }
}
function summary(rows){
 const count=rows.length,tot=(key)=>rows.reduce((n,x)=>n+(x[key]||0),0);
 return {games:count,wins:rows.filter(x=>x.hybridWon).length,
  loss:rows.filter(x=>!x.hybridWon).length,unfinished:rows.filter(x=>!x.finished).length,
  playedRaid:tot('playedRaid'),handRaidSeen:tot('handRaidSeen'),matched:tot('matched'),
  legalRaidWindow:tot('legalRaidWindow'),missedLegalRaid:tot('missedLegalRaid'),
  energyWrongColor:tot('energyWrongColor'),energyAlternative:tot('energyAlternative'),
  gamesWithAlternative:rows.filter(x=>x.energyAlternative>0).length};
}
const byDeck=Object.fromEntries(decks.map(d=>[d.id,
 {all:summary(results.filter(x=>x.deck===d.id)),
 wins:summary(results.filter(x=>x.deck===d.id&&x.hybridWon)),
 losses:summary(results.filter(x=>x.deck===d.id&&!x.hybridWon))}]));
const report={head:process.env.GITHUB_SHA,shard,notes:
 ['One-step alternative raid legality is not win advantage',
  'All decisions 48 nodes with disabled wall clock',
  'Observations use own hand and public board only',
  'A raid that is legally available but skipped may be a deliberate resource choice'],
 all:summary(results),byDeck,results,errors};
writeFileSync('raid-energy-turn34-shard-'+shard+'.json',JSON.stringify(report,null,2));
console.log('RAID_SUMMARY '+JSON.stringify({shard,all:report.all,byDeck,errors:errors.length}));
if(errors.length||report.all.unfinished)process.exitCode=1;
