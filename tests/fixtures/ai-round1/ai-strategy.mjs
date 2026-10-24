// Pure bounded heuristic policy. No reducer, hidden match state or network.
// Numbers are utility estimates, NOT a second effects/battle rules engine.
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const field=p=>[...p.front,...p.energy].filter(Boolean);
const def=(packs,p,c)=>packs[p].cards[c?.cardId]||{};
const lifeValue=n=>n<=1?14:n<=3?6:3;
export function universalAiCardValue(d,c={}){
 return 1.2+Math.max(0,c.bp??d.bp??0)/1400+
  (c.impact??d.printedImpact??0)*1.5+
  Math.max(0,(c.damage??d.printedAttackDamage??1)-1)*1.4+
  (d.effects?.onAttack?.length?0.5:0)+(d.mainAbility?0.4:0);
}
function desiredEnergy(packs,o){
 const ids=Object.keys(o.ownDeckCounts);
 return Math.max(3,Math.min(6,Math.max(0,...ids.map(id=>def(packs,o.actor,{cardId:id}).energy||0))));
}
function handValue(packs,o,c){
 const p=o.players[o.actor],d=def(packs,o.actor,c);
 const shortage=Math.max(0,(d.energy||0)-(p.energyByColor[d.color]||0));
 const raidBase=d.raidName&&field(p).some(x=>def(packs,o.actor,x).name===d.raidName);
 return universalAiCardValue(d)*0.6+Math.min(2,d.gen||0)*0.35-shortage*0.35+(raidBase?1:0);
}
export function evaluateUniversalAiPosition(packs,o){
 const values=o.players.map((p,i)=>{
  const strength=sum(p.front.filter(Boolean).map(c=>universalAiCardValue(def(packs,i,c),c)+(c.ready?0.8:0)));
  const energy=Math.min(6,p.energyTotal)*1.6;
  const knownHand=i===o.actor?sum(p.hand.map(c=>handValue(packs,o,c))):p.handCount*1.8;
  // Outside is a modest potential resource, never equal to a card in hand.
  const recoverable=sum(p.outside.map(c=>Math.min(3,universalAiCardValue(def(packs,i,c)))))*0.08;
  return p.life*4-(p.life<=1?8:0)+strength+energy+knownHand+p.ap*0.5+recoverable;
 });
 if(o.status==='finished')return o.winner===o.actor?1e6:-1e6;
 return values[o.actor]-values[1-o.actor];
}
// Estimate public program utility only. Unknown opcodes get no speculative
// payoff; all actual costs, choices and resolution remain in the V2 reducer.
function programValue(packs,o,program,source,depth=0){
 if(depth>4)return 0;
 const own=o.players[o.actor],foe=o.players[1-o.actor],enemies=foe.front.filter(Boolean);
 const val=c=>universalAiCardValue(def(packs,1-o.actor,c),c);
 return sum((program||[]).map(e=>{
  if(e.op==='draw')return Math.min(e.count||1,Math.max(0,own.deckCount-1))*2;
  if(e.op==='drawDiscard')return 0.7;
  if(e.op==='restSilenceOppFrontIfOwnOutsideField')return own.outside.some(x=>def(packs,o.actor,x).type==='field')?Math.max(0,...enemies.map(c=>val(c)*0.8)):0;
  if(e.op==='recoverAp')return 1.5;
  if(['retireOppFrontUnderBp','retireOppFrontOneUnderBp','conditionalBounceOrRetireByOwnOutsideNames'].includes(e.op))
   return Math.max(0,...enemies.filter(c=>c.bp<=e.bp).map(val));
  if(e.op==='enemyBpDown')return Math.max(0,...enemies.map(c=>c.bp<=e.bp?val(c):c.ready?1.2:0.4));
  if(e.op==='retireOppFrontAllUnderBp')return sum(enemies.filter(c=>c.bp<=e.bp).map(val));
  if(e.op==='enemyFrontAllBpDown')return sum(enemies.map(c=>c.bp<=e.bp?val(c):0.6));
  if(['restOppFrontOne','restOppFrontUnderBp','restOrRetireOppFrontByLife','skipNextActiveOppRest'].includes(e.op))
   return Math.max(0,...enemies.filter(c=>c.ready&&(e.bp===undefined||c.bp<=e.bp)).map(c=>val(c)*0.55));
  if(['buffSelf','buffOwnField','buffOwnTrait','buffOwnTraitAllTurn','buffSelfUntilNextOwnStart'].includes(e.op)){
   const friends=own.front.filter(c=>c&&c.ready);
   return friends.length?Math.min(2.5,(e.bp||1000)/1000)*0.7:0;
  }
  if(['recoverOutsideOne','recoverOutsidePrintedBp','recoverOutsideColorUnderEnergy','recoverOutsideTraitlessUnderEnergy'].includes(e.op))
   return own.outside.length?2:0;
  if(['searchDeckOne','searchDeckMany','searchDeckWhere','searchTopOneBottomDiscard','searchTopUpToTwoBottom'].includes(e.op))return own.deckCount>1?1.5:0;
  if(e.op==='chooseOne')return Math.max(0,...(e.options||[]).map(x=>programValue(packs,o,x.then,source,depth+1)));
  if(['oncePerTurnGate','discardGate'].includes(e.op))return programValue(packs,o,e.then,source,depth+1)-(e.op==='discardGate'?1.8:0);
  if(e.op==='retireSourceOnPhaseEnd')return -universalAiCardValue(def(packs,o.actor,source),source)*0.8;
  return 0;
 }));
}
function energyGain(packs,o,d,produces=d.gen||0){
 const own=o.players[o.actor],target=desiredEnergy(packs,o),current=own.energyByColor[d.color]||0;
 const peak=Math.max(0,...own.hand.map(c=>def(packs,o.actor,c)).filter(x=>x.color===d.color).map(x=>x.energy||0));
 const need=Math.max(peak,Math.min(target,6));
 return Math.min(produces,Math.max(0,need-current))*4.8+
  Math.max(0,produces-Math.max(0,need-current))*0.12;
}
function deployment(packs,o,a,c,free=false){
 const own=o.players[o.actor],d=def(packs,o.actor,c);
 const value=universalAiCardValue(d);
 const line=a.line||'front',old=a.replaceUid?field(own).find(x=>x.uid===a.replaceUid):null;
 const base=a.baseUid?field(own).find(x=>x.uid===a.baseUid):null;
 const replacing=old?universalAiCardValue(def(packs,o.actor,old),old):0;
 let score=line==='energy'?energyGain(packs,o,d):value+(own.front.filter(Boolean).length<4?1:0);
 score-=replacing;
 if(base){
  score-=own.front.includes(base)?universalAiCardValue(def(packs,o.actor,base),base)*0.8:energyGain(packs,o,def(packs,o.actor,base),base.produces);
  // Raid preserves a destination slot and may earn a base onRaided effect.
  score+=2.5+(base.ready?0:1)+programValue(packs,o,def(packs,o.actor,base).effects?.onRaided,base);
 }
 score+=programValue(packs,o,d.effects?.onPlay,c);
 if(base)score+=programValue(packs,o,d.effects?.onRaid,c);
 if(d.type==='field')score+=programValue(packs,o,d.effects?.onRetire,c)*0.8;
 if(!free)score-=0.7+(d.ap||1)*0.8;
 // Don't turn a valuable attacker into a marginal excess producer.
 if(line==='energy')score-=value*0.15;
 return score;
}
function attackScore(packs,o,c,target){
 const own=o.players[o.actor],foe=o.players[1-o.actor];
 const value=universalAiCardValue(def(packs,o.actor,c),c);
 const blockers=foe.front.filter(x=>x&&x.ready);
 const reward=(c.damage||1)*lifeValue(foe.life);
 const trade=b=>c.bp>=b.bp?universalAiCardValue(def(packs,1-o.actor,b),b)+(c.impact||0)*lifeValue(foe.life):-value;
 let gain=target?trade(target):Math.min(reward,...blockers.map(trade));
 if(!target&&!blockers.length&&foe.life<(c.damage||1))gain+=1000;
 // V2 refreshes our field at turn end. Retaining a READY blocker only adds
 // value when a public restriction prevents that refresh; don't invent fatigue.
 const reserve=own.front.filter(x=>x?.ready&&x.uid!==c.uid).length;
 const pressure=foe.front.filter(Boolean).length;
 if(own.life<=2&&pressure>reserve+own.life&&
  c.restrictions?.some(r=>['cannotActive','skipNextActive'].includes(r.kind)))gain-=value*0.9;
 gain+=programValue(packs,o,def(packs,o.actor,c).effects?.onAttack,c);
 // Prefer a cheaper equally effective attacker, preserving high-value choices.
 return gain-value*0.04;
}
function pendingScore(packs,o,a){
 const q=o.pending,own=o.players[o.actor],foe=o.players[1-o.actor];
 const ownCards=[...field(own),...own.hand,...own.outside];
 const c=ownCards.find(c=>c.uid===a.uid),enemy=field(foe).find(c=>c.uid===a.uid);
 const info=o.choices.find(x=>JSON.stringify(x.action)===JSON.stringify(a));
 const visible=c||(info?.card?{cardId:info.card.cardId}:null);
 const value=c?universalAiCardValue(def(packs,o.actor,c),c):0;
 const enemyValue=enemy?universalAiCardValue(def(packs,1-o.actor,enemy),enemy):0;
 if(q.kind==='block'){
  const at=foe.front.find(c=>c?.uid===q.attackerUid);
  if(!at)return 0;
  const direct=(at.damage||1)*lifeValue(own.life);
  if(a.uid===null)return -direct-(own.life<(at.damage||1)?1000:0);
  if(c.bp>at.bp)return universalAiCardValue(def(packs,1-o.actor,at),at)-value*0.03;
  const impact=(at.impact||0)*lifeValue(own.life);
  // Healthy life is cheaper than losing a useful equal-BP character.
  return -value-impact-(own.life<(at.impact||0)?1000:0);
 }
 if(a.mode==='skip'||a.uid===null)return 0;
 if(['effect-discard','end-hand-limit','effect-discard-cost','effect-discard-gate','effect-selection-hand-payment','main-discard-buff','main-discard-self-retire'].includes(q.kind)){
  const cards=a.uids?a.uids.map(uid=>own.hand.find(c=>c.uid===uid)):[c];
  const cost=sum(cards.filter(Boolean).map(c=>handValue(packs,o,c)));
  return (['effect-discard-cost','effect-discard-gate'].includes(q.kind)?3:0)-cost;
 }
 if(q.kind==='effect-choice-mode')return programValue(packs,o,q.options?.find(x=>x.id===a.mode)?.then);
 if(a.line)return deployment(packs,o,a,visible,true);
 if(['effect-search-deck','effect-search-deck-multi','effect-recover-outside','effect-top-filter-choice','effect-top-filter-many-choice'].includes(q.kind))return visible?handValue(packs,o,visible):0.5;
 if(q.kind==='effect-top-order')return visible?-handValue(packs,o,visible):0;
 if(q.kind==='private-top-place'||q.kind==='private-top-choice'){
  const good=visible?handValue(packs,o,visible)>2:true;
  return (a.mode==='top')===good?1:0;
 }
 if(q.kind==='leave-replacement'){
  const protectedCard=field(own).find(x=>x.uid===q.uid);
  const loss=def(packs,o.actor,protectedCard).conditionalUnderFaceDown?.bp||0;
  const layers=o.legal.filter(x=>x.mode==='protect').length;
  return a.mode==='protect'?(protectedCard&&protectedCard.bp-(layers>1?0:loss)>0?1:-1):0;
 }
 if(['effect-retire-own-field','effect-retire-own-character','main-field-trait-retire'].includes(q.kind))
  return programValue(packs,o,q.after,c)+programValue(packs,o,def(packs,o.actor,c).effects?.onRetire,c)-value;
 if(['effect-bounce-own','main-rest-front-energy'].includes(q.kind))return -value;
 if(['effect-retire-bp','effect-target','effect-target-many','effect-strip-raid-top','effect-named-outside-bounce-retire'].includes(q.kind))return enemyValue+(enemy&&q.bp&&enemy.bp<=q.bp?3:0);
 if(['effect-rest-bp','effect-attack-ban'].includes(q.kind))return enemy?.ready?enemyValue*0.7:0.05;
 if(q.kind==='attack-end-swap')return c?(c.ready?1:0)+value*0.3:0;
 if(q.kind==='life-trigger'){
  if(a.mode==='final')return 1000;
  if(['special','colorRetire','colorBounce'].includes(a.mode))return enemyValue;
  if(a.mode==='colorRestSkip')return enemyValue*0.6;
  if(a.mode==='active')return c&&!c.ready?value:0;
  if(a.mode==='draw'||a.mode==='get')return 2;
  if(a.mode==='raid')return 3;
 }
 if(['effect-optional-draw','granted-attack-draw'].includes(q.kind))return own.deckCount>1?2:-2;
 if(q.kind==='effect-optional-mill')return own.deckCount>5?0.1:-1;
 if(q.kind==='effect-pay-ap-deploy')return own.ap>1?0.5:-0.5;
 if(q.kind==='effect-rest-tuck')return 0.5;
 if(q.kind==='effect-once-choice')return 0.5;
 if(q.kind==='effect-recover-ap')return 1;
 if(['effect-top-inspect','effect-top-inspect-many','effect-top-trait-outside'].includes(q.kind))return visible?2-handValue(packs,o,visible):0.1;
 if(q.kind==='raid-effect-order')return a.mode==='entryFirst'?0.1:0;
 // Remaining mandatory ordering is stable; positive target choices prefer
 // valuable own ready characters, with zero-score decline for optional choices.
 return c?value*0.3+(c.ready?0.3:0):a.uid?0.1:0;
}
export function rankUniversalAiActions(packs,o){
 const own=o.players[o.actor],foe=o.players[1-o.actor];
 const position=evaluateUniversalAiPosition(packs,o);
 return o.legal.map((action,index)=>{
  const a=action,c=[...own.hand,...field(own)].find(c=>c.uid===a.uid),d=def(packs,o.actor,c);
  let score=0;
  if(o.pending)score=pendingScore(packs,o,a);
  else if(a.type==='play'||a.type==='raid')score=deployment(packs,o,a,c);
  else if(a.type==='event')score=programValue(packs,o,d.effects?.onPlay,c)-(d.ap||1)*0.8-0.7;
  else if(a.type==='attack')score=attackScore(packs,o,c,foe.front.find(x=>x?.uid===a.targetUid));
  else if(a.type==='move'){
   score=c.bp<3000||own.energyTotal-(c.produces||0)<desiredEnergy(packs,o)?-10:
    universalAiCardValue(d,c)-0.5-(a.replaceUid?universalAiCardValue(def(packs,o.actor,own.front.find(x=>x?.uid===a.replaceUid))):0);
  }else if(a.type==='step')score=-1;
  else if(a.type==='extraDraw')score=own.hand.length<3&&own.deckCount>2?1:-1;
  else if(a.type==='activate'){
   const ab=d.mainAbility;
   score=programValue(packs,o,ab?.then,c);
   if(['ready','readyAndBuff','retireReady'].includes(a.mode))score+=c.ready?0:3;
   if(['buff','fieldOnceBuffOther','fieldRestBuffGroup'].includes(a.mode))score+=own.front.some(x=>x?.ready)?1.3:0;
   if(a.mode==='selfRestEnemy')score+=Math.max(0,...foe.front.filter(x=>x?.ready).map(x=>universalAiCardValue(def(packs,1-o.actor,x),x)*0.6));
   if(a.mode==='payApDrawEnergy')score+=own.deckCount>2?1:0;
   if(a.mode==='retireFieldThen')score+=Math.max(0,...own.energy.filter(x=>x&&def(packs,o.actor,x).type==='field').map(x=>programValue(packs,o,ab?.after,c)+programValue(packs,o,def(packs,o.actor,x).effects?.onRetire,x)-universalAiCardValue(def(packs,o.actor,x),x)));
   if(a.mode==='discardSelfBuff')score+=own.hand.length>3&&foe.front.some(x=>x&&x.bp>=c.bp&&x.bp<c.bp+(ab?.bp||0))?2.5:0;
   if(/^(selfRest|restDiscard|fieldRest)/.test(a.mode))score-=own.front.includes(c)?universalAiCardValue(d,c)*0.55:0.3;
   if(a.mode==='discardSelfBuff')score-=1.8;
   score-=0.05; // Unknown/no-benefit activation must not form loops.
  }
  return {action,score:position+score,utility:score,index};
 }).sort((a,b)=>b.score-a.score||(o.pending?.kind?.startsWith('effect-search-deck')?JSON.stringify(a.action).localeCompare(JSON.stringify(b.action)):a.index-b.index));
}
export function chooseStrategicUniversalAction(packs,o){return rankUniversalAiActions(packs,o)[0]?.action||null;}
