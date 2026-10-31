import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseLegacyHardAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseStrengthenedHardAction,HARD_AI_POLICY,resetHardAiReport,
 lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const deck=Object.fromEntries(summarizeDesignatedDecks(id=>!!pack.cards[id])
 .map(row=>[row.key,designatedPlayableCounts(row)]));
const FIXED={nodes:48,ms:10000,seed:11};

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c?.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function reach(s,phase){
 for(let n=0;s.phase!==phase&&s.status==='playing'&&n<8;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,s.phase+' '+(s.pending?.kind||''));
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function hold(s,p,cards){
 const keep=new Set(cards.map(c=>c.uid));
 const hand=s.players[p].hand;
 for(let i=hand.length-1;i>=0;i--)if(!keep.has(hand[i].uid))
  s.players[p].deck.push(hand.splice(i,1)[0]);
 for(const card of cards)if(!hand.includes(card))hand.push(card);
}
function boot(){
 return reach(newUniversalMatch(packs,{
  decks:[deck.renruki,deck.renruki],seed:3,first:0
 }),'main');
}
function observation(s){
 return JSON.stringify(universalPublicView(packs,s,0));
}
function explain(s){
 resetHardAiReport();
 const before=structuredClone(s);
 const action=chooseStrengthenedHardAction(packs,s,FIXED);
 assert.deepEqual(s,before,'search must not mutate the live state');
 const trace=lastHardAiTrace();
 assert.equal(trace.policy,HARD_AI_POLICY);
 assert.equal(trace.seed,FIXED.seed);
 assert.equal(trace.nodesBudget,FIXED.nodes);
 return {action,candidates:trace.candidates};
}
function sameDecision(a,b){
 assert.deepEqual(b.candidates,a.candidates);
 assert.deepEqual(b.action,a.action);
}

test('hidden hand, deck order, LIFE and unauthorized cards do not change the choice',()=>{
 let s=boot();
 const small=take(s,0,'BLC-4-048'),body=take(s,0,'BLC-4-083'),raider=take(s,0,'BLC-1-047');
 hold(s,0,[small,body,raider]);
 assert.equal(assertUniversalMatch(packs,s),true);
 const base=explain(s);
 assert.ok(base.candidates.length>=2,'the main phase offers more than one scored line');

 const hand=structuredClone(s);
 const foe=hand.players[1];
 let handChanged=0;
 for(let i=0;i<foe.hand.length;i++){
  const j=foe.deck.findIndex(c=>c.cardId!==foe.hand[i].cardId);
  assert.ok(j>=0);
  const tmp=foe.hand[i];
  foe.hand[i]=foe.deck[j];
  foe.deck[j]=tmp;
  handChanged++;
 }
 assert.ok(handChanged>=5);
 assert.equal(observation(hand),observation(s));
 assert.equal(assertUniversalMatch(packs,hand),true);
 sameDecision(base,explain(hand));

 const ordered=structuredClone(s);
 for(const pl of ordered.players){
  const top=pl.deck[0];
  const k=pl.deck.findIndex((c,i)=>i>2&&c.cardId!==top.cardId);
  assert.ok(k>2,'deck top must move, not only two deep cards');
  pl.deck[0]=pl.deck[k];
  pl.deck[k]=top;
  assert.notEqual(pl.deck[0].cardId,top.cardId);
 }
 assert.equal(observation(ordered),observation(s));
 sameDecision(base,explain(ordered));

 const life=structuredClone(s);
 for(const pl of life.players){
  assert.ok(pl.life.length>=2&&pl.deck.length>pl.life.length+2);
  const before=pl.life.map(c=>c.cardId).join(',');
  for(let i=0;i<pl.life.length;i++){
   const j=pl.deck.length-1-i;
   const tmp=pl.life[i];
   pl.life[i]=pl.deck[j];
   pl.deck[j]=tmp;
  }
  assert.notEqual(pl.life.map(c=>c.cardId).join(','),before);
 }
 assert.equal(observation(life),observation(s));
 sameDecision(base,explain(life));

 const listed=structuredClone(s);
 const hiddenTop=listed.players[1].deck[0];
 const alt=Object.keys(pack.cards).find(id=>id!==hiddenTop.cardId&&
  !(listed.initialCounts[1][id]>=4)&&!pack.cards[id].trigger);
 assert.ok(alt);
 listed.initialCounts[1][hiddenTop.cardId]--;
 listed.initialCounts[1][alt]=(listed.initialCounts[1][alt]||0)+1;
 hiddenTop.cardId=alt;
 assert.equal(assertUniversalMatch(packs,listed),true);
 assert.equal(observation(listed),observation(s));
 sameDecision(base,explain(listed));

 const hostId=s.players[1].deck.find(c=>pack.cards[c.cardId].type==='character').cardId;
 const underA=structuredClone(s),underB=structuredClone(s);
 for(const [copy,from] of [[underA,0],[underB,1]]){
  const pl=copy.players[1];
  const host=pl.deck.find(c=>c.cardId===hostId);
  pl.deck.splice(pl.deck.indexOf(host),1);
  host.ready=true;
  host.fieldEntryStamp=copy.nextFieldEntryStamp++;
  pl.front[0]=host;
  const donors=pl.deck.filter(c=>c.cardId!==host.cardId);
  const donor=donors[from===0?0:donors.length-1];
  assert.notEqual(donors[0].cardId,donors[donors.length-1].cardId);
  pl.deck.splice(pl.deck.indexOf(donor),1);
  donor.faceDown=true;
  host.under=[donor];
 }
 assert.notEqual(underA.players[1].front[0].under[0].cardId,
  underB.players[1].front[0].under[0].cardId);
 assert.equal(observation(underA),observation(underB));
 assert.equal(assertUniversalMatch(packs,underA),true);
 sameDecision(explain(underA),explain(underB));
});

test('an authorized top-window card can change the choice',()=>{
 let s=reach(newUniversalMatch(packs,{
  decks:[deck['reject-blue'],deck['reject-blue']],seed:11,first:0
 }),'main');
 const event=take(s,0,'BLC-2-047'),raider=take(s,0,'BLC-2-019'),source=take(s,0,'BLC-2-015');
 const handBase=take(s,0,'BLC-2-016');
 const deckWeak=take(s,0,'BLC-4-034'),deckBase=take(s,0,'BLC-2-016'),deckOther=take(s,0,'BLC-2-021');
 hold(s,0,[handBase,raider,event,source]);
 place(s,0,'BLC-4-022','energy',0);
 s.players[0].deck.unshift(deckOther);
 s.players[0].deck.unshift(deckBase);
 s.players[0].deck.unshift(deckWeak);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===source.uid&&a.line==='front'&&!a.replaceUid));
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const seen=explain(s);
 assert.equal(s.players[0].deck.find(c=>c.uid===seen.action.uid).cardId,'BLC-2-016');

 const blocked=structuredClone(s);
 const windowBase=blocked.players[0].deck[1];
 const deep=blocked.players[0].deck[blocked.players[0].deck.length-1];
 assert.equal(windowBase.cardId,'BLC-2-016');
 assert.notEqual(deep.cardId,'BLC-2-016');
 blocked.players[0].deck[1]=deep;
 blocked.players[0].deck[blocked.players[0].deck.length-1]=windowBase;
 const missed=explain(blocked);
 assert.notDeepEqual(missed.action,seen.action);

 const buried=structuredClone(s);
 const lifePile=buried.players[0].life;
 const deckPile=buried.players[0].deck;
 const tmp=lifePile[0];
 lifePile[0]=deckPile[deckPile.length-1];
 deckPile[deckPile.length-1]=tmp;
 assert.equal(observation(buried),observation(s));
 sameDecision(seen,explain(buried));
});

test('naming required energy does not read the unrevealed top',()=>{
 let s=boot();
 const host=s.players[0].deck.find(c=>pack.cards[c.cardId].trigger==='color'&&
  pack.cards[c.cardId].type==='character');
 assert.ok(host);
 const previousId=host.cardId;
 s.players[0].deck.splice(s.players[0].deck.indexOf(host),1);
 host.ready=true;
 host.fieldEntryStamp=s.nextFieldEntryStamp++;
 host.cardId='BLC-2-060';
 s.initialCounts[0][previousId]--;
 s.initialCounts[0]['BLC-2-060']=(s.initialCounts[0]['BLC-2-060']||0)+1;
 s.players[0].front[0]=host;
 assert.equal(assertUniversalMatch(packs,s),true);
 s.pending={kind:'effect-name-energy-reveal',player:0,sourceUid:host.uid,
  sourceName:'兵主部 一兵衛',min:0,max:30};
 const firstTop=s.players[0].deck[0];
 const other=s.players[0].deck.find((c,i)=>i>0&&
  pack.cards[c.cardId].energy!==pack.cards[firstTop.cardId].energy);
 assert.ok(other);
 const named=chooseLegacyHardAiAction(packs,s);
 const swapped=structuredClone(s);
 const top=swapped.players[0].deck[0];
 const idx=swapped.players[0].deck.findIndex(c=>c.uid===other.uid);
 swapped.players[0].deck[0]=swapped.players[0].deck[idx];
 swapped.players[0].deck[idx]=top;
 assert.notEqual(pack.cards[swapped.players[0].deck[0].cardId].energy,
  pack.cards[firstTop.cardId].energy);
 assert.deepEqual(chooseLegacyHardAiAction(packs,swapped),named);
});
