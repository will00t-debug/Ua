import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {createUniversalAiObservation} from '../dist/universal-v2/ai-observation.mjs';
import {rankUniversalAiActions} from '../dist/universal-v2/ai-strategy.mjs';
import {boundedUniversalAiContinuationDetailed,stableUniversalAiActionKey} from '../dist/universal-v2/ai-planner.mjs';
import {evaluateTrustedUniversalAiTactics} from '../dist/universal-v2/ai-tactics.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const presets=createAllV2PreviewRealDecks();
const p=presets['solo-leveling'],packs=[p.pack,p.pack];
const begin=()=>{
 let s=newUniversalMatch(packs,{decks:[p.counts,p.counts],seed:20261026});
 for(let n=0;n<10&&s.phase!=='main';n++){
  const legal=legalUniversalActions(packs,s);
  const a=legal.find(x=>x.type==='next')||legal[0];
  s=dispatchUniversalAction(packs,s,a,{actor:s.pending?.player??s.active});
 }
 assert.equal(s.phase,'main');
 return s;
};
test('Round 3: canonical tie keys cannot depend on original reducer field order',()=>{
 const a={type:'play',uid:'0-7',line:'front',slot:3};
 const b={slot:3,line:'front',uid:'0-7',type:'play'};
 assert.equal(stableUniversalAiActionKey(a),stableUniversalAiActionKey(b));
});
test('Round 3: legal list permutations keep full-set heuristic best and bounded estimates',()=>{
 const s=begin(),o=createUniversalAiObservation(packs,s,legalUniversalActions(packs,s));
 const base=rankUniversalAiActions(packs,o)[0]?.action;
 const reversed={...o,legal:[...o.legal].reverse()};
 assert.deepEqual(rankUniversalAiActions(packs,reversed)[0].action,base);
 const one=boundedUniversalAiContinuationDetailed(packs,o,{timeMs:100});
 const two=boundedUniversalAiContinuationDetailed(packs,reversed,{timeMs:100});
 assert.equal(one.fallback,two.fallback);
 assert.deepEqual([...one.bonuses].sort(),[...two.bonuses].sort());
});
test('Round 3: insufficient fixed node budget returns no partial bonuses',()=>{
 const s=begin(),o=createUniversalAiObservation(packs,s,legalUniversalActions(packs,s));
 const disabled=boundedUniversalAiContinuationDetailed(packs,o,{nodes:0});
 assert.equal(disabled.bonuses.size,0);
 assert.equal(disabled.fallback,'disabled');
 const tiny=boundedUniversalAiContinuationDetailed(packs,o,{nodes:1,timeMs:100});
 if(tiny.fallback==='node-budget')assert.equal(tiny.bonuses.size,0);
});
test('Round 3: native tactical bridge returns a genuine root legal action without mutating state',()=>{
 const s=begin(),before=JSON.stringify(s),legal=legalUniversalActions(packs,s);
 const o=createUniversalAiObservation(packs,s,legal),ranked=rankUniversalAiActions(packs,o);
 const result=evaluateTrustedUniversalAiTactics(packs,s,o,ranked,{nodes:40,timeMs:100});
 assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(result.action)));
 assert.equal(JSON.stringify(s),before);
 assert.ok(result.nodes<=41);
 assert.equal(evaluateTrustedUniversalAiTactics(packs,s,o,ranked,{nodes:0}).action.type,
  ranked[0].action.type);
});
test('Round 3: emergency timing disables rollout safely; Hard remains legal',()=>{
 const s=begin(),legal=legalUniversalActions(packs,s);
 const o=createUniversalAiObservation(packs,s,legal),ranked=rankUniversalAiActions(packs,o);
 const aborted=evaluateTrustedUniversalAiTactics(packs,s,o,ranked,{timeMs:0});
 assert.equal(aborted.fallback,'not-eligible');
 assert.deepEqual(aborted.action,ranked[0].action);
 for(const tactical of [false,true]){
  const picked=chooseUniversalAiAction(packs,s,{difficulty:'hard',tactical});
  assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(picked)));
 }
});
test('Round 3: hidden-zone reordering never becomes a future exact LIFE prediction',()=>{
 const s=begin(),other=structuredClone(s);
 for(const pl of other.players){pl.deck.reverse();pl.life.reverse();}
 const take=state=>{
  const legal=legalUniversalActions(packs,state);
  const o=createUniversalAiObservation(packs,state,legal);
  return evaluateTrustedUniversalAiTactics(packs,state,o,
   rankUniversalAiActions(packs,o),{timeMs:100,nodes:40}).action;
 };
 assert.deepEqual(take(s),take(other));
});

test('Round 3: exact native main-to-attack phase transition is actually expanded',()=>{
 const s=begin(),legal=legalUniversalActions(packs,s),next=legal.find(a=>a.type==='next');
 assert.ok(next,'native main phase has a next action');
 const observation=createUniversalAiObservation(packs,s,legal);
 const result=evaluateTrustedUniversalAiTactics(packs,s,observation,
  [{action:next,score:0,utility:0}],{roots:1,children:1,depth:1,nodes:8,timeMs:100});
 assert.equal(result.fallback,null);
 assert.ok(result.exactSteps>=1,'a deterministic native reducer edge was exercised');
 assert.equal(result.used,true);
});

test('Round 3: registered deck can demonstrate native ENERGY play into native FRONT play',()=>{
 let verified=false,firstPair=null,visitedMain=0;
 // Reach the tactical root naturally through the official reducer. A turn-one
 // SLG opening is not guaranteed to have a legal ENERGY→FRONT chain.
 for(let seed=21;seed<=50&&!verified;seed++){
  let s=newUniversalMatch(packs,{decks:[p.counts,p.counts],seed});
  for(let tick=0;tick<180&&s.status==='playing'&&!verified;tick++){
   const actor=s.pending?.player??s.active;
   const legal=legalUniversalActions(packs,s);
   if(!s.pending&&s.phase==='main'){
    visitedMain++;
    for(const first of legal.filter(a=>a.type==='play'&&a.line==='energy')){
     const mid=dispatchUniversalAction(packs,s,first,{actor});
     if(mid.pending||mid.status!=='playing')continue;
     const afterEnergy=legalUniversalActions(packs,mid);
     const frontLegal=afterEnergy.filter(a=>a.type==='play'&&a.line==='front');
     if(!frontLegal.length)continue;
     const o=createUniversalAiObservation(packs,s,legal),trace=[];
     const tactical=evaluateTrustedUniversalAiTactics(packs,s,o,
      [{action:first,score:0,utility:0}],{roots:1,children:10,depth:2,nodes:100,timeMs:100,trace});
     // Native exactSteps could otherwise count ENERGY→ENERGY and silently
     // pass even when every true FRONT candidate was rejected.
     const acceptedFront=trace.find(e=>e.at==='native'&&e.action==='play'&&
      e.line==='front'&&e.accepted===true);
     const follow=frontLegal.find(a=>a.uid===acceptedFront?.uid&&a.slot===acceptedFront?.slot);
     const final=follow?dispatchUniversalAction(packs,mid,follow,{actor}):null;
     if(final)assert.equal(final.status,'playing','certified FRONT retains a real match state');
     const evidence={seed,tick,turn:s.turn,
      initial:{phase:s.phase,actor,ap:o.players[actor].ap,
       hand:o.players[actor].hand.map(c=>({uid:c.uid,cardId:c.cardId})),
       energy:o.players[actor].energyByColor},
      first,mid:{phase:mid.phase,ap:mid.players[actor].ap,legal:afterEnergy.length},
      follow:follow||null,frontLegalCount:frontLegal.length,
      final:final?{phase:final.phase,active:final.active}:null,
      tactical,trace};
     if(!firstPair)firstPair=evidence;
     if(tactical.exactSteps>=2&&follow&&final){
      console.log('R3 TWO-STEP CERTIFIED',JSON.stringify(evidence));
      verified=true;break;
     }
    }
   }
   if(verified)break;
   // Deterministic, legal, real match progression to later main phases.
   // Prefer building ENERGY, then deploy FRONT, and pass attack without
   // resolving unrevealed LIFE in our tactical search.
   const action=legal.find(a=>a.type==='play'&&a.line==='energy')||
    legal.find(a=>a.type==='play'&&a.line==='front')||
    legal.find(a=>a.type==='next')||legal[0];
   assert.ok(action,'state must expose a native legal action');
   s=dispatchUniversalAction(packs,s,action,{actor});
  }
 }
 if(!verified)console.log('R3 TWO-STEP FAILURE EVIDENCE',
  JSON.stringify({visitedMain,firstPair}));
 assert.equal(verified,true,'requires a real two-action reducer sequence, not guessed energy affordability');
});
