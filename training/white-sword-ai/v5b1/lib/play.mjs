// Live matches for the frozen residual. Weight 0 is compared with official v2.
import {legalUniversalActions,dispatchUniversalAction} from '../../../../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction} from '../../../../dist/universal-v2/hard-ai.mjs';
import {matchRules,newComparedMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {HARD_OPTIONS,LOOP_LIMIT,MAX_STEPS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseWhiteSwordAction} from '../../../../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../../../../dist/universal-v2/white-sword-ai/deck.mjs';
import {positionKey} from '../../../../dist/universal-v2/white-sword-ai/runner.mjs';
import {decideResidual,ownCardId} from '../../v5b/lib/residual.mjs';
import {HARD_CAP,SCALE} from '../../v5b/lib/protocol.mjs';

const RULES=matchRules('official');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

function officialBlend(packs,state,actor,model,seed){
 return chooseWhiteSwordAction(packs,state,{
  actor,model,mode:'blend',explore:0,seed,scale:SCALE,hardCap:HARD_CAP
 });
}
function pick(packs,state,actor,seat,spec,model){
 const legal=legalUniversalActions(packs,state);
 if(seat.policy==='hard-search-2'){
  const action=chooseStrengthenedHardAction(packs,state,{...HARD_OPTIONS,seed:spec.seed});
  return {action:legal.find(item=>same(item,action))||null,source:'hard-search-2',changed:false,indicated:false,tie:false};
 }
 if(seat.residual){
  return decideResidual(packs,state,actor,model,spec.seed,seat.weight||0,seat.feature||null,{
   columns:seat.columns,baselineColumns:seat.baselineColumns,rules:seat.rules,valueModel:seat.valueModel||null
  });
 }
 return officialBlend(packs,state,actor,model,spec.seed);
}
export function playFairMatch(spec,model){
 const decks=spec.seats.map(seat=>getDeck(seat.deckId));
 const packs=[decks[0].pack,decks[1].pack];
 const counts=[decks[0].counts,decks[1].counts];
 let state=newComparedMatch(packs,counts,spec.seed,spec.first,RULES);
 let steps=0;
 let last='';
 let repeats=0;
 let illegal=0;
 let error=null;
 let changes=0;
 const changeKinds={};
 let indicated=0;
 let ties=0;
 let orders=0;
 let fallbacks=0;
 let decisions=0;
 while(state.status==='playing'&&steps<MAX_STEPS){
  const actor=state.pending?.player??state.active;
  let legal;
  try{legal=legalUniversalActions(packs,state);}
  catch(failure){error=failure.message;illegal++;break;}
  if(!legal.length){error='no legal action';illegal++;break;}
  const key=positionKey(state);
  repeats=key===last?repeats+1:0;
  last=key;
  if(repeats>=LOOP_LIMIT){error='repeated position';break;}
  let picked;
  try{picked=pick(packs,state,actor,spec.seats[actor],spec,model);}
  catch(failure){error=failure.message;illegal++;break;}
  const seat=spec.seats[actor];
  if(seat.residual&&actor===spec.specialistSeat){
   decisions++;
   const moved=seat.baselineColumns?.length?picked.changedFromBaseline:picked.changed;
   if(moved){
    changes++;
    const card=ownCardId(state,actor,picked.action);
    const kind=[picked.action?.type||'',card||'',picked.action?.line||''].join('|');
    changeKinds[kind]=(changeKinds[kind]||0)+1;
   }
   if(picked.indicated)indicated++;
   if(picked.tie)ties++;
   if(picked.source==='reference')orders++;
   if(picked.source==='fallback')fallbacks++;
  }
  const action=legal.find(item=>item===picked?.action||same(item,picked?.action));
  if(!action){error=picked?.reason||'illegal action';illegal++;break;}
  try{state=dispatchUniversalAction(packs,state,action,{actor});}
  catch(failure){error=failure.message;illegal++;break;}
  steps++;
 }
 const finished=state.status==='finished'&&(state.winner===0||state.winner===1)&&!illegal;
 return {
  seed:spec.seed,opponent:spec.opponent,arm:spec.arm,specialistSeat:spec.specialistSeat,first:spec.first,
  goingFirst:spec.specialistSeat===spec.first,weight:spec.arm==='v2'?0:spec.weight,
  status:state.status,winner:finished?state.winner:null,steps,finished,illegal,error,
  changes,changeKinds,indicated,ties,orders,fallbacks,decisions
 };
}
function auditSeats(opponent,specialistSeat){
 if(opponent==='white-sword')return [{deckId:'white-sword'},{deckId:'white-sword'}];
 const seats=[{deckId:opponent},{deckId:opponent}];
 seats[specialistSeat]={deckId:'white-sword'};
 return seats;
}
export function playAudit(spec,model,feature,options={}){
 const seats=auditSeats(spec.opponent,spec.specialistSeat);
 const decks=seats.map(seat=>getDeck(seat.deckId));
 const packs=[decks[0].pack,decks[1].pack];
 let state=newComparedMatch(packs,[decks[0].counts,decks[1].counts],spec.seed,spec.first,RULES);
 const totals={
  decisions:0,mismatches:0,openings:0,openingMismatches:0,orders:0,orderMismatches:0,
  ties:0,tieMismatches:0,fallbacks:0,fallbackMismatches:0,samples:[]
 };
 const opened=[false,false];
 const limit=options.steps||MAX_STEPS;
 let steps=0;
 let last='';
 let repeats=0;
 let error=null;
 while(state.status==='playing'&&steps<limit){
  const actor=state.pending?.player??state.active;
  let legal;
  try{legal=legalUniversalActions(packs,state);}
  catch(failure){error=failure.message;break;}
  if(!legal.length){error='no legal action';break;}
  const key=positionKey(state);
  repeats=key===last?repeats+1:0;
  last=key;
  if(repeats>=LOOP_LIMIT){error='repeated position';break;}
  let action;
  if(seats[actor].deckId==='white-sword'){
   const official=officialBlend(packs,state,actor,model,spec.seed);
   const residual=decideResidual(packs,state,actor,model,spec.seed,0,feature);
   const mismatch=!official?.action||!same(official.action,residual.action);
   const opening=!opened[actor];
   const order=official.source==='reference'||residual.source==='reference';
   const fallback=official.source==='fallback'||residual.source==='fallback';
   opened[actor]=true;
   totals.decisions++;
   if(opening)totals.openings++;
   if(order)totals.orders++;
   if(residual.tie)totals.ties++;
   if(fallback)totals.fallbacks++;
   if(mismatch){
    totals.mismatches++;
    if(opening)totals.openingMismatches++;
    if(order)totals.orderMismatches++;
    if(residual.tie)totals.tieMismatches++;
    if(fallback)totals.fallbackMismatches++;
    if(totals.samples.length<4)totals.samples.push({
     seed:spec.seed,opponent:spec.opponent,step:steps,kind:state.pending?.kind||null,
     official:official.source,residual:residual.source,reason:residual.reason||official.reason||null
    });
   }
   action=legal.find(item=>item===official.action||same(item,official.action));
  }else{
   try{
    const hard=chooseStrengthenedHardAction(packs,state,{...HARD_OPTIONS,seed:spec.seed});
    action=legal.find(item=>same(item,hard));
   }catch(failure){error=failure.message;break;}
  }
  if(!action){error='illegal action';break;}
  try{state=dispatchUniversalAction(packs,state,action,{actor});}
  catch(failure){error=failure.message;break;}
  steps++;
 }
 return {
  seed:spec.seed,opponent:spec.opponent,specialistSeat:spec.specialistSeat,first:spec.first,
  steps,status:state.status,error,...totals
 };
}
export function compareFallback(packs,state,actor,model,seed,feature){
 const official=chooseWhiteSwordAction(packs,state,{
  actor,model,mode:'blend',explore:0,seed,scale:SCALE,hardCap:HARD_CAP,forceError:true
 });
 const residual=decideResidual(packs,state,actor,model,seed,0,feature,{forceError:true});
 return {official,residual,same:same(official.action,residual.action)};
}
