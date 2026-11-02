// Browser-friendly progress guard for the V2 AI. Never invent actions or
// bypass the reducer: every returned action is drawn from this state's
// native legalUniversalActions list. Keep decision recovery separate from UI.
import {legalUniversalActions,universalActor,universalPublicView,universalPrivateChoices} from './engine.mjs';
import {chooseUniversalAiAction} from './ai.mjs';
import {chooseStrengthenedHardAction,HARD_AI_POLICY} from './hard-ai.mjs';
import {LEARN_AI_VERSION,chooseLearnedAction} from './learn-policy.mjs';

export function aiPolicyFor(difficulty){
 if(difficulty==='learned')return LEARN_AI_VERSION;
 return difficulty==='hard'?HARD_AI_POLICY:difficulty||'normal';
}

function learnedObservation(pack,state,seat){
 const visible=universalPublicView(pack,state,seat);
 delete visible.winner;
 delete visible.seed;
 delete visible.initialCounts;
 delete visible.endReason;
 if(Array.isArray(visible.players)){
  visible.players=visible.players.map((player,index)=>{
   const next={...player};
   delete next.deck;
   delete next.life;
   if(index!==seat)next.hand=null;
   return next;
  });
 }
 let privateView=null;
 try{
  const raw=universalPrivateChoices(pack,state,seat);
  if(raw&&typeof raw==='object'){
   privateView={kind:raw.kind};
   if(Array.isArray(raw.inspected)){
    privateView.inspected=raw.inspected
     .filter(card=>card&&typeof card.uid==='string'&&typeof card.cardId==='string')
     .map(card=>({uid:card.uid,cardId:card.cardId}));
   }
  }
 }catch{privateView=null;}
 return {visible,private:privateView};
}
function learnedChoice(pack,state,policy){
 if(!policy)return null;
 const seat=universalActor(state);
 const picked=chooseLearnedAction(policy,learnedObservation(pack,state,seat),legalUniversalActions(pack,state),seat);
 return picked?.action||null;
}

export const AI_ACTIONS_PER_FRAME=3;
export const AI_PHASE_ACTION_BUDGET=72;
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function chooseProgressSafeAiAction(pack,state,{
 difficulty='normal',actionsInPhase=0,choose=null,policy=null
}={}){
 const strategy=choose||(difficulty==='hard'||difficulty==='learned'?chooseStrengthenedHardAction:chooseUniversalAiAction);
 const legal=legalUniversalActions(pack,state);
 if(!legal.length)throw Error('V2 reducer returned no legal AI action');
 const next=!state.pending?legal.find(a=>a.type==='next'):null;
 const exhausted=actionsInPhase>=AI_PHASE_ACTION_BUDGET&&!!next;
 let learnedAction=null,choice=null,problem=null;
 if(!exhausted&&difficulty==='learned'&&!choose){
  try{learnedAction=learnedChoice(pack,state,policy);}catch{learnedAction=null;}
  if(learnedAction&&legal.some(a=>exact(a,learnedAction)))choice=learnedAction;
  else learnedAction=null;
 }
 if(!exhausted&&!choice){
  try{choice=strategy(pack,state,{difficulty:difficulty==='learned'?'hard':difficulty});}
  catch(e){problem='ai-exception';}
 }
 if(!exhausted&&choice&&legal.some(a=>exact(a,choice)))
  return {action:choice,reason:null,learned:!!learnedAction&&exact(choice,learnedAction)};
 // A fallback never fabricates a decision. If the AI is looping in MAIN,
 // the reducer-supplied next action ends this phase instead of freezing.
 const action=next||legal.find(a=>a.type==='chooseBlock'&&a.uid===null)||
  legal.find(a=>a.mode==='skip')||legal[0];
 return {action,reason:exhausted?'phase-budget':problem||(choice?'invalid-ai-choice':'empty-ai-choice'),learned:false};
}
