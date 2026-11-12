import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAuditFixture} from '../dist/universal-v2/audit-browser-fixtures.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalEnergyByColor,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {boardEntrySelection,controllerDeckWindowCards,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
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

test('CSM-1-056 raid board pays, stacks, and keeps the attack text inside the raid frame',()=>{
 const {packs,state}=loadAuditFixture('csm056raid');
 const aki=state.players[0].hand.find(card=>card.cardId==='CSM-1-056');
 const base=state.players[0].front.find(card=>card?.cardId==='CSM-1-052');
 const decoy=state.players[0].front.find(card=>card?.cardId==='CSM-1-057');
 const readyAp=state.players[0].apCards.filter(card=>card.ready).length;
 const deck=state.players[0].deck.length;
 const legal=legalUniversalActions(packs,state);
 const raid=legal.find(action=>action.type==='raid'&&action.uid===aki.uid&&
  action.baseUid===base.uid&&action.slot===0&&action.line!=='energy');
 assert.ok(raid);
 assert.equal(legal.some(action=>action.type==='raid'&&action.baseUid===decoy.uid),false);
 assert.equal(legal.some(action=>action.type==='play'&&action.uid===aki.uid),true);
 const next=dispatchUniversalAction(packs,state,raid,{actor:0});
 const host=next.players[0].front.find(card=>card?.uid===aki.uid);
 assert.equal(next.pending,null);
 assert.equal(host.cardId,'CSM-1-056');
 assert.equal(host.stack[0].cardId,'CSM-1-052');
 assert.equal(host.ready,true);
 assert.equal(universalBp(packs,next,host),5000);
 assert.deepEqual(host.under.map(card=>card.cardId),['CSM-1-062','CSM-1-067','CSM-1-057']);
 assert.equal(host.under.every(card=>card.faceDown===true),true);
 assert.equal(next.players[0].deck.length,deck-3);
 assert.equal(next.players[0].hand.length,0);
 assert.equal(host.sniperGranted,undefined);
 assert.equal(host.impactGranted,undefined);
 assert.equal(next.players[0].front.some(card=>card?.uid===decoy.uid),true);
 assert.equal(next.players[0].apCards.filter(card=>card.ready).length,readyAp-1);
 assert.equal(next.players[0].energy.filter(card=>card?.cardId==='CSM-1-060').length,2);
 assertUniversalMatch(packs,next);
});

test('CSM-1-055 audit board names both branches, pays once, and does not activate the other character',()=>{
 const {packs,state}=loadAuditFixture('csm055act');
 const aki=state.players[0].front.find(card=>card?.cardId==='CSM-1-055');
 const decoy=state.players[0].front.find(card=>card?.cardId==='CSM-1-052');
 const payment=state.players[0].hand[0];
 assert.equal(payment.cardId,'CSM-1-041');
 const legal=legalUniversalActions(packs,state);
 const act=legal.find(action=>action.type==='activate');
 assert.equal(act.uid,aki.uid);
 assert.equal(legal.some(action=>action.type==='activate'&&action.uid===decoy.uid),false);
 const confirm=uiActionLabel(act,{pack:packs,state});
 assert.match(confirm,/起動主要：早川/);
 assert.doesNotMatch(confirm,/BP＋1000|先 ACTIVE/);
 let next=dispatchUniversalAction(packs,state,act,{actor:0});
 assert.equal(next.pending?.step,'discardThenChoose');
 assert.equal(legalUniversalActions(packs,next).some(action=>action.type==='activate'),false);
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
  .find(action=>action.mode==='discard'&&action.uid===payment.uid),{actor:0});
 assert.equal(next.players[0].outside.some(card=>card.uid===payment.uid),true);
 assert.equal(next.pending?.step,'akiChoose');
 const block=uiActionLabel(legalUniversalActions(packs,next).find(action=>action.mode==='block'),{pack:packs,state:next});
 const search=uiActionLabel(legalUniversalActions(packs,next).find(action=>action.mode==='search'),{pack:packs,state:next});
 assert.match(block,/BP3000/);
 assert.match(search,/3 張/);
 assert.notEqual(block,search);
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
  .find(action=>action.mode==='search'),{actor:0});
 const shown=controllerDeckWindowCards(next,packs,legalUniversalActions(packs,next));
 assert.deepEqual(shown.map(card=>card.cardId),['CSM-1-001','CSM-1-049','CSM-1-057']);
 assert.equal(shown.find(card=>card.cardId==='CSM-1-001').caption,'目前不能選');
 const power=next.players[0].deck.find(card=>card.cardId==='CSM-1-057');
 next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
  .find(action=>action.mode==='take'&&action.uid===power.uid),{actor:0});
 while(next.pending?.step==='lookOrder')
  next=dispatchUniversalAction(packs,next,legalUniversalActions(packs,next)
   .find(action=>action.mode==='next'),{actor:0});
 assert.equal(next.pending,null);
 assert.equal(next.players[0].hand.some(card=>card.uid===power.uid),true);
 assert.equal(next.players[0].hand.some(card=>card.uid===payment.uid),false);
 assert.equal(legalUniversalActions(packs,next).some(action=>action.type==='activate'),false);
 assert.equal(next.players[0].front.some(card=>card?.uid===decoy.uid),true);
 assert.equal(next.players[0].front.some(card=>card?.uid===aki.uid),true);
 assertUniversalMatch(packs,next);
});

test('STG-1-006 audit activation rests the source, buffs another character, and the turn can continue',()=>{
 const {packs,state}=loadAuditFixture('stg006');
 const source=state.players[0].energy[0];
 const ally=state.players[0].front[0];
 assert.equal(source.cardId,'STG-1-006');
 assert.equal(ally.cardId,'STG-1-001');
 assert.equal(source.ready,true);
 assert.equal(state.phase,'main');
 assert.equal(state.players[0].apCards.filter(card=>card.ready).length,3);
 const activate=legalUniversalActions(packs,state).find(action=>action.type==='activate'&&action.uid===source.uid);
 assert.equal(activate.mode,'selfRestBuff');
 let next=dispatchUniversalAction(packs,state,activate,{actor:0});
 assert.equal(next.pending?.kind,'effect-buff-own');
 assert.equal(next.players[0].energy[0].ready,false);
 assert.equal(next.players[0].apCards.filter(card=>card.ready).length,3);
 assert.equal(universalEnergyByColor(packs,next,0).blue,1);
 const choice=legalUniversalActions(packs,next).find(action=>action.type==='chooseOwnBuff'&&action.uid===ally.uid);
 const label=uiActionLabel(choice,{pack:packs,state:next});
 assert.match(label,/鈴羽/);
 assert.match(label,/BP＋1000/);
 assert.equal(label.includes('退場'),false);
 next=dispatchUniversalAction(packs,next,choice,{actor:0});
 assert.equal(next.pending,null);
 assert.equal(next.players[0].front[0].uid,ally.uid);
 assert.equal(universalBp(packs,next,next.players[0].front[0]),3000);
 assert.equal(next.players[0].energy[0].ready,false);
 const pass=legalUniversalActions(packs,next).find(action=>action.type==='next');
 assert.ok(pass);
 next=dispatchUniversalAction(packs,next,pass,{actor:0});
 assert.equal(next.phase,'attack');
 assert.equal(legalUniversalActions(packs,next).length>0,true);
 assertUniversalMatch(packs,next);
});

test('BLC-2-067 audit hand can enter normally or by raid, and the occupied non-base cell cannot',()=>{
 const {packs,state}=loadAuditFixture('blc067dual');
 const hand=state.players[0].hand[0];
 const base=state.players[0].energy[0];
 assert.equal(hand.cardId,'BLC-2-067');
 assert.equal(state.players[0].hand.length,1);
 assert.equal(base.cardId,'BLC-4-070');
 assert.equal(state.players[0].front[0].cardId,'BLC-1-083');
 assert.equal(universalEnergyByColor(packs,state,0).green,4);
 assert.equal(state.players[0].apCards.filter(card=>card.ready).length,3);
 const legal=legalUniversalActions(packs,state);
 const selection=boardEntrySelection(legal,hand.uid);
 assert.equal(selection.needsMode,false);
 assert.equal(selection.normal.some(action=>action.type==='play'&&action.line==='front'&&action.slot===1&&action.replaceUid===undefined),true);
 assert.equal(selection.raid.some(action=>action.type==='raid'&&action.baseUid===base.uid&&action.slot===1),true);
 assert.equal(selection.normal.some(action=>action.type==='play'&&action.replaceUid===base.uid),true);
 assert.equal(legal.some(action=>action.uid===hand.uid&&action.line==='front'&&action.slot===0),false);
 const normal=dispatchUniversalAction(packs,structuredClone(state),selection.normal.find(action=>action.line==='front'&&action.slot===1),{actor:0});
 assert.equal(normal.players[0].front[1].cardId,'BLC-2-067');
 assert.equal(normal.players[0].front[1].ready,false);
 assert.equal(normal.players[0].front[1].stack?.length||0,0);
 assert.equal(normal.players[0].energy.every(card=>card?.cardId==='BLC-4-070'),true);
 assert.equal(normal.players[0].apCards.filter(card=>card.ready).length,2);
 assert.equal(universalEnergyByColor(packs,normal,0).green,4);
 assert.equal(normal.players[0].front[0].cardId,'BLC-1-083');
 const raidAction=selection.raid.find(action=>action.baseUid===base.uid&&action.slot===1&&action.line!=='energy');
 const raided=dispatchUniversalAction(packs,structuredClone(state),raidAction,{actor:0});
 assert.equal(raided.players[0].front[1].cardId,'BLC-2-067');
 assert.equal(raided.players[0].front[1].ready,true);
 assert.equal(raided.players[0].front[1].stack[0].cardId,'BLC-4-070');
 assert.equal(raided.players[0].energy[0],null);
 assert.equal(raided.players[0].apCards.filter(card=>card.ready).length,2);
 assert.equal(universalEnergyByColor(packs,raided,0).green,3);
 assert.equal(raided.players[0].front[0].uid,state.players[0].front[0].uid);
 const squeeze=selection.normal.find(action=>action.line==='energy'&&action.slot===0&&action.replaceUid===base.uid);
 const squeezed=dispatchUniversalAction(packs,structuredClone(state),squeeze,{actor:0});
 assert.equal(squeezed.players[0].energy[0].cardId,'BLC-2-067');
 assert.equal(squeezed.players[0].energy[0].ready,false);
 assert.equal(squeezed.players[0].removed.some(card=>card.uid===base.uid),true);
 assert.equal(squeezed.players[0].front[1],null);
 assert.equal(squeezed.players[0].apCards.filter(card=>card.ready).length,2);
 assert.equal(universalEnergyByColor(packs,squeezed,0).green,4);
 const continued=dispatchUniversalAction(packs,normal,legalUniversalActions(packs,normal).find(action=>action.type==='next'),{actor:0});
 assert.equal(continued.phase,'attack');
 assert.equal(legalUniversalActions(packs,continued).some(action=>action.type==='attack'||action.type==='next'),true);
 assertUniversalMatch(packs,continued);
});
