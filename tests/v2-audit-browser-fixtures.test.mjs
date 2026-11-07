import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAuditFixture} from '../dist/universal-v2/audit-browser-fixtures.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {facedownInspectModel} from '../dist/universal-v2/facedown-inspect.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';

test('KMR-2-054 audit board attacks, the AI blocks, and the look stays private',()=>{
 const {packs,state}=loadAuditFixture('kmr054');
 const heat=state.players[0].front[0];
 const wall=state.players[1].front[0];
 assert.equal(heat.cardId,'KMR-2-054');
 assert.equal(state.phase,'attack');
 assert.ok(universalBp(packs,state,wall)>universalBp(packs,state,heat));
 const attack=legalUniversalActions(packs,state).find(a=>a.type==='attack'&&a.uid===heat.uid);
 assert.ok(attack);
 let next=dispatchUniversalAction(packs,state,attack,{actor:0});
 assert.equal(next.pending?.kind,'block');
 const ai=chooseProgressSafeAiAction(packs,next,{difficulty:'normal'});
 assert.equal(ai.action.type,'chooseBlock');
 assert.equal(ai.action.uid,wall.uid);
 next=dispatchUniversalAction(packs,next,ai.action,{actor:1});
 assert.equal(next.pending?.id,'KMR-2-054');
 assert.equal(next.pending.step,'mode');
 assert.equal(next.pending.player,0);
 assert.equal(universalPrivateChoices(packs,next,1),null);
 const look=legalUniversalActions(packs,next).find(a=>a.key==='top');
 next=dispatchUniversalAction(packs,next,look,{actor:0});
 assert.equal(next.pending?.step,'topPlace');
 assert.equal((universalPrivateChoices(packs,next,0)?.inspected||[]).length,1);
 assert.equal(universalPrivateChoices(packs,next,1),null);
 const place=legalUniversalActions(packs,next).find(a=>a.mode==='top');
 const life=next.players[1].life.length;
 next=dispatchUniversalAction(packs,next,place,{actor:0});
 assert.equal(next.pending,null);
 assert.equal(next.players[1].life.length,life);
 assert.equal(next.players[1].front.filter(c=>c?.uid===wall.uid).length,1);
 assert.equal(next.players[1].outside.some(c=>c.uid===wall.uid),false);
 assert.equal(next.players[0].front.find(c=>c?.uid===heat.uid).ready,false);
 assertUniversalMatch(packs,next);
});

test('CSM-1-008 audit board shows every looked card only to the controller',()=>{
 const {packs,state}=loadAuditFixture('csm008');
 const looker=state.players[0].hand.find(c=>c.cardId==='CSM-1-008');
 const play=legalUniversalActions(packs,state).find(a=>a.type==='play'&&a.uid===looker.uid);
 let next=dispatchUniversalAction(packs,state,play,{actor:0});
 assert.equal(next.pending?.step,'lookPick');
 assert.equal(next.pending.data.window.length,3);
 assert.equal((universalPrivateChoices(packs,next,0)?.inspected||[]).length,3);
 assert.equal(universalPrivateChoices(packs,next,1),null);
 const makima=next.players[0].deck.find(c=>c.cardId==='CSM-1-022');
 const hidden=next.players[0].deck.filter(c=>c.uid!==makima.uid).map(c=>c.uid);
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
  .find(a=>a.mode==='take'&&a.uid===makima.uid),{actor:0});
 assert.equal(next.pending?.step,'lookOrder');
 assert.equal(next.publicReveals.some(entry=>entry.uid===makima.uid),true);
 assert.equal(hidden.some(uid=>next.publicReveals.some(entry=>entry.uid===uid)),false);
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
  .find(a=>a.mode==='next'),{actor:0});
 assert.equal(next.pending?.step,'discard');
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
  .find(a=>a.mode==='discard'&&a.uid===makima.uid),{actor:0});
 assert.equal(next.players[0].outside.some(c=>c.uid===makima.uid),true);
 assert.equal(next.pending?.step,'buffOther');
 const ally=next.players[0].front.find(c=>c?.cardId==='CSM-1-001');
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
  .find(a=>a.mode==='pick'&&a.uid===ally.uid),{actor:0});
 assert.equal(next.pending,null);
 assert.equal(universalBp(packs,next,next.players[0].front.find(c=>c?.uid===ally.uid)),3000);
 assertUniversalMatch(packs,next);
});

test('CSM-1-056 audit board tucks three cards and hides them from the other seat',()=>{
 const {packs,state}=loadAuditFixture('csm056');
 assert.equal(state.pending,null);
 assert.equal(state.active,0);
 for(const owner of [0,1]){
  const host=state.players[owner].front.find(card=>card?.cardId==='CSM-1-056');
  assert.equal(host.under.length,3);
  assert.deepEqual(host.under.map(card=>card.cardId),['CSM-1-062','CSM-1-067','CSM-1-057']);
  const own=universalPublicView(packs,state,owner).players[owner].front.find(card=>card.uid===host.uid);
  const foe=universalPublicView(packs,state,1-owner).players[owner].front.find(card=>card.uid===host.uid);
  const ownModel=facedownInspectModel(own);
  const foeModel=facedownInspectModel(foe);
  assert.equal(ownModel.private,true);
  assert.deepEqual(ownModel.cards.map(card=>card.cardId),['CSM-1-062','CSM-1-067','CSM-1-057']);
  assert.equal(foeModel.cards.every(card=>card.hidden===true&&!card.cardId&&!card.uid&&!card.name),true);
  assert.equal(foeModel.count,3);
  const published=JSON.stringify(foe);
  for(const layer of host.under)
   assert.equal(published.includes(layer.uid)||published.includes(layer.cardId),false);
 }
 assertUniversalMatch(packs,state);
});
