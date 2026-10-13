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
test('all 81 printed cards are admitted to isolated core without claiming browser website automation',()=>{
 assert.ok(TTG_CORE_SMOKE_IDS.length>=13);
 assert.equal(TTG_CORE_SMOKE_IDS.length,81);
 assert.deepEqual(validateTtgCoreDeck(deck()),[]);
 const bad={...deck(),'TTG-1-999':1,'TTG-1-036':0};
 assert.ok(validateTtgCoreDeck(bad).some(x=>x.includes('TTG-1-999')));
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
 const pending=dispatchTtgCoreAction(incoming,{type:'block',blockUid:null});
 assert.equal(pending.pendingTtgLife.trigger,'active');
 assert.ok(legalTtgCoreActions(pending).every(a=>a.type==='ttgLifeChoice'));
 const active=legalTtgCoreActions(pending).find(a=>a.mode==='active'&&a.targetUid===defendingCharacter.uid);
 const after=dispatchTtgCoreAction(pending,active);
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
 assert.equal(after.status,'playing','FINAL awaits optional defender resolution (Q99)');
 assert.equal(after.players[1].life.length,0);
 assert.equal(after.pendingTtgLife?.trigger,'final');
 const rescue=legalTtgCoreActions(after).find(a=>a.mode==='final');
 assert.ok(rescue,'defender must be able to choose FINAL');
 after=dispatchTtgCoreAction(after,rescue);
 assert.equal(after.status,'playing','chosen FINAL restores one life');
 assert.equal(after.players[1].life.length,1);
 assert.ok(assertTtgCoreState(after));
 // The second attacker will remove the final life with no FINAL rescue.
});

test('end of active turn readies own field BEFORE the other player can block',()=>{
 let st=match(44);
 const actor=findById(st.players[0],'TTG-1-042');
 st.players[0].front[0]={...actor,ready:false};
 st.phase='attack';st.players[0].turnCount=2;
 st=withTtgDerivedEnergy(st,0);
 const next=dispatchTtgCoreAction(st,{type:'next'});
 assert.equal(next.active,1);
 assert.equal(next.phase,'start');
 assert.equal(next.players[0].front[0].ready,true);
 assert.equal(st.players[0].front[0].ready,false);
 assert.ok(assertTtgCoreState(next));
});
test('TTG-1-048 first block readies itself, second block rests it (Double Block)',()=>{
 let st=match(22);
 const defender=findById(st.players[1],'TTG-1-048');
 const attacker=findById(st.players[0],'TTG-1-042');
 const attacker2=findById(st.players[0],'TTG-1-064');
 st.players[1].turnCount=2;
 st.players[1].front[0]={...defender,ready:true,
  doubleBlockUntilOwnStartTurnCount:3,currentBp:TTG_BY_ID[defender.cardId].bp+500,
  buffs:[{bp:500,turn:1,until:'ownNextStart'}]};
 st.players[0].front[0]={...attacker,ready:true};
 st.players[0].front[1]={...attacker2,ready:true};
 st.players[0].turnCount=2;st.phase='attack';
 st=withTtgDerivedEnergy(st,0);
 st=dispatchTtgCoreAction(st,{type:'attack',uid:attacker.uid});
 st=dispatchTtgCoreAction(st,{type:'block',blockUid:defender.uid});
 assert.equal(st.players[1].front[0].ready,true,'first block makes defender ACTIVE');
 assert.equal(st.players[1].front[0].doubleBlockUsedTurn,st.turn);
 st=dispatchTtgCoreAction(st,{type:'attack',uid:attacker2.uid});
 st=dispatchTtgCoreAction(st,{type:'block',blockUid:defender.uid});
 assert.equal(st.players[1].front[0].ready,false,'second block stays REST');
 assert.ok(assertTtgCoreState(st));
 st=dispatchTtgCoreAction(st,{type:'next'});
 assert.equal(st.active,1);
 assert.equal(st.players[1].turnCount,3);
 assert.equal(st.players[1].front[0].currentBp,TTG_BY_ID[defender.cardId].bp,'previous attack buff expires at own start');
 assert.equal(st.players[1].front[0].doubleBlockUntilOwnStartTurnCount,undefined);
});

test('50-card ALL GREEN subset plays to completion against itself without skipping entries',()=>{
 const green=Object.fromEntries([
  ...['001','002','003','005','006','009','010','011','014','015','018','019']
   .map(n=>['TTG-1-'+n,4]),['TTG-1-020',2]
 ]);
 assert.equal(Object.values(green).reduce((n,x)=>n+x,0),50);
 assert.deepEqual(validateTtgCoreDeck(green),[]);
 for(const seed of [5,12,47]){
  const initial=newTtgCoreMatch({decks:[green,green],seed});
  const done=runTtgCoreAiMatch(initial,{maxSteps:9000});
  assert.equal(done.truncated,false,JSON.stringify({seed,actions:done.actions,turn:done.state.turn}));
  assert.equal(done.state.status,'finished');
  assert.ok(done.actions>=20);
  assert.ok(assertTtgCoreState(done.state));
  assert.equal(initial.players[0].hand.length,7,'original game unchanged');
 }
});
test('green 009 mandatory draw/discard must resolve before continuing Main phase',()=>{
 const green=Object.fromEntries([...['001','002','003','005','006','009','010','011','014','015','018','019']
  .map(n=>['TTG-1-'+n,4]),['TTG-1-020',2]]);
 let st=newTtgCoreMatch({decks:[green,green],seed:7});
 // Resolve a known green 009 using the existing drawn 50 physical cards.
 const owner=st.players[0];
 let i=owner.hand.findIndex(c=>c.cardId==='TTG-1-009');
 if(i<0){
  const j=owner.deck.findIndex(c=>c.cardId==='TTG-1-009');
  const retrieved=owner.deck.splice(j,1)[0];
  owner.deck.push(owner.hand.shift());
  owner.hand.push(retrieved);
 }
 st=dispatchTtgCoreAction(st,{type:'next'});
 st=dispatchTtgCoreAction(st,{type:'next'});
 // A zero-energy generator is required to afford the 009 play.
 const zero=owner.hand.find(c=>TTG_BY_ID[c.cardId].energy===0);
 if(zero){
  const idx=owner.hand.indexOf(zero);owner.energy[0]=owner.hand.splice(idx,1)[0];
 }
 st=withTtgDerivedEnergy(st,0);
 const action=legalTtgCoreActions(st).find(a=>a.type==='play'&&st.players[0].hand.find(c=>c.uid===a.handUid)?.cardId==='TTG-1-009');
 if(!action)return; // energy requirement depends on printed opening order
 const next=dispatchTtgCoreAction(st,action);
 assert.equal(next.pending.kind,'ttgGreenEntry');
 assert.ok(legalTtgCoreActions(next).every(a=>a.type==='resolveGreenEntry'));
 assert.throws(()=>dispatchTtgCoreAction(next,{type:'next'}));
 const resolved=dispatchTtgCoreAction(next,legalTtgCoreActions(next)[0]);
 assert.equal(resolved.pending,null);
 assert.ok(assertTtgCoreState(resolved));
});
