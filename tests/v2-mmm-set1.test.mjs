import test from 'node:test';
import assert from 'node:assert/strict';
import {MADOKA_CARDS} from '../dist/madoka-cards.mjs';
import {createMadokaV2Pack, mmmEngineKind} from '../dist/universal-v2/mmm-pack.mjs';
import {createUniversalPack, validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {madokaPracticeDeck, v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy, universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 s.players[p][line][slot]=card;
 return card;
}
// Q552: listed raid-box text is live only with a face-up card underneath.
// Pop the deck bottom so a top-of-deck marker stays put.
function bury(s,p,card){
 if(!card||(card.stack||[]).some(x=>x&&x.faceDown!==true))return card;
 const deck=s.players[p].deck;
 if(!deck.length)throw Error('No deck card to place under '+card.cardId);
 const under=deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(s,uid,kind){
 const action=legalUniversalActions(packs,s).find(a=>a.type===kind&&a.uid===uid&&
  (kind!=='play'||a.line==='front'));
 if(!action)throw Error('No '+kind+' for '+uid);
 return dispatchUniversalAction(packs,s,action);
}
function playLine(s,uid,line){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line);
 if(!action)throw Error('No play '+line+' for '+uid);
 return dispatchUniversalAction(packs,s,action);
}
function activates(s,uid,mode){
 return legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&a.uid===uid&&a.mode===mode);
}
function use(s,action){
 return dispatchUniversalAction(packs,s,action);
}
function setLife(s,p,n){
 const pl=s.players[p];
 while(pl.life.length>n)pl.deck.push(pl.life.pop());
}

test('Madoka catalogue stays outside the five-title census',()=>{
 assert.equal(MADOKA_CARDS.length,113);
 assert.equal(new Set(MADOKA_CARDS.map(c=>c.id)).size,113);
 assert.equal(MADOKA_CARDS.some(c=>c.id.includes('AP')||c.rarity==='AP'),false);
 assert.equal(MADOKA_CARDS.filter(c=>c.engineKind).length,113);
 assert.equal(Object.keys(pack.cards).length,186);
 assert.equal(pack.version,'mmm-ua31-ex16-20261029');
 assert.equal(V2_TITLE_IDS.includes('madoka'),false);
 for(const card of MADOKA_CARDS){
  assert.equal(card.effect,card.effectJa);
  assert.equal(card.name,card.nameJa);
  assert.equal(mmmEngineKind(card.effectJa),card.engineKind);
  assert.deepEqual(card.faq,[]);
  assert.equal(card.sets.length,card.printings.length);
 }
 const practice=madokaPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((n,x)=>n+x,0),50);
 assert.ok(Object.keys(practice.counts).every(id=>pack.cards[id].color==='red'));
 const editor=editorV2Status('madoka',practice.counts);
 assert.equal(editor.ready,true);
 assert.equal(editor.registered,186);
 const blocked=v2DeckReport('madoka',{'MMM-1-001':4,'MMM-1-006':46});
 assert.equal(blocked.ok,false);
 assert.match(blocked.issues.join('\n'),/exceeds/);
});

test('MMM-1-011 steps, and 029 rests an active front then draws 3',()=>{
 const counts=countsFor(['MMM-1-011','MMM-1-025','MMM-1-029','MMM-1-018','MMM-1-006']);
 let step=toPhase(fresh(counts,31011),'move');
 const mover=put(step,0,'MMM-1-011','front',0);
 assert.equal(pack.cards['MMM-1-011'].step,true);
 assert.equal(pack.cards['MMM-1-011'].implementation,'dsl');
 assert.ok(legalUniversalActions(packs,step).some(a=>a.type==='step'&&a.uid===mover.uid));

 let rest=toPhase(fresh(counts,31029),'main');
 put(rest,0,'MMM-1-011','energy',0);
 put(rest,0,'MMM-1-025','energy',1);
 const ally=put(rest,0,'MMM-1-006','front',0,true);
 const event=take(rest,0,'MMM-1-029');
 rest.players[0].hand.push(event);
 readyAp(rest);
 const deck=rest.players[0].deck.length;
 rest=play(rest,event.uid,'event');
 assert.equal(rest.pending.kind,'effect-rest-own');
 assert.equal(rest.pending.optional,false);
 assert.equal(legalUniversalActions(packs,rest).some(a=>a.uid===null),false);
 rest=use(rest,{type:'chooseOwnFrontRest',uid:ally.uid});
 assert.equal(rest.players[0].front[0].ready,false);
 assert.equal(rest.players[0].deck.length,deck-3);
 assert.equal(rest.pending,null);

 let quiet=toPhase(fresh(counts,31030),'main');
 put(quiet,0,'MMM-1-011','energy',0);
 put(quiet,0,'MMM-1-025','energy',1);
 const idle=take(quiet,0,'MMM-1-029');
 quiet.players[0].hand.push(idle);
 readyAp(quiet);
 const untouched=quiet.players[0].deck.length;
 quiet=play(quiet,idle.uid,'event');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,untouched);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('MMM-1-018 draws only after two outside events',()=>{
 const counts=countsFor(['MMM-1-011','MMM-1-018','MMM-1-030','MMM-1-006']);
 let open=toPhase(fresh(counts,31018),'main');
 put(open,0,'MMM-1-011','energy',0);
 put(open,0,'MMM-1-030','outside',0);
 const dry=take(open,0,'MMM-1-018');
 open.players[0].hand.push(dry);
 readyAp(open);
 const before=open.players[0].deck.length;
 open=play(open,dry.uid,'play');
 assert.equal(open.pending,null);
 assert.equal(open.players[0].deck.length,before);

 let live=toPhase(fresh(counts,31019),'main');
 put(live,0,'MMM-1-011','energy',0);
 const first=take(live,0,'MMM-1-030');
 const second=take(live,0,'MMM-1-030');
 live.players[0].outside.push(first,second);
 const mami=take(live,0,'MMM-1-018');
 live.players[0].hand.push(mami);
 readyAp(live);
 const deck=live.players[0].deck.length;
 live=play(live,mami.uid,'play');
 assert.equal(live.pending,null);
 assert.equal(live.players[0].deck.length,deck-1);
 assert.equal(assertUniversalMatch(packs,live),true);
});

test('MMM-1-064 retires from a 2000 floor plus 1000 per quintet',()=>{
 const counts=countsFor(['MMM-1-037','MMM-1-064','MMM-1-058','MMM-1-069','MMM-1-077']);
 let base=toPhase(fresh(counts,31064),'main');
 put(base,0,'MMM-1-037','energy',0);
 put(base,0,'MMM-1-037','energy',1);
 const small=put(base,1,'MMM-1-069','front',0);
 const mid=put(base,1,'MMM-1-077','front',1);
 const event=take(base,0,'MMM-1-064');
 base.players[0].hand.push(event);
 readyAp(base);
 base=play(base,event.uid,'event');
 assert.equal(base.pending.kind,'effect-retire-bp');
 assert.equal(base.pending.limit,2000);
 assert.deepEqual(base.pending.choices,[small.uid]);
 assert.equal(legalUniversalActions(packs,base).some(a=>a.uid===null),false);
 assert.equal(base.pending.choices.includes(mid.uid),false);

 let scaled=toPhase(fresh(counts,31065),'main');
 put(scaled,0,'MMM-1-037','energy',0);
 put(scaled,0,'MMM-1-037','energy',1);
 put(scaled,0,'MMM-1-058','front',0);
 const victim=put(scaled,1,'MMM-1-077','front',0);
 const again=take(scaled,0,'MMM-1-064');
 scaled.players[0].hand.push(again);
 readyAp(scaled);
 scaled=play(scaled,again.uid,'event');
 assert.equal(scaled.pending.limit,3000);
 assert.ok(scaled.pending.choices.includes(victim.uid));
 scaled=use(scaled,{type:'chooseRetireBp',uid:victim.uid});
 assert.ok(scaled.players[1].outside.some(c=>c.uid===victim.uid));
 assert.equal(assertUniversalMatch(packs,scaled),true);
});

test('MMM-1-077 adds red energy only at three other magical-girl names',()=>{
 const counts=countsFor(['MMM-1-077','MMM-1-009','MMM-1-014','MMM-1-112']);
 let few=fresh(counts,31077);
 const self=put(few,0,'MMM-1-077','energy',0);
 put(few,0,'MMM-1-009','energy',1);
 put(few,0,'MMM-1-014','front',0);
 assert.equal(universalCardEnergy(packs,few,0,self),1);
 let full=fresh(counts,31078);
 const source=put(full,0,'MMM-1-077','energy',0);
 put(full,0,'MMM-1-009','energy',1);
 put(full,0,'MMM-1-014','energy',2);
 put(full,0,'MMM-1-112','front',0);
 assert.equal(universalCardEnergy(packs,full,0,source),2);
 assert.equal(universalEnergyByColor(packs,full,0).red,2);
 assert.equal(assertUniversalMatch(packs,full),true);
});

test('MMM-1-078 optional retirement uses other magical-girl names',()=>{
 const counts=countsFor(['MMM-1-085','MMM-1-078','MMM-1-009','MMM-1-014','MMM-1-069']);
 let none=toPhase(fresh(counts,31080),'main');
 put(none,0,'MMM-1-085','energy',0);
 put(none,0,'MMM-1-085','energy',1);
 put(none,0,'MMM-1-069','energy',2);
 const solo=take(none,0,'MMM-1-078');
 none.players[0].hand.push(solo);
 readyAp(none);
 bury(none,0,solo);
 none=play(none,solo.uid,'play');
 assert.equal(none.pending,null);

 let named=toPhase(fresh(counts,31081),'main');
 put(named,0,'MMM-1-085','energy',0);
 put(named,0,'MMM-1-085','energy',1);
 put(named,0,'MMM-1-069','energy',2);
 put(named,0,'MMM-1-009','front',0);
 put(named,0,'MMM-1-014','front',1);
 const low=put(named,1,'MMM-1-069','front',0);
 const raider=take(named,0,'MMM-1-078');
 named.players[0].hand.push(raider);
 readyAp(named);
 bury(named,0,raider);
 named=play(named,raider.uid,'play');
 assert.equal(named.pending.kind,'effect-retire-bp');
 assert.equal(named.pending.limit,2000);
 assert.equal(named.pending.optional,true);
 assert.ok(named.pending.choices.includes(low.uid));
 named=use(named,{type:'chooseRetireBp',uid:null});
 assert.equal(named.players[1].front[0].uid,low.uid);
 assert.equal(assertUniversalMatch(packs,named),true);
});

test('MMM-1-080 gains 1000 BP only after a life card reaches hand, and 092 draws 2',()=>{
 const counts=countsFor(['MMM-1-085','MMM-1-080','MMM-1-092']);
 let taken=toPhase(fresh(counts,31092),'main');
 put(taken,0,'MMM-1-085','energy',0);
 const kyoko=put(taken,0,'MMM-1-080','front',0);
 assert.equal(universalBp(packs,taken,kyoko),3000);
 const event=take(taken,0,'MMM-1-092');
 taken.players[0].hand.push(event);
 readyAp(taken);
 const life=taken.players[0].life[0];
 const deck=taken.players[0].deck.length;
 taken=play(taken,event.uid,'event');
 assert.equal(taken.pending.kind,'effect-life-to-hand');
 assert.equal(universalBp(packs,taken,kyoko),3000);
 taken=use(taken,{type:'chooseLifeToHand',uid:life.uid});
 assert.ok(taken.players[0].hand.some(c=>c.uid===life.uid));
 assert.equal(taken.players[0].deck.length,deck-2);
 assert.equal(universalBp(packs,taken,kyoko),4000);

 let skipped=toPhase(fresh(counts,31093),'main');
 put(skipped,0,'MMM-1-085','energy',0);
 const quiet=put(skipped,0,'MMM-1-080','front',0);
 const other=take(skipped,0,'MMM-1-092');
 skipped.players[0].hand.push(other);
 readyAp(skipped);
 const stay=skipped.players[0].deck.length;
 skipped=play(skipped,other.uid,'event');
 skipped=use(skipped,{type:'chooseLifeToHand',uid:null});
 assert.equal(skipped.players[0].deck.length,stay);
 assert.equal(universalBp(packs,skipped,quiet),3000);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('MMM-1-093 raises the retirement cap only when Sayaka is on the field and life is 5 or less',()=>{
 const counts=countsFor(['MMM-1-085','MMM-1-093','MMM-1-087','MMM-1-069','MMM-1-020']);
 function scene(seed,life,withSayaka){
  let s=toPhase(fresh(counts,seed),'main');
  put(s,0,'MMM-1-085','energy',0);
  put(s,0,'MMM-1-085','energy',1);
  if(withSayaka)put(s,0,'MMM-1-087','front',0);
  const low=put(s,1,'MMM-1-069','front',0);
  const high=put(s,1,'MMM-1-020','front',1);
  setLife(s,0,life);
  const event=take(s,0,'MMM-1-093');
  s.players[0].hand.push(event);
  readyAp(s);
  return {s,event,low,high};
 }
 const namedHigh=scene(31094,6,true);
 let capped=play(namedHigh.s,namedHigh.event.uid,'event');
 assert.equal(capped.pending.limit,3000);
 assert.deepEqual(capped.pending.choices,[namedHigh.low.uid]);
 let blocked=toPhase(fresh(counts,31097),'main');
 put(blocked,0,'MMM-1-085','energy',0);
 put(blocked,0,'MMM-1-085','energy',1);
 put(blocked,0,'MMM-1-087','front',0);
 put(blocked,1,'MMM-1-020','front',0);
 setLife(blocked,0,6);
 const denied=take(blocked,0,'MMM-1-093');
 blocked.players[0].hand.push(denied);
 readyAp(blocked);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===denied.uid),false);

 const lifeOnly=scene(31095,5,false);
 let s=play(lifeOnly.s,lifeOnly.event.uid,'event');
 assert.equal(s.pending.limit,3000);
 assert.deepEqual(s.pending.choices,[lifeOnly.low.uid]);

 const both=scene(31096,5,true);
 s=play(both.s,both.event.uid,'event');
 assert.equal(s.pending.limit,5000);
 assert.equal(s.pending.optional,undefined);
 assert.ok(s.pending.choices.includes(both.low.uid));
 assert.ok(s.pending.choices.includes(both.high.uid));
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=use(s,{type:'chooseRetireBp',uid:both.high.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===both.high.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-099 costs 1 AP while Kyoko is on the field and may retire BP 5000',()=>{
 const counts=countsFor(['MMM-1-085','MMM-1-099','MMM-1-009','MMM-1-087','MMM-1-020']);
 let discounted=toPhase(fresh(counts,31099),'main');
 put(discounted,0,'MMM-1-085','energy',0);
 put(discounted,0,'MMM-1-085','energy',1);
 put(discounted,0,'MMM-1-009','front',0);
 const victim=put(discounted,1,'MMM-1-020','front',0);
 const event=take(discounted,0,'MMM-1-099');
 discounted.players[0].hand.push(event);
 readyAp(discounted,0,1);
 assert.ok(legalUniversalActions(packs,discounted).some(a=>a.type==='event'&&a.uid===event.uid));
 discounted=play(discounted,event.uid,'event');
 assert.equal(discounted.pending.kind,'effect-retire-bp');
 assert.equal(discounted.pending.limit,5000);
 assert.equal(discounted.pending.optional,true);
 assert.ok(discounted.pending.choices.includes(victim.uid));

 let full=toPhase(fresh(counts,31100),'main');
 put(full,0,'MMM-1-085','energy',0);
 put(full,0,'MMM-1-085','energy',1);
 put(full,0,'MMM-1-087','front',0);
 const costly=take(full,0,'MMM-1-099');
 full.players[0].hand.push(costly);
 readyAp(full,0,1);
 assert.equal(legalUniversalActions(packs,full).some(a=>a.type==='event'&&a.uid===costly.uid),false);
 readyAp(full,0,2);
 assert.ok(legalUniversalActions(packs,full).some(a=>a.type==='event'&&a.uid===costly.uid));
 assert.equal(assertUniversalMatch(packs,full),true);
});

test('MMM-1-103 adds a magical girl other than Madoka, then discards',()=>{
 const counts=countsFor(['MMM-1-085','MMM-1-103','MMM-1-006','MMM-1-009','MMM-1-014','MMM-1-068']);
 let s=toPhase(fresh(counts,31103),'main');
 put(s,0,'MMM-1-085','energy',0);
 const window=['MMM-1-009','MMM-1-006','MMM-1-068','MMM-1-014'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const spare=s.players[0].deck.pop();
 s.players[0].hand.push(spare);
 const madoka=take(s,0,'MMM-1-103');
 s.players[0].hand.push(madoka);
 readyAp(s);
 s=play(s,madoka.uid,'play');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.ok(s.pending.choices.includes(window[0].uid));
 assert.ok(s.pending.choices.includes(window[3].uid));
 assert.equal(s.pending.choices.includes(window[1].uid),false);
 assert.equal(s.pending.choices.includes(window[2].uid),false);
 s=use(s,{type:'chooseTopFiltered',uid:window[0].uid});
 while(s.pending?.kind==='effect-top-order'){
  s=use(s,{type:'chooseTopOrder',uid:s.pending.uids.find(uid=>!s.pending.order.includes(uid))});
 }
 assert.equal(s.pending.kind,'effect-discard');
 s=use(s,{type:'chooseDiscard',uid:spare.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===spare.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-112 returns one Madoka of energy 2 or less from outside when she retires',()=>{
 const counts=countsFor(['MMM-1-112','MMM-1-078','MMM-1-103']);
 let s=toPhase(fresh(counts,31112),'attack');
 const wall=put(s,1,'MMM-1-112','front',0,true);
 const low=take(s,1,'MMM-1-103');
 const high=take(s,1,'MMM-1-078');
 s.players[1].outside.push(low,high);
 const striker=put(s,0,'MMM-1-078','front',0,true);
 assert.ok(universalBp(packs,s,striker)>=universalBp(packs,s,wall));
 s=use(s,{type:'attack',uid:striker.uid});
 s=use(s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.player,1);
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(high.uid),false);
 s=use(s,{type:'chooseOutsideRecovery',uid:low.uid});
 assert.ok(s.players[1].hand.some(c=>c.uid===low.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===high.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-049 grants impact 1 to another character only on its entry turn',()=>{
 const counts=countsFor(['MMM-1-049','MMM-1-061','MMM-1-006']);
 let alone=toPhase(fresh(counts,31049),'main');
 put(alone,0,'MMM-1-061','energy',0);
 put(alone,0,'MMM-1-061','energy',1);
 const solo=take(alone,0,'MMM-1-049');
 alone.players[0].hand.push(solo);
 readyAp(alone);
 alone=play(alone,solo.uid,'play');
 assert.equal(alone.pending,null);
 assert.equal(activates(alone,solo.uid,'entryOtherImpact').length,0);
 const ally=take(alone,0,'MMM-1-006');
 alone.players[0].hand.push(ally);
 alone=play(alone,ally.uid,'play');
 assert.equal(activates(alone,solo.uid,'entryOtherImpact').length,1);
 alone=use(alone,{type:'activate',uid:solo.uid,mode:'entryOtherImpact'});
 assert.equal(alone.pending.kind,'effect-entry-other-impact');
 assert.equal(alone.pending.optional,false);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.uid===null),false);
 assert.ok(alone.pending.choices.includes(ally.uid));
 assert.equal(alone.pending.choices.includes(solo.uid),false);
 alone=use(alone,{type:'chooseEntryImpact',uid:ally.uid});
 const granted=alone.players[0].front.find(c=>c?.uid===ally.uid);
 assert.equal(granted.impactGranted.amount,1);
 assert.equal(granted.impactGranted.turn,alone.turn);
 assert.equal(granted.impactGranted.stamp,granted.fieldEntryStamp);
 assert.equal(activates(alone,solo.uid,'entryOtherImpact').length,0);
 alone.players[0].front.find(c=>c?.uid===solo.uid).entryTurn=alone.turn-1;
 alone.mainAbilityUsedUids=[];
 assert.equal(activates(alone,solo.uid,'entryOtherImpact').length,0);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

test('MMM-1-052 actives itself once when live BP is at least 5000',()=>{
 const counts=countsFor(['MMM-1-052','MMM-1-037','MMM-1-006']);
 let s=toPhase(fresh(counts,31052),'main');
 const kyoko=put(s,0,'MMM-1-052','front',0,false);
 assert.equal(universalBp(packs,s,kyoko),4000);
 assert.equal(activates(s,kyoko.uid,'bpActive').length,0);
 kyoko.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,kyoko),5000);
 assert.equal(activates(s,kyoko.uid,'bpActive').length,1);
 s=use(s,{type:'activate',uid:kyoko.uid,mode:'bpActive'});
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(activates(s,kyoko.uid,'bpActive').length,0);
 const live=put(s,0,'MMM-1-052','energy',0,true);
 live.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(activates(s,live.uid,'bpActive').length,1);
 s=use(s,{type:'activate',uid:live.uid,mode:'bpActive'});
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(activates(s,live.uid,'bpActive').length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-061 rests, discards one, draws one, and can pay again',()=>{
 const counts=countsFor(['MMM-1-061','MMM-1-037','MMM-1-006']);
 let s=toPhase(fresh(counts,31061),'main');
 const field=put(s,0,'MMM-1-061','energy',0,true);
 field.fieldEntryStamp=1;
 const payment=s.players[0].hand[0];
 const deck=s.players[0].deck.length;
 assert.equal(activates(s,field.uid,'fieldDiscardDraw').length,1);
 s.players[0].outside.push(...s.players[0].hand.splice(0));
 assert.equal(activates(s,field.uid,'fieldDiscardDraw').length,0);
 s.players[0].hand.push(s.players[0].outside.pop());
 s=use(s,{type:'activate',uid:field.uid,mode:'fieldDiscardDraw'});
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(s.pending.optional,false);
 const paid=s.players[0].hand[0];
 s=use(s,{type:'chooseDiscardGate',uid:paid.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===paid.uid));
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending,null);
 assert.equal(activates(s,field.uid,'fieldDiscardDraw').length,0);
 s.players[0].energy[0].ready=true;
 assert.equal(activates(s,field.uid,'fieldDiscardDraw').length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-091 enters active and rests to give a magical girl BP+500',()=>{
 const counts=countsFor(['MMM-1-091','MMM-1-085','MMM-1-037']);
 let empty=toPhase(fresh(counts,31091),'main');
 const quiet=put(empty,0,'MMM-1-091','energy',0,true);
 put(empty,0,'MMM-1-037','front',0);
 assert.equal(quiet.ready,true);
 assert.equal(activates(empty,quiet.uid,'fieldTraitBuff').length,0);

 let s=toPhase(fresh(counts,31092),'main');
 put(s,0,'MMM-1-085','energy',0);
 put(s,0,'MMM-1-085','energy',1);
 const bystander=put(s,0,'MMM-1-037','front',1);
 const town=take(s,0,'MMM-1-091');
 s.players[0].hand.push(town);
 readyAp(s);
 s=playLine(s,town.uid,'energy');
 const placed=s.players[0].energy.find(c=>c?.uid===town.uid);
 const girl=s.players[0].energy[0];
 const before=universalBp(packs,s,girl);
 assert.equal(placed.ready,true);
 assert.equal(activates(s,town.uid,'fieldTraitBuff').length,1);
 s=use(s,{type:'activate',uid:town.uid,mode:'fieldTraitBuff'});
 assert.equal(s.players[0].energy.find(c=>c?.uid===town.uid).ready,false);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,false);
 assert.ok(s.pending.choices.includes(girl.uid));
 assert.equal(s.pending.choices.includes(bystander.uid),false);
 s=use(s,{type:'chooseOwnBuff',uid:girl.uid});
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),before+500);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-089 gains 500 BP at 4 life on its turn, then actives after taking life',()=>{
 const counts=countsFor(['MMM-1-089','MMM-1-085']);
 assert.deepEqual(pack.cards['MMM-1-089'].triggerEffect,{op:'retireOppFrontUnderBp',bp:2500});
 let s=toPhase(fresh(counts,31089),'main');
 const sayaka=put(s,0,'MMM-1-089','front',0,false);
 assert.equal(s.players[0].life.length,7);
 assert.equal(universalBp(packs,s,sayaka),3500);
 setLife(s,0,5);
 assert.equal(universalBp(packs,s,sayaka),3500);
 setLife(s,0,4);
 assert.equal(universalBp(packs,s,sayaka),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,sayaka),3500);
 s.active=0;
 assert.equal(universalBp(packs,s,sayaka),4000);
 const deck=s.players[0].deck.length;
 const life=s.players[0].life[0];
 assert.equal(activates(s,sayaka.uid,'lifeActive').length,1);
 s=use(s,{type:'activate',uid:sayaka.uid,mode:'lifeActive'});
 assert.equal(s.pending.kind,'effect-life-active-self');
 assert.equal(s.pending.optional,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=use(s,{type:'chooseLifeActive',uid:life.uid});
 assert.equal(s.players[0].front[0].ready,true);
 assert.ok(s.players[0].hand.some(c=>c.uid===life.uid));
 assert.equal(s.players[0].life.length,3);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(activates(s,sayaka.uid,'lifeActive').length,0);
 assert.equal(s.status,'playing');
 setLife(s,0,0);
 assert.equal(activates(s,sayaka.uid,'lifeActive').length,0);
 let last=toPhase(fresh(counts,31090),'main');
 const closer=put(last,0,'MMM-1-089','front',0,false);
 setLife(last,0,1);
 const finalLife=last.players[0].life[0];
 last=use(last,{type:'activate',uid:closer.uid,mode:'lifeActive'});
 last=use(last,{type:'chooseLifeActive',uid:finalLife.uid});
 assert.equal(last.players[0].front[0].ready,true);
 assert.equal(last.players[0].life.length,0);
 assert.equal(last.status,'finished');
 assert.equal(last.endReason,'life-zero');
});

test('MMM-1-033 rests one opposing front, and skips the next active only with Mami and two outside events',()=>{
 const counts=countsFor(['MMM-1-033','MMM-1-011','MMM-1-018','MMM-1-030','MMM-1-006']);
 let plain=toPhase(fresh(counts,31033),'main');
 put(plain,0,'MMM-1-011','energy',0);
 put(plain,0,'MMM-1-011','energy',1);
 const victim=put(plain,1,'MMM-1-006','front',0,true);
 const event=take(plain,0,'MMM-1-033');
 plain.players[0].hand.push(event);
 readyAp(plain);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.type==='event'&&a.uid===event.uid),true);
 const blocked=toPhase(fresh(counts,31034),'main');
 put(blocked,0,'MMM-1-011','energy',0);
 put(blocked,0,'MMM-1-011','energy',1);
 const lonely=take(blocked,0,'MMM-1-033');
 blocked.players[0].hand.push(lonely);
 readyAp(blocked);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===lonely.uid),false);
 plain=play(plain,event.uid,'event');
 assert.equal(plain.pending.kind,'effect-rest-bp');
 assert.equal(plain.pending.skipNextActive,false);
 plain=use(plain,{type:'chooseRestBp',uid:victim.uid});
 assert.equal(plain.players[1].front[0].ready,false);
 assert.equal(plain.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 const again=take(plain,0,'MMM-1-033');
 plain.players[0].hand.push(again);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.type==='event'&&a.uid===again.uid),false);

 let upgraded=toPhase(fresh(counts,31035),'main');
 put(upgraded,0,'MMM-1-011','energy',0);
 put(upgraded,0,'MMM-1-011','energy',1);
 put(upgraded,0,'MMM-1-018','front',0);
 put(upgraded,0,'MMM-1-030','outside',0);
 const marked=put(upgraded,1,'MMM-1-006','front',0,true);
 const scary=take(upgraded,0,'MMM-1-033');
 upgraded.players[0].hand.push(scary);
 readyAp(upgraded);
 upgraded=play(upgraded,scary.uid,'event');
 assert.equal(upgraded.pending.skipNextActive,true);
 upgraded=use(upgraded,{type:'chooseRestBp',uid:marked.uid});
 assert.equal(upgraded.players[1].front[0].ready,false);
 assert.equal(upgraded.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===marked.uid),true);
 assert.equal(assertUniversalMatch(packs,upgraded),true);
});

test('MMM-1-034 draws 2, and actives one AP only after an event is discarded',()=>{
 const counts=countsFor(['MMM-1-034','MMM-1-011','MMM-1-030','MMM-1-006']);
 let s=toPhase(fresh(counts,31036),'main');
 put(s,0,'MMM-1-011','energy',0);
 put(s,0,'MMM-1-011','energy',1);
 const eventCard=take(s,0,'MMM-1-030');
 const girl=take(s,0,'MMM-1-006');
 s.players[0].hand.push(eventCard,girl);
 const event=take(s,0,'MMM-1-034');
 s.players[0].hand.push(event);
 readyAp(s);
 const deck=s.players[0].deck.length;
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deck-2);
 s.players[0].apCards[0].ready=false;
 s=use(s,{type:'chooseDiscard',uid:girl.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===girl.uid));
 const second=take(s,0,'MMM-1-034');
 s.players[0].hand.push(second);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===second.uid),false);

 let ap=toPhase(fresh(counts,31037),'main');
 put(ap,0,'MMM-1-011','energy',0);
 put(ap,0,'MMM-1-011','energy',1);
 const discarded=take(ap,0,'MMM-1-030');
 ap.players[0].hand.push(discarded);
 const spell=take(ap,0,'MMM-1-034');
 ap.players[0].hand.push(spell);
 readyAp(ap);
 ap=play(ap,spell.uid,'event');
 ap.players[0].apCards[0].ready=false;
 ap=use(ap,{type:'chooseDiscard',uid:discarded.uid});
 assert.equal(ap.pending.kind,'effect-recover-ap');
 assert.equal(ap.pending.optional,true);
 assert.ok(legalUniversalActions(packs,ap).some(a=>a.uid===null));
 ap=use(ap,{type:'chooseApRecovery',uid:ap.players[0].apCards[0].uid});
 assert.equal(ap.players[0].apCards[0].ready,true);
 assert.equal(ap.pending,null);
 assert.equal(assertUniversalMatch(packs,ap),true);
});

function readyCount(s,p=0){
 return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;
}
function fuelPurple(s){
 put(s,0,'MMM-1-037','energy',0);
 put(s,0,'MMM-1-037','energy',1);
}
function handPlay(s,id){
 const card=take(s,0,id);
 s.players[0].hand.push(card);
 return card;
}

test('MMM-1-062 grants front BP and impact, then draws only with Homura',()=>{
 const counts=countsFor(['MMM-1-037','MMM-1-062','MMM-1-006','MMM-1-039']);
 let alone=toPhase(fresh(counts,31062),'main');
 fuelPurple(alone);
 const madoka=handPlay(alone,'MMM-1-006');
 readyAp(alone);
 alone=play(alone,madoka.uid,'play');
 const girl=alone.players[0].front.find(c=>c.uid===madoka.uid);
 const dry=handPlay(alone,'MMM-1-062');
 const deck=alone.players[0].deck.length;
 alone=play(alone,dry.uid,'event');
 assert.equal(alone.pending.kind,'effect-front-grant');
 assert.equal(alone.pending.optional,false);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.uid===null),false);
 assert.deepEqual(alone.pending.choices,[girl.uid]);
 alone=use(alone,{type:'chooseFrontGrant',uid:girl.uid});
 const boosted=alone.players[0].front.find(c=>c.uid===girl.uid);
 assert.equal(universalBp(packs,alone,boosted),3500);
 assert.deepEqual(boosted.impactPlus,{turn:alone.turn,stamp:boosted.fieldEntryStamp,amount:1});
 assert.equal(alone.players[0].deck.length,deck);
 assert.equal(alone.pending,null);

 let both=toPhase(fresh(counts,31063),'main');
 fuelPurple(both);
 const homura=handPlay(both,'MMM-1-039');
 const other=handPlay(both,'MMM-1-006');
 readyAp(both);
 both=play(both,homura.uid,'play');
 both=play(both,other.uid,'play');
 const spell=handPlay(both,'MMM-1-062');
 const before=both.players[0].deck.length;
 both=play(both,spell.uid,'event');
 const chosen=both.players[0].front.find(c=>c.uid===other.uid);
 both=use(both,{type:'chooseFrontGrant',uid:chosen.uid});
 assert.equal(both.players[0].deck.length,before-1);
 const flame=both.players[0].front.find(c=>c.uid===homura.uid);
 const marked=both.players[0].front.find(c=>c.uid===other.uid);
 assert.equal(marked.impactPlus.amount,1);
 assert.equal(flame.impactPlus,undefined);
 assert.equal(universalBp(packs,both,marked),3500);
 assert.equal(assertUniversalMatch(packs,both),true);

 let empty=toPhase(fresh(counts,31064),'main');
 fuelPurple(empty);
 const blocked=handPlay(empty,'MMM-1-062');
 readyAp(empty);
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.type==='event'&&a.uid===blocked.uid),false);
});

test('MMM-1-067 cuts AP only for the chosen Homura and grants a second attack',()=>{
 const counts=countsFor(['MMM-1-037','MMM-1-067','MMM-1-006','MMM-1-039']);
 let cheap=toPhase(fresh(counts,31067),'main');
 fuelPurple(cheap);
 const homura=handPlay(cheap,'MMM-1-039');
 const madoka=handPlay(cheap,'MMM-1-006');
 readyAp(cheap);
 cheap=play(cheap,homura.uid,'play');
 cheap=play(cheap,madoka.uid,'play');
 const flame=cheap.players[0].front.find(c=>c.uid===homura.uid);
 const event=handPlay(cheap,'MMM-1-067');
 readyAp(cheap,0,1);
 const offers=legalUniversalActions(packs,cheap).filter(a=>a.type==='event'&&a.uid===event.uid);
 assert.deepEqual(offers.map(a=>a.targetUid),[flame.uid]);
 assert.equal(offers.some(a=>a.targetUid===undefined),false);
 cheap=use(cheap,offers[0]);
 assert.equal(readyCount(cheap),0);
 const granted=cheap.players[0].front.find(c=>c.uid===flame.uid);
 assert.equal(universalBp(packs,cheap,granted),3000);
 assert.equal(granted.readyOnAttackGranted.sourceUid,event.uid);
 assert.equal(granted.paidTargetUid,undefined);
 granted.ready=true;
 cheap=toPhase(cheap,'attack');
 const attacker=cheap.players[0].front.find(c=>c.uid===flame.uid);
 cheap=use(cheap,legalUniversalActions(packs,cheap).find(a=>
  a.type==='attack'&&a.uid===attacker.uid&&a.targetUid===undefined));
 assert.equal(cheap.players[0].front.find(c=>c.uid===flame.uid).ready,true);
 assert.equal(cheap.attacksByUid[flame.uid],1);

 let full=toPhase(fresh(counts,31068),'main');
 fuelPurple(full);
 const named=handPlay(full,'MMM-1-039');
 const plain=handPlay(full,'MMM-1-006');
 readyAp(full,0,3);
 full=play(full,named.uid,'play');
 full=play(full,plain.uid,'play');
 const spell=handPlay(full,'MMM-1-067');
 readyAp(full,0,2);
 const both=legalUniversalActions(packs,full).filter(a=>a.type==='event'&&a.uid===spell.uid);
 assert.deepEqual(both.map(a=>a.targetUid).sort(),[named.uid,plain.uid].sort());
 full=use(full,both.find(a=>a.targetUid===plain.uid));
 assert.equal(readyCount(full),0);
 const unmarked=full.players[0].front.find(c=>c.uid===named.uid);
 const marked=full.players[0].front.find(c=>c.uid===plain.uid);
 assert.equal(universalBp(packs,full,marked),2500);
 assert.equal(unmarked.readyOnAttackGranted,undefined);
 assert.equal(marked.readyOnAttackGranted.turn,full.turn);
 assert.equal(assertUniversalMatch(packs,full),true);
});

function fuelYellow(s){
 put(s,0,'MMM-1-011','energy',0);
 put(s,0,'MMM-1-011','energy',1);
}

test('MMM-1-022, 024 and 111 do not fire removed-entry text from hand',()=>{
 const counts=countsFor(['MMM-1-011','MMM-1-022','MMM-1-024','MMM-1-111','MMM-1-006']);
 let nagisa=toPhase(fresh(counts,31022),'main');
 fuelYellow(nagisa);
 const girl=handPlay(nagisa,'MMM-1-022');
 readyAp(nagisa);
 const deck=nagisa.players[0].deck.length;
 nagisa=play(nagisa,girl.uid,'play');
 const entered=nagisa.players[0].front.find(c=>c.uid===girl.uid);
 assert.equal(nagisa.pending,null);
 assert.equal(nagisa.players[0].deck.length,deck);
 assert.equal(universalBp(packs,nagisa,entered),4000);
 nagisa=toPhase(nagisa,'start');
 assert.equal(nagisa.active,1);
 assert.equal(universalBp(packs,nagisa,nagisa.players[0].front.find(c=>c.uid===girl.uid)),3000);

 let look=toPhase(fresh(counts,31024),'main');
 fuelYellow(look);
 const sayaka=handPlay(look,'MMM-1-024');
 readyAp(look);
 look=play(look,sayaka.uid,'play');
 assert.equal(look.pending,null);

 let impact=toPhase(fresh(counts,31111),'main');
 fuelYellow(impact);
 const big=handPlay(impact,'MMM-1-111');
 readyAp(impact);
 impact=play(impact,big.uid,'play');
 assert.equal(impact.pending,null);
 assert.equal(pack.cards['MMM-1-111'].impactNull,true);
 assert.equal(assertUniversalMatch(packs,impact),true);
});

test('removed-area entry draws once per name, looks, or actives another',()=>{
 const unit=(id,extra)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:2000,
  gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const cards=[
  unit('NAG',{name:'百江 なぎさ',implementation:'dsl',ownTurnBp:1000,effects:{onPlay:[{
   op:'ifEnteredFromRemoved',then:[{op:'oncePerTurnGate',scope:'name',optional:false,
    then:[{op:'draw',count:1}]}]}]}}),
  unit('LOOK',{implementation:'dsl',effects:{onPlay:[{op:'ifEnteredFromRemoved',then:[
   {op:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]}]}}),
  unit('ACT',{implementation:'dsl',impactNull:true,effects:{onPlay:[{op:'ifEnteredFromRemoved',
   then:[{op:'activeOwnOther',optional:true}]}]}}),
  unit('ENT',{type:'event',bp:0,gen:0,implementation:'dsl',effects:{onPlay:[
   {op:'restEnterRemovedOne',optional:true}]}}),
  ...['A','B','C','D','E','F','G','H','I'].map(id=>unit(id))
 ];
 const lab=createUniversalPack({id:'madoka-removed-lab',version:'lab',cards});
 const group=[lab,lab];
 const ids=cards.map(c=>c.id);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 function boot(seed){
  let state=newUniversalMatch(group,{decks:[counts,counts],seed,first:0});
  for(let n=0;n<8&&state.phase!=='main';n++)
   state=dispatchUniversalAction(group,state,{type:'next'});
  return state;
 }
 function lift(state,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const pile=state.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error('Missing '+id);
 }
 function enterRemoved(state,uid){
  const card=state.players[0].removed.find(c=>c.uid===uid);
  if(!card)throw Error('Removed character missing');
  const event=lift(state,'ENT');
  state.players[0].hand.push(event);
  readyAp(state);
  const deck=state.players[0].deck.length;
  state=dispatchUniversalAction(group,state,legalUniversalActions(group,state)
   .find(a=>a.type==='event'&&a.uid===event.uid));
  assert.equal(state.pending.kind,'effect-removed-enter');
  const choice=legalUniversalActions(group,state).find(a=>a.type==='chooseRemovedEnter'&&
   a.uid===card.uid&&a.line==='front');
  state=dispatchUniversalAction(group,state,choice);
  return {state,drew:deck-state.players[0].deck.length};
 }
 let draw=boot(32022);
 const first=lift(draw,'NAG'),second=lift(draw,'NAG');
 draw.players[0].removed.push(first,second);
 const opened=enterRemoved(draw,first.uid);
 draw=opened.state;
 assert.equal(draw.pending,null);
 assert.equal(opened.drew,1);
 const again=enterRemoved(draw,second.uid);
 draw=again.state;
 assert.equal(draw.pending,null);
 assert.equal(again.drew,0);
 assert.equal(assertUniversalMatch(group,draw),true);

 let seen=boot(32024);
 const watcher=lift(seen,'LOOK');
 seen.players[0].removed.push(watcher);
 seen=enterRemoved(seen,watcher.uid).state;
 assert.equal(seen.pending.kind,'effect-top-inspect');
 assert.equal(seen.pending.uids.length,2);

 let active=boot(32025);
 const other=lift(active,'A');
 active.players[0].hand.push(other);
 readyAp(active);
 active=dispatchUniversalAction(group,active,legalUniversalActions(group,active)
  .find(a=>a.type==='play'&&a.uid===other.uid&&a.line==='front'));
 const rested=active.players[0].front.find(c=>c.uid===other.uid);
 assert.equal(rested.ready,false);
 const actor=lift(active,'ACT');
 active.players[0].removed.push(actor);
 active=enterRemoved(active,actor.uid).state;
 assert.equal(active.pending.kind,'effect-active-own-other');
 assert.equal(active.pending.optional,true);
 assert.ok(legalUniversalActions(group,active).some(a=>a.uid===null));
 active=dispatchUniversalAction(group,active,{type:'chooseActiveOwnOther',uid:rested.uid});
 assert.equal(active.players[0].front.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(assertUniversalMatch(group,active),true);
});

function fuelFields(s){
 put(s,0,'MMM-1-061','energy',0);
 put(s,0,'MMM-1-061','energy',1);
}
function handIds(s){
 return new Set(s.pending.choices.map(uid=>{
  const card=s.players[0].hand.find(c=>c.uid===uid);
  return card.cardId;
 }));
}

test('MMM-1-042 raises the hand energy cap only for Homura and Madoka',()=>{
 const counts=countsFor(['MMM-1-042','MMM-1-061','MMM-1-037','MMM-1-039','MMM-1-040',
  'MMM-1-046','MMM-1-051','MMM-1-049','MMM-1-006']);
 let low=toPhase(fresh(counts,31042),'main');
 fuelFields(low);
 put(low,0,'MMM-1-037','front',1);
 low.players[0].outside.push(...low.players[0].hand);
 low.players[0].hand=[];
 for(const id of ['MMM-1-039','MMM-1-040','MMM-1-046','MMM-1-051','MMM-1-049','MMM-1-006'])
  handPlay(low,id);
 const actor=handPlay(low,'MMM-1-042');
 readyAp(low);
 low=play(low,actor.uid,'play');
 assert.equal(low.pending.kind,'effect-hand-rest');
 assert.equal(low.pending.maxEnergy,1);
 assert.deepEqual([...handIds(low)].sort(),['MMM-1-039','MMM-1-040']);
 assert.ok(legalUniversalActions(packs,low).some(a=>a.type==='chooseHandRest'&&a.uid===null));
 const cheap=low.players[0].hand.find(c=>c.cardId==='MMM-1-039');
 low=use(low,legalUniversalActions(packs,low).find(a=>a.type==='chooseHandRest'&&
  a.uid===cheap.uid&&a.line==='front'));
 const entered=low.players[0].front.find(c=>c.uid===cheap.uid);
 assert.equal(entered.ready,false);
 assert.equal(low.pending,null);

 let raised=toPhase(fresh(counts,31043),'main');
 fuelFields(raised);
 put(raised,0,'MMM-1-039','front',1);
 raised.players[0].outside.push(...raised.players[0].hand);
 raised.players[0].hand=[];
 for(const id of ['MMM-1-046','MMM-1-051','MMM-1-049','MMM-1-006'])handPlay(raised,id);
 const wide=handPlay(raised,'MMM-1-042');
 readyAp(raised);
 raised=play(raised,wide.uid,'play');
 assert.equal(raised.pending.maxEnergy,2);
 assert.deepEqual([...handIds(raised)].sort(),['MMM-1-046']);
 const second=raised.players[0].hand.find(c=>c.cardId==='MMM-1-046');
 raised=use(raised,legalUniversalActions(packs,raised).find(a=>a.type==='chooseHandRest'&&
  a.uid===second.uid&&a.line==='energy'));
 assert.equal(raised.players[0].energy.find(c=>c?.uid===second.uid).ready,false);
 assert.equal(raised.pending,null);
 assert.equal(assertUniversalMatch(packs,raised),true);
});

test('MMM-1-075 raids Homura, deploys a red girl, and locks attacks beside Madoka',()=>{
 const counts=countsFor(['MMM-1-075','MMM-1-085','MMM-1-072','MMM-1-076','MMM-1-079','MMM-1-073','MMM-1-006']);
 assert.equal(pack.cards['MMM-1-075'].raidName,'暁美 ほむら');
 let quiet=toPhase(fresh(counts,31075),'main');
 put(quiet,0,'MMM-1-085','energy',0);
 put(quiet,0,'MMM-1-085','energy',1);
 const host=put(quiet,0,'MMM-1-072','front',0);
 const wrong=put(quiet,0,'MMM-1-085','front',1);
 handPlay(quiet,'MMM-1-079');
 handPlay(quiet,'MMM-1-073');
 const raider=handPlay(quiet,'MMM-1-075');
 readyAp(quiet);
 assert.ok(legalUniversalActions(packs,quiet).some(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===host.uid));
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===wrong.uid),false);
 quiet=use(quiet,legalUniversalActions(packs,quiet).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===host.uid));
 assert.equal(quiet.pending.kind,'effect-hand-rest');
 assert.deepEqual([...handIds(quiet)],['MMM-1-079']);
 quiet=use(quiet,{type:'chooseHandRest',uid:null});
 assert.equal(quiet.pending,null);

 let locked=toPhase(fresh(counts,31076),'main');
 put(locked,0,'MMM-1-085','energy',0);
 put(locked,0,'MMM-1-085','energy',1);
 put(locked,0,'MMM-1-076','front',1);
 const foe=put(locked,1,'MMM-1-006','front',0,true);
 const spare=put(locked,1,'MMM-1-072','front',1,true);
 foe.fieldEntryStamp=locked.nextFieldEntryStamp++;
 spare.fieldEntryStamp=locked.nextFieldEntryStamp++;
 handPlay(locked,'MMM-1-079');
 const played=handPlay(locked,'MMM-1-075');
 readyAp(locked);
 bury(locked,0,played);
 locked=play(locked,played.uid,'play');
 assert.equal(locked.pending.kind,'effect-hand-rest');
 locked=use(locked,{type:'chooseHandRest',uid:null});
 assert.equal(locked.pending.kind,'effect-attack-ban');
 assert.equal(locked.pending.optional,true);
 assert.ok(legalUniversalActions(packs,locked).some(a=>a.type==='chooseAttackBan'&&a.uid===null));
 locked=use(locked,{type:'chooseAttackBan',uid:foe.uid});
 assert.equal(locked.pending,null);
 while(locked.players[0].hand.length>7)locked.players[0].outside.push(locked.players[0].hand.pop());
 while(locked.players[1].hand.length>7)locked.players[1].outside.push(locked.players[1].hand.pop());
 let guard=0;
 while(!(locked.active===1&&locked.phase==='attack')){
  if(locked.pending)throw Error('Pending '+locked.pending.kind);
  locked=dispatchUniversalAction(packs,locked,{type:'next'});
  if(++guard>12)throw Error('Did not reach the opponent attack');
 }
 const banned=locked.players[1].front.find(c=>c?.uid===foe.uid);
 const open=locked.players[1].front.find(c=>c?.uid===spare.uid);
 assert.equal(legalUniversalActions(packs,locked).some(a=>a.type==='attack'&&a.uid===banned.uid),false);
 assert.ok(legalUniversalActions(packs,locked).some(a=>a.type==='attack'&&a.uid===open.uid));
 guard=0;
 while(!(locked.active===0&&locked.phase==='start')){
  if(locked.pending)throw Error('Pending '+locked.pending.kind);
  locked=dispatchUniversalAction(packs,locked,{type:'next'});
  if(++guard>8)throw Error('Did not reach the next own start');
 }
 guard=0;
 while(!(locked.active===1&&locked.phase==='attack')){
  if(locked.pending)throw Error('Pending '+locked.pending.kind);
  locked=dispatchUniversalAction(packs,locked,{type:'next'});
  if(++guard>12)throw Error('Did not reach the later attack');
 }
 assert.ok(legalUniversalActions(packs,locked).some(a=>a.type==='attack'&&
  a.uid===locked.players[1].front.find(c=>c?.cardId==='MMM-1-006').uid));

 let brought=toPhase(fresh(counts,31077),'main');
 put(brought,0,'MMM-1-085','energy',0);
 put(brought,0,'MMM-1-085','energy',1);
 const victim=put(brought,1,'MMM-1-006','front',0,true);
 victim.fieldEntryStamp=brought.nextFieldEntryStamp++;
 const madoka=handPlay(brought,'MMM-1-076');
 const source=handPlay(brought,'MMM-1-075');
 readyAp(brought);
 bury(brought,0,source);
 brought=play(brought,source.uid,'play');
 assert.equal(brought.pending.kind,'effect-hand-rest');
 assert.deepEqual([...handIds(brought)],['MMM-1-076']);
 brought=use(brought,legalUniversalActions(packs,brought).find(a=>a.type==='chooseHandRest'&&
  a.uid===madoka.uid&&a.line==='front'));
 assert.equal(brought.players[0].front.find(c=>c.uid===madoka.uid).ready,false);
 assert.equal(brought.pending.kind,'effect-attack-ban');
 assert.ok(brought.pending.choices.some(c=>c.uid===victim.uid));
 brought=use(brought,{type:'chooseAttackBan',uid:null});
 assert.equal(brought.pending,null);
 assert.equal(assertUniversalMatch(packs,brought),true);
});

function stackTop(s,ids){
 const piled=ids.map(id=>take(s,0,id));
 for(const card of [...piled].reverse())s.players[0].deck.unshift(card);
 return piled;
}
function orderBottom(s){
 while(s.pending?.kind==='effect-top-order'){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder');
  s=use(s,action);
 }
 return s;
}
function fuelRed(s){
 put(s,0,'MMM-1-085','energy',0);
 put(s,0,'MMM-1-085','energy',1);
}

test('MMM-1-098 actives an AP only after revealing a Raid magical girl',()=>{
 const counts=countsFor(['MMM-1-098','MMM-1-085','MMM-1-075','MMM-1-072','MMM-1-037','MMM-1-029','MMM-1-061']);
 let plain=toPhase(fresh(counts,31098),'main');
 fuelRed(plain);
 const window=stackTop(plain,['MMM-1-075','MMM-1-072','MMM-1-037','MMM-1-029','MMM-1-061']);
 const event=handPlay(plain,'MMM-1-098');
 readyAp(plain);
 plain.players[0].apCards[0].ready=false;
 plain=play(plain,event.uid,'event');
 assert.equal(plain.pending.kind,'effect-top-filter-choice');
 assert.equal(plain.pending.choices.includes(window[0].uid),true);
 assert.equal(plain.pending.choices.includes(window[1].uid),true);
 assert.equal(plain.pending.choices.includes(window[2].uid),true);
 assert.equal(plain.pending.choices.includes(window[3].uid),false);
 assert.equal(plain.pending.choices.includes(window[4].uid),false);
 plain=use(plain,{type:'chooseTopFiltered',uid:window[1].uid});
 plain=orderBottom(plain);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].apCards[0].ready,false);
 assert.ok(plain.players[0].hand.some(c=>c.uid===window[1].uid));

 let raid=toPhase(fresh(counts,31099),'main');
 fuelRed(raid);
 const looked=stackTop(raid,['MMM-1-075','MMM-1-072','MMM-1-037','MMM-1-029','MMM-1-061']);
 const again=handPlay(raid,'MMM-1-098');
 readyAp(raid);
 raid.players[0].apCards[0].ready=false;
 raid=play(raid,again.uid,'event');
 raid=use(raid,{type:'chooseTopFiltered',uid:looked[0].uid});
 raid=orderBottom(raid);
 assert.equal(raid.pending.kind,'effect-recover-ap');
 assert.ok(legalUniversalActions(packs,raid).some(a=>a.type==='chooseApRecovery'&&a.uid===null));
 raid=use(raid,{type:'chooseApRecovery',uid:raid.players[0].apCards[0].uid});
 assert.equal(raid.players[0].apCards[0].ready,true);
 assert.equal(raid.pending,null);
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('MMM-1-108 recovers one low-energy magical girl only after a hand card leaves',()=>{
 const counts=countsFor(['MMM-1-108','MMM-1-085','MMM-1-079','MMM-1-075','MMM-1-037']);
 let empty=toPhase(fresh(counts,31108),'main');
 fuelRed(empty);
 empty.players[0].outside.push(...empty.players[0].hand);
 empty.players[0].hand=[];
 const stuck=take(empty,0,'MMM-1-079');
 empty.players[0].outside.push(stuck);
 const field=handPlay(empty,'MMM-1-108');
 readyAp(empty);
 empty=playLine(empty,field.uid,'energy');
 assert.equal(empty.pending,null);
 assert.ok(empty.players[0].outside.some(c=>c.uid===stuck.uid));

 let paid=toPhase(fresh(counts,31109),'main');
 fuelRed(paid);
 paid.players[0].outside.push(...paid.players[0].hand);
 paid.players[0].hand=[];
 const girl=take(paid,0,'MMM-1-079');
 const high=take(paid,0,'MMM-1-075');
 const other=take(paid,0,'MMM-1-037');
 paid.players[0].hand.push(girl);
 paid.players[0].outside.push(high,other);
 const area=handPlay(paid,'MMM-1-108');
 readyAp(paid);
 paid=playLine(paid,area.uid,'energy');
 assert.equal(paid.pending.kind,'effect-discard-gate');
 assert.equal(paid.pending.optional,true);
 paid=use(paid,{type:'chooseDiscardGate',uid:null});
 assert.equal(paid.pending,null);
 assert.ok(paid.players[0].hand.some(c=>c.uid===girl.uid));

 let back=toPhase(fresh(counts,31110),'main');
 fuelRed(back);
 back.players[0].outside.push(...back.players[0].hand);
 back.players[0].hand=[];
 const returning=take(back,0,'MMM-1-079');
 const capped=take(back,0,'MMM-1-075');
 const kyubey=take(back,0,'MMM-1-037');
 back.players[0].hand.push(returning);
 back.players[0].outside.push(capped,kyubey);
 const source=handPlay(back,'MMM-1-108');
 readyAp(back);
 back=playLine(back,source.uid,'energy');
 back=use(back,{type:'chooseDiscardGate',uid:returning.uid});
 assert.equal(back.pending.kind,'effect-recover-outside');
 assert.equal(back.pending.optional,true);
 assert.ok(back.pending.choices.includes(returning.uid));
 assert.equal(back.pending.choices.includes(capped.uid),false);
 assert.equal(back.pending.choices.includes(kyubey.uid),false);
 assert.ok(legalUniversalActions(packs,back).some(a=>a.uid===null));
 back=use(back,{type:'chooseOutsideRecovery',uid:returning.uid});
 assert.ok(back.players[0].hand.some(c=>c.uid===returning.uid));
 assert.ok(back.players[0].outside.some(c=>c.uid===capped.uid));
 assert.equal(back.pending,null);
 assert.equal(assertUniversalMatch(packs,back),true);
});

test('MMM-1-109 adds up to three differently named magical girls',()=>{
 const counts=countsFor(['MMM-1-109','MMM-1-085','MMM-1-072','MMM-1-076','MMM-1-079','MMM-1-029']);
 let s=toPhase(fresh(counts,31109),'main');
 fuelRed(s);
 s.players[0].outside.push(...s.players[0].hand);
 s.players[0].hand=[];
 const looked=stackTop(s,['MMM-1-072','MMM-1-072','MMM-1-076','MMM-1-079','MMM-1-029']);
 const event=handPlay(s,'MMM-1-109');
 readyAp(s);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-top-filter-many-choice');
 assert.equal(s.pending.max,3);
 assert.equal(s.pending.distinctNames,true);
 const names=uid=>legalUniversalActions(packs,s).filter(a=>a.type==='chooseTopFilteredMany'&&a.uid===uid);
 assert.equal(names(looked[0].uid).length,1);
 assert.equal(names(looked[4].uid).length,0);
 s=use(s,{type:'chooseTopFilteredMany',uid:looked[0].uid});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===looked[1].uid),false);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===looked[2].uid));
 s=use(s,{type:'chooseTopFilteredMany',uid:looked[2].uid});
 s=use(s,{type:'chooseTopFilteredMany',uid:looked[3].uid});
 s=orderBottom(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.filter(c=>['MMM-1-072','MMM-1-076','MMM-1-079'].includes(c.cardId)).length,3);
 assert.equal(s.players[0].hand.some(c=>c.uid===looked[1].uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-1-019 returns an opposing front at 1000 BP per outside event',()=>{
 const counts=countsFor(['MMM-1-019','MMM-1-011','MMM-1-030','MMM-1-006','MMM-1-078']);
 assert.equal(pack.cards['MMM-1-019'].raidName,'巴 マミ');
 let quiet=toPhase(fresh(counts,31019),'main');
 put(quiet,0,'MMM-1-011','energy',0);
 put(quiet,0,'MMM-1-011','energy',1);
 quiet.players[0].deck.push(...quiet.players[0].hand);
 quiet.players[0].hand=[];
 const spare=handPlay(quiet,'MMM-1-006');
 const dry=handPlay(quiet,'MMM-1-019');
 readyAp(quiet);
 bury(quiet,0,dry);
 const deck=quiet.players[0].deck.length;
 quiet=play(quiet,dry.uid,'play');
 assert.equal(quiet.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.uid===null),false);
 quiet=use(quiet,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,deck-1);
 assert.ok(quiet.players[0].outside.some(c=>c.uid===spare.uid));

 let scaled=toPhase(fresh(counts,31020),'main');
 put(scaled,0,'MMM-1-011','energy',0);
 put(scaled,0,'MMM-1-011','energy',1);
 const first=take(scaled,0,'MMM-1-030');
 const second=take(scaled,0,'MMM-1-030');
 scaled.players[0].outside.push(first,second);
 scaled.players[0].deck.push(...scaled.players[0].hand);
 scaled.players[0].hand=[];
 const payment=handPlay(scaled,'MMM-1-006');
 const small=put(scaled,1,'MMM-1-006','front',0);
 const big=put(scaled,1,'MMM-1-078','front',1);
 const mami=handPlay(scaled,'MMM-1-019');
 readyAp(scaled);
 bury(scaled,0,mami);
 scaled=play(scaled,mami.uid,'play');
 scaled=use(scaled,{type:'chooseDiscard',uid:payment.uid});
 assert.equal(scaled.pending.kind,'effect-bounce-bp');
 assert.equal(scaled.pending.limit,2000);
 assert.equal(scaled.pending.optional,true);
 assert.deepEqual(scaled.pending.choices,[small.uid]);
 assert.equal(scaled.pending.choices.includes(big.uid),false);
 scaled=use(scaled,{type:'chooseBounceBp',uid:small.uid});
 assert.ok(scaled.players[1].hand.some(c=>c.uid===small.uid));
 assert.equal(scaled.players[1].front[0],null);
 assert.equal(scaled.pending,null);
 assert.equal(assertUniversalMatch(packs,scaled),true);
});

function discardOne(s){
 const pay=s.players[0].hand[0];
 if(!pay)throw Error('Draw left no hand card');
 return use(s,{type:'chooseDiscard',uid:pay.uid});
}
function retireByBlocking(s,uid){
 while(s.players[0].hand.length>7)s.players[0].deck.push(s.players[0].hand.pop());
 while(s.players[1].hand.length>7)s.players[1].deck.push(s.players[1].hand.pop());
 const wall=put(s,1,'MMM-1-078','front',0,true);
 wall.fieldEntryStamp=s.nextFieldEntryStamp++;
 let guard=0;
 while(!(s.active===1&&s.phase==='attack')){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=use(s,{type:'next'});
  if(++guard>16)throw Error('Did not reach the opponent attack');
 }
 const blocker=s.players[0].front.find(c=>c?.uid===uid);
 assert.equal(universalBp(packs,s,wall),universalBp(packs,s,blocker));
 s=use(s,{type:'attack',uid:wall.uid});
 assert.equal(s.pending.kind,'block');
 return use(s,{type:'chooseBlock',uid});
}

test('MMM-1-041 returns its raid base to hand only beside Madoka',()=>{
 const counts=countsFor(['MMM-1-041','MMM-1-061','MMM-1-039','MMM-1-006','MMM-1-078']);
 assert.equal(pack.cards['MMM-1-041'].raidName,'暁美 ほむら');
 assert.equal(pack.cards['MMM-1-041'].effects.onPlay[0].op,'drawDiscard');
 assert.equal(pack.cards['MMM-1-041'].effects.onRetire[0].op,'returnOwnRaidBase');

 let brought=toPhase(fresh(counts,31041),'main');
 fuelFields(brought);
 const host=put(brought,0,'MMM-1-039','front',0);
 put(brought,0,'MMM-1-006','front',1);
 const raider=handPlay(brought,'MMM-1-041');
 readyAp(brought);
 assert.ok(legalUniversalActions(packs,brought).some(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===host.uid));
 assert.equal(legalUniversalActions(packs,brought).some(a=>a.type==='raid'&&a.uid===raider.uid&&
  a.baseUid===brought.players[0].front[1].uid),false);
 brought=use(brought,legalUniversalActions(packs,brought).find(a=>a.type==='raid'&&
  a.uid===raider.uid&&a.baseUid===host.uid));
 assert.equal(brought.pending.kind,'effect-discard');
 brought=discardOne(brought);
 assert.equal(brought.pending,null);
 assert.equal(brought.players[0].front.find(c=>c?.uid===raider.uid).ready,true);
 brought=retireByBlocking(brought,raider.uid);
 assert.equal(brought.pending.kind,'effect-return-raid-base');
 assert.equal(brought.pending.optional,true);
 assert.equal(brought.pending.baseUid,host.uid);
 assert.ok(legalUniversalActions(packs,brought).some(a=>a.type==='chooseReturnRaidBase'&&a.uid===null));
 brought=use(brought,{type:'chooseReturnRaidBase',uid:host.uid});
 assert.ok(brought.players[0].hand.some(c=>c.uid===host.uid));
 assert.equal(brought.players[0].outside.some(c=>c.uid===host.uid),false);
 assert.ok(brought.players[0].outside.some(c=>c.uid===raider.uid));
 assert.equal(brought.pending,null);
 assert.equal(assertUniversalMatch(packs,brought),true);

 let quiet=toPhase(fresh(counts,31044),'main');
 fuelFields(quiet);
 const bare=put(quiet,0,'MMM-1-039','front',0);
 const alone=handPlay(quiet,'MMM-1-041');
 readyAp(quiet);
 quiet=use(quiet,legalUniversalActions(packs,quiet).find(a=>a.type==='raid'&&
  a.uid===alone.uid&&a.baseUid===bare.uid));
 quiet=discardOne(quiet);
 quiet=retireByBlocking(quiet,alone.uid);
 assert.equal(quiet.pending,null);
 assert.ok(quiet.players[0].outside.some(c=>c.uid===bare.uid));
 assert.equal(quiet.players[0].hand.some(c=>c.uid===bare.uid),false);

 let played=toPhase(fresh(counts,31045),'main');
 fuelFields(played);
 put(played,0,'MMM-1-006','front',1);
 const entered=handPlay(played,'MMM-1-041');
 readyAp(played);
 played=play(played,entered.uid,'play');
 assert.equal(played.pending,null);
 assert.equal(played.players[0].front.find(c=>c?.uid===entered.uid).stack.length,0);
 played=retireByBlocking(played,entered.uid);
 assert.equal(played.pending,null);
 assert.ok(played.players[0].outside.some(c=>c.uid===entered.uid));
 assert.equal(assertUniversalMatch(packs,played),true);
});

function orderDeploy(s){
 while(s.pending?.kind==='effect-top-deploy-rest'&&s.pending.step==='order'){
  s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='chooseTopDeployRest'));
 }
 return s;
}

test('MMM-1-056 deploys one purple character from the top and gains impact from other quintet',()=>{
 const counts=countsFor(['MMM-1-056','MMM-1-061','MMM-1-053','MMM-1-039','MMM-1-049',
  'MMM-1-006','MMM-1-030','MMM-1-050','MMM-1-045','MMM-1-113','MMM-1-054']);
 assert.equal(pack.cards['MMM-1-056'].raidName,'巴 マミ');
 let looked=toPhase(fresh(counts,31056),'main');
 fuelFields(looked);
 const host=put(looked,0,'MMM-1-053','front',0);
 const wrong=put(looked,0,'MMM-1-045','front',1);
 const window=stackTop(looked,['MMM-1-039','MMM-1-049','MMM-1-006','MMM-1-030']);
 const mami=handPlay(looked,'MMM-1-056');
 readyAp(looked);
 assert.ok(legalUniversalActions(packs,looked).some(a=>a.type==='raid'&&a.uid===mami.uid&&a.baseUid===host.uid));
 assert.equal(legalUniversalActions(packs,looked).some(a=>a.type==='raid'&&a.uid===mami.uid&&a.baseUid===wrong.uid),false);
 looked=use(looked,legalUniversalActions(packs,looked).find(a=>a.type==='raid'&&
  a.uid===mami.uid&&a.baseUid===host.uid));
 assert.equal(looked.pending.kind,'effect-top-deploy-rest');
 assert.equal(looked.pending.step,'pick');
 assert.deepEqual(looked.pending.choices,[window[0].uid]);
 const girl=looked.players[0].deck.find(c=>c.uid===window[0].uid);
 looked=use(looked,legalUniversalActions(packs,looked).find(a=>a.type==='chooseTopDeployRest'&&
  a.uid===girl.uid&&a.line==='energy'));
 assert.equal(looked.players[0].energy.find(c=>c?.uid===girl.uid).ready,false);
 looked=orderDeploy(looked);
 assert.equal(looked.pending,null);
 assert.equal(looked.players[0].front.find(c=>c?.uid===mami.uid).impactGranted,undefined);
 assert.equal(looked.players[0].deck.slice(-3).map(c=>c.uid).includes(window[1].uid),true);
 assert.equal(assertUniversalMatch(packs,looked),true);

 let grown=toPhase(fresh(counts,31057),'main');
 fuelFields(grown);
 const base=put(grown,0,'MMM-1-053','front',0);
 put(grown,0,'MMM-1-045','front',1);
 put(grown,0,'MMM-1-113','front',2);
 put(grown,0,'MMM-1-054','front',3);
 const added=stackTop(grown,['MMM-1-050','MMM-1-049','MMM-1-006','MMM-1-030']);
 const again=handPlay(grown,'MMM-1-056');
 readyAp(grown);
 grown=use(grown,legalUniversalActions(packs,grown).find(a=>a.type==='raid'&&
  a.uid===again.uid&&a.baseUid===base.uid));
 assert.deepEqual(grown.pending.choices,[added[0].uid]);
 grown=use(grown,legalUniversalActions(packs,grown).find(a=>a.type==='chooseTopDeployRest'&&
  a.uid===added[0].uid&&a.line==='energy'));
 grown=orderDeploy(grown);
 const quintet=grown.players[0].energy.find(c=>c?.uid===added[0].uid);
 assert.equal(quintet.ready,false);
 const granted=grown.players[0].front.find(c=>c?.uid===again.uid).impactGranted;
 assert.equal(granted.amount,1);
 assert.equal(granted.turn,grown.turn);
 assert.equal(granted.stamp,grown.players[0].front.find(c=>c?.uid===again.uid).fieldEntryStamp);

 let declined=toPhase(fresh(counts,31058),'main');
 fuelFields(declined);
 const seat=put(declined,0,'MMM-1-053','front',0);
 put(declined,0,'MMM-1-045','front',1);
 put(declined,0,'MMM-1-113','front',2);
 put(declined,0,'MMM-1-054','front',3);
 put(declined,0,'MMM-1-050','energy',2);
 stackTop(declined,['MMM-1-039','MMM-1-049','MMM-1-006','MMM-1-030']);
 const third=handPlay(declined,'MMM-1-056');
 readyAp(declined);
 declined=use(declined,legalUniversalActions(packs,declined).find(a=>a.type==='raid'&&
  a.uid===third.uid&&a.baseUid===seat.uid));
 declined=use(declined,{type:'chooseTopDeployRest',uid:null});
 declined=orderDeploy(declined);
 assert.equal(declined.players[0].front.find(c=>c?.uid===third.uid).impactGranted.amount,1);
 assert.equal(declined.players[0].front.concat(declined.players[0].energy).some(c=>c?.cardId==='MMM-1-039'),false);
 assert.equal(assertUniversalMatch(packs,declined),true);
});

function stamp(s,card){
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 return card;
}
function packCounts(local,required){
 const fillers=Object.values(local.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(local,counts),[]);
 return counts;
}

test('MMM-1-005 pays one removed Ultimate Madoka for BP and impact',()=>{
 // The payment test uses a vanilla stand-in so MMM-1-001's own sentences
 // stay out of this attack. The registered card is covered separately.
 const ultimate={id:'MMM-1-001',name:'アルティメットまどか',color:'yellow',type:'character',
  energy:5,ap:2,bp:5000,gen:1,trigger:'get',traits:[],implementation:'vanilla',effects:{}};
 const named=createUniversalPack({id:'madoka',version:pack.version,cards:[ultimate]});
 const local={kind:pack.kind,id:pack.id,version:pack.version,restrictColors:false,
  cards:Object.freeze({...pack.cards,'MMM-1-001':named.cards['MMM-1-001']})};
 const localPacks=[local,local];
 const counts=packCounts(local,['MMM-1-005','MMM-1-006']);
 const playMatch=seed=>{
  let s=newUniversalMatch(localPacks,{decks:[counts,counts],seed,first:0});
  let guard=0;
  while(s.phase!=='attack'){
   if(s.pending)throw Error('Pending '+s.pending.kind);
   s=dispatchUniversalAction(localPacks,s,{type:'next'});
   if(++guard>8)throw Error('Did not reach attack');
  }
  return s;
 };
 const act=(s,action)=>dispatchUniversalAction(localPacks,s,action);
 let paid=playMatch(31005);
 const homura=stamp(paid,put(paid,0,'MMM-1-005','front',0,true));
 const removed=take(paid,0,'MMM-1-001');
 paid.players[0].removed.push(removed);
 const wall=stamp(paid,put(paid,1,'MMM-1-006','front',0,true));
 const life=paid.players[1].life.length;
 paid=act(paid,{type:'attack',uid:homura.uid});
 assert.equal(paid.pending.kind,'effect-removed-self-grant');
 assert.equal(paid.pending.optional,true);
 assert.deepEqual(paid.pending.choices,[removed.uid]);
 paid=act(paid,{type:'chooseRemovedSelfGrant',uid:removed.uid});
 const paidHomura=paid.players[0].front.find(c=>c.uid===homura.uid);
 assert.ok(paid.players[0].outside.some(c=>c.uid===removed.uid));
 assert.equal(paid.players[0].removed.some(c=>c.uid===removed.uid),false);
 assert.equal(universalBp(localPacks,paid,paidHomura),5000);
 assert.equal(paidHomura.impactGranted.amount,1);
 assert.equal(paid.pending.kind,'block');
 paid=act(paid,{type:'chooseBlock',uid:wall.uid});
 assert.equal(paid.players[1].front[0],null);
 assert.equal(paid.players[1].life.length,life-1);
 if(paid.pending?.kind==='life-trigger')paid=act(paid,{type:'chooseTrigger',mode:'skip'});
 assert.equal(assertUniversalMatch(localPacks,paid),true);

 let declined=playMatch(31006);
 const quiet=stamp(declined,put(declined,0,'MMM-1-005','front',0,true));
 const passed=take(declined,0,'MMM-1-001');
 declined.players[0].removed.push(passed);
 declined=act(declined,{type:'attack',uid:quiet.uid});
 declined=act(declined,{type:'chooseRemovedSelfGrant',uid:null});
 const quietNow=declined.players[0].front.find(c=>c.uid===quiet.uid);
 assert.equal(declined.players[0].removed.some(c=>c.uid===passed.uid),true);
 assert.equal(universalBp(localPacks,declined,quietNow),4000);
 assert.equal(quietNow.impactGranted,undefined);
 assert.equal(declined.pending.kind,'block');

 let empty=playMatch(31007);
 const bare=stamp(empty,put(empty,0,'MMM-1-005','front',0,true));
 const other=take(empty,0,'MMM-1-006');
 empty.players[0].removed.push(other);
 empty=act(empty,{type:'attack',uid:bare.uid});
 assert.equal(empty.pending.kind,'block');
 assert.equal(universalBp(localPacks,empty,empty.players[0].front.find(c=>c.uid===bare.uid)),4000);
 assert.equal(assertUniversalMatch(localPacks,empty),true);
});

function twoColorCounts(colors,needed){
 const fillers=Object.values(pack.cards).filter(c=>!colors.includes(c.id)&&!needed.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...needed];
 for(const id of fillers){if(ids.length>=12)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,12);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===11?2:4]));
 for(const id of colors)counts[id]=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}

test('MMM-1-035 swaps with front Madoka and cuts a front character from energy',()=>{
 const counts=twoColorCounts(['MMM-1-035','MMM-1-055'],['MMM-1-038','MMM-1-006','MMM-1-037','MMM-1-062','MMM-1-061']);
 assert.deepEqual(pack.cards['MMM-1-035'].nameAliases,['暁美 ほむら']);
 assert.equal(pack.cards['MMM-1-035'].triggerEffect.op,'deployOutsideCharacter');
 let swapped=toPhase(fresh(counts,31035),'main');
 const devil=stamp(swapped,put(swapped,0,'MMM-1-035','energy',0,true));
 const other=stamp(swapped,put(swapped,0,'MMM-1-037','front',0,true));
 const madoka=stamp(swapped,put(swapped,0,'MMM-1-006','front',1,true));
 assert.deepEqual(activates(swapped,devil.uid,'energySwap').map(a=>a.uid),[devil.uid]);
 swapped=use(swapped,{type:'activate',uid:devil.uid,mode:'energySwap'});
 assert.equal(swapped.pending.kind,'effect-energy-swap');
 assert.equal(swapped.pending.name,'鹿目 まどか');
 assert.deepEqual(swapped.pending.choices,[madoka.uid]);
 swapped=use(swapped,{type:'chooseEnergySwap',uid:madoka.uid});
 assert.equal(swapped.players[0].front[1].uid,devil.uid);
 assert.equal(swapped.players[0].energy[0].uid,madoka.uid);
 assert.equal(swapped.players[0].front[0].uid,other.uid);
 assert.equal(activates(swapped,devil.uid,'energySwap').length,0);
 assert.equal(assertUniversalMatch(packs,swapped),true);

 let cut=toPhase(fresh(counts,31036),'attack');
 const attacker=stamp(cut,put(cut,0,'MMM-1-035','front',0,true));
 stamp(cut,put(cut,0,'MMM-1-006','energy',0,true));
 const foe=stamp(cut,put(cut,1,'MMM-1-037','front',0,true));
 const before=universalBp(packs,cut,foe);
 cut=use(cut,{type:'attack',uid:attacker.uid});
 assert.equal(cut.pending.kind,'effect-target');
 assert.equal(cut.pending.optional,true);
 assert.equal(cut.pending.bp,1000);
 assert.deepEqual(cut.pending.choices,[foe.uid]);
 cut=use(cut,{type:'chooseTarget',uid:foe.uid});
 assert.equal(universalBp(packs,cut,cut.players[1].front.find(c=>c.uid===foe.uid)),before-1000);
 assert.equal(cut.pending.kind,'block');

 let quiet=toPhase(fresh(counts,31038),'attack');
 const lone=stamp(quiet,put(quiet,0,'MMM-1-035','front',0,true));
 stamp(quiet,put(quiet,1,'MMM-1-037','front',0,true));
 quiet=use(quiet,{type:'attack',uid:lone.uid});
 assert.equal(quiet.pending.kind,'block');

 let colored=toPhase(fresh(counts,31039),'attack');
 const striker=stamp(colored,put(colored,0,'MMM-1-006','front',0,true));
 const revealed=take(colored,1,'MMM-1-035');
 colored.players[1].life.unshift(revealed);
 const deploy=take(colored,1,'MMM-1-055');
 const alias=take(colored,1,'MMM-1-038');
 const heavy=take(colored,1,'MMM-1-037');
 const yellow=take(colored,1,'MMM-1-006');
 colored.players[1].outside.push(deploy,alias,heavy,yellow);
 colored=use(colored,{type:'attack',uid:striker.uid});
 assert.equal(colored.pending.kind,'block');
 colored=use(colored,{type:'chooseBlock',uid:null});
 assert.equal(colored.pending.kind,'life-trigger');
 assert.equal(colored.pending.trigger,'color');
 const outs=legalUniversalActions(packs,colored).filter(a=>a.mode==='colorOutside');
 assert.ok(outs.some(a=>a.uid===deploy.uid));
 assert.ok(outs.some(a=>a.uid===alias.uid));
 assert.equal(outs.some(a=>a.uid===heavy.uid||a.uid===yellow.uid),false);
 colored=use(colored,outs.find(a=>a.uid===deploy.uid&&a.slot===0));
 assert.equal(colored.players[1].front[0].uid,deploy.uid);
 assert.equal(colored.players[1].front[0].ready,true);
 assert.equal(colored.players[1].outside.some(c=>c.uid===deploy.uid),false);
 if(colored.pending?.kind==='life-trigger')colored=use(colored,{type:'chooseTrigger',mode:'skip'});
 assert.equal(assertUniversalMatch(packs,colored),true);

 let named=toPhase(fresh(counts,31040),'main');
 fuelFields(named);
 const flame=stamp(named,put(named,0,'MMM-1-035','front',0,true));
 const event=take(named,0,'MMM-1-062');
 named.players[0].hand.push(event);
 readyAp(named);
 const deck=named.players[0].deck.length;
 named=play(named,event.uid,'event');
 assert.equal(named.pending.kind,'effect-front-grant');
 named=use(named,{type:'chooseFrontGrant',uid:named.players[0].front[0].uid});
 assert.equal(named.players[0].deck.length,deck-1);
 assert.equal(assertUniversalMatch(packs,named),true);
});

test('MMM-1-055 buffs Nagisa or another quintet only while active on the front',()=>{
 const counts=countsFor(['MMM-1-055','MMM-1-038','MMM-1-049','MMM-1-006']);
 assert.equal(pack.cards['MMM-1-055'].mainAbility.requiresActive,true);
 assert.equal(pack.cards['MMM-1-055'].triggerEffect.frontOnly,true);
 let buffed=toPhase(fresh(counts,31055),'main');
 const mami=stamp(buffed,put(buffed,0,'MMM-1-055','front',0,true));
 const bebe=stamp(buffed,put(buffed,0,'MMM-1-038','energy',0,true));
 const quintet=stamp(buffed,put(buffed,0,'MMM-1-049','front',1,true));
 const girl=stamp(buffed,put(buffed,0,'MMM-1-006','front',2,true));
 const beforeBebe=universalBp(packs,buffed,bebe);
 const beforeGirl=universalBp(packs,buffed,girl);
 assert.equal(activates(buffed,mami.uid,'frontNameOrTrait').length,1);
 buffed=use(buffed,{type:'activate',uid:mami.uid,mode:'frontNameOrTrait'});
 assert.equal(buffed.pending.kind,'effect-buff-name-or-trait');
 assert.ok(buffed.pending.choices.includes(bebe.uid));
 assert.ok(buffed.pending.choices.includes(quintet.uid));
 assert.equal(buffed.pending.choices.includes(mami.uid),false);
 assert.equal(buffed.pending.choices.includes(girl.uid),false);
 buffed=use(buffed,{type:'chooseNameOrTraitBuff',uid:bebe.uid});
 const buffedBebe=buffed.players[0].energy.find(c=>c?.uid===bebe.uid);
 const buffedGirl=buffed.players[0].front.find(c=>c?.uid===girl.uid);
 assert.equal(universalBp(packs,buffed,buffedBebe),beforeBebe+1000);
 assert.equal(universalBp(packs,buffed,buffedGirl),beforeGirl);
 assert.equal(activates(buffed,mami.uid,'frontNameOrTrait').length,0);
 assert.equal(assertUniversalMatch(packs,buffed),true);

 let rested=toPhase(fresh(counts,31059),'main');
 const asleep=stamp(rested,put(rested,0,'MMM-1-055','front',0,false));
 stamp(rested,put(rested,0,'MMM-1-049','front',1,true));
 assert.equal(activates(rested,asleep.uid,'frontNameOrTrait').length,0);
 let sidelined=toPhase(fresh(counts,31060),'main');
 const energy=stamp(sidelined,put(sidelined,0,'MMM-1-055','energy',0,true));
 stamp(sidelined,put(sidelined,0,'MMM-1-038','front',0,true));
 assert.equal(activates(sidelined,energy.uid,'frontNameOrTrait').length,0);
 let alone=toPhase(fresh(counts,31061),'main');
 const solo=stamp(alone,put(alone,0,'MMM-1-055','front',0,true));
 assert.equal(activates(alone,solo.uid,'frontNameOrTrait').length,0);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

test('MMM-1-032 rests a front at BP 5000 and may retire it only while Mami is on the field',()=>{
 const counts=countsFor(['MMM-1-032','MMM-1-011','MMM-1-017','MMM-1-014','MMM-1-006']);
 const legalEvent=(s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 let plain=toPhase(fresh(counts,32032),'main');
 put(plain,0,'MMM-1-011','energy',0);
 put(plain,0,'MMM-1-011','energy',1);
 const high=put(plain,1,'MMM-1-006','front',0,true);
 high.buffs=[{bp:4000,untilTurn:plain.turn}];
 const event=take(plain,0,'MMM-1-032');
 plain.players[0].hand.push(event);
 readyAp(plain);
 assert.equal(universalBp(packs,plain,high),5500);
 assert.equal(legalEvent(plain,event.uid),false);
 const exact=put(plain,1,'MMM-1-006','front',1,true);
 exact.buffs=[{bp:3500,untilTurn:plain.turn}];
 const low=put(plain,1,'MMM-1-006','front',2,true);
 assert.equal(universalBp(packs,plain,exact),5000);
 assert.equal(legalEvent(plain,event.uid),true);
 plain=play(plain,event.uid,'event');
 assert.equal(plain.pending.kind,'effect-rest-skip-may-retire');
 assert.equal(plain.pending.mayRetire,false);
 assert.equal(plain.pending.ceiling,5000);
 assert.ok(plain.pending.choices.includes(exact.uid));
 assert.ok(plain.pending.choices.includes(low.uid));
 assert.equal(plain.pending.choices.includes(high.uid),false);
 assert.deepEqual(legalUniversalActions(packs,plain).filter(a=>a.uid===low.uid).map(a=>a.mode),['rest']);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.uid===null||a.mode==='retire'),false);
 plain=use(plain,{type:'chooseRestSkipMayRetire',uid:low.uid,mode:'rest'});
 assert.equal(plain.players[1].front.find(c=>c.uid===low.uid).ready,false);
 assert.equal(plain.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===low.uid),true);
 for(const p of [0,1])while(plain.players[p].hand.length>7)
  plain.players[p].outside.push(plain.players[p].hand.pop());
 let guard=0;
 while(!(plain.active===1&&plain.phase==='start')){
  if(plain.pending)throw Error('Pending '+plain.pending.kind);
  plain=dispatchUniversalAction(packs,plain,{type:'next'});
  if(++guard>16)throw Error('Did not reach the opponent start');
 }
 assert.equal(plain.players[1].front.find(c=>c.uid===low.uid).ready,false);
 assert.equal(plain.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===low.uid),false);
 assert.equal(assertUniversalMatch(packs,plain),true);

 let branch=toPhase(fresh(counts,32033),'main');
 put(branch,0,'MMM-1-011','energy',0);
 put(branch,0,'MMM-1-017','energy',1);
 put(branch,0,'MMM-1-014','front',0);
 const victim=put(branch,1,'MMM-1-006','front',0,true);
 const spared=put(branch,1,'MMM-1-006','front',1,true);
 const finale=take(branch,0,'MMM-1-032');
 branch.players[0].hand.push(finale);
 readyAp(branch);
 branch=play(branch,finale.uid,'event');
 assert.equal(branch.pending.mayRetire,true);
 assert.deepEqual(legalUniversalActions(packs,branch).filter(a=>a.uid===victim.uid).map(a=>a.mode),['rest','retire']);
 branch=use(branch,{type:'chooseRestSkipMayRetire',uid:victim.uid,mode:'retire'});
 assert.ok(branch.players[1].outside.some(c=>c.uid===victim.uid));
 assert.equal(branch.players[1].front.find(c=>c?.uid===spared.uid).ready,true);
 assert.equal(branch.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 assert.equal(assertUniversalMatch(packs,branch),true);

 let lined=toPhase(fresh(counts,32034),'main');
 put(lined,0,'MMM-1-011','energy',0);
 put(lined,0,'MMM-1-017','energy',1);
 put(lined,0,'MMM-1-014','energy',2);
 const marked=put(lined,1,'MMM-1-006','front',0,true);
 const fromEnergy=take(lined,0,'MMM-1-032');
 lined.players[0].hand.push(fromEnergy);
 readyAp(lined);
 lined=play(lined,fromEnergy.uid,'event');
 assert.equal(lined.pending.mayRetire,true);
 lined=use(lined,{type:'chooseRestSkipMayRetire',uid:marked.uid,mode:'rest'});
 assert.equal(lined.players[1].front[0].ready,false);
 assert.equal(lined.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===marked.uid),true);
 assert.equal(assertUniversalMatch(packs,lined),true);
});

test('MMM-1-071 cannot be used at 5 life, raids as Sayaka, deals 2, and is not blocked at BP 2000',()=>{
 const counts=countsFor(['MMM-1-071','MMM-1-073','MMM-1-085','MMM-1-086','MMM-1-076','MMM-1-107','MMM-1-013','MMM-1-093']);
 const printed=pack.cards['MMM-1-071'];
 assert.deepEqual([...printed.nameAliases],['美樹 さやか']);
 assert.equal(printed.raidName,'美樹 さやか');
 assert.equal(printed.raidAttackDamage,2);
 assert.equal(printed.printedAttackDamage,1);
 assert.equal(printed.playLifeAtMost,4);
 assert.equal(printed.blockBpRestriction.relation,'atMost');
 assert.equal(printed.blockBpRestriction.bp,2000);
 assert.equal(printed.trigger,'get');
 let gated=toPhase(fresh(counts,32071),'main');
 put(gated,0,'MMM-1-073','energy',0);
 put(gated,0,'MMM-1-085','energy',1);
 const base=put(gated,0,'MMM-1-086','energy',2);
 const other=put(gated,0,'MMM-1-076','front',0);
 const witch=take(gated,0,'MMM-1-071');
 gated.players[0].hand.push(witch);
 readyAp(gated);
 setLife(gated,0,5);
 assert.equal(legalUniversalActions(packs,gated).some(a=>a.uid===witch.uid&&(a.type==='play'||a.type==='raid')),false);
 setLife(gated,0,4);
 const raids=legalUniversalActions(packs,gated).filter(a=>a.type==='raid'&&a.uid===witch.uid);
 assert.ok(raids.some(a=>a.baseUid===base.uid&&a.line!=='energy'));
 assert.equal(raids.some(a=>a.baseUid===other.uid),false);
 assert.ok(legalUniversalActions(packs,gated).some(a=>a.type==='play'&&a.uid===witch.uid));
 gated=use(gated,raids.find(a=>a.baseUid===base.uid&&a.line!=='energy'));
 const raided=gated.players[0].front.find(c=>c?.uid===witch.uid);
 assert.equal(raided.ready,true);
 assert.equal(raided.stack[0].cardId,'MMM-1-086');
 assert.equal(gated.players[0].energy.some(c=>c?.uid===base.uid),false);
 assert.equal(assertUniversalMatch(packs,gated),true);

 let named=toPhase(fresh(counts,32072),'main');
 put(named,0,'MMM-1-073','energy',0);
 put(named,0,'MMM-1-085','energy',1);
 put(named,0,'MMM-1-071','front',0);
 const small=put(named,1,'MMM-1-086','front',0,true);
 const heavy=put(named,1,'MMM-1-076','front',1,true);
 heavy.buffs=[{bp:2500,untilTurn:named.turn}];
 assert.equal(universalBp(packs,named,heavy),4000);
 setLife(named,0,6);
 const narrow=take(named,0,'MMM-1-093');
 named.players[0].hand.push(narrow);
 readyAp(named);
 named=play(named,narrow.uid,'event');
 assert.equal(named.pending.limit,3000);
 assert.deepEqual(named.pending.choices,[small.uid]);
 named=use(named,{type:'chooseRetireBp',uid:small.uid});
 setLife(named,0,4);
 const wide=take(named,0,'MMM-1-093');
 named.players[0].hand.push(wide);
 named=play(named,wide.uid,'event');
 assert.equal(named.pending.limit,5000);
 assert.deepEqual(named.pending.choices,[heavy.uid]);
 named=use(named,{type:'chooseRetireBp',uid:heavy.uid});
 assert.ok(named.players[1].outside.some(c=>c.uid===heavy.uid));
 assert.equal(assertUniversalMatch(packs,named),true);

 let blocked=toPhase(fresh(counts,32073),'attack');
 const sayakaBase=take(blocked,0,'MMM-1-086');
 const attacker=stamp(blocked,put(blocked,0,'MMM-1-071','front',0,true));
 attacker.stack=[sayakaBase];
 const lowBlock=stamp(blocked,put(blocked,1,'MMM-1-107','front',0,true));
 const highBlock=stamp(blocked,put(blocked,1,'MMM-1-013','front',1,true));
 assert.equal(universalAttackDamage(packs,blocked,attacker),2);
 assert.equal(universalBp(packs,blocked,lowBlock),2000);
 assert.equal(universalBp(packs,blocked,highBlock),2500);
 blocked=use(blocked,{type:'attack',uid:attacker.uid});
 assert.equal(blocked.pending.kind,'block');
 const blocks=legalUniversalActions(packs,blocked).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===lowBlock.uid),false);
 assert.ok(blocks.some(a=>a.uid===highBlock.uid));
 assert.ok(blocks.some(a=>a.uid===null));
 setLife(blocked,1,0);
 const top=take(blocked,1,'MMM-1-107');
 const next=take(blocked,1,'MMM-1-107');
 blocked.players[1].life.unshift(next,top);
 blocked=use(blocked,{type:'chooseBlock',uid:null});
 assert.equal(blocked.players[1].life.length,0);
 assert.equal(blocked.pending.kind,'life-batch-order');
 assert.deepEqual([...blocked.pending.choices].sort(),[top.uid,next.uid].sort());
 blocked=use(blocked,{type:'chooseLifeOrder',uid:top.uid});
 assert.ok(blocked.players[1].outside.some(c=>c.uid===top.uid));
 assert.ok(blocked.players[1].outside.some(c=>c.uid===next.uid));
 assert.equal(blocked.players[1].lifeRevealed.length,0);
 assert.equal(assertUniversalMatch(packs,blocked),true);
});

test('MMM-1-100 retires one Kyoko, keeps her BP, then may retire one opponent and draws 2',()=>{
 const counts=countsFor(['MMM-1-100','MMM-1-073','MMM-1-085','MMM-1-009','MMM-1-012']);
 const legalEvent=(s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 let dry=toPhase(fresh(counts,32100),'main');
 put(dry,0,'MMM-1-073','energy',0);
 put(dry,0,'MMM-1-085','energy',1);
 const missing=take(dry,0,'MMM-1-100');
 dry.players[0].hand.push(missing);
 readyAp(dry);
 assert.equal(legalEvent(dry,missing.uid),false);

 let quiet=toPhase(fresh(counts,32101),'main');
 put(quiet,0,'MMM-1-073','energy',0);
 put(quiet,0,'MMM-1-085','energy',1);
 const kyoko=put(quiet,0,'MMM-1-009','energy',2,true);
 const above=put(quiet,1,'MMM-1-012','front',0,true);
 const mid=put(quiet,1,'MMM-1-073','front',1,true);
 const lonely=take(quiet,0,'MMM-1-100');
 quiet.players[0].hand.push(lonely);
 readyAp(quiet);
 assert.equal(universalBp(packs,quiet,kyoko),2000);
 assert.equal(legalEvent(quiet,lonely.uid),true);
 const deck=quiet.players[0].deck.length;
 quiet=play(quiet,lonely.uid,'event');
 assert.equal(quiet.pending.kind,'effect-retire-named-draw');
 assert.equal(quiet.pending.name,'佐倉 杏子');
 assert.deepEqual(quiet.pending.choices,[kyoko.uid]);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.uid===null),false);
 quiet=use(quiet,{type:'chooseNamedRetireDraw',uid:kyoko.uid});
 assert.equal(quiet.pending,null);
 assert.ok(quiet.players[0].outside.some(c=>c.uid===kyoko.uid));
 assert.equal(quiet.players[1].front.some(c=>c?.uid===above.uid),true);
 assert.equal(quiet.players[1].front.some(c=>c?.uid===mid.uid),true);
 assert.equal(quiet.players[0].deck.length,deck-2);
 assert.equal(assertUniversalMatch(packs,quiet),true);

 let paid=toPhase(fresh(counts,32102),'main');
 put(paid,0,'MMM-1-073','energy',0);
 put(paid,0,'MMM-1-085','energy',1);
 const boosted=put(paid,0,'MMM-1-009','front',0,true);
 const other=put(paid,0,'MMM-1-009','front',1,true);
 boosted.buffs=[{bp:2000,untilTurn:paid.turn}];
 const under=put(paid,1,'MMM-1-073','front',0,true);
 const over=put(paid,1,'MMM-1-012','front',1,true);
 over.buffs=[{bp:1000,untilTurn:paid.turn}];
 assert.equal(universalBp(packs,paid,boosted),4000);
 assert.equal(universalBp(packs,paid,over),5000);
 const sacrifice=take(paid,0,'MMM-1-100');
 paid.players[0].hand.push(sacrifice);
 readyAp(paid);
 paid=play(paid,sacrifice.uid,'event');
 assert.equal(paid.pending.kind,'effect-retire-named-draw');
 assert.ok(paid.pending.choices.includes(boosted.uid));
 assert.ok(paid.pending.choices.includes(other.uid));
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.uid===null),false);
 const before=paid.players[0].deck.length;
 paid=use(paid,{type:'chooseNamedRetireDraw',uid:boosted.uid});
 assert.equal(paid.pending.kind,'effect-retire-bp');
 assert.equal(paid.pending.optional,true);
 assert.equal(paid.pending.limit,4000);
 assert.equal(paid.pending.thenDraw,2);
 assert.deepEqual(paid.pending.choices,[under.uid]);
 assert.equal(paid.players[0].front.some(c=>c?.uid===other.uid),true);
 paid=use(paid,{type:'chooseRetireBp',uid:null});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[1].front.some(c=>c?.uid===under.uid),true);
 assert.equal(paid.players[1].front.some(c=>c?.uid===over.uid),true);
 assert.equal(paid.players[0].deck.length,before-2);
 assert.equal(assertUniversalMatch(packs,paid),true);

 let removed=toPhase(fresh(counts,32103),'main');
 put(removed,0,'MMM-1-073','energy',0);
 put(removed,0,'MMM-1-085','energy',1);
 const chosen=put(removed,0,'MMM-1-009','front',0,true);
 chosen.buffs=[{bp:2000,untilTurn:removed.turn}];
 const foe=put(removed,1,'MMM-1-073','front',0,true);
 const event=take(removed,0,'MMM-1-100');
 removed.players[0].hand.push(event);
 readyAp(removed);
 const cards=removed.players[0].deck.length;
 removed=play(removed,event.uid,'event');
 removed=use(removed,{type:'chooseNamedRetireDraw',uid:chosen.uid});
 assert.equal(removed.pending.limit,4000);
 removed=use(removed,{type:'chooseRetireBp',uid:foe.uid});
 assert.ok(removed.players[1].outside.some(c=>c.uid===foe.uid));
 assert.equal(removed.players[0].deck.length,cards-2);
 assert.equal(assertUniversalMatch(packs,removed),true);
});
