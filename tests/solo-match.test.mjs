import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_MATCH_SUPPORTED,SOLO_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET,soloTrainingDeckIssues,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloTrainingBotAction,assertSoloTrainingMatch,simulateSoloTraining,soloEnergy} from '../dist/solo-match.mjs';
const advance=(s,target)=>{for(let i=0;i<5&&s.phase!==target;i++)s=soloTrainingDispatch(s,{type:'next'});return s;};
test('training deck uses exactly 50 cards and rejects overweight or invalid SLG deck',()=>{
 assert.deepEqual(soloTrainingDeckIssues(SOLO_TRAINING_PRESET),[]);
 const size=Object.values(SOLO_TRAINING_PRESET).reduce((a,b)=>a+b,0);assert.equal(size,50);
 assert.equal(SOLO_MATCH_SUPPORTED.length,80);
 assert.match(soloTrainingDeckIssues({'SLG-1-030':12,'SLG-1-047':4}).join(';'),/50/);
 assert.match(soloTrainingDeckIssues({...SOLO_TRAINING_PRESET,'SLG-1-047':1}).join(';'),/51張/);
});
test('opening both players has 7 hand, 7 life, no duplicate UIDs, first-turn AP 1, source-phase transitions',()=>{
 let s=newSoloTrainingMatch({seed:74});
 assert.equal(s.players[0].hand.length,7);assert.equal(s.players[1].life.length,7);
 assert.equal(s.players[0].ap,1);assert.equal(s.phase,'start');assert.equal(soloEnergy(s),0);
 assertSoloTrainingMatch(s);
 s=advance(s,'main');assert.equal(s.phase,'main');
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='play'),s.players[0].hand.some(c=>c.cardId));
 assertSoloTrainingMatch(s);
});
test('illegal match actions cannot mutate input or fabricate a card',()=>{
 let s=newSoloTrainingMatch({seed:21}),copy=structuredClone(s);
 assert.throws(()=>soloTrainingDispatch(s,{type:'play',uid:'forgery',line:'front',slot:0}),/illegal/);
 assert.deepEqual(s,copy);
});
test('every active/supported start-to-end match survives card conservation and legal action enumeration',()=>{
 for(const seed of [1,2,3,4,5,6,7,8]){
  let s=newSoloTrainingMatch({seed,first:seed%2});let steps=0;
  while(s.status==='playing'&&steps<3000){
   const a=soloTrainingBotAction(s);
   assert.ok(soloTrainingLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
   s=soloTrainingDispatch(s,a);steps++;
  }
  assert.equal(s.status,'finished','seed '+seed+' incomplete after '+steps+' actions');
  assert.ok([0,1].includes(s.winner));assertSoloTrainingMatch(s);
 }
});
test('simulation helper runs independently from BLEACH game engine',()=>{
 const sim=simulateSoloTraining(40,3000);
 assert.equal(sim.finished,true);assert.equal(sim.state.title,'solo-leveling');
});

test('purple Shadow Army deck is a 50-card legal training preset with 12 Shadow Soldiers',()=>{
 assert.equal(Object.values(SOLO_SHADOW_TRAINING_PRESET).reduce((a,b)=>a+b,0),50);
 assert.equal(SOLO_SHADOW_TRAINING_PRESET['SLG-1-030'],12);
 assert.deepEqual(soloTrainingDeckIssues(SOLO_SHADOW_TRAINING_PRESET),[]);
 const first=newSoloTrainingMatch({decks:[SOLO_SHADOW_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET],seed:900});
 assertSoloTrainingMatch(first);
});
test('AI completes purple Shadow Army matches with conditional REST and top-two choices without losing cards',()=>{
 for(const seed of [11,12,13,14,15,16]){
  let s=newSoloTrainingMatch({decks:[SOLO_SHADOW_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET],seed});
  let steps=0;
  while(s.status==='playing'&&steps<3000){
   const a=soloTrainingBotAction(s);
   assert.ok(soloTrainingLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
   s=soloTrainingDispatch(s,a);steps++;
  }
  assert.equal(s.status,'finished','purple seed '+seed+' stuck at '+steps);
  assertSoloTrainingMatch(s);
 }
});

test('Shizuku green Raid turns base into stack, consumes one AP and stays UID-conservative',()=>{
 const decks=[SOLO_TRAINING_PRESET,SOLO_TRAINING_PRESET];
 let s=newSoloTrainingMatch({decks,seed:270});const p=s.players[0];s.phase='main';p.ap=3;p.maxAp=3;
 const pluck=(id)=>{for(const area of ['hand','deck','life']){let ix=p[area].findIndex(x=>x.cardId===id);if(ix>=0)return p[area].splice(ix,1)[0];}throw Error('not in deck '+id);};
 const base=pluck('SLG-1-055');base.owner=0;base.line='front';base.slot=0;base.ready=false;p.front[0]=base;
 const raid=pluck('SLG-1-058');p.hand.push(raid);
 for(let i=0;i<4;i++){const c=pluck('SLG-1-045');c.owner=0;c.line='energy';c.slot=i;c.ready=true;p.energy[i]=c;}
 const possible=soloTrainingLegalActions(s).filter(x=>x.type==='raid'&&x.uid===raid.uid);
 assert.ok(possible.some(a=>a.target===base.uid&&a.line==='front'&&a.slot===0));
 const beforeAp=p.ap;
 s=soloTrainingDispatch(s,possible.find(a=>a.target===base.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.players[0].ap,beforeAp-1);
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='raid'&&a.uid===raid.uid),false);
 assertSoloTrainingMatch(s);
});

test('life RAID Trigger can choose legal free Raid on own Shizuku base, or add card to hand',()=>{
 const setup=()=>{
  let s=newSoloTrainingMatch({decks:[SOLO_TRAINING_PRESET,SOLO_TRAINING_PRESET],seed:789});
  const take=(p,id)=>{for(const key of ['hand','deck','life']){const i=p[key].findIndex(c=>c.cardId===id);if(i>=0)return p[key].splice(i,1)[0];}throw Error('missing '+id);};
  const attacker=take(s.players[0],'SLG-1-045');Object.assign(attacker,{owner:0,line:'front',slot:0,ready:true});
  s.players[0].front[0]=attacker;s.phase='attack';
  const defender=s.players[1],base=take(defender,'SLG-1-055');
  Object.assign(base,{owner:1,line:'energy',slot:0,ready:true});defender.energy[0]=base;
  for(let i=1;i<4;i++){const e=take(defender,'SLG-1-045');Object.assign(e,{owner:1,line:'energy',slot:i,ready:true});defender.energy[i]=e;}
  const raid=take(defender,'SLG-1-058'),prior=defender.life[0];
  defender.life[0]=raid;if(prior)defender.deck.push(prior);
  assertSoloTrainingMatch(s);
  s=soloTrainingDispatch(s,{type:'attack',uid:attacker.uid});
  assert.equal(s.pending.kind,'soloOptionalLife');assert.equal(s.pending.p,1);
  return {s,raid,base};
 };
 const yes=setup();yes.s=soloTrainingDispatch(yes.s,{type:'choose',mode:'raid'});
 assert.equal(yes.s.pending.kind,'raidTrigger');
 const legal=soloTrainingLegalActions(yes.s),raidChoice=legal.find(a=>a.uid===yes.base.uid&&a.line==='energy');
 assert.ok(raidChoice);
 const beforeAp=yes.s.players[1].ap;
 const after=soloTrainingDispatch(yes.s,raidChoice);
 assert.equal(after.players[1].ap,beforeAp);
 assert.equal(after.players[1].energy[0].uid,yes.raid.uid);
 assert.equal(after.players[1].energy[0].stack[0].uid,yes.base.uid);
 assert.equal(after.pending,null);assertSoloTrainingMatch(after);
 const no=setup();
 const kept=soloTrainingDispatch(no.s,{type:'choose',mode:'get'});
 assert.ok(kept.players[1].hand.some(c=>c.uid===no.raid.uid));
 assert.equal(kept.pending,null);assertSoloTrainingMatch(kept);
});
