import test from 'node:test';
import assert from 'node:assert/strict';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction}
 from '../dist/universal-v2/engine.mjs';
import {stableTransitionRejection,evaluateTrustedUniversalAiTactics}
 from '../dist/universal-v2/ai-tactics.mjs';
import {createUniversalAiObservation} from '../dist/universal-v2/ai-observation.mjs';
import {rankUniversalAiActions} from '../dist/universal-v2/ai-strategy.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const preset=createAllV2PreviewRealDecks()['solo-leveling'];
const packs=[preset.pack,preset.pack],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const card=(uid,cardId)=>({uid,cardId});
const player=()=>({deck:[],life:[],lifeRevealed:[],front:[],energy:[],
 hand:[],outside:[]});
const transition=()=>({status:'playing',rng:1,active:0,phase:'main',
 players:[player(),player()],effectQueue:[]});
const native=(s,a)=>dispatchUniversalAction(packs,s,a,{actor:s.pending?.player??s.active});

// The original failure silently returned 'false' (accepted) for ANY new own-hand
// UID. Preserve only truly attributable, publicly known OWN physical cards.
test('R3 closeout: UNKNOWN own-hand arrival is rejected, public recovery permitted',()=>{
 const before=transition(),unknown=structuredClone(before);
 unknown.players[0].hand.push(card('unseen','SLG-1-005'));
 assert.equal(stableTransitionRejection(before,unknown,{type:'activate'},0),
  'own-hand-unattributed-arrival');
 const returned=structuredClone(before);
 before.players[0].outside.push(card('known','SLG-1-005'));
 returned.players[0].hand.push(card('known','SLG-1-005'));
 assert.equal(stableTransitionRejection(before,returned,{type:'activate'},0),null);
 const forged=structuredClone(returned);
 forged.players[0].hand[0].cardId='SLG-1-038';
 assert.equal(stableTransitionRejection(before,forged,{type:'activate'},0),
  'own-hand-unattributed-arrival');
});

// Fixed reducer-produced fixture from original R3 CI log (seed 21, tick 7,
// SLG turn 2). No per-test seed scanning. The complete legal root set is used.
function tacticalFixture(){
 let s=newUniversalMatch(packs,{decks:[preset.counts,preset.counts],seed:21});
 for(let tick=0;tick<7;tick++){
  const legal=legalUniversalActions(packs,s);
  const a=legal.find(x=>x.type==='play'&&x.line==='energy')||
   legal.find(x=>x.type==='play'&&x.line==='front')||
   legal.find(x=>x.type==='next')||legal[0];
  s=native(s,a);
 }
 assert.equal(s.status,'playing');
 assert.equal(s.phase,'main');
 assert.equal(s.active,1);
 return s;
}
test('R3 closeout: FULL legal choice compared with real ENERGY-to-FRONT sequence',()=>{
 const s=tacticalFixture(),legal=legalUniversalActions(packs,s);
 const o=createUniversalAiObservation(packs,s,legal),ranked=rankUniversalAiActions(packs,o);
 const trace=[],t=evaluateTrustedUniversalAiTactics(packs,s,o,ranked,
  {timeMs:100,depth:2,nodes:60,roots:4,children:5,trace});
 assert.ok(legal.some(a=>same(a,t.action)));
 const telemetry={};
 const selected=chooseUniversalAiAction(packs,s,{difficulty:'hard',telemetry,
  tacticalLimits:{timeMs:100,nodes:24,depth:3}});
 assert.equal(telemetry.rawActionLegal,true);
 assert.ok(legal.some(a=>same(a,selected)));
 const first=legal.find(x=>x.type==='play'&&x.line==='energy'&&x.uid==='1-1'&&x.slot===0);
 assert.ok(first,'fixed recorded native ENERGY action still legal');
 const after=native(s,first),front=legalUniversalActions(packs,after).find(
  x=>x.type==='play'&&x.line==='front'&&x.uid==='1-32'&&x.slot===0);
 assert.ok(front,'FRONT is made legal by the ENERGY step');
 const result=native(after,front);
 assert.equal(result.status,'playing');
 assert.ok(!result.players[s.active].hand.some(c=>c.uid==='1-32'));
 assert.ok(result.players[s.active].front.some(c=>c?.uid==='1-32'));
 // Diagnostics must name the chosen ROOT and its direct descendants.
 for(const event of trace.filter(e=>e.at==='native'&&e.accepted&&e.path?.length===2)){
  assert.ok(trace.some(r=>r.at==='native'&&r.accepted&&
   r.path?.length===1&&r.path[0]===event.path[0]));
 }
 console.log('R3 CLOSEOUT ACTUAL POLICY',JSON.stringify({
  baseline:ranked[0]?.action,chosen:selected,telemetry,
  search:t,frontAfterEnergy:front,visitedRoots:trace.filter(x=>x.at==='root-score')
 }));
});
test('R3 closeout: SAME observation with hidden zone mutations keeps raw strategy choice',()=>{
 const s=tacticalFixture(),other=structuredClone(s);
 for(const p of other.players){p.deck.reverse();p.life.reverse();}
 const enemy=other.players[1-s.active];
 if(enemy.deck.length&&enemy.hand.length)
  [enemy.deck[0],enemy.hand[0]]=[enemy.hand[0],enemy.deck[0]];
 const take=x=>{
  const data={};
  const decision=chooseUniversalAiAction(packs,x,
   {difficulty:'hard',tacticalLimits:{nodes:24,depth:2,timeMs:100},telemetry:data});
  return {decision,reason:data.tacticalFallback,changed:data.tacticalChanged,
   fallback:data.legalFallback};
 };
 const a=take(s),b=take(other);
 assert.deepEqual(a,b);
});
