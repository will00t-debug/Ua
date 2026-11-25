// Legal games and paired continuations. Models only receive visible features.
// The simulator keeps the real cards so the rules can resolve.
import {createHash} from 'node:crypto';
import {legalUniversalActions,dispatchUniversalAction} from '../../../../dist/universal-v2/engine.mjs';
import {cloneMatch,matchRules,newComparedMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {HARD_OPTIONS,LOOP_LIMIT,ORDER_KINDS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseStrengthenedHardAction} from '../../../../dist/universal-v2/hard-ai.mjs';
import {catalogsOf} from '../../../../dist/universal-v2/white-sword-ai/browser-catalogs.mjs';
import {policyVector} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {observeActor} from '../../../../dist/universal-v2/white-sword-ai/observe.mjs';
import {searchOnce} from '../../../../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../../../../dist/universal-v2/white-sword-ai/deck.mjs';
import {positionKey} from '../../../../dist/universal-v2/white-sword-ai/runner.mjs';
import {choiceKey,positionBucket} from '../../v4a/lib/diverge.mjs';
import {blendScore} from '../../v4a2/lib/sensitivity.mjs';
import {HARD_CAP,MINE_SEEDS,ROLLOUT_STEPS,SCALE,assertFreshPlan} from './protocol.mjs';

const RULES=matchRules('official');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
function matchAction(legal,action){
 const exact=legal.find(item=>same(item,action));
 if(exact)return exact;
 const key=choiceKey(action);
 const hits=legal.filter(item=>choiceKey(item)===key);
 return hits.length===1?hits[0]:null;
}

function digest(value){
 return createHash('sha256').update(value).digest('hex').slice(0,16);
}
function packsOf(decks){
 return decks.map(id=>getDeck(id).pack);
}
function bandOf(pack,state,legal,seed,actor){
 const searched=searchOnce(pack,state,seed);
 const observation=observeActor(pack,state,actor);
 const catalogs=catalogsOf(pack);
 const rows=[];
 const seen=new Set();
 const add=(action,hard)=>{
  const exact=legal.find(item=>same(item,action));
  if(!exact)return;
  const key=choiceKey(exact);
  if(seen.has(key))return;
  seen.add(key);
  rows.push({
   key,hard:Number(hard)||0,
   features:policyVector({observation,seat:actor,action:exact,legal,catalogs}),
   action:exact
  });
 };
 for(const row of searched.trace?.candidates||[])add(row.action,row.score);
 add(searched.hard,searched.trace?.score);
 const anchor=rows.find(row=>row.key===choiceKey(legal.find(item=>same(item,searched.hard))||searched.hard));
 const base=anchor?anchor.hard:Math.max(...rows.map(row=>row.hard),0);
 const band=rows.filter(row=>row.hard>=base-HARD_CAP-1e-9);
 const play=legal.find(item=>same(item,searched.hard))||legal.find(item=>item.type==='next')||legal[0];
 return {band:band.length?band:rows,play};
}
function pairOf(band,policy){
 const scored=band.map(row=>({...row,blend:blendScore(row.hard,policy,row.features,SCALE)}));
 scored.sort((left,right)=>right.blend-left.blend||(left.key<right.key?-1:1));
 return {actionA:scored[0],actionB:scored[1],gap:scored[0].blend-scored[1].blend};
}
function hardAction(pack,state,legal,seed){
 const action=chooseStrengthenedHardAction(pack,state,{...HARD_OPTIONS,seed});
 return legal.find(item=>same(item,action))||legal.find(item=>item.type==='next')||legal[0];
}
export function minePool({parent,maxSteps=200,perBucket=12,seeds=null,log=()=>{}}={}){
 const plan=seeds||MINE_SEEDS;
 const flat=Object.values(plan).flat();
 assertFreshPlan(flat,'mine');
 const positions=[];
 const counts={};
 let games=0;
 let decisions=0;
 for(const [opponent,list] of Object.entries(plan)){
  const white=getDeck('white-sword');
  const other=getDeck(opponent);
  const packs=[white.pack,other.pack];
  const countsPair=[white.counts,other.counts];
  for(const seed of list){
   if(Object.values(counts).every(count=>count>=perBucket)&&Object.keys(counts).length>=7)break;
   games++;
   const first=seed%2;
   let state=newComparedMatch(packs,countsPair,seed,first,RULES);
   let last='';
   let repeats=0;
   for(let step=0;step<maxSteps&&state.status==='playing';step++){
    const actor=state.pending?.player??state.active;
    const legal=legalUniversalActions(packs,state);
    if(!legal.length)throw Error('挖掘走到沒有合法動作的局面');
    const loop=positionKey(state);
    repeats=loop===last?repeats+1:0;
    last=loop;
    if(repeats>=LOOP_LIMIT)break;
    const ordered=ORDER_KINDS.has(state.pending?.kind);
    let action;
    if(actor===0&&legal.length>1&&!ordered){
     decisions++;
     const viewed=bandOf(packs,state,legal,seed,actor);
     const bucket=positionBucket(state,actor,legal);
     if(viewed.band.length>=2&&(counts[bucket]||0)<perBucket){
      const pair=pairOf(viewed.band,parent.policy);
      positions.push({
       id:digest(opponent+':'+seed+':'+step),
       seed,first,step,actor,turn:state.turn,phase:state.phase,bucket,
       opponent,decks:['white-sword',opponent],
       legalCount:legal.length,bandCount:viewed.band.length,gap:pair.gap,
       actionA:publicAction(pair.actionA),
       actionB:publicAction(pair.actionB),
       band:viewed.band.map(row=>({key:row.key,hard:row.hard,features:row.features}))
      });
      counts[bucket]=(counts[bucket]||0)+1;
     }
     action=viewed.play;
    }else action=hardAction(packs,state,legal,seed);
    state=dispatchUniversalAction(packs,state,action,{actor});
   }
   log('挖掘 '+opponent+' '+seed+' 局面 '+positions.length);
  }
 }
 return {positions,counts,games,decisions,seeds:flat};
}
function publicAction(row){
 return {key:row.key,hard:row.hard,features:row.features,action:row.action};
}
export function replayState(position){
 const decks=position.decks;
 const packs=packsOf(decks);
 const counts=decks.map(id=>getDeck(id).counts);
 let state=newComparedMatch(packs,counts,position.seed,position.first,RULES);
 for(let step=0;step<position.step&&state.status==='playing';step++){
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  const action=hardAction(packs,state,legal,position.seed);
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 return {packs,state};
}
export function finishFromAction({decks,state,actor,action,seed,maxSteps=ROLLOUT_STEPS}={}){
 const packs=packsOf(decks);
 const legal=legalUniversalActions(packs,state);
 const exact=matchAction(legal,action);
 if(!exact)return {status:'illegal',winner:null,steps:0,finished:false,error:'action left the legal list'};
 let cursor;
 try{cursor=dispatchUniversalAction(packs,cloneMatch(state),exact,{actor});}
 catch(error){return {status:'error',winner:null,steps:0,finished:false,error:error.message};}
 let steps=1;
 let last='';
 let repeats=0;
 while(cursor.status==='playing'&&steps<maxSteps){
  const who=cursor.pending?.player??cursor.active;
  let options;
  try{options=legalUniversalActions(packs,cursor);}
  catch(error){return {status:'error',winner:null,steps,finished:false,error:error.message};}
  if(!options.length)return {status:'illegal',winner:null,steps,finished:false,error:'no legal action'};
  const loop=positionKey(cursor);
  repeats=loop===last?repeats+1:0;
  last=loop;
  if(repeats>=LOOP_LIMIT)return {status:'dead-loop',winner:null,steps,finished:false,error:'repeated position'};
  let picked;
  try{picked=chooseStrengthenedHardAction(packs,cursor,{...HARD_OPTIONS,seed});}
  catch(error){return {status:'error',winner:null,steps,finished:false,error:error.message};}
  const next=options.find(item=>same(item,picked));
  if(!next)return {status:'illegal',winner:null,steps,finished:false,error:'search left the legal list'};
  try{cursor=dispatchUniversalAction(packs,cursor,next,{actor:who});}
  catch(error){return {status:'error',winner:null,steps,finished:false,error:error.message};}
  steps++;
 }
 const finished=cursor.status==='finished'&&(cursor.winner===0||cursor.winner===1);
 return {
  status:cursor.status,winner:finished?cursor.winner:null,steps,finished,
  endReason:finished?cursor.endReason:'unfinished'
 };
}
