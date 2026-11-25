// One extra action column. v2's 115 weights stay frozen.
// The bonus is added after the hard-cap filter, never to the search score.
import {chooseUniversalAiAction} from '../../../../dist/universal-v2/ai.mjs';
import {legalUniversalActions} from '../../../../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction} from '../../../../dist/universal-v2/hard-ai.mjs';
import {BLEND_TIMEOUT_MS,HARD_OPTIONS,ORDER_KINDS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {searchOnce,selectScored,withinHardCap} from '../../../../dist/universal-v2/white-sword-ai/choose.mjs';
import {catalogsOf} from '../../../../dist/universal-v2/white-sword-ai/browser-catalogs.mjs';
import {policyVector} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {dot} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {observeActor} from '../../../../dist/universal-v2/white-sword-ai/observe.mjs';
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {isPlay} from '../../v5a/lib/pressure.mjs';
import {matchingRule,sameSignature} from '../../v5d/lib/compare.mjs';
import {actionResidual} from '../../v6a/lib/model.mjs';
import {HARD_CAP,SCALE} from './protocol.mjs';

const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

export function indicates(row,feature){
 return isPlay(row,feature.card,feature.line)?1:0;
}
export function ownCardId(state,actor,action){
 if(!action?.uid)return null;
 const player=state?.players?.[actor];
 if(!player)return null;
 for(const zone of ['hand','front','energy','outside','removed']){
  const card=(player[zone]||[]).find(item=>item?.uid===action.uid);
  if(card?.cardId)return card.cardId;
 }
 return null;
}
function lineOf(value){
 return value||null;
}
export function indicatesLive(state,actor,action,feature){
 if(!feature||action?.type!==feature.type||lineOf(action?.line)!==lineOf(feature.line))return 0;
 return ownCardId(state,actor,action)===feature.card?1:0;
}
export function columnBonus(state,actor,action,columns){
 let bonus=0;
 for(const column of columns||[])bonus+=(column.weight||0)*indicatesLive(state,actor,action,column);
 return bonus;
}
export function residualScore(row,weights,weight,feature){
 return blendScore(row.hard,weights,row.features,SCALE)+SCALE*weight*indicates(row,feature);
}
export function residualChoice(band,weights,weight,feature){
 if(!band?.length)return null;
 let best=band[0];
 let bestScore=residualScore(best,weights,weight,feature);
 for(const row of band.slice(1)){
  const score=residualScore(row,weights,weight,feature);
  const left=row.sort||row.key;
  const right=best.sort||best.key;
  if(score>bestScore+1e-12||(Math.abs(score-bestScore)<=1e-12&&left<right)){
   best=row;
   bestScore=score;
  }
 }
 return best.key;
}
export function sameAsV2(band,weights,feature){
 return residualChoice(band,weights,0,feature)===chooseKey(band,weights,SCALE);
}
export function hardPool(rows,hardAction){
 return withinHardCap(rows,hardAction,HARD_CAP);
}
export function liveSignature(state,actor,action){
 if(!action?.type)return null;
 if(action.type==='next')return {type:'next',card:null,line:null};
 const card=ownCardId(state,actor,action);
 if(!card)return null;
 return {type:action.type,card,line:action.line||null};
}
export function applyPairRules(rows,state,actor,rules){
 if(!Array.isArray(rules)||!rules.length||!rows?.length)return {row:null,applied:false};
 const base=selectScored(rows.map(row=>({action:row.action,score:row.baseScore})));
 const baseRow=rows.find(row=>row.action===base.action);
 const pool=rows.map(row=>liveSignature(state,actor,row.action));
 const rule=matchingRule(liveSignature(state,actor,baseRow?.action),pool,rules);
 if(!rule)return {row:null,applied:false};
 const winners=rows.filter(row=>sameSignature(liveSignature(state,actor,row.action),rule.winner));
 if(!winners.length)return {row:null,applied:false};
 const picked=selectScored(winners.map(row=>({action:row.action,score:row.baseScore})));
 return {row:winners.find(row=>row.action===picked.action)||winners[0],applied:true};
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
function quiet(action,extra){
 return {action,changed:false,changedFromBaseline:false,tie:false,indicated:false,...extra};
}
export function decideResidual(pack,state,actor,model,seed,weight,feature,options={}){
 const started=performance.now();
 const legal=legalUniversalActions(pack,state);
 if(!legal.length)return quiet(null,{source:'fallback',reason:'no-legal',pool:0});
 if(legal.length===1)return quiet(legal[0],{source:'forced',reason:'one-legal',pool:1});
 const timeout=Number.isFinite(options.timeoutMs)?options.timeoutMs:BLEND_TIMEOUT_MS;
 try{
  if(options.forceError)throw Error('forced model failure');
  if(ORDER_KINDS.has(state?.pending?.kind)){
   return quiet(referenceAction(pack,state,legal,seed),{source:'reference',reason:state.pending.kind,pool:legal.length});
  }
  const searched=searchOnce(pack,state,seed);
  const observation=observeActor(pack,state,actor);
  const catalogs=catalogsOf(pack);
  const rows=[];
  const seen=new Set();
  const add=(action,hardScore)=>{
   const exact=legal.find(item=>same(item,action));
   if(!exact)return;
   const key=JSON.stringify(exact);
   if(seen.has(key))return;
   seen.add(key);
   const features=policyVector({observation,seat:actor,action:exact,legal,catalogs});
   rows.push({action:exact,features,hardScore:Number(hardScore)||0});
  };
  for(const row of searched.trace?.candidates||[])add(row.action,row.score);
  add(searched.hard,searched.trace?.score);
  const pool=hardPool(rows,searched.hard);
  if(!pool.length)throw Error('blend produced no legal action');
  const columns=Array.isArray(options.columns)
   ?options.columns
   :(feature?[{type:feature.type,card:feature.card,line:feature.line??null,weight}]:[]);
  let indicated=false;
  for(const row of pool){
   const policy=SCALE*dot(model.policy,row.features);
   row.policy=policy;
   const bonus=columnBonus(state,actor,row.action,columns);
   row.residual=SCALE*bonus;
   if(bonus)indicated=true;
   row.baseScore=row.hardScore+policy;
   row.score=row.baseScore+row.residual;
  }
  if(options.valueModel){
   for(const row of pool){
    row.residual=actionResidual(row.features,options.valueModel);
    row.score=row.baseScore+row.residual;
    if(row.residual)indicated=true;
   }
  }
  const base=selectScored(pool.map(row=>({action:row.action,score:row.baseScore})));
  let picked=selectScored(pool);
  let source='blend';
  const ruled=applyPairRules(pool,state,actor,options.rules);
  if(ruled.applied&&JSON.stringify(ruled.row.action)!==JSON.stringify(picked.action)){
   picked=ruled.row;
   source='compare';
  }
  const baseline=selectScored(pool.map(row=>({
   action:row.action,
   score:row.baseScore+SCALE*columnBonus(state,actor,row.action,options.baselineColumns||[])
  })));
  const tie=pool.filter(row=>Math.abs(row.baseScore-base.score)<=1e-12).length>1;
  if(performance.now()-started>timeout){
   return quiet(referenceAction(pack,state,legal,seed),{source:'fallback',reason:'timeout',pool:pool.length});
  }
  return {
   action:picked.action,source,reason:null,pool:pool.length,hard:searched.hard,
   changed:JSON.stringify(picked.action)!==JSON.stringify(base.action),
   changedFromBaseline:JSON.stringify(picked.action)!==JSON.stringify(baseline.action),
   tie,indicated
  };
 }catch(error){
  return quiet(referenceAction(pack,state,legal,seed),{
   source:'fallback',reason:error?.message||'model-error',pool:legal.length
  });
 }
}
