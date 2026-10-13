import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState,runTtgCoreAiMatch,validateTtgCoreDeck} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';

// Real 50-card mono-green decks: one 039 appears in the complete test game.
const deck=()=>Object.fromEntries([
 ...['003','005','006','009','010','011','014','015','016','017','018','019']
  .map(n=>['TTG-1-'+n,4]),
 ['TTG-1-039',2]
]);
function extract(pl,id){
 for(const zone of ['deck','hand','life','outside']){
  const index=pl[zone].findIndex(c=>c.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 throw new Error('Not enough physical cards '+id);
}
function fixture({blockId='TTG-1-006',lifeId='TTG-1-006'}={}){
 const s=newTtgCoreMatch({decks:[deck(),deck()],seed:318});
 s.phase='main';s.players[0].turnCount=2;
 const atk=s.players[0],def=s.players[1];
 atk.front[0]={...extract(atk,'TTG-1-009'),ready:true};
 for(let i=0;i<3;i++)atk.energy[i]={...extract(atk,'TTG-1-017'),ready:true};
 const evt=extract(atk,'TTG-1-039');atk.hand.push(evt);
 const lifeTop=def.life[0];
 if(lifeTop.cardId!==lifeId){def.deck.push(def.life.shift());def.life.unshift(extract(def,lifeId));}
 def.front[0]={...extract(def,blockId),ready:true};
 // Recompute physical energy from printed producers.
 return withTtgDerivedEnergy(s,0);
}
function playEvent(s){
 const option=legalTtgCoreActions(s).find(a=>a.type==='playGreenEvent'&&a.cardId==='TTG-1-039'&&a.targetUid===s.players[0].front[0].uid);
 assert.ok(option,'039 must offer an explicit own Simon target');
 const ap=s.players[0].apCards.find(a=>a.ready);
 const used=dispatchTtgCoreAction(s,{...option,payApUids:[ap.uid]});
 assert.equal(used.players[0].front[0].greenEventImpact,1);
 assert.ok(used.players[0].front[0].currentBp>TTG_BY_ID['TTG-1-006'].bp);
 return dispatchTtgCoreAction(used,{type:'next'});
}
function attack(s){
 const uid=s.players[0].front[0].uid;
 const after=dispatchTtgCoreAction(s,{type:'attack',uid});
 assert.equal(after.pending?.kind,'block');
 return after;
}
test('039 officially deals EXACTLY 1 life damage if a blocker loses (Q71)',()=>{
 const s=playEvent(fixture());
 const beforeLife=s.players[1].life.length,lifeUid=s.players[1].life[0].uid;
 const before=JSON.stringify(s);
 const attacked=attack(s),defenderUid=attacked.players[1].front[0].uid;
 const after=dispatchTtgCoreAction(attacked,{type:'block',blockUid:defenderUid});
 assert.equal(after.players[1].front[0],null);
 assert.equal(after.players[1].life.length,beforeLife-1);
 assert.ok(after.players[1].outside.some(c=>c.uid===lifeUid));
 assert.equal(after.pendingTtgLife==null,true,'non-trigger life resolves immediately');
 assert.equal(after.players[0].front[0].ready,false);
 assert.ok(assertTtgCoreState(after));
 assert.equal(JSON.stringify(s),before,'reducer must not mutate original');
 const turnEnded=dispatchTtgCoreAction(after,{type:'next'});
 assert.equal(turnEnded.players[0].front[0].greenEventImpact,0);
 assert.equal(turnEnded.players[0].front[0].currentBp,TTG_BY_ID['TTG-1-009'].bp);
});
test('039 IMPACT is NOT another point of damage on an unblocked direct attack (Q75)',()=>{
 const s=playEvent(fixture());
 const before=s.players[1].life.length;
 const out=dispatchTtgCoreAction(attack(s),{type:'block',blockUid:null});
 assert.equal(out.players[1].life.length,before-1);
 assert.ok(out.players[1].front[0]);
 assert.ok(assertTtgCoreState(out));
});
test('039 IMPACT is suppressed by IMPACT-null defender even if that blocker loses (Q77)',()=>{
 const s=playEvent(fixture({blockId:'TTG-1-005'})),before=s.players[1].life.length;
 const attacked=attack(s);
 const out=dispatchTtgCoreAction(attacked,{type:'block',blockUid:s.players[1].front[0].uid});
 assert.equal(out.players[1].life.length,before);
 assert.equal(out.players[1].front[0],null);
 assert.equal(out.players[0].front[0].greenEventImpact,1,'attacker retains its impact until turn end');
 assert.ok(assertTtgCoreState(out));
});
test('039 does not damage through a higher-BP blocker when attack loses (Q34)',()=>{
 const s=playEvent(fixture()),before=s.players[1].life.length;
 s.players[1].front[0].currentBp=80000;
 const out=dispatchTtgCoreAction(attack(s),{type:'block',blockUid:s.players[1].front[0].uid});
 assert.equal(out.players[1].life.length,before);
 assert.equal(out.players[0].front[0].ready,false);
 assert.ok(out.players[0].front[0]);
 assert.ok(out.players[1].front[0]);
 assert.ok(assertTtgCoreState(out));
});
test('039 in green 50-card decks produces legal, deterministic full AI match completions',()=>{
 assert.deepEqual(validateTtgCoreDeck(deck()),[]);
 for(const seed of [5,13,44]){
  const game=newTtgCoreMatch({decks:[deck(),deck()],seed});
  const outcome=runTtgCoreAiMatch(game,{maxSteps:9000});
  assert.equal(outcome.truncated,false,JSON.stringify({seed,actions:outcome.actions}));
  assert.equal(outcome.state.status,'finished');
  assert.ok(assertTtgCoreState(outcome.state));
 }
});
