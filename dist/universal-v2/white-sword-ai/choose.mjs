// Scores legal engine actions. Hidden information never reaches the weights.
// An illegal, throwing, or overdue model returns the existing hard action.
import {performance} from 'node:perf_hooks';
import {legalUniversalActions} from '../engine.mjs';
import {chooseUniversalAiAction} from '../ai.mjs';
import {chooseStrengthenedHardAction,lastHardAiTrace} from '../hard-ai.mjs';
import {
 BLEND_SCALE,BLEND_TIMEOUT_MS,HARD_OPTIONS,NEGATIVES,ORDER_KINDS,POLICY_TIMEOUT_MS
} from './constants.mjs';
import {catalogsOf} from './browser-catalogs.mjs';
import {policyVector,valueVector} from './features.mjs';
import {createModel,dot} from './browser-model.mjs';
import {observeActor} from './observe.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function mulberry32(seed){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
export function selectScored(rows){
 let best=rows[0];
 for(const row of rows.slice(1)){
  if(row.score>best.score+1e-12)best=row;
  else if(Math.abs(row.score-best.score)<=1e-12&&JSON.stringify(row.action)<JSON.stringify(best.action))best=row;
 }
 return best;
}
function referenceAction(pack,state,legal,seed){
 try{
  const action=chooseStrengthenedHardAction(pack,state,{...HARD_OPTIONS,seed});
  const exact=legal.find(item=>same(item,action));
  if(exact)return exact;
 }catch{/* the universal hard list is the next legal reference */}
 try{
  const action=chooseUniversalAiAction(pack,state,{difficulty:'hard'});
  const exact=legal.find(item=>same(item,action));
  if(exact)return exact;
 }catch{/* the reducer list itself is still legal */}
 return legal.find(item=>item.type==='next')||legal[0];
}
function finish(action,extra,started){
 return {action,ms:performance.now()-started,...extra};
}
export function chooseWhiteSwordAction(pack,state,options={}){
 const started=performance.now();
 const legal=legalUniversalActions(pack,state);
 const seat=options.actor??(state?.pending?.player??state?.active);
 if(!legal.length)return finish(null,{source:'fallback',reason:'no-legal'},started);
 if(legal.length===1)return finish(legal[0],{source:'forced',reason:'one-legal'},started);
 const seed=Number.isInteger(options.seed)?options.seed:1;
 const mode=options.mode||'policy';
 const timeout=options.timeoutMs??(mode==='blend'?BLEND_TIMEOUT_MS:POLICY_TIMEOUT_MS);
 try{
  if(options.forceError)throw Error('forced model failure');
  if(ORDER_KINDS.has(state?.pending?.kind)){
   return finish(referenceAction(pack,state,legal,seed),{source:'reference',reason:state.pending.kind},started);
  }
  const model=options.model||createModel();
  const observation=observeActor(pack,state,seat);
  const packs=catalogsOf(pack);
  const value=valueVector({observation,seat,catalogs:packs});
  const scored=legal.map(action=>({
   action,
   features:policyVector({observation,seat,action,legal,catalogs:packs}),
   score:0
  }));
  for(const row of scored)row.score=dot(model.policy,row.features);
  let picked;
  let source='model';
  if(mode==='blend'){
   const hardCap=Number.isFinite(options.hardCap)?options.hardCap:null;
   const blended=blendRows(pack,state,seat,legal,model,options.scale??BLEND_SCALE,seed,observation,packs,hardCap);
   if(!blended)throw Error('blend produced no legal action');
   picked=blended;
   source='blend';
  }else{
   const ranked=[...scored].sort((a,b)=>b.score-a.score||(JSON.stringify(a.action)<JSON.stringify(b.action)?-1:1));
   picked=ranked[0];
   const explore=Number(options.explore)||0;
   if(explore>0){
    const rng=mulberry32((seed+((options.step||0)*17)+(seat*97))>>>0);
    if(rng()<explore){
     const pool=ranked.slice(0,Math.min(4,ranked.length));
     picked=pool[Math.floor(rng()*pool.length)]||ranked[0];
    }
   }
  }
  if(performance.now()-started>timeout){
   return finish(referenceAction(pack,state,legal,seed),{source:'fallback',reason:'timeout'},started);
  }
  const exact=legal.find(item=>item===picked.action||same(item,picked.action));
  if(!exact)throw Error('model action is not legal');
  const negatives=scored.filter(row=>row.action!==exact).slice(0,NEGATIVES).map(row=>row.features);
  return finish(exact,{
   source,reason:null,version:model.version||null,
   chosen:picked.features,negatives,value
  },started);
 }catch(error){
  return finish(referenceAction(pack,state,legal,seed),{
   source:'fallback',reason:error?.message||'model-error'
  },started);
 }
}
export function withinHardCap(rows,hardAction,cap){
 if(!Number.isFinite(cap))return rows;
 const anchor=rows.find(row=>same(row.action,hardAction));
 const base=anchor?anchor.hardScore:Math.max(...rows.map(row=>row.hardScore));
 const allowed=rows.filter(row=>row.hardScore>=base-cap-1e-9);
 return allowed.length?allowed:rows;
}
function blendRows(pack,state,seat,legal,model,scale,seed,observation,packs,hardCap){
 const hard=chooseStrengthenedHardAction(pack,state,{...HARD_OPTIONS,seed});
 const trace=lastHardAiTrace();
 const rows=[];
 const seen=new Set();
 const add=(action,hardScore)=>{
  const exact=legal.find(item=>same(item,action));
  if(!exact)return;
  const key=JSON.stringify(exact);
  if(seen.has(key))return;
  seen.add(key);
  const features=policyVector({observation,seat,action:exact,legal,catalogs:packs});
  const search=Number(hardScore)||0;
  rows.push({action:exact,features,hardScore:search,score:search+scale*dot(model.policy,features)});
 };
 for(const row of trace?.candidates||[])add(row.action,row.score);
 add(hard,trace?.score);
 const pool=withinHardCap(rows,hard,hardCap);
 return pool.length?selectScored(pool):null;
}
