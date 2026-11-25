// Replay saved hard-search games far enough to read the visible position.
// This does not start a new match and does not look at the opponent's hand.
import {legalUniversalActions,dispatchUniversalAction} from '../../../../dist/universal-v2/engine.mjs';
import {matchRules,newComparedMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseStrengthenedHardAction} from '../../../../dist/universal-v2/hard-ai.mjs';
import {catalogsOf} from '../../../../dist/universal-v2/white-sword-ai/browser-catalogs.mjs';
import {observeActor} from '../../../../dist/universal-v2/white-sword-ai/observe.mjs';
import {getDeck} from '../../../../dist/universal-v2/white-sword-ai/deck.mjs';
import {choiceKey} from '../../v4a/lib/diverge.mjs';
import {measureLegal} from './context.mjs';

const RULES=matchRules('official');
function hardAction(packs,state,legal,seed){
 const action=chooseStrengthenedHardAction(packs,state,{...HARD_OPTIONS,seed});
 const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
 return legal.find(item=>same(item,action))||legal.find(item=>item.type==='next')||legal[0];
}
export function collectGame({decks,seed,first,marks}){
 const packs=decks.map(id=>getDeck(id).pack);
 const counts=decks.map(id=>getDeck(id).counts);
 const books=catalogsOf(packs);
 const wanted=new Map();
 for(const mark of marks||[]){
  const list=wanted.get(mark.step)||[];
  list.push(mark);
  wanted.set(mark.step,list);
 }
 const max=Math.max(...marks.map(mark=>mark.step));
 let state=newComparedMatch(packs,counts,seed,first,RULES);
 const rows=[];
 for(let step=0;step<=max&&state.status==='playing';step++){
  if(wanted.has(step)){
   const actor=state.pending?.player??state.active;
   const legal=legalUniversalActions(packs,state).map(action=>({...action,key:choiceKey(action)}));
   const measured=measureLegal(observeActor(packs,state,actor),books,actor,legal);
   for(const mark of wanted.get(step)){
    rows.push({id:mark.id,step,actor,facts:measured.facts,actions:measured.actions});
   }
  }
  if(step===max)break;
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  state=dispatchUniversalAction(packs,state,hardAction(packs,state,legal,seed),{actor});
 }
 return rows;
}
