// Cross-title Universal v2 AI baseline. Uses only the native legal-action
// list; no work-specific card-ID shortcuts and no mutation of match state.
import {legalUniversalActions,dispatchUniversalAction,universalBp,universalEnergy,universalEnergyByColor,universalCardEnergy,handRevealIdentity,handCharacterBpMayAmount} from './engine.mjs';
import {cardCountsAsEvent} from './field-conditions.mjs';
export const UNIVERSAL_AI_LEVELS=Object.freeze(['easy','normal','hard']);
const packsOf=pack=>Array.isArray(pack)?pack:[pack,pack];
const option=(list,type)=>list.find(x=>x.type===type);
const played=(state,action)=>state.players[state.active].hand.find(c=>c.uid===action.uid);
const cardFor=(pack,state,action)=>packsOf(pack)[state.active].cards[played(state,action)?.cardId];
function energyTarget(pack,state,difficulty){
 if(difficulty!=='hard')return 2;
 const player=state.players[state.active],catalog=packsOf(pack)[state.active].cards;
 // Hard AI knows its own 50-card registered deck. Planning only from cards
 // CURRENTLY in hand makes it stop energy growth before expensive draws.
 const peakInHand=Math.max(0,...player.hand.map(c=>catalog[c.cardId]?.energy||0));
 const original=state.initialCounts?.[state.active]||{};
 const deckPeak=Math.max(0,...Object.entries(original)
  .filter(([,count])=>count>0)
  .map(([id])=>catalog[id]?.energy||0));
 return Math.max(3,Math.min(6,Math.max(peakInHand,deckPeak)));
}
function chooseBlock(pack,s,actions,difficulty){
 const no=actions.find(a=>a.uid===null)||actions[0];
 if(difficulty==='easy')return no;
 const attacker=s.players[s.active].front.find(c=>c?.uid===s.pending.attackerUid);
 if(!attacker)return no;
 const damage=universalBp(pack,s,attacker);
 const healthy=actions.filter(a=>a.uid!==null).map(a=>({
  a,card:s.players[s.pending.player].front.find(c=>c?.uid===a.uid)
 })).filter(x=>x.card&&universalBp(pack,s,x.card)>damage);
 healthy.sort((a,b)=>universalBp(pack,s,a.card)-universalBp(pack,s,b.card));
 return healthy[0]?.a||
  (difficulty==='hard'&&s.players[s.pending.player].life.length<=1?
   actions.find(a=>a.uid!==null)||no:no);
}
export function chooseUniversalAiAction(pack,s,{difficulty='normal'}={}){
 if(!UNIVERSAL_AI_LEVELS.includes(difficulty))throw Error('Unknown universal AI difficulty');
 const legal=legalUniversalActions(pack,s);
 if(!legal.length)return null;
 if(s.pending?.kind==='effect-move-order')return legal[0];
 if(s.pending?.kind==='effect-rest-tuck')return
  legal.find(x=>x.mode===(difficulty==='easy'?'skip':'rest'))||legal[0];
 if(s.pending?.kind==='effect-tuck-moved')return
  legal.find(x=>difficulty!=='easy'&&x.uid!==null)||legal[0];
 if(s.pending?.kind==='retirement-order')
  return legal.find(a=>a.type==='chooseRetirementOrder')||legal[0];
 if(s.pending?.kind==='effect-grant-front-energy')
  return difficulty==='easy'?legal[0]:legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-grant-ap-tax')
  return difficulty==='easy'?legal[0]:legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-attack-ban')
  return difficulty==='easy'?legal[0]:legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-discard')
  return legal.find(a=>a.type==='chooseDiscard')||legal[0];
 if(s.pending?.kind==='life-trigger')
  return legal.find(a=>['final','raid','special','colorRetire','colorRestSkip','colorField','color','active','draw','get'].includes(a.mode))||legal[0];
 if(s.pending?.kind==='effect-recover-ap')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='recovered-self-entry')return difficulty==='easy'?legal[0]:
  legal.find(a=>a.mode==='enter'&&!a.replaceUid)||legal[0];
 if(['effect-search-deck','effect-search-deck-multi','effect-recover-outside'].includes(s.pending?.kind))
  return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-top-inspect')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='private-top-place'||s.pending?.kind==='private-top-choice')return legal[0];
 if(s.pending?.kind==='effect-grant-impact')
  return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-grant-opp-block')
  return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-deploy-outside')
  return difficulty==='easy'?legal[0]:
   legal.find(a=>a.uid!==null&&!a.replaceUid)||legal[0];
 if(s.pending?.kind==='effect-energy-skip-swap')
  return difficulty==='easy'?legal[0]:legal.find(a=>a.uid!==null)||legal[0];
 if(['effect-energy-trait-swap','effect-active-lines','effect-active-skip-pair',
  'effect-play-outside-event','effect-release-facedown'].includes(s.pending?.kind))
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-pay-hand-outside'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0];
 }
 if(s.pending?.kind==='effect-attack-aid')
  return difficulty==='easy'?legal.find(a=>a.mode==='skip')||legal[0]:
   legal.find(a=>a.mode!=='skip')||legal[0];
 if(s.pending?.kind==='effect-attack-aid-grant'||s.pending?.kind==='effect-tuck-damage')
  return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-active-own-trait')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-tuck-hand-under'||s.pending?.kind==='effect-chain-discard'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0];
 }
 if(s.pending?.kind==='effect-chain-raid-facedown')
  return difficulty==='easy'&&!s.pending.selected?.length?
   legal.find(a=>a.uid===null)||legal[0]:legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-chain-raid-hand'||s.pending?.kind==='effect-outside-named-raid')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-outside-cost-hand'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0];
 }
 if(s.pending?.kind==='effect-top-inspect-many')return legal.find(x=>x.uid===null)||legal[0];
 if(s.pending?.kind==='effect-top-filter-choice')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-top-trait-event'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const deck=s.players[s.pending.player].deck;
  const score=uid=>{
   if(uid===null)return 0;
   const printed=catalog[deck.find(c=>c.uid===uid)?.cardId];
   if(printed?.traits?.includes(s.pending.trait)||printed?.traitComponents?.includes(s.pending.trait))return 2;
   return cardCountsAsEvent(printed)?1:0;
  };
  return [...legal].sort((a,b)=>score(b.uid)-score(a.uid))[0];
 }
 if(s.pending?.kind==='effect-top-trait-outside')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-optional-mill')
  return difficulty==='easy'?legal.find(a=>a.mode==='skip')||legal[0]:
   legal.find(a=>a.mode==='mill')||legal[0];
 if(s.pending?.kind==='effect-mill-up-to')
  return difficulty==='easy'?legal.find(a=>a.mode==='stop')||legal[0]:
   legal.find(a=>a.mode==='mill')||legal[0];
 if(s.pending?.kind==='effect-mill-recover-discard')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-mill-recover')
  return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-grant-impact-null')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-discard-up-to')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-top-add-one')return legal[0];
 if(s.pending?.kind==='effect-distinct-trait-buff')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-energy-mode'){
  const onFront=s.players[s.pending.player].front.some(c=>c?.uid===s.pending.sourceUid);
  return legal.find(a=>a.mode===(onFront?'front':'plus'))||legal[0];
 }
 if(s.pending?.kind==='effect-may-then')
  return legal.find(a=>a.mode===(difficulty==='easy'?'skip':'do'))||legal[0];
 if(s.pending?.kind==='effect-max-bp-impact')return legal[0];
 if(s.pending?.kind==='effect-outside-or-rest')
  return difficulty==='easy'?legal.find(a=>a.mode==='skip')||legal[0]:
   legal.find(a=>a.mode==='hand')||legal[0];
 if(s.pending?.kind==='effect-replay-base')
  return difficulty==='easy'?legal.find(a=>a.mode==='skip')||legal[0]:
   legal.find(a=>a.mode===(s.pending.canActive?'active':'rest'))||legal[0];
 if(s.pending?.kind==='effect-named-energy'||s.pending?.kind==='effect-active-one-ap')
  return legal[0];
 if(s.pending?.kind==='effect-outside-deck-top'||s.pending?.kind==='effect-outside-names')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-active-character')return legal[0];
 if(s.pending?.kind==='effect-mode-discard'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0];
 }
 if(s.pending?.kind==='effect-pay-ap-deploy')
  return difficulty==='easy'?legal.find(a=>a.mode==='skip')||legal[0]:
   legal.find(a=>a.mode==='pay')||legal[0];
 if(s.pending?.kind==='effect-deck-named-play')
  return difficulty==='easy'?legal.find(a=>a.mode==='hand')||legal[0]:
   legal.find(a=>a.mode==='raid'&&!a.replaceUid)||
   legal.find(a=>a.mode==='enter'&&!a.replaceUid)||
   legal.find(a=>a.mode==='hand')||legal[0];
 if(s.pending?.kind==='effect-place-hand'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  const outside=legal.filter(a=>a.mode==='outside');
  return [...outside].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0]||legal[0];
 }
 if(s.pending?.kind==='effect-top-order')return legal[0];
 if(['effect-discard-cost','effect-discard-gate'].includes(s.pending?.kind)){
  // An optional cost may be declined; tougher bots pay with a lower-value
  // hand card, using only the actor's own registered title pack.
  if(difficulty==='easy')return legal.find(a=>a.uid===null)||legal[0];
  const own= packsOf(pack)[s.pending.player].cards;
  const options=legal.filter(a=>a.uid!==null).map(a=>({
   action:a,printed:own[s.players[s.pending.player].hand.find(c=>c.uid===a.uid)?.cardId]
  }));
  options.sort((a,b)=>(a.printed?.energy||0)-(b.printed?.energy||0));
  return options[0]?.action||legal[0];
 }
 if(s.pending?.kind==='raid-effect-order')return legal.find(a=>a.mode==='entryFirst')||legal[0];
 if(s.pending?.kind==='effect-choice-mode'){
  // Entirely generic printed-mode selection; inspect only public enemy FRONT
  // and the validated program profile, never hard-code a title/card ID.
  const foe=s.players[1-s.pending.player].front;
  const options=s.pending.options||[];
  const available=options.find(o=>o.then.some(x=>x.op==='retireOppFrontOneUnderBp'&&
   foe.some(c=>c&&universalBp(pack,s,c)<=x.bp)))||
   options.find(o=>o.then.some(x=>x.op==='stripOppRaidTop'&&
    foe.some(c=>c&&c.stack?.length&&packsOf(pack)[1-s.pending.player].cards[c.cardId].raidName)));
  return legal.find(a=>a.type==='chooseEffectMode'&&a.mode===available?.id)||
   legal.find(a=>a.type==='chooseEffectMode'&&a.mode!=='skip')||legal[0];
 }
 if(s.pending?.kind==='effect-hand-rest')return difficulty==='easy'?legal[0]:
   legal.find(x=>x.uid!==null&&!x.replaceUid)||legal[0];
  if(['effect-outside-rest','effect-outside-traitless-rest'].includes(s.pending?.kind))
  return difficulty==='easy'?legal[0]:
   legal.find(x=>x.mode==='raid'&&!x.replaceUid)||
   legal.find(x=>x.uid!==null&&!x.replaceUid)||legal[0];
 if(s.pending?.kind==='effect-once-choice')
  return difficulty==='easy'?legal.find(a=>a.mode==='skip')||legal[0]:
   legal.find(a=>a.mode==='activate')||legal[0];
 if(s.pending?.kind==='effect-buff-own')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-facedown-front')
  return legal.find(a=>a.mode==='move'&&!a.replaceUid)||
   legal.find(a=>a.mode==='move')||legal[0];
 if(s.pending?.kind==='effect-named-impact')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-buff-either')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-hand-outside-active')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-named-duration')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-top-take-one')return legal[0];
 if(s.pending?.kind==='effect-reveal-optional'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>{
   const score=uid=>{
    if(uid===null)return -1;
    const printed=catalog[hand.find(c=>c.uid===uid)?.cardId];
    return printed?.type==='character'&&Number.isInteger(printed.bp)?printed.bp:0;
   };
   return score(b.uid)-score(a.uid);
  })[0];
 }
 if(s.pending?.kind==='effect-referenced-bp')return legal.find(a=>a.mode==='accept')||legal[0];
 if(s.pending?.kind==='effect-outside-referenced')return legal.find(a=>a.mode==='hand')||legal[0];
 if(s.pending?.kind==='effect-reveal-retire'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>{
   const score=uid=>{
    const printed=catalog[hand.find(c=>c.uid===uid)?.cardId];
    return printed?.type==='character'&&Number.isInteger(printed.bp)?printed.bp:0;
   };
   return score(b.uid)-score(a.uid);
  })[0];
 }
 if(s.pending?.kind==='effect-retire-referenced')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-hand-block'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0];
 }
 if(s.pending?.kind==='effect-substitute-retire')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-outside-printed-active')return legal.find(a=>a.uid!==null&&!a.replaceUid)||legal[0];
 if(s.pending?.kind==='effect-bounce-include-self')
  return legal.find(a=>a.uid!==null&&a.uid!==s.pending.sourceUid)||
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-outside-rest-or-raid')
  return legal.find(a=>a.mode==='enter'&&!a.replaceUid)||
   legal.find(a=>a.mode==='raid'&&!a.replaceUid)||legal[0];
 if(s.pending?.kind==='effect-grant-bounce-instead')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-hand-reenter-under')return legal.find(a=>a.uid!==null&&!a.replaceUid)||legal[0];
 if(s.pending?.kind==='effect-return-printed')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-remove-named')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-pay-named')return legal.find(a=>a.mode==='hand')||
  legal.find(a=>a.mode==='rest')||legal[0];
 if(s.pending?.kind==='effect-add-named')return legal.find(a=>a.uid)||legal[0];
 if(s.pending?.kind==='effect-rest-front-ap')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-discard-active')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-hand-top'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0];
 }
 if(s.pending?.kind==='effect-reveal-bottom'){
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>{
   const score=uid=>{
    const printed=catalog[hand.find(c=>c.uid===uid)?.cardId];
    const shown=handRevealIdentity(printed);
    const bonus=shown.type==='character'?handCharacterBpMayAmount(pack,s,s.pending.player):0;
    const referenced=Number.isInteger(shown.bp)?shown.bp+bonus:null;
    return shown.type==='character'&&referenced>=s.pending.minPrintedBp?referenced:0;
   };
   return score(b.uid)-score(a.uid);
  })[0];
 }
 if(s.pending?.kind==='effect-buff-trait')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='main-discard-buff'){
  // The payment is mandatory once activated. Choose a low-cost OWN hand
  // card, not a forged or opponent target; all candidates are exact legal.
  const catalog=packsOf(pack)[s.pending.player].cards;
  const hand=s.players[s.pending.player].hand;
  return [...legal].sort((a,b)=>(catalog[hand.find(c=>c.uid===a.uid)?.cardId]?.energy||0)-
   (catalog[hand.find(c=>c.uid===b.uid)?.cardId]?.energy||0))[0];
 }
 if(s.pending?.kind==='main-two-buff')return legal[0];
 if(s.pending?.kind==='main-rest-front-energy')
  return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-rest-bp'){
  // RESTed characters remain legal targets (official Q91), but choosing one
  // wastes the effect whenever a READY opponent is also available.
  const foe=s.players[1-s.pending.player].front;
  return legal.find(a=>a.uid!==null&&foe.find(c=>c?.uid===a.uid)?.ready)||
   legal.find(a=>a.uid!==null)||legal[0];
 }
 if(s.pending?.kind==='effect-retire-own-field')
  return difficulty==='easy'?legal.find(a=>a.uid===null)||legal[0]:
   legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-strip-raid-top')
  return difficulty==='easy'?legal[0]:legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-retire-at-least')return legal[0];
 if(s.pending?.kind==='effect-retire-at-most')return legal[0];
 if(s.pending?.kind==='effect-retire-scaled')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-rest-outside-events')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-rested-retire-impact')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-hand-named-rest')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-grant-named-impact')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-outside-printed-rest')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-grant-printed-block')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-move-opp-front')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-unblocked-rest')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-remove-opp-field')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-energy-swap')return legal[0];
 if(s.pending?.kind==='effect-hand-bp-may')return legal.find(a=>a.mode==='accept')||legal[0];
 if(s.pending?.kind==='effect-hand-deploy-may')return legal.find(a=>a.mode==='accept')||legal[0];
 if(s.pending?.kind==='effect-hand-rest-entry')return legal[0];
 if(s.pending?.kind==='effect-active-other')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-rest-own-front-draw')return legal[0];
 if(s.pending?.kind==='effect-raid-base-rest')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-rest-or-retire')return legal[0];
 if(s.pending?.kind==='effect-retire-bp'){
  // A printed "up to one" retirement presents SKIP first; normal/hard AI
  // should choose an eligible enemy unless there is none.
  const targets=legal.filter(a=>a.uid!==null);
  targets.sort((a,b)=>{
   const foe=s.players[1-s.pending.player].front;
   const aa=foe.find(c=>c?.uid===a.uid),bb=foe.find(c=>c?.uid===b.uid);
   return universalBp(pack,s,bb)-universalBp(pack,s,aa);
  });
  return difficulty==='easy'?legal[0]:targets[0]||legal[0];
 }
 if(s.pending?.kind==='leave-replacement'){
  const leave=legal.find(a=>a.mode==='leave')||legal[0];
  if(difficulty==='easy')return leave;
  // A facedown layer may provide the ONLY +BP keeping a Raid alive.
  // Never waste that layer if the post-payment state-based BP check still
  // sends the protected top to outside. Simulate using the pure reducer so
  // chained layers, nested pending actions and game-zone invariants agree.
  for(const choice of legal.filter(a=>a.mode==='protect')){
   const after=dispatchUniversalAction(pack,s,choice,{actor:s.pending.player});
   const field=[...after.players[s.pending.player].front,
    ...after.players[s.pending.player].energy];
   if(field.some(c=>c?.uid===s.pending.uid))return choice;
  }
  return leave;
 }
 if(s.pending?.kind==='block')return chooseBlock(pack,s,legal,difficulty);
 if(s.pending?.kind==='granted-attack-draw')return legal.find(x=>x.mode==='draw')||legal[0];
 if(s.pending?.kind==='effect-grant-attack')return legal[0];
 if(s.pending?.kind==='effect-target-many')return legal.find(a=>a.uid!==null)||legal[0];
 if(s.pending?.kind==='effect-target'){
  const choices=legal.filter(a=>a.uid!==null).map(a=>({
   a,character:s.players[1-s.pending.player].front.find(c=>c?.uid===a.uid)
  }));
  choices.sort((a,b)=>{
   const aa=universalBp(pack,s,a.character),bb=universalBp(pack,s,b.character);
   const lethalA=aa<=s.pending.bp?1:0,lethalB=bb<=s.pending.bp?1:0;
   return lethalB-lethalA||bb-aa;
  });
  // Exact legal action; the printed title's supported effect determines
  // candidate targets, never AI text parsing.
  return choices[0]?.a||legal[0];
 }
 if(['effect-raid-witness-order','effect-raid-attach','effect-raid-witness-move','effect-look-take','effect-discard-mode','effect-facedown-scale','effect-spend-facedown','effect-absorb-front','effect-simon-low','effect-replay-entry','effect-attack-end-raid','effect-retire-capture'].includes(s.pending?.kind))
  return legal.find(a=>a.uid===null||a.when==='skip'||a.mode==='skip'||a.uids?.length===0)||legal[0];
 const next=option(legal,'next')||legal[0];
 if(s.phase==='start')return next;
 if(s.phase==='move'){
  if(difficulty!=='hard')return next;
  const target=energyTarget(pack,s,difficulty),energy=universalEnergy(pack,s,s.active);
  const pl=s.players[s.active],catalog=packsOf(pack)[s.active].cards;
  return legal.find(a=>{
   if(a.type!=='move')return false;
   const c=pl.energy.find(c=>c?.uid===a.uid),d=catalog[c?.cardId];
   return d&&d.bp>=3000&&
    energy-universalCardEnergy(pack,s,s.active,c)>=target;
  })||next;
 }
 if(s.phase==='attack'){
  const attacks=legal.filter(a=>a.type==='attack');
  if(difficulty==='hard'){
   const catalog=packsOf(pack)[s.active].cards;
   attacks.sort((a,b)=>{
    const aCard=s.players[s.active].front.find(c=>c?.uid===a.uid);
    const bCard=s.players[s.active].front.find(c=>c?.uid===b.uid);
    return (catalog[bCard?.cardId]?.bp||0)-(catalog[aCard?.cardId]?.bp||0);
   });
  }
  return attacks[0]||next;
 }
 if(s.phase!=='main')return next;
 const energy=universalEnergy(pack,s,s.active),target=energyTarget(pack,s,difficulty);
 const byColor=universalEnergyByColor(pack,s,s.active);
 const hand=s.players[s.active].hand;
 const catalog=packsOf(pack)[s.active].cards;
 const energyPlays=legal.filter(a=>a.type==='play'&&a.line==='energy'&&cardFor(pack,s,a)?.gen>0);
 const frontPlays=legal.filter(a=>a.type==='play'&&a.line==='front');
 const events=legal.filter(a=>a.type==='event');
 const raids=legal.filter(a=>a.type==='raid');
 if(difficulty==='easy')return frontPlays[0]||energyPlays[0]||events[0]||raids[0]||next;
 // A multi-color deck cannot pay for a purple card with accumulated green
 // symbols. Hard/normal AI should build the colors its own hand needs.
 const missingColors=new Set(hand.map(c=>catalog[c.cardId])
  .filter(c=>c&&c.energy>(byColor[c.color]||0)).map(c=>c.color));
 const neededEnergy=energyPlays.filter(a=>missingColors.has(cardFor(pack,s,a)?.color));
 if(neededEnergy.length){
  neededEnergy.sort((a,b)=>
   (cardFor(pack,s,b)?.gen||0)-(cardFor(pack,s,a)?.gen||0));
  return neededEnergy[0];
 }
 if(energy<target&&energyPlays.length){
  energyPlays.sort((a,b)=>
   (cardFor(pack,s,b)?.gen||0)-(cardFor(pack,s,a)?.gen||0));
  return energyPlays[0];
 }
 if(difficulty==='hard'&&raids.length)return raids[0];
 const foeReady=s.players[1-s.active].front.some(c=>c?.ready);
 const activate=legal.find(a=>a.type==='activate'&&a.mode==='retireReady')||
  legal.find(a=>a.type==='activate'&&a.mode==='retireFieldThen')||
  legal.find(a=>a.type==='activate'&&a.mode==='readyAndBuff')||
  legal.find(a=>a.type==='activate'&&a.mode==='buff')||
  legal.find(a=>a.type==='activate'&&a.mode==='ready')||
  (foeReady?legal.find(a=>a.type==='activate'&&a.mode==='selfRestEnemy'):null)||
  legal.find(a=>a.type==='activate'&&a.mode==='selfRestThen')||
  legal.find(a=>a.type==='activate'&&a.mode==='selfRestBuff')||
  legal.find(a=>a.type==='activate'&&a.mode==='gunmenModes'&&a.effects?.includes('bp'))||
  legal.find(a=>a.type==='activate'&&a.mode==='restRetireTrait')||
  legal.find(a=>a.type==='activate'&&a.mode==='selfRestBuffHand')||
  legal.find(a=>a.type==='activate'&&a.mode==='restTraitBuff')||
  legal.find(a=>a.type==='activate'&&a.mode==='payApDrawEnergy')||
  legal.find(a=>a.type==='activate'&&a.mode==='restFrontGainEnergy')||
  legal.find(a=>a.type==='activate'&&a.mode==='selfRestEnergyRetire')||
  (difficulty==='hard'&&s.players[s.active].hand.length>1?
   legal.find(a=>a.type==='activate'&&a.mode==='discardSelfBuff'):null);
 if(activate&&difficulty!=='easy')return activate;
 if(frontPlays.length){
  frontPlays.sort((a,b)=> (cardFor(pack,s,b)?.bp||0)-(cardFor(pack,s,a)?.bp||0));
  return frontPlays[0];
 }
 return energyPlays[0]||raids[0]||events[0]||next;
}
