// Development matches. The residual never enters Hard Search or the hard cap.
import {legalUniversalActions,dispatchUniversalAction} from '../../../../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction} from '../../../../dist/universal-v2/hard-ai.mjs';
import {cloneMatch,matchRules,newComparedMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {HARD_OPTIONS,LOOP_LIMIT,MAX_STEPS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseWhiteSwordAction} from '../../../../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../../../../dist/universal-v2/white-sword-ai/deck.mjs';
import {positionKey} from '../../../../dist/universal-v2/white-sword-ai/runner.mjs';
import {decideResidual} from './residual.mjs';
import {HARD_CAP,SCALE} from './protocol.mjs';

const RULES=matchRules('official');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

function pickFor(packs,state,actor,seat,spec){
 const legal=legalUniversalActions(packs,state);
 if(seat.policy==='hard-search-2'){
  const action=chooseStrengthenedHardAction(packs,state,{...HARD_OPTIONS,seed:spec.seed});
  return {action:legal.find(item=>same(item,action))||null,source:'hard-search-2'};
 }
 if(seat.residual){
  return decideResidual(packs,state,actor,seat.model,spec.seed,seat.weight,seat.feature);
 }
 return chooseWhiteSwordAction(packs,state,{
  actor,model:seat.model,mode:'blend',explore:0,seed:spec.seed,scale:SCALE,hardCap:HARD_CAP
 });
}
export function playResidualMatch(spec){
 const decks=spec.seats.map(seat=>getDeck(seat.deckId));
 const packs=[decks[0].pack,decks[1].pack];
 const counts=[decks[0].counts,decks[1].counts];
 let state=newComparedMatch(packs,counts,spec.seed,spec.first,RULES);
 let steps=0;
 let last='';
 let repeats=0;
 let illegal=0;
 let error=null;
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
  try{picked=pickFor(packs,state,actor,spec.seats[actor],spec);}
  catch(failure){error=failure.message;illegal++;break;}
  const action=legal.find(item=>item===picked?.action||same(item,picked?.action));
  if(!action){error=picked?.reason||'illegal action';illegal++;break;}
  try{state=dispatchUniversalAction(packs,state,action,{actor});}
  catch(failure){error=failure.message;illegal++;break;}
  steps++;
 }
 const finished=state.status==='finished'&&(state.winner===0||state.winner===1)&&!illegal;
 return {
  seed:spec.seed,opponent:spec.opponent,specialistSeat:spec.specialistSeat,first:spec.first,
  status:state.status,winner:finished?state.winner:null,steps,finished,illegal,error
 };
}
export function matchSpecs({seeds,opponents,model,weight,feature}){
 // These two cells both give the residual the first move. v5-B.1 does not use them for strength.
 const cells=[{specialistSeat:0,first:0},{specialistSeat:1,first:1}];
 const specs=[];
 for(const opponent of opponents){
  for(const seed of seeds){
   for(const cell of cells){
    const seats=[{deckId:opponent,policy:'hard-search-2',model:null,residual:false},{deckId:opponent,policy:'hard-search-2',model:null,residual:false}];
    seats[cell.specialistSeat]={
     deckId:'white-sword',policy:'white-sword',model,residual:true,weight,feature
    };
    if(opponent==='white-sword'){
     seats[1-cell.specialistSeat]={
      deckId:'white-sword',policy:'white-sword',model,residual:false,weight:0,feature
     };
    }
    specs.push({...cell,seed,opponent,weight,seats});
   }
  }
 }
 return specs;
}
export function summarizeMatches(rows){
 const finished=rows.filter(row=>row.finished);
 const byDeck={};
 let wins=0;
 for(const row of finished){
  const deck=byDeck[row.opponent]||(byDeck[row.opponent]={games:0,wins:0});
  deck.games++;
  if(row.winner===row.specialistSeat){deck.wins++;wins++;}
 }
 for(const deck of Object.values(byDeck))deck.winRate=deck.games?deck.wins/deck.games:0;
 return {
  games:rows.length,finished:finished.length,wins,
  winRate:finished.length?wins/finished.length:0,
  delta:finished.length?(wins-(finished.length-wins))/finished.length:0,
  illegal:rows.filter(row=>row.illegal).length,
  decks:byDeck
 };
}
