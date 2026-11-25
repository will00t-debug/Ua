// Collect visible positions from legal games. The stored rows are feature
// numbers and public action keys. Opponent hand, deck order and life stay out.
import {createHash} from 'node:crypto';
import {legalUniversalActions,dispatchUniversalAction} from '../../../../dist/universal-v2/engine.mjs';
import {cloneMatch,matchRules,newComparedMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {ORDER_KINDS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {catalogsOf} from '../../../../dist/universal-v2/white-sword-ai/browser-catalogs.mjs';
import {policyVector} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {observeActor} from '../../../../dist/universal-v2/white-sword-ai/observe.mjs';
import {scoreBlend,searchOnce} from '../../../../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../../../../dist/universal-v2/white-sword-ai/deck.mjs';
import {choiceKey,positionBucket} from '../../v4a/lib/diverge.mjs';
import {HARD_CAP,MINE,SCALE,STAGE_A_GATE,assertFreshPlan} from './protocol.mjs';
import {chooseKey} from './sensitivity.mjs';
import {combineSamples,consultTeacher} from './teacher.mjs';

const RULES=matchRules('official');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

function digest(value){
 return createHash('sha256').update(value).digest('hex').slice(0,16);
}
function visibleBand(pack,state,legal,seed,actor){
 const started=performance.now();
 const searched=searchOnce(pack,state,seed);
 const observation=observeActor(pack,state,actor);
 const catalogs=catalogsOf(pack);
 const trace=searched.trace;
 const rows=[];
 const seen=new Set();
 const add=(action,hardScore)=>{
  const exact=legal.find(item=>same(item,action));
  if(!exact)return;
  const key=choiceKey(exact);
  if(seen.has(key))return;
  seen.add(key);
  const features=policyVector({observation,seat:actor,action:exact,legal,catalogs});
  rows.push({key,sort:JSON.stringify(exact),hard:Number(hardScore)||0,features});
 };
 for(const row of trace?.candidates||[])add(row.action,row.score);
 add(searched.hard,trace?.score);
 const anchor=rows.find(row=>row.key===choiceKey(legal.find(item=>same(item,searched.hard))||searched.hard));
 const base=anchor?anchor.hard:Math.max(...rows.map(row=>row.hard),0);
 const band=rows.filter(row=>row.hard>=base-HARD_CAP-1e-9);
 return {searched,rows,band:band.length?band:rows,ms:performance.now()-started};
}
function signature(bucket,turn,band){
 const body=band.map(row=>row.key+':'+row.hard.toFixed(3)+':'+row.features.map(value=>value.toFixed(3)).join(',')).join('|');
 return digest(bucket+'/'+turn+'/'+body);
}
function hardGap(trace){
 const scores=(trace?.candidates||[]).map(row=>row.score).filter(Number.isFinite).sort((a,b)=>b-a);
 if(scores.length<2)return null;
 return scores[0]-scores[1];
}
function play(pack,state,legal,seed,actor){
 if(legal.length===1)return legal[0];
 if(ORDER_KINDS.has(state.pending?.kind)){
  const searched=searchOnce(pack,state,seed);
  return legal.find(item=>same(item,searched.hard))||legal[0];
 }
 const searched=searchOnce(pack,state,seed);
 return legal.find(item=>same(item,searched.hard))||legal[0];
}
export function minePositions({
 seeds,parent,holdout=false,maxSteps=MINE.maxSteps,maxBand=MINE.maxBand,
 perBucket=MINE.perBucket,teacherLimit=0,teacherNodes,minSeeds=1,log=()=>{}
}={}){
 assertFreshPlan(seeds||[],holdout?'holdout':'train');
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 const counts=[deck.counts,deck.counts];
 const positions=[];
 const seen=new Set();
 const countsByBucket={};
 let walked=0;
 let steps=0;
 let decisions=0;
 let multi=0;
 let bandSeen=0;
 let duplicates=0;
 let mismatches=0;
 let searchMs=0;
 let teacherCount=0;
 const teacherByBucket={};
 for(const seed of seeds||[]){
  const enough=positions.length>=maxBand
   &&Object.values(countsByBucket).filter(count=>count>=STAGE_A_GATE.minPerBucket).length>=STAGE_A_GATE.minBuckets
   &&walked>=minSeeds;
  if(enough)break;
  walked++;
  let state=newComparedMatch(packs,counts,seed,0,RULES);
  let lastKey='';
  let repeats=0;
  for(let step=0;step<maxSteps&&state.status==='playing';step++){
   steps++;
   const actor=state.pending?.player??state.active;
   const legal=legalUniversalActions(packs,state);
   if(!legal.length)throw Error('局面沒有合法動作');
   const loopKey=(state.pending?.kind||state.phase)+':'+state.turn+':'+actor+':'+legal.length;
   repeats=loopKey===lastKey?repeats+1:0;
   lastKey=loopKey;
   if(repeats>=12)break;
   const ordered=ORDER_KINDS.has(state.pending?.kind);
   let action;
   if(legal.length>1&&!ordered){
    decisions++;
    const viewed=visibleBand(packs,state,legal,seed,actor);
    searchMs+=viewed.ms;
    if(legal.length>=2)multi++;
    if(viewed.band.length>=2)bandSeen++;
    const bucket=positionBucket(state,actor,legal);
    const sign=signature(bucket,state.turn,viewed.band);
    const room=(countsByBucket[bucket]||0)<perBucket&&positions.length<maxBand;
    if(viewed.band.length>=2&&room){
     if(seen.has(sign))duplicates++;
     else{
      seen.add(sign);
      const champion=scoreBlend(packs,cloneMatch(state),legal,parent,seed,actor,viewed.searched,{scale:SCALE,hardCap:HARD_CAP});
      const predicted=chooseKey(viewed.band,parent.policy,SCALE);
      if(!champion.action||choiceKey(champion.action)!==predicted)mismatches++;
      const record={
       id:digest(seed+':'+step+':'+sign),
       seed,step,turn:state.turn,phase:state.phase,bucket,holdout,
       legalCount:legal.length,
       hardCandidates:(viewed.searched.trace?.candidates||[]).length,
       hardGap:hardGap(viewed.searched.trace),
       bandCount:viewed.band.length,
       hardChoice:choiceKey(viewed.searched.hard),
       v2Choice:champion.action?choiceKey(champion.action):null,
       band:viewed.band,
       teacher:null
      };
      if(teacherCount<teacherLimit&&(teacherByBucket[bucket]||0)<3){
       const first=consultTeacher(packs,state,seed,teacherNodes);
       const second=consultTeacher(packs,state,seed+997,teacherNodes);
       record.teacher=combineSamples([first,second],viewed.searched.hard,viewed.searched.trace,HARD_CAP);
       teacherCount++;
       teacherByBucket[bucket]=(teacherByBucket[bucket]||0)+1;
      }
      positions.push(record);
      countsByBucket[bucket]=(countsByBucket[bucket]||0)+1;
     }
    }
    action=legal.find(item=>same(item,viewed.searched.hard))||legal[0];
   }else action=play(packs,state,legal,seed,actor);
   const exact=legal.find(item=>same(item,action));
   if(!exact)throw Error('對局要打出不合法的動作');
   state=dispatchUniversalAction(packs,state,exact,{actor});
  }
  log((holdout?'保留':'訓練')+' seed '+seed+' 局面 '+positions.length);
 }
 return {
  holdout,positions,walked,steps,decisions,multi,bandSeen,duplicates,mismatches,
  meanSearchMs:decisions?searchMs/decisions:0,countsByBucket,seeds
 };
}
