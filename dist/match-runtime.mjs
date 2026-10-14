// Shared match orchestration for officially playable BLEACH and isolated Beta series.
// Dispatch always uses the title's existing, tested rules core; it never tries to
// interpret a TTG/SLG card using BLEACH-specific effects or card identities.
import {newGame,legalActions,dispatch,assertState,controller} from './engine.mjs?v=9.1.1';
import {chooseAiAction} from './ai-v2.mjs';
import {validateDeck,pendingCards} from './cards.mjs?v=9.1.0';
import {newTtgCoreMatch,validateTtgCoreDeck,dispatchTtgCoreAction,assertTtgCoreState,ttgCoreAiChoice,legalTtgCoreActions} from './ttg-core-match.mjs';
import {ttgExecutableActions,ttgChoiceActor} from './ttg-browser.mjs';
import {chooseBetaAiAction} from './beta-ai-policy.mjs';
import {newSoloTrainingMatch,soloTrainingDeckIssues,soloTrainingLegalActions,soloTrainingDispatch,assertSoloTrainingMatch,soloTrainingBotAction} from './solo-match.mjs';

const deckIssuesForBleach=counts=>[...validateDeck(counts),...pendingCards(counts).map(c=>'自動判定尚未完成：'+c.id)];
const runtimes=Object.freeze({
 bleach:Object.freeze({
  title:'bleach',corePlayable:true,beta:false,
  newMatch:newGame,deckIssues:deckIssuesForBleach,assert:assertState,
  legalActions,dispatch,actor:controller,botAction:(state,{difficulty='normal'}={})=>chooseAiAction(state,{difficulty}),
 }),
 'gurren-lagann':Object.freeze({
  title:'gurren-lagann',corePlayable:false,beta:true,
  newMatch:newTtgCoreMatch,deckIssues:validateTtgCoreDeck,
  assert:assertTtgCoreState,legalActions:ttgExecutableActions,
  // Engine rule templates are used ONLY by specialized, explicitly verified UX.
  ruleTemplates:legalTtgCoreActions,
  dispatch:dispatchTtgCoreAction,actor:ttgChoiceActor,botAction:(state,options)=>chooseBetaAiAction('gurren-lagann',state,options),
 }),
 'solo-leveling':Object.freeze({
  title:'solo-leveling',corePlayable:false,beta:true,
  newMatch:newSoloTrainingMatch,deckIssues:soloTrainingDeckIssues,
  assert:assertSoloTrainingMatch,legalActions:soloTrainingLegalActions,
  dispatch:soloTrainingDispatch,actor:s=>s.pending?.p??s.active,
  botAction:(state,options)=>chooseBetaAiAction('solo-leveling',state,options),
 })
});
export const MATCH_RUNTIME_TITLES=Object.freeze(Object.keys(runtimes));
export function matchRuntime(title){
 const match=runtimes[title];
 if(!match)throw new Error('作品尚未提供判定引擎：'+String(title));
 return match;
}
export function matchTitle(state){
 if(state?.kind==='ttg-core-smoke')return 'gurren-lagann';
 if(state?.title==='solo-leveling'&&state?.version===1)return 'solo-leveling';
 if(state?.version===1&&state?.players?.length===2&&state.title==null&&
    (state.status==='mulligan'||state.phase==='mulligan'||state.logSeq!==undefined))return 'bleach';
 throw new Error('無法辨識或已過期的對戰存檔。');
}
function verifiedRuntime(title,state){
 const runtime=matchRuntime(title);
 if(matchTitle(state)!==title)throw new Error('不能跨作品使用另一款遊戲的判定引擎。');
 runtime.assert(state);
 return runtime;
}
export function matchDeckIssues(title,deck){return [...matchRuntime(title).deckIssues(deck)];}
export function startMatchForTitle(title,options){
 const runtime=matchRuntime(title);
 const state=runtime.newMatch(options);
 verifiedRuntime(title,state);
 return state;
}
export function matchChoiceActor(title,state){return verifiedRuntime(title,state).actor(state);}
export function matchLegalActions(title,state,{templates=false}={}){
 const runtime=verifiedRuntime(title,state);
 if(templates&&runtime.ruleTemplates)return runtime.ruleTemplates(state);
 return runtime.legalActions(state);
}
export function dispatchMatchAction(title,state,action,{actor}={}){
 const runtime=verifiedRuntime(title,state);
 if(actor!==undefined&&actor!==runtime.actor(state))throw new Error('現在輪到另一位玩家操作。');
 const next=runtime.dispatch(state,action,...(actor===undefined?[]:[actor]));
 verifiedRuntime(title,next);
 return next;
}
export function chooseMatchBotAction(title,state,options={}){
 const runtime=verifiedRuntime(title,state);
 return runtime.botAction(state,options);
}
// Beta support and official acceptance are separate facts. Do not use the
// catalogue's formal playable:auto flags to misreport an isolated Beta core.
export function matchSupport(title){
 const runtime=runtimes[title];
 return runtime?{title,beta:runtime.beta,corePlayable:runtime.corePlayable,allCardsVerified:false}:{
  title,beta:false,corePlayable:false,allCardsVerified:false
 };
}
