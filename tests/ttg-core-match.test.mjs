import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_CORE_SMOKE_IDS,validateTtgCoreDeck,newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,ttgCoreAiChoice,assertTtgCoreState,runTtgCoreAiMatch} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';

const deck=()=>Object.fromEntries([
 ...['042','043','005','006','047','048','064','065','019','066','002','063'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
const match=(seed=1)=>newTtgCoreMatch({decks:[deck(),deck()],seed});
const findById=(pl,id)=>{
 for(const line of ['deck','hand','life','outside']){
  const index=pl[line].findIndex(c=>c.cardId===id);
  if(index>=0)return pl[line].splice(index,1)[0];
 }
 throw new Error('Cannot find printed '+id);
};
test('core smoke is a named, strict subset and never claims all 81 cards are playable',()=>{
 assert.ok(TTG_CORE_SMOKE_IDS.length>=13);
 assert.ok(TTG_CORE_SMOKE_IDS.length<81);
 assert.deepEqual(validateTtgCoreDeck(deck()),[]);
 const bad={...deck(),'TTG-1-071':1,'TTG-1-036':0};
 assert.ok(validateTtgCoreDeck(bad).some(x=>x.includes('TTG-1-071')));
 assert.throws(()=>newTtgCoreMatch({decks:[bad,deck()]}));
 assert.throws(()=>newTtgCoreMatch({decks:[{},deck()]}));
});
test('new 50-card match has seven cards in each starting hand and life, correct first AP',()=>{
 const s=match(17);
 assert.equal(s.players[0].hand.length,7);
 assert.equal(s.players[1].hand.length,7);
 assert.equal(s.players[0].life.length,7);
 assert.equal(s.players[1].life.length,7);
 assert.equal(s.players[0].deck.length,36);
 assert.equal(s.players[1].deck.length,36);
 assert.equal(s.players[0].turnCount,1);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,1);
 assert.ok(assertTtgCoreState(s));
});
test('phase transitions never allow an unsupported action and no normal draw for first player',()=>{
 const s=match();
 const hand=s.players[0].hand.length;
 assert.deepEqual(legalTtgCoreActions(s).filter(x=>x.type==='next'),[{type:'next'}]);
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'attack',uid:'nonexistent'}));
 let st=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(st.phase,'move');
 st=dispatchTtgCoreAction(st,{type:'next'});
 assert.equal(st.phase,'main');
 st=dispatchTtgCoreAction(st,{type:'next'});
 assert.equal(st.phase,'attack');
 assert.deepEqual(legalTtgCoreActions(st),[{type:'next'}],'first player first turn cannot attack');
 st=dispatchTtgCoreAction(st,{type:'next'});
 assert.equal(st.active,1);assert.equal(st.phase,'start');
 assert.equal(st.players[1].turnCount,1);
 assert.equal(st.players[1].apCards.filter(x=>x.ready).length,2);
 assert.equal(s.players[0].hand.length,hand);
 assert.ok(assertTtgCoreState(st));
});
test('AI opens with 0-cost generators, normal play pays exactly one AP and never duplicates cards',()=>{
 let st=match(6);st=dispatchTtgCoreAction(st,{type:'next'});st=dispatchTtgCoreAction(st,{type:'next'});
 let attempts=0;
 while(attempts<5){
  const a=ttgCoreAiChoice(st);
  if(a.type==='play'){const active=st.players[0].apCards.filter(x=>x.ready).length;
   const before=st.players[0].hand.length;
   const after=dispatchTtgCoreAction(st,a);
   assert.equal(after.players[0].hand.length,before-1);
   assert.equal(after.players[0].apCards.filter(x=>x.ready).length,active-1);
   assert.ok(assertTtgCoreState(after));
   return;
  }
  st=dispatchTtgCoreAction(st,{type:'next'});
  if(st.active!==0)break;attempts++;
 }
 assert.fail('Expected an AI deploy option in opening scene');
});
test('official BP tie is won by attacker (Q33), no unblocked life damage',()=>{
 let st=match(19);
 const attacker=findById(st.players[0],'TTG-1-042');
 const defender=findById(st.players[1],'TTG-1-064');
 st.players[0].front[0]={...attacker,ready:true};
 st.players[1].front[0]={...defender,ready:true};
 st.players[0].turnCount=2;st.phase='attack';
 st=withTtgDerivedEnergy(st,0);
 let after=dispatchTtgCoreAction(st,{type:'attack',uid:attacker.uid});
 assert.equal(after.pending.kind,'block');
 const beforeLife=after.players[1].life.length;
 after=dispatchTtgCoreAction(after,{type:'block',blockUid:defender.uid});
 assert.equal(after.players[1].front[0],null,'defending card loses same-BP combat');
 assert.equal(after.players[0].front[0].uid,attacker.uid);
 assert.equal(after.players[1].life.length,beforeLife);
 assert.equal(after.players[1].outside.at(-1).uid,defender.uid);
 assert.ok(assertTtgCoreState(after));
});
test('unblocked attack ACTIVE life trigger readies and buffs own character, not AP',()=>{
 let st=match(11);
 const attacker=findById(st.players[0],'TTG-1-042');
 const lifeActive=findById(st.players[1],'TTG-1-042');
 const replaced=st.players[1].life[0];st.players[1].deck.push(replaced);st.players[1].life[0]=lifeActive;
 const defendingCharacter=findById(st.players[1],'TTG-1-005');
 st.players[1].front[0]={...defendingCharacter,ready:false};
 st.players[0].front[0]={...attacker,ready:true};
 st.players[0].turnCount=2;st.phase='attack';st.players[1].apCards.forEach(x=>x.ready=false);
 st=withTtgDerivedEnergy(st,0);
 const incoming=dispatchTtgCoreAction(st,{type:'attack',uid:attacker.uid});
 const beforeLife=incoming.players[1].life.length;
 const after=dispatchTtgCoreAction(incoming,{type:'block',blockUid:null});
 assert.equal(after.players[1].life.length,beforeLife-1);
 assert.equal(after.players[1].apCards.filter(x=>x.ready).length,0,'ACTIVE does not recover AP');
 assert.equal(after.players[1].front[0].ready,true,'ACTIVE readies chosen own character');
 assert.equal(after.players[1].front[0].currentBp,TTG_BY_ID['TTG-1-005'].bp+3000);
 assert.equal(after.players[1].outside.at(-1).uid,lifeActive.uid);
 assert.ok(assertTtgCoreState(after));
});
test('unblocked attack when defender has no life wins instead of losing card conservation',()=>{
 let st=match(12);
 const attacker=findById(st.players[0],'TTG-1-042');
 st.players[0].front[0]={...attacker,ready:true};
 st.players[0].turnCount=2;st.phase='attack';
 st.players[1].outside.push(...st.players[1].life.splice(0));
 st=withTtgDerivedEnergy(st,0);
 st=dispatchTtgCoreAction(st,{type:'attack',uid:attacker.uid});
 st=dispatchTtgCoreAction(st,{type:'block',blockUid:null});
 assert.equal(st.status,'finished');
 assert.equal(st.winner,0);
 assert.equal(st.endReason,'unblockedAttack');
 assert.ok(assertTtgCoreState(st));
});
test('deterministic 50-card subset AI games make progress and preserve cards every action',()=>{
 for(const seed of [1,7,19,33]){
  const s=match(seed);
  const result=runTtgCoreAiMatch(s,{maxSteps:6000});
  assert.ok(result.actions>=20,'AI match must span multiple phase transitions: '+JSON.stringify({seed,actions:result.actions,turns:result.state.turn,reason:result.state.endReason}));
  assert.ok(result.state.turn>=3,'AI must finish beyond the opening turn');
  assert.equal(result.truncated,false,'AI must resolve life or required-deck-draw ending by step limit');
  assert.equal(result.state.status,'finished');
  assert.ok([0,1].includes(result.state.winner));
  assert.ok(assertTtgCoreState(result.state));
  assert.equal(s.players[0].life.length,7,'original match state must remain immutable');
 }
});

test('higher-BP blocker wins but attacker stays on field REST (official Q34)',()=>{
 let st=match(15);
 const attackingCard=findById(st.players[0],'TTG-1-064');
 const blockingCard=findById(st.players[1],'TTG-1-006');
 st.players[0].front[0]={...attackingCard,ready:true};
 st.players[1].front[0]={...blockingCard,ready:true};
 st.players[0].turnCount=2;st.phase='attack';
 st=withTtgDerivedEnergy(st,0);
 let after=dispatchTtgCoreAction(st,{type:'attack',uid:attackingCard.uid});
 const life=after.players[1].life.length;
 after=dispatchTtgCoreAction(after,{type:'block',blockUid:blockingCard.uid});
 assert.equal(after.players[0].front[0].uid,attackingCard.uid,'attacker is not retired');
 assert.equal(after.players[0].front[0].ready,false);
 assert.equal(after.players[1].front[0].uid,blockingCard.uid);
 assert.equal(after.players[1].life.length,life);
 assert.ok(assertTtgCoreState(after));
});
test('last life card loss wins only after its trigger resolves',()=>{
 let st=match(14);
 const attacker=findById(st.players[0],'TTG-1-042');
 st.players[0].front[0]={...attacker,ready:true};
 st.players[0].turnCount=2;st.phase='attack';
 st.players[1].outside.push(...st.players[1].life.splice(1));
 // Force a final trigger at the last life point: FINAL should restore one.
 const final=findById(st.players[1],'TTG-1-036');
 const previous=st.players[1].life.shift();if(previous)st.players[1].deck.push(previous);
 st.players[1].life.unshift(final);
 st=withTtgDerivedEnergy(st,0);
 let after=dispatchTtgCoreAction(st,{type:'attack',uid:attacker.uid});
 after=dispatchTtgCoreAction(after,{type:'block',blockUid:null});
 assert.equal(after.status,'playing','FINAL restores a life card, so game cannot end');
 assert.equal(after.players[1].life.length,1);
 assert.ok(assertTtgCoreState(after));
 // The second attacker will remove the final life with no FINAL rescue.
});
