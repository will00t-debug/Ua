// Official solo matches mulligan once, then let the attacker choose LIFE.
// Strength tables before 88ee9db6 dealt LIFE immediately and skipped both.
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../engine.mjs';
import {chooseUniversalAiAction} from '../ai.mjs';

export const OFFICIAL_OPENING=Object.freeze({openingMulligan:true,attackerChoosesLife:true});
export const LEGACY_OPENING=Object.freeze({openingMulligan:false,attackerChoosesLife:false});

export function matchRules(name){
 return name==='legacy'?LEGACY_OPENING:OFFICIAL_OPENING;
}
export function newComparedMatch(packs,decks,seed,first,rules=OFFICIAL_OPENING){
 return newUniversalMatch(packs,{decks,seed,first,...rules});
}
// The same legal hard mulligan both policies already defer to: redraw when
// the seven cards contain fewer than two zero-cost characters.
export function sharedMulliganAction(packs,state){
 return chooseUniversalAiAction(packs,state,{difficulty:'hard'});
}
export function applySharedOpening(packs,state){
 let cursor=state;
 const choices=[];
 while(cursor.status==='playing'&&cursor.pending?.kind==='opening-mulligan'){
  const actor=cursor.pending.player;
  const legal=legalUniversalActions(packs,cursor);
  const picked=sharedMulliganAction(packs,cursor);
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(picked));
  if(!action)throw Error('Shared mulligan is not legal');
  choices.push({actor,mode:action.mode});
  cursor=dispatchUniversalAction(packs,cursor,action,{actor});
 }
 return {state:cursor,choices};
}
export function cloneMatch(state){
 return structuredClone(state);
}
// "Only next is legal" is not the same decision as passing a play, raid,
// attack, or any other non-pass action. extraDraw is a pass-phase option.
export function nextBuckets(legal,action){
 const onlyNext=legal.length===1&&legal[0]?.type==='next';
 const other=legal.some(item=>item?.type!=='next');
 const development=legal.some(item=>item&&item.type!=='next'&&item.type!=='extraDraw');
 const choseNext=action?.type==='next';
 return {
  onlyNext,
  voluntaryNext:!!(choseNext&&other&&!onlyNext),
  passedDevelopment:!!(choseNext&&development)
 };
}
