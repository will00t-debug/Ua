// Turn-3/4 raid-energy counterfactual on 23 pinned decision states.
// Frozen 48-node clock-free AI. Alternative legal energy placements are
// compared FROM EXACT SAME STATE until the next own START or terminal.
// Own hand + public board are logged; opponent hidden data/deck/LIFE order
// never appear in artifacts. Full-state SHA256 lets the fixture be verified.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {applySharedOpening,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {buildAiV3Request,handleAiV3Request,acceptAiV3Result} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {HYBRID_START_HARD_POLICY} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,universalBp,effectiveHandRequiredEnergy} from '../dist/universal-v2/engine.mjs';

const manifest=JSON.parse(readFileSync(new URL('../audit/ai-v3-raid-energy-counterfactual-manifest-20261114.json',import.meta.url),'utf8'));
const shard=Number(process.env.SHARD||0);
const deckPool=battleDecks(),DECKS=new Map(deckPool.map(x=>[x.id,x]));
const SETTINGS={nodes:48,ms:1e9,seed:1};
const maxSteps=1200,maxFutureSteps=220;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=state=>createHash('sha256').update(JSON.stringify(state)).digest('hex');
const actorOf=s=>s.pending?.player??s.active;
const squash=value=>String(value||'').replace(/\s+/g,'');
const printed=(packs,actor,card)=>card?packs[actor].cards[card.cardId]||null:null;
const safeColors=(packs,state,actor)=>{try{return universalEnergyByColor(packs,state,actor)||{};}catch{return {};}};
const bp=(packs,state,card)=>{try{return card?universalBp(packs,state,card)||0:0;}catch{return 0;}};
const handBody=(s,actor,uid)=>s.players[actor].hand.find(c=>c?.uid===uid);
const cardId=(packs,s,actor,uid)=>printed(packs,actor,handBody(s,actor,uid))?.id||null;
const distinctRaidCount=actions=>new Set(actions.filter(a=>a.type==='raid').map(a=>a.uid)).size;

function fixedAction(packs,state,step,hybridSeat,phaseCounts,phaseKeys){
 const actor=actorOf(state);
 const key=state.turn+'|'+state.active+'|'+state.phase;
 if(phaseKeys[actor]!==key){phaseKeys[actor]=key;phaseCounts[actor]=0;}
 const legal=legalUniversalActions(packs,state);
 const next=!state.pending?legal.find(a=>a.type==='next'):null;
 let choice=null;
 if(phaseCounts[actor]>=72&&next)choice=next;
 else if(actor===hybridSeat){
  const requestId=step+1,stateVersion=step+1;
  const req=buildAiV3Request(packs,state,actor,{...SETTINGS,requestId,stateVersion,policy:HYBRID_START_HARD_POLICY});
  const result=req?handleAiV3Request(req):null;
  const accepted=acceptAiV3Result({requestId,stateVersion,actor,legal},result);
  if(!accepted.ok)throw Error('Hybrid invalid '+accepted.reason+' at step '+step);
  choice=accepted.action;
 }else choice=chooseStrengthenedHardAction(packs,state,SETTINGS);
 const exact=legal.find(a=>same(a,choice));
 if(!exact)throw Error('AI invalid '+(choice?.type||'null')+' step '+step);
 phaseCounts[actor]++;
 return {action:exact,actor,legal};
}
function raidInventory(packs,s,actor){
 const mine=s.players[actor],colors=safeColors(packs,s,actor),catalog=packs[actor].cards;
 const boards=[...mine.front,...mine.energy].filter(Boolean),out=[];
 for(const card of mine.hand){
  const def=printed(packs,actor,card);
  if(!def?.raidName)continue;
  const needs=new Set([def.raidName,...(def.raidBaseNames||[])].map(squash));
  const materials=boards.filter(c=>needs.has(squash(catalog[c.cardId]?.name)));
  let required=Number(def.energy)||0;
  try{required=effectiveHandRequiredEnergy(packs,s,actor,def,card);}
  catch{/* use printed energy only as a fallback */}
  out.push({id:def.id,required,have:colors[def.color]||0,
   hasMaterial:materials.length>0,materialCount:materials.length,
   payable:required<=(colors[def.color]||0)});
 }
 return {raidInHand:out.length,matched:out.filter(x=>x.hasMaterial).length,
  matchedAndPayable:out.filter(x=>x.hasMaterial&&x.payable).length,details:out};
}
function snapshot(packs,s,actor){
 const mine=s.players[actor],opp=s.players[1-actor];
 return {
  stage:{status:s.status,phase:s.phase,turn:s.turn,active:s.active,pending:s.pending?.kind||null},
  life:[mine.life.length,opp.life.length],
  front:{ownBodies:mine.front.filter(Boolean).length,own4000:mine.front.filter(c=>c&&bp(packs,s,c)>=4000).length,
   ownReady4000:mine.front.filter(c=>c?.ready&&bp(packs,s,c)>=4000).length,
   opponentBodies:opp.front.filter(Boolean).length,opponent4000:opp.front.filter(c=>c&&bp(packs,s,c)>=4000).length},
  colors:safeColors(packs,s,actor),
  handSize:mine.hand.length,apReady:mine.apCards.filter(c=>c?.ready).length,
  raid:raidInventory(packs,s,actor)
 };
}
function rootPublic(packs,s,actor,legal){
 const mine=s.players[actor];
 return {
  life:s.players.map(p=>p.life.length),
  ownHand:mine.hand.map(c=>{const def=printed(packs,actor,c);return {id:def?.id||c.cardId,color:def?.color,
   bp:def?.bp||0,cost:def?.energy||0,gen:def?.gen||0,type:def?.type};}),
  ownFront:mine.front.filter(Boolean).map(c=>({id:c.cardId,bp:bp(packs,s,c),ready:c.ready})),
  ownEnergy:mine.energy.filter(Boolean).map(c=>({id:c.cardId,ready:c.ready})),
  oppFront:s.players[1-actor].front.filter(Boolean).map(c=>({id:c.cardId,bp:bp(packs,s,c),ready:c.ready})),
  colors:safeColors(packs,s,actor),lifeOwn:mine.life.length,
  lifeOpp:s.players[1-actor].life.length,
  readyAp:mine.apCards.filter(c=>c?.ready).length,
  legalRaidCount:distinctRaidCount(legal),
  raidInventory:raidInventory(packs,s,actor)
 };
}
function immediateRaid(packs,origin,actor,action){
 const s=dispatchUniversalAction(packs,structuredClone(origin),action,{actor});
 const legal=s.status==='playing'&&!s.pending&&s.phase==='main'?legalUniversalActions(packs,s):[];
 return {count:distinctRaidCount(legal),pending:s.pending?.kind||null,
  ap:s.players[actor].apCards.filter(c=>c?.ready).length,
  colors:safeColors(packs,s,actor)};
}
function alternatives(packs,origin,actor,selected,legal,manifestRow){
 const baseline=immediateRaid(packs,origin,actor,selected);
 const seen=new Set();
 const candidates=[];
 for(const action of legal){
  if(action.type!=='play'||action.line!=='energy'||same(action,selected))continue;
  const id=cardId(packs,origin,actor,action.uid);
  if(!manifestRow.alternatives.includes(id))continue;
  const post=immediateRaid(packs,origin,actor,action);
  if(post.count<=baseline.count)continue;
  const key=action.uid+'|'+action.slot;
  if(seen.has(key))continue;
  seen.add(key);
  candidates.push({action,cardId:id,post});
 }
 candidates.sort((a,b)=>b.post.count-a.post.count
   ||b.post.ap-a.post.ap
   ||String(a.cardId).localeCompare(String(b.cardId))
   ||Number(a.action.slot||0)-Number(b.action.slot||0));
 const chosen=[],seenCards=new Set();
 for(const candidate of candidates){
  // Two distinct physical hand cards, or one card with one best placement.
  if(seenCards.has(candidate.action.uid))continue;
  seenCards.add(candidate.action.uid);
  chosen.push(candidate);
  if(chosen.length===2)break;
 }
 return {baseline,allEligible:candidates.length,choices:chosen};
}
function continuation(packs,origin,actor,initialAction,originStep,originPhaseKeys,originPhaseCounts){
 const startTurn=origin.turn;
 let s=dispatchUniversalAction(packs,structuredClone(origin),initialAction,{actor});
 let steps=1,raidThisTurn=0,ownTurnEnd=null,finish='unknown',error=null;
 const phaseKeys=[...originPhaseKeys],phaseCounts=[...originPhaseCounts];
 // The initial action is already chosen by fixedAction and counted in these
 // counters. Do not count the same decision a second time.
 try{
  while(s.status==='playing'&&steps<maxFutureSteps){
   if(s.active===actor&&s.phase==='start'&&!s.pending&&s.turn>startTurn){
    finish='next-own-start';
    break;
   }
   const picked=fixedAction(packs,s,originStep+steps,actor,phaseCounts,phaseKeys);
   if(picked.actor===actor&&picked.action.type==='raid'&&s.turn===startTurn)raidThisTurn++;
   const before=s;
   s=dispatchUniversalAction(packs,s,picked.action,{actor:picked.actor});
   if(!ownTurnEnd&&before.active===actor&&s.active!==actor)
    ownTurnEnd=snapshot(packs,s,actor);
   steps++;
  }
  if(s.status!=='playing'){
   finish=s.winner===actor?'terminal-win':'terminal-loss';
  }else if(steps>=maxFutureSteps)finish='step-limit';
 }catch(e){finish='error';error=e?.stack||String(e);}
 return {finish,steps,raidThisTurn,ownTurnEnd,next:snapshot(packs,s,actor),
  // Same full state is compared via digest but hidden cards are not exposed.
  finalHash:hash(s),error};
}
function compare(a,b){
 const old=a.next,cur=b.next;
 const colorDelta={};
 for(const color of new Set([...Object.keys(old.colors),...Object.keys(cur.colors)]))
  colorDelta[color]=(cur.colors[color]||0)-(old.colors[color]||0);
 const lifeOwn=cur.life[0]-old.life[0];
 const lifeOpp=old.life[1]-cur.life[1];
 const front4000=cur.front.own4000-old.front.own4000;
 const raidMaterial=cur.raid.matchedAndPayable-old.raid.matchedAndPayable;
 const ownHand=cur.handSize-old.handSize;
 const gotNext=b.finish==='next-own-start',baseNext=a.finish==='next-own-start';
 return {lifeOwn,lifeOpp,front4000,raidMaterial,ownHand,
  raidPerformedThisTurn:b.raidThisTurn-a.raidThisTurn,
  energyColorDelta:colorDelta,
  sameStage:a.finish===b.finish,
  bothReachedNextStart:gotNext&&baseNext,
  atLeastOneTerminal:a.finish.startsWith('terminal')||b.finish.startsWith('terminal')};
}
function reconstruct(caseRow){
 const deck=DECKS.get(caseRow.deck);
 if(!deck)throw Error('Unknown deck '+caseRow.deck);
 const packs=[deck.pack,deck.pack];
 let s=applySharedOpening(packs,newComparedMatch(packs,[deck.counts,deck.counts],caseRow.seed,caseRow.first)).state;
 let step=0,ownTurn=0,startTag=null,keys=['',''],counts=[0,0];
 while(s.status==='playing'&&step<=caseRow.step&&step<maxSteps){
  const actor=actorOf(s);
  if(actor===caseRow.hybridSeat&&s.phase==='start'&&!s.pending){
   const tag=s.turn+'|'+s.active;
   if(tag!==startTag){startTag=tag;ownTurn++;}
  }
  const picked=fixedAction(packs,s,step,caseRow.hybridSeat,counts,keys);
  if(step===caseRow.step){
   const selectedId=cardId(packs,s,actor,picked.action.uid);
   if(actor!==caseRow.hybridSeat||ownTurn!==caseRow.ownTurn||
    picked.action.type!=='play'||picked.action.line!=='energy'||
    selectedId!==caseRow.selectedCard){
    throw Error('Pinned step did not match '+caseRow.caseId+
     ' actual='+JSON.stringify({actor,ownTurn,step,type:picked.action.type,
      line:picked.action.line,card:selectedId}));
   }
   const alt=alternatives(packs,s,actor,picked.action,picked.legal,caseRow);
   if(!alt.choices.length)throw Error('No verified alternative '+caseRow.caseId);
   const publicView=rootPublic(packs,s,actor,picked.legal);
   const fullHash=hash(s);
   const original=continuation(packs,s,actor,picked.action,step,keys,counts);
   const repeat=continuation(packs,s,actor,picked.action,step,keys,counts);
   if(original.finalHash!==repeat.finalHash||original.finish!==repeat.finish)
    throw Error('Unstable baseline replay at '+caseRow.caseId);
   const branches=[];
   for(const candidate of alt.choices){
    const outcome=continuation(packs,s,actor,candidate.action,step,keys,counts);
    branches.push({alternative:{id:candidate.cardId,slot:candidate.action.slot,
      postRaidTypes:candidate.post.count,postColors:candidate.post.colors},
      outcome,change:compare(original,outcome)});
   }
   return {caseId:caseRow.caseId,deck:caseRow.deck,seed:caseRow.seed,first:caseRow.first,
    hybridSeat:caseRow.hybridSeat,step,ownTurn,sourceSha:manifest.sourceSha,fullStateSha256:fullHash,
    root:publicView,originalChoice:{id:caseRow.selectedCard,slot:picked.action.slot,
     postRaidTypes:alt.baseline.count,postColors:alt.baseline.colors},
    eligibleAlternatives:alt.allEligible,baseline:original,branches,
    reproducible:true};
  }
  s=dispatchUniversalAction(packs,s,picked.action,{actor:picked.actor});
  step++;
 }
 throw Error('Could not replay case '+caseRow.caseId+' stopped at '+step);
}
const rows=[],errors=[];
for(let i=0;i<manifest.cases.length;i++){
 if(i%4!==shard)continue;
 const c=manifest.cases[i];
 try{
  const row=reconstruct(c);
  rows.push(row);
  console.log('COUNTERFACTUAL_CASE '+JSON.stringify({caseId:c.caseId,deck:c.deck,seed:c.seed,
   step:c.step,ownTurn:c.ownTurn,alt:row.branches.length,
   baselineEnd:row.baseline.finish,
   differences:row.branches.map(x=>({
    card:x.alternative.id,slot:x.alternative.slot,
    outcome:x.outcome.finish,raidDelta:x.change.raidPerformedThisTurn,
    ownLifeDelta:x.change.lifeOwn,oppLifeDelta:x.change.lifeOpp,
    front4000Delta:x.change.front4000}))}));
 }catch(e){
  const problem={caseId:c.caseId,deck:c.deck,seed:c.seed,step:c.step,error:e?.stack||String(e)};
  errors.push(problem);
  console.error('COUNTERFACTUAL_ERROR '+JSON.stringify(problem));
 }
}
const branches=rows.flatMap(r=>r.branches.map(b=>({...b,caseId:r.caseId,deck:r.deck})));
const result={shard,version:'raid-energy-next-own-start-v1',source:manifest.sourceRun,
 casesExpected:manifest.cases.filter((_,i)=>i%4===shard).length,
 cases:rows.length,branches:branches.length,
 toNextStart:branches.filter(x=>x.change.bothReachedNextStart).length,
 branchTerminal:branches.filter(x=>x.change.atLeastOneTerminal).length,
 branchUnfinished:branches.filter(x=>x.outcome.finish==='error'||x.outcome.finish==='step-limit').length,
 positiveOwnLife:branches.filter(x=>x.change.lifeOwn>0).length,
 negativeOwnLife:branches.filter(x=>x.change.lifeOwn<0).length,
 gainedRaidUse:branches.filter(x=>x.change.raidPerformedThisTurn>0).length,
 lostRaidUse:branches.filter(x=>x.change.raidPerformedThisTurn<0).length,
 rows,errors};
writeFileSync('raid-energy-counterfactual-shard-'+shard+'.json',JSON.stringify(result,null,2));
console.log('COUNTERFACTUAL_SUMMARY '+JSON.stringify({shard,cases:result.cases,
 branches:result.branches,toNextStart:result.toNextStart,branchTerminal:result.branchTerminal,
 branchUnfinished:result.branchUnfinished,positiveOwnLife:result.positiveOwnLife,
 negativeOwnLife:result.negativeOwnLife,gainedRaidUse:result.gainedRaidUse,
 lostRaidUse:result.lostRaidUse,errors:errors.length}));
if(errors.length||result.cases!==result.casesExpected||result.branchUnfinished)
 process.exitCode=1;
