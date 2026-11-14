// Fresh held-out mirrored A/B. Baseline is unchanged live hybrid-start-hard-v1.
// Candidate is offline-only and checks energy replacement when it opens a RAID.
// 48 nodes, clock-free; unchanged pairs MUST replay identically.
import {writeFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {preferRaidEnablingEnergy} from '../dist/universal-v2/ai-v3/raid-energy-candidate.mjs';
const shard=Number(process.env.SHARD||0),SEEDS=12,MAX_STEPS=1200;
const SETTINGS={nodes:48,ms:1e9,seed:1};
const decks=battleDecks().filter(d=>['white-sword','sword-art-online-raid'].includes(d.id));
if(decks.length!==2)throw Error('Missing White Sword or SAO Raid deck');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const actorOf=s=>s.pending?.player??s.active;
function choose(packs,s,step,actor,hybridSeat,phaseCount){
 const legal=legalUniversalActions(packs,s);
 const next=!s.pending?legal.find(a=>a.type==='next'):null;
 let picked=null;
 if(phaseCount>=72&&next)picked=next;
 else if(actor===hybridSeat){
  const requestId=step+1,stateVersion=step+1;
  const req=buildAiV3Request(packs,s,actor,{...SETTINGS,requestId,stateVersion,policy:HYBRID_START_HARD_POLICY});
  const result=req?handleAiV3Request(req):null;
  const accepted=acceptAiV3Result({requestId,stateVersion,actor,legal},result);
  if(!accepted.ok)throw Error('Hybrid illegal '+accepted.reason);
  picked=accepted.action;
 }else picked=chooseStrengthenedHardAction(packs,s,SETTINGS);
 const exact=legal.find(a=>same(a,picked));
 if(!exact)throw Error('Illegal chosen action '+(picked?.type||'null'));
 return {action:exact,legal};
}
function run(deck,initial,seed,first,hybridSeat,arm){
 const packs=[deck.pack,deck.pack];
 let s=structuredClone(initial),step=0,ownTurn=0,startTag=null;
 const phaseKey=['',''],phaseCounts=[0,0],events=[];
 let interventions=0,raidBefore=0,raidAfter=0,earlyEnergy=0;
 while(s.status==='playing'&&step<MAX_STEPS){
  const actor=actorOf(s);
  if(actor===hybridSeat&&s.phase==='start'&&!s.pending){
   const tag=s.turn+'|'+s.active;
   if(startTag!==tag){startTag=tag;ownTurn++;}
  }
  const current=s.turn+'|'+s.active+'|'+s.phase;
  if(phaseKey[actor]!==current){phaseKey[actor]=current;phaseCounts[actor]=0;}
  const selected=choose(packs,s,step,actor,hybridSeat,phaseCounts[actor]);
  let action=selected.action;
  if(actor===hybridSeat&&(ownTurn===3||ownTurn===4)){
   if(action.type==='raid')raidBefore++;
   if(action.type==='play'&&action.line==='energy')earlyEnergy++;
   if(arm==='B'){
    const candidate=preferRaidEnablingEnergy(packs,s,actor,action,selected.legal,ownTurn);
    if(candidate.changed){
     if(!selected.legal.some(a=>same(a,candidate.action)))throw Error('Candidate invalid');
     interventions++;
     if(events.length<12)events.push({
      ownTurn,step,reason:candidate.reason,chosenType:action.type,
      chosenLine:action.line,alternativeCard:candidate.cardId,
      life:s.players[actor].life.length,oppLife:s.players[1-actor].life.length,
      legalRaidBefore:selected.legal.filter(a=>a.type==='raid').length,
      newlyUnlocked:candidate.unlocked});
     action=candidate.action;
    }
   }
  }
  s=dispatchUniversalAction(packs,s,action,{actor});
  phaseCounts[actor]++;step++;
  if(actor===hybridSeat&&(ownTurn===3||ownTurn===4)&&action.type==='raid')raidAfter++;
 }
 const finished=s.status==='finished';
 return {deck:deck.id,seed,first,hybridSeat,arm,finished,
  hybridWon:finished&&s.winner===hybridSeat,
  steps:step,ownTurns:ownTurn,interventions,events,raidBefore,raidAfter,earlyEnergy,
  life:s.players.map(p=>p.life.length),endReason:s.endReason||null};
}
const pairs=[],errors=[];
for(const deck of decks){
 for(let i=0;i<SEEDS;i++){
  if(i%4!==shard)continue;
  const seed=(deck.id==='white-sword'?9800:9900)+i;
  const packs=[deck.pack,deck.pack];
  for(const first of [0,1])for(const hybridSeat of [0,1]){
   try{
    const opened=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],seed,first)).state;
    const A=run(deck,opened,seed,first,hybridSeat,'A');
    const B=run(deck,opened,seed,first,hybridSeat,'B');
    const changed=B.interventions>0;
    const inconsistent=!changed&&(A.hybridWon!==B.hybridWon||A.steps!==B.steps||
      A.raidAfter!==B.raidAfter);
    const row={deck:deck.id,seed,first,hybridSeat,A,B,changed,inconsistent};
    pairs.push(row);
    console.log('RAID_AB_PAIR '+JSON.stringify({deck:deck.id,seed,first,hybridSeat,
      aWon:A.hybridWon,bWon:B.hybridWon,changed,overrides:B.interventions,
      aRaid:A.raidAfter,bRaid:B.raidAfter,inconsistent}));
   }catch(e){
    const err={deck:deck.id,seed,first,hybridSeat,error:e?.stack||String(e)};
    errors.push(err);console.error('RAID_AB_ERROR '+JSON.stringify(err));
   }
  }
 }
}
function summary(xs){
 return {games:xs.length,wins:xs.filter(x=>x.hybridWon).length,
  losses:xs.filter(x=>x.finished&&!x.hybridWon).length,
  unfinished:xs.filter(x=>!x.finished).length,
  overrides:xs.reduce((s,x)=>s+x.interventions,0),
  raids:xs.reduce((s,x)=>s+x.raidAfter,0),
  earlyEnergy:xs.reduce((s,x)=>s+x.earlyEnergy,0)};
}
const affected=pairs.filter(p=>p.changed);
const report={shard,head:process.env.GITHUB_SHA,
 note:'Held-out pairs with fixed nodes; baseline is unchanged. No live import.',
 byDeck:Object.fromEntries(decks.map(deck=>[deck.id,{
  A:summary(pairs.filter(p=>p.deck===deck.id).map(p=>p.A)),
  B:summary(pairs.filter(p=>p.deck===deck.id).map(p=>p.B)),
  affected:pairs.filter(p=>p.deck===deck.id&&p.changed).length}])),
 A:summary(pairs.map(p=>p.A)),B:summary(pairs.map(p=>p.B)),
 affected:{pairs:affected.length,aWins:affected.filter(p=>p.A.hybridWon).length,
  bWins:affected.filter(p=>p.B.hybridWon).length,
  improvements:affected.filter(p=>!p.A.hybridWon&&p.B.hybridWon).length,
  regressions:affected.filter(p=>p.A.hybridWon&&!p.B.hybridWon).length},
 inconsistentUnchanged:pairs.filter(p=>p.inconsistent).length,pairs,errors};
writeFileSync('raid-energy-ab-shard-'+shard+'.json',JSON.stringify(report,null,2));
console.log('RAID_AB_SUMMARY '+JSON.stringify({shard,A:report.A,B:report.B,byDeck:report.byDeck,
 affected:report.affected,inconsistentUnchanged:report.inconsistentUnchanged,
 errors:errors.length}));
if(errors.length||report.inconsistentUnchanged||report.A.unfinished||report.B.unfinished)
 process.exitCode=1;
