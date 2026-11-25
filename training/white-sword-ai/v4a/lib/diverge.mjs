// Show that mutated policies can choose different legal actions on one visible state.
// The probe never reads an opponent hand, an unrevealed LIFE card, or a deck order.
import {legalUniversalActions,dispatchUniversalAction} from '../../../../dist/universal-v2/engine.mjs';
import {cloneMatch,matchRules,newComparedMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {ORDER_KINDS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {scoreBlend,searchOnce} from '../../../../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../../../../dist/universal-v2/white-sword-ai/deck.mjs';
import {actionKey} from '../../../../dist/universal-v2/white-sword-ai/runner.mjs';
import {HARD_CAP,SCALE} from './protocol.mjs';

const RULES=matchRules('official');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function choiceKey(action){
 const key=actionKey(0,action);
 return JSON.stringify({type:key.type,mode:key.mode,line:key.line,uid:key.uid,baseUid:key.baseUid,targetUid:key.targetUid,slot:key.slot});
}
function distinct(choices){
 return [...new Set(Object.values(choices||{}))].length>1;
}
function publicChoice(key){
 try{
  const parsed=JSON.parse(key);
  return [parsed.type,parsed.mode,parsed.line].filter(Boolean).join(':');
 }catch{return 'unknown';}
}
export function positionBucket(state,actor,legal){
 const own=state.players[actor];
 const foe=state.players[1-actor];
 const late=(own.life.length+foe.life.length)<=4||state.turn>=8;
 const types=new Set((legal||[]).map(action=>action.type));
 const attack=types.has('attack')||types.has('chooseBlock')||state.phase==='attack'||state.pending?.kind==='block';
 if(late&&attack)return 'late-pressure';
 if(attack)return 'attack-defense';
 if(types.has('raid'))return 'raid';
 if((legal||[]).some(action=>action.type==='activate'||action.mode==='oncePay'))return 'ap';
 if(types.has('move')||state.phase==='move')return 'line-move';
 if(state.turn<=2)return 'early-energy';
 if((legal||[]).some(action=>action.type==='play'&&action.line==='front'))return 'mid-entry';
 return 'mid-entry';
}
export function summarizeDisagreement(rows){
 const usable=(rows||[]).filter(row=>(row.legal??0)>=2||(row.band??0)>=2);
 let disagreed=0;
 let versus=0;
 let versusSeen=0;
 let pairDisagree=0;
 let pairCount=0;
 const byPhase={};
 const byCandidate={};
 const examples=[];
 for(const row of usable){
  const choices=row.choices||{};
  const values=[...new Set(Object.values(choices))];
  const different=values.length>1;
  if(different){
   disagreed++;
   if(examples.length<5)examples.push({
    seed:row.seed,step:row.step,band:row.band,bucket:row.bucket||null,
    choices:Object.fromEntries(Object.entries(choices).map(([id,key])=>[id,publicChoice(key)]))
   });
  }
  const bucket=row.bucket||'unlabeled';
  byPhase[bucket]??={positions:0,disagreed:0};
  byPhase[bucket].positions++;
  if(different)byPhase[bucket].disagreed++;
  const ids=Object.keys(choices);
  if(Object.hasOwn(choices,'champion')){
   versusSeen++;
   const champion=choices.champion;
   let any=false;
   for(const id of ids){
    if(id==='champion')continue;
    byCandidate[id]??={compared:0,differed:0};
    byCandidate[id].compared++;
    if(choices[id]!==champion){
     byCandidate[id].differed++;
     any=true;
    }
   }
   if(any)versus++;
  }
  const others=ids.filter(id=>id!=='champion');
  for(let i=0;i<others.length;i++){
   for(let j=i+1;j<others.length;j++){
    pairCount++;
    if(choices[others[i]]!==choices[others[j]])pairDisagree++;
   }
  }
 }
 for(const bucket of Object.values(byPhase))bucket.rate=bucket.positions?bucket.disagreed/bucket.positions:0;
 for(const row of Object.values(byCandidate))row.rate=row.compared?row.differed/row.compared:0;
 const band=usable.filter(row=>(row.band??0)>=2);
 const bandDisagreed=band.filter(row=>distinct(row.choices)).length;
 return {
  positions:usable.length,
  disagreed,
  rate:usable.length?disagreed/usable.length:0,
  bandPositions:band.length,
  bandDisagreed,
  bandRate:band.length?bandDisagreed/band.length:0,
  versusChampion:versusSeen?versus/versusSeen:null,
  pairwise:pairCount?pairDisagree/pairCount:null,
  byPhase,byCandidate,examples
 };
}
export function probeDivergence({candidates,champion,seeds,maxSteps=180,maxPositions=12,log=()=>{}}={}){
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 const counts=[deck.counts,deck.counts];
 const rows=[];
 const fallbackIds=new Set();
 let walked=0;
 let steps=0;
 const models=[{id:'champion',model:champion},...(candidates||[]).map(candidate=>({id:candidate.id,model:candidate.model}))];
 for(const seed of seeds||[]){
  if(rows.length>=maxPositions)break;
  walked++;
  let state=newComparedMatch(packs,counts,seed,0,RULES);
  let lastKey='';
  let repeats=0;
  for(let step=0;step<maxSteps&&state.status==='playing'&&rows.length<maxPositions;step++){
   steps++;
   const actor=state.pending?.player??state.active;
   const legal=legalUniversalActions(packs,state);
   if(!legal.length)throw Error('Probe found a state with no legal action');
   const loopKey=JSON.stringify(state.pending?.kind||state.phase)+':'+state.turn+':'+actor+':'+legal.length+':'+(state.pending?.sourceUid||'');
   repeats=loopKey===lastKey?repeats+1:0;
   lastKey=loopKey;
   if(repeats>=12)break;
   const kind=state.pending?.kind;
   const ordered=ORDER_KINDS.has(kind);
   let played;
   if(legal.length===1)played={action:legal[0],source:'forced'};
   else if(actor!==0||ordered){
    const searched=searchOnce(packs,state,seed);
    played={action:searched.hard,source:'hard-search-2'};
   }else{
    const searched=searchOnce(packs,state,seed);
    const snapshot=cloneMatch(state);
    const choices={};
    const sources={};
    let band=0;
    const anchor=(searched.trace?.candidates||[]).find(row=>same(row.action,searched.hard));
    if(anchor)band=(searched.trace.candidates||[]).filter(row=>row.score>=anchor.score-HARD_CAP-1e-9).length;
    for(const entry of models){
     const picked=scoreBlend(packs,snapshot,legal,entry.model,seed,actor,searched,{scale:SCALE,hardCap:HARD_CAP});
     choices[entry.id]=choiceKey(picked.action);
     sources[entry.id]=picked.source;
     if(picked.source==='fallback')fallbackIds.add(entry.id);
    }
    rows.push({
     seed,step,turn:state.turn,bucket:positionBucket(state,actor,legal),
     band,legal:legal.length,choices,sources
    });
    played=scoreBlend(packs,state,legal,champion,seed,actor,searched,{scale:SCALE,hardCap:HARD_CAP});
   }
   const action=legal.find(item=>same(item,played.action));
   if(!action)throw Error('Probe action is not legal');
   state=dispatchUniversalAction(packs,state,action,{actor});
  }
  log('probe seed '+seed+' positions '+rows.length);
 }
 const summary=summarizeDisagreement(rows);
 summary.walked=walked;
 summary.steps=steps;
 summary.fallbackIds=[...fallbackIds];
 summary.seeds=seeds;
 return summary;
}
