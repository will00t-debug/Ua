import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,pruneContinuousStates,attemptFieldActive} from '../dist/universal-v2/continuous-states.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts,DESIGNATED_BLEACH_DECKS}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay,replayUniversalPreview}
 from '../dist/universal-v2/preview-replay.mjs';

// FAQ-specific tests. All deck counts use the untouched user-2026-10-24 lists.
const pack=createBleachV2Pack(),packs=[pack,pack];
const report=summarizeDesignatedDecks(id=>!!pack.cards[id]);
const deck=Object.fromEntries(report.filter(r=>['reject-blue','white-sword'].includes(r.key))
 .map(r=>[r.key,designatedPlayableCounts(r)]));
function fresh(a='white-sword',b='white-sword',seed=1053,first=0){
 return newUniversalMatch(packs,{decks:[deck[a],deck[b]],seed,first});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],at=list.findIndex(c=>c.cardId===id);
  if(at>=0)return list.splice(at,1)[0];
 }
 throw Error('Missing real print '+id);
}
function field(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function moveHand(s,p,id){const c=take(s,p,id);s.players[p].hand.push(c);return c;}
function actor(s){return s.pending?.player??s.active;}
function legalStep(s,pred){
 const chosen=legalUniversalActions(packs,s).find(pred);
 assert.ok(chosen,'no legal choice; phase='+s.phase+' pending='+s.pending?.kind);
 const before=allUids(s);
 const next=dispatchUniversalAction(packs,s,chosen,{actor:actor(s)});
 assert.deepEqual(allUids(next),before,'physical UID conservation');
 assert.equal(assertUniversalMatch(packs,next),true);
 return next;
}
function phase(s,name){
 for(let i=0;i<10&&s.phase!==name;i++)s=legalStep(s,a=>a.type==='next');
 assert.equal(s.phase,name);return s;
}
function allUids(s){
 const out=[],walk=x=>{out.push(x.uid);for(const c of x.stack||[])walk(c);for(const c of x.under||[])walk(c);};
 for(const p of s.players){
  for(const z of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
   for(const c of p[z]||[])walk(c);
  for(const c of [...p.front,...p.energy])if(c)walk(c);
 }
 return out.sort();
}
function runTurnToOpponentMain(s){
 s=phase(s,'attack');s=legalStep(s,a=>a.type==='next');
 assert.equal(s.active,1);return phase(s,'main');
}

test('FAQ Q570: a REST and cannot-ACTIVE Raid base never locks the newly raided physical top',()=>{
 let s=phase(fresh('white-sword','white-sword',10570),'main');
 const source=field(s,0,'BLC-1-085','front',0);
 const base=field(s,1,'BLC-1-083','front',0,false);
 const top=moveHand(s,1,'BLC-1-085');
 field(s,1,'BLC-3-009','energy',0);
 field(s,1,'BLC-3-009','energy',1);
 grantContinuousState(s,{kind:'cannotActive',controller:0,sourceUid:source.uid,
  targetUid:base.uid,sourceLinked:false,releaseBeforeRefresh:true,
  until:{player:1,phase:'attack',edge:'end'}});
 assert.equal(attemptFieldActive(s,1,base),false,'Q569: effect ACTIVE must fail before Raid');
 assert.equal(base.ready,false);
 s=runTurnToOpponentMain(s);
 assert.equal(base.ready,false,'normal refresh must respect remaining lock');
 assert.equal(s.continuousStates.some(e=>e.targetUid===base.uid&&e.kind==='cannotActive'),true);
 s=legalStep(s,a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 const raided=s.players[1].front.find(c=>c?.uid===top.uid);
 assert.ok(raided,'new top UID must be present');
 assert.equal(raided.ready,true,'Q570: printed Raid ACTIVE overrides old base lock');
 assert.equal(raided.stack[0].uid,base.uid,'base UID remains below top, not equal to top');
 pruneContinuousStates(s);
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotActive'&&e.targetUid===top.uid),false);
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotActive'&&e.targetUid===base.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});


test('FAQ Q571: Hitsugaya LIFE Raid during the opponent attack phase expires at THIS attack phase end',()=>{
 let s=fresh('white-sword','white-sword',5711,0);
 const attacker=field(s,0,'BLC-1-083','front',0,true);
 const raidBase=field(s,1,'BLC-1-083','front',0,false);
 field(s,1,'BLC-3-009','energy',0);
 field(s,1,'BLC-3-009','energy',1);
 const raidCard=take(s,1,'BLC-1-085');
 const displaced=s.players[1].life.shift();
 s.players[1].deck.push(displaced);
 s.players[1].life.unshift(raidCard);
 s=phase(s,'attack');
 s=legalStep(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 s=legalStep(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending?.trigger,'raid');
 s=legalStep(s,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&
  a.baseUid===raidBase.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.players[1].front[0].uid,raidCard.uid);
 assert.equal(s.pending?.kind,'effect-rest-lock');
 s=legalStep(s,a=>a.type==='chooseRestLock'&&a.uid===attacker.uid);
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotActive'&&
  e.targetUid===attacker.uid&&e.until.player===0&&e.until.phase==='attack'),true);
 assert.equal(s.phase,'attack');
 assert.equal(s.active,0);
 s=legalStep(s,a=>a.type==='next');
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotActive'&&e.targetUid===attacker.uid),false,
  'Q571: lock must not persist into a subsequent attack phase');
 assert.equal(s.players[0].front[0].ready,true);
});

test('FAQ Q1053-Q1057: REST Raid top strip keeps REST base, no entry trigger and no inherited top buff',()=>{
 let s=phase(fresh('white-sword','white-sword',10567),'main');
 field(s,0,'BLC-3-009','energy',0);field(s,0,'BLC-3-009','energy',1);
 const base=field(s,0,'BLC-3-008','front',0);
 const raid=moveHand(s,0,'BLC-2-067');
 s=legalStep(s,a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===base.uid);
 const top=s.players[0].front[0];
 assert.equal(top.uid,raid.uid);assert.equal(top.stack[0].uid,base.uid);
 assert.equal(top.ready,true);
 top.ready=false;
 top.buffs.push({bp:800,untilTurn:s.turn});
 const beforeBp=universalBp(packs,s,top);
 assert.ok(beforeBp>4000);
 s=runTurnToOpponentMain(s);
 // A normal intervening start/refresh has already occurred; force REST
 // immediately BEFORE the opponent's leave effect, as Q1056 specifies.
 const departing=s.players[0].front[0];
 assert.equal(departing.uid,raid.uid);
 departing.ready=false;
 field(s,1,'BLC-3-009','energy',0);field(s,1,'BLC-3-009','energy',1);
 field(s,1,'BLC-4-070','front',1);
 const event=moveHand(s,1,'BLC-2-073');
 s=legalStep(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'effect-retire-bp');
 s=legalStep(s,a=>a.type==='chooseRetireBp'&&a.uid===raid.uid);
 assert.equal(s.pending.kind,'effect-raid-leave');
 const payment=s.players[0].hand[0];
 assert.ok(payment);
 s=legalStep(s,a=>a.type==='chooseRaidLeave'&&a.mode==='pay'&&a.uid===payment.uid);
 const survivor=s.players[0].front[0];
 assert.equal(survivor.uid,base.uid,'Q1054: original positive base stays');
 assert.equal(survivor.ready,false,'Q1056: REST must be inherited');
 assert.deepEqual(survivor.buffs,[],'Q1057: top received buffs must not survive');
 assert.equal(survivor.fieldEntryStamp>top.fieldEntryStamp,true);
 assert.equal(s.pending,null,'Q1055: stripping does not replay on-entry jobs');
 assert.equal(s.players[0].outside.filter(c=>c.uid===raid.uid).length,1);
 assert.equal(s.players[0].outside.filter(c=>c.uid===payment.uid).length,1);
 assert.equal(s.players[0].outside.some(c=>c.uid===base.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('FAQ Q1046 is an energy-independent hand-move trigger, and Q1033 is source-resolution timing',()=>{
 let s=phase(fresh('reject-blue','reject-blue',10460),'main');
 const ichigo=moveHand(s,0,'BLC-2-016');
 const event=moveHand(s,0,'BLC-2-047');
 assert.equal(s.players[0].energy.every(x=>x===null),true,'no generated energy');
 s=legalStep(s,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-discard');
 const oldDeck=s.players[0].deck.length;
 s=legalStep(s,a=>a.type==='chooseDiscard'&&a.uid===event.uid);
 assert.equal(s.players[0].deck.length,oldDeck-1,'extra draw despite insufficient energy');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
});


test('Q2315 and physical source proof: Riruka observer orders a non-draw Zangetsu grant without accepting forged jobs',()=>{
 let s=phase(fresh('reject-blue','reject-blue',23150),'main');
 const observer=field(s,0,'BLC-4-034','front',0,true);
 const ichigo=moveHand(s,0,'BLC-2-016');
 const zangetsu=moveHand(s,0,'BLC-2-021');
 s=legalStep(s,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='front');
 assert.equal(s.pending?.kind,'effect-discard');
 s=legalStep(s,a=>a.type==='chooseDiscard'&&a.uid===zangetsu.uid);
 assert.equal(s.pending?.kind,'effect-move-order');
 assert.ok(s.pending.entries.some(e=>String(e.key).startsWith('moved-')&&
  e.jobs.some(j=>j.op==='grantCauseBlockAtMost')));
 assert.ok(s.pending.entries.some(e=>String(e.key).startsWith('observer-')));
 const forged=structuredClone(s);
 const earned=forged.pending.entries.find(e=>String(e.key).startsWith('moved-'));
 earned.jobs[0].bp=999999;
 assert.throws(()=>assertUniversalMatch(packs,forged),/Forged moved-card earned effect/);
 assert.equal(assertUniversalMatch(packs,s),true);
 s=legalStep(s,a=>a.type==='chooseMoveEffectOrder'&&String(a.key).startsWith('moved-'));
 assert.equal(s.pending?.kind,'effect-grant-cause');
 s=legalStep(s,a=>a.type==='chooseGrantCause'&&a.mode==='grant');
 assert.equal(s.pending?.kind,'effect-rest-tuck');
 s=legalStep(s,a=>a.type==='chooseRestTuck'&&a.mode==='rest');
 s=legalStep(s,a=>a.type==='chooseTuckMoved'&&a.uid===zangetsu.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0].uid,observer.uid);
 assert.equal(s.players[0].front[0].under[0].uid,zangetsu.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('exact 50-card specified decks: both starts and both mirrors, legal seeded AI paths and replay',()=>{
 const cases=[
  ['reject-blue','white-sword',0,2601],
  ['reject-blue','white-sword',1,2602],
  ['reject-blue','reject-blue',0,2603],
  ['white-sword','white-sword',1,2604],
  ['reject-blue','white-sword',0,2701],
  ['reject-blue','white-sword',1,2702],
  ['reject-blue','reject-blue',1,2703],
  ['white-sword','white-sword',0,2704]
 ];
 for(const [one,two,first,seed] of cases){
  for(const key of [one,two]){
   assert.equal(DESIGNATED_BLEACH_DECKS.find(d=>d.key===key).entries.reduce((n,c)=>n+c.copies,0),50);
   assert.deepEqual(validateUniversalDeck(pack,deck[key]),[]);
  }
  let state=fresh(one,two,seed,first);
  let tape=makeUniversalPreviewReplay(packs,{decks:[deck[one],deck[two]],seed,first});
  let steps=0,aiFallbacks=0;
  for(;steps<2500&&state.status==='playing';steps++){
   const actions=legalUniversalActions(packs,state);
   assert.ok(actions.length>0,'dead pending '+one+'/'+two+' '+steps+' '+state.pending?.kind);
   const aiSelected=chooseUniversalAiAction(packs,state,{difficulty:'normal'});
   // AI is only a driving tool in this FAQ run. Record an AI-null fallback,
   // but NEVER invent or dispatch an action not produced by the reducer.
   // This does not change any AI strategy or endorse AI quality.
   const selected=aiSelected||actions.find(a=>a.type==='next')||
    actions.find(a=>a.type==='chooseBlock'&&a.uid===null)||
    actions.find(a=>a.type==='chooseTrigger'&&a.mode==='skip')||actions[0];
   if(!aiSelected)aiFallbacks++;
   assert.ok(actions.some(a=>JSON.stringify(a)===JSON.stringify(selected)),'illegal chosen action');
   const p=actor(state),u=allUids(state);
   state=dispatchUniversalAction(packs,state,selected,{actor:p});
   tape=appendUniversalReplay(tape,selected,p);
   assert.deepEqual(allUids(state),u,'UID lost or duplicated at '+steps);
   if(steps%40===0)assert.equal(assertUniversalMatch(packs,state),true);
  }
  assert.equal(state.status,'finished',one+' vs '+two+' first='+first+' seed='+seed+' after '+steps+' steps');
  assert.ok([0,1].includes(state.winner));
  assert.equal(assertUniversalMatch(packs,state),true);
  assert.deepEqual(replayUniversalPreview(packs,tape,{maxActions:2501}),state,
   'replay divergence for '+one+' vs '+two);
  // Emit reproducible per-deck counts into the GitHub Actions test log.
  console.log('DESIGNATED_GAME_RESULT',JSON.stringify({one,two,seed,first,steps,
   winner:state.winner,endReason:state.endReason,aiFallbacks,replay:'PASS'}));
 }
});
