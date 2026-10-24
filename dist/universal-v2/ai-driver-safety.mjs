// Browser-friendly progress guard for the V2 AI. Never invent actions or
// bypass the reducer: every returned action is drawn from this state's
// native legalUniversalActions list. Keep decision recovery separate from UI.
import {legalUniversalActions} from './engine.mjs';
import {chooseUniversalAiAction} from './ai.mjs';

export const AI_ACTIONS_PER_FRAME=3;
export const AI_PHASE_ACTION_BUDGET=72;
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function chooseProgressSafeAiAction(pack,state,{
 difficulty='normal',actionsInPhase=0,choose=chooseUniversalAiAction
}={}){
 const legal=legalUniversalActions(pack,state);
 if(!legal.length)throw Error('V2 reducer returned no legal AI action');
 const next=!state.pending?legal.find(a=>a.type==='next'):null;
 const exhausted=actionsInPhase>=AI_PHASE_ACTION_BUDGET&&!!next;
 let choice=null,problem=null;
 if(!exhausted){
  try{choice=choose(pack,state,{difficulty});}
  catch(e){problem='ai-exception';}
 }
 if(!exhausted&&choice&&legal.some(a=>exact(a,choice)))
  return {action:choice,reason:null};
 // A fallback never fabricates a decision. If the AI is looping in MAIN,
 // the reducer-supplied next action ends this phase instead of freezing.
 const action=next||legal.find(a=>a.type==='chooseBlock'&&a.uid===null)||
  legal.find(a=>a.mode==='skip')||legal[0];
 return {action,reason:exhausted?'phase-budget':problem||(choice?'invalid-ai-choice':'empty-ai-choice')};
}
