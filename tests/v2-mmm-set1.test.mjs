import test from 'node:test';
import assert from 'node:assert/strict';
import {MADOKA_CARDS} from '../dist/madoka-cards.mjs';
import {createMadokaV2Pack, mmmEngineKind} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {madokaPracticeDeck, v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalEnergyByColor}
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
 assert.equal(MADOKA_CARDS.filter(c=>c.engineKind).length,75);
 assert.equal(Object.keys(pack.cards).length,75);
 assert.equal(pack.version,'mmm-ua31-set1-20261029');
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
 assert.equal(editor.registered,75);
 const blocked=v2DeckReport('madoka',{'MMM-1-001':4,'MMM-1-006':46});
 assert.equal(blocked.ok,false);
 assert.match(blocked.issues.join('\n'),/尚未支援/);
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
 assert.equal(universalCardEnergy(packs,few,0,self),0);
 let full=fresh(counts,31078);
 const source=put(full,0,'MMM-1-077','energy',0);
 put(full,0,'MMM-1-009','energy',1);
 put(full,0,'MMM-1-014','energy',2);
 put(full,0,'MMM-1-112','front',0);
 assert.equal(universalCardEnergy(packs,full,0,source),1);
 assert.equal(universalEnergyByColor(packs,full,0).red,1);
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
