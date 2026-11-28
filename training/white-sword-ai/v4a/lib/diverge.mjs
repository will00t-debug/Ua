// Show that mutated policies can choose different legal actions on one visible state.
// The probe never reads an opponent hand, an unrevealed LIFE card, or a deck order.
import {legalUniversalActions,dispatchUniversalAction} from '../../../../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,lastHardAiTrace} from '../../../../dist/universal-v2/hard-ai.mjs';
import {cloneMatch,matchRules,newComparedMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {BLEND_SCALE,HARD_OPTIONS,ORDER_KINDS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseWhiteSwordAction} from '../../../../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../../../../dist/universal-v2/white-sword-ai/deck.mjs';
import {actionKey} from '../../../../dist/universal-v2/white-sword-ai/runner.mjs';
import {HARD_CAP} from './protocol.mjs';

const RULES=matchRules('official');
const same= (a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function choiceKey(action){
 const key=actionKey(0,action);
 return JSON.stringify({type:key.type,mode:key.mode,line:key.line,uid:key.uid,baseUid:key.baseUid,targetUid:key.targetUid,slot:key.slot});
}
export function summarizeDisagreement(rows){
 const usable=rows.filter(row=>row.band>=2&&row.choices);
 let disagreed=0;
 const examples=[];
 for(const row of usable){
  const values=[...new Set(Object.values(row.choices))];
  if(values.length>1){
   disagreed++;
   if(examples.length<5)examples.push({
    seed:row.seed,step:row.step,band:row.band,choices:row.choices
   });
  }
 }
 return {
  positions:usable.length,
  disagreed,
  rate:usable.length?disagreed/usable.length:0,
  examples
 };
}
function bandOf(trace,hardAction){
 const ranked=trace?.candidates||[];
 const anchorRow=ranked.find(row=>same(row.action,hardAction));
 if(!anchorRow||ranked.length<2)return [];
 return ranked.filter(row=>row.score>=anchorRow.score-HARD_CAP-1e-9);
}
function ask(pack,state,model,seed){
 return chooseWhiteSwordAction(pack,state,{
  actor:0,model,mode:'blend',explore:0,seed,scale:BLEND_SCALE,hardCap:HARD_CAP
 });
}
export function probeDivergence({candidates,champion,seeds,maxSteps=180,maxPositions=12,log=()=>{}}={}){
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 const counts=[deck.counts,deck.counts];
 const rows=[];
 const fallbackIds=new Set();
 let walked=0;
 let steps=0;
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
   const key=JSON.stringify(state.pending?.kind||state.phase)+':'+state.turn+':'+actor+':'+legal.length;
   repeats=key===lastKey?repeats+1:0;
   lastKey=key;
   if(repeats>=12)break;
   const kind=state.pending?.kind;
   const decision=actor===0&&legal.length>1&&kind!=='opening-mulligan'&&!ORDER_KINDS.has(kind);
   if(decision){
    const hard=chooseStrengthenedHardAction(packs,state,{...HARD_OPTIONS,seed});
    const trace=lastHardAiTrace();
    const band=bandOf(trace,hard);
    if(band.length>=2){
     const snapshot=cloneMatch(state);
     const choices={};
     const sources={};
     const championPick=ask(packs,snapshot,champion,seed);
     choices.champion=choiceKey(championPick.action);
     sources.champion=championPick.source;
     if(championPick.source==='fallback')fallbackIds.add('champion');
     for(const candidate of candidates){
      const picked=ask(packs,snapshot,candidate.model,seed);
      choices[candidate.id]=choiceKey(picked.action);
      sources[candidate.id]=picked.source;
      if(picked.source==='fallback')fallbackIds.add(candidate.id);
     }
     rows.push({seed,step,band:band.length,legal:legal.length,choices,sources});
    }
   }
   const played=actor===0
    ?ask(packs,state,champion,seed)
    :{action:chooseStrengthenedHardAction(packs,state,{...HARD_OPTIONS,seed}),source:'hard-search-2'};
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
