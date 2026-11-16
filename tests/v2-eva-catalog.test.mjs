import test from 'node:test';
import assert from 'node:assert/strict';
import {evaCatalog} from '../dist/eva/catalog.mjs';
import {evaSharedProgram,EVA_SHARED_BLOCKER} from '../dist/universal-v2/eva/programs.mjs';
import {evaSharedCard,createEvaSharedStagingPack} from '../dist/universal-v2/eva-shared-adapter.mjs';
import {createEvaStagingPack,EVA_STAGING_IDS} from '../dist/universal-v2/eva-staging-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status,registeredPackForEditor} from '../dist/v2-editor-compat.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {newUniversalMatch,universalCardEnergy} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const READY=[
 'EVA-1-001','EVA-1-004','EVA-1-007','EVA-1-009','EVA-1-010','EVA-1-011','EVA-1-014',
 'EVA-1-015','EVA-1-016','EVA-1-020','EVA-1-023','EVA-1-024','EVA-1-025','EVA-1-027',
 'EVA-1-028','EVA-1-029','EVA-1-037','EVA-1-038','EVA-1-040','EVA-1-044','EVA-1-046',
 'EVA-1-047','EVA-1-048',
 'EVA-1-049','EVA-1-050','EVA-1-051','EVA-1-054','EVA-1-055','EVA-1-059','EVA-1-060',
 'EVA-1-061','EVA-1-064','EVA-1-066','EVA-1-067','EVA-1-068','EVA-1-069','EVA-1-070',
 'EVA-1-072','EVA-1-073','EVA-1-076','EVA-1-083','EVA-1-084','EVA-1-086','EVA-1-089',
 'EVA-1-097','EVA-1-100','EVA-1-101','EVA-1-102','EVA-1-103','EVA-1-107','EVA-1-110',
 'EVA-1-111'
];

test('UA44 EVA catalog keeps one identity per deck card and leaves AP out',()=>{
 const catalog=evaCatalog();
 assert.equal(catalog.deck.length,113);
 assert.equal(catalog.booster.length,100);
 assert.equal(catalog.ap.length,6);
 assert.deepEqual(catalog.reprints,[
  'EVA-1-068','EVA-1-069','EVA-1-072','EVA-1-073','EVA-1-076',
  'EVA-1-083','EVA-1-085','EVA-1-095','EVA-1-100'
 ]);
 assert.equal(catalog.byId.get('EVA-1-085').officialFaqIds.join(','),'Q1748,Q1752');
 assert.equal(getTitle('eva').playable,false);
 assert.equal(getTitle('eva').cards.length,113);
 assert.equal(getTitle('eva').cards.every(card=>card.battleReady===false&&card.playable===false),true);
 assert.equal(catalog.ap.every(card=>card.deckLegal===false),true);
 assert.equal(registeredPackForEditor('eva'),null);
 const closed=editorV2Status('eva',{'EVA-1-001':4,'EVA-1-068':46});
 assert.equal(closed.registered,52);
 assert.equal(closed.ready,false);
 assert.match(closed.issues.join('\n'),/尚未開放正式對戰/);
 assert.throws(()=>officialV2Pack('eva'),/正式 V2/);
});

test('only full Japanese prints that already exist in the shared engine are staged',()=>{
 const catalog=evaCatalog();
 const ready=catalog.deck.filter(card=>evaSharedProgram(card).ready).map(card=>card.id);
 assert.deepEqual(ready,READY);
 assert.deepEqual([...EVA_STAGING_IDS],READY);
 const pack=createEvaStagingPack();
 assert.equal(pack.id,'eva');
 assert.deepEqual(Object.keys(pack.cards),READY);
 assert.equal(pack.cards['EVA-1-001'].activeExtraEnergy,0);
 assert.deepEqual(pack.cards['EVA-1-001'].mainAbility,{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1
 });
 assert.equal(pack.cards['EVA-1-007'].activeExtraEnergy,1);
 assert.equal(pack.cards['EVA-1-014'].implementation,'vanilla');
 assert.deepEqual(pack.cards['EVA-1-015'].opponentFieldColorsHandEnergyDiscount,{
  colors:['purple','red'],amount:1
 });
 assert.equal(pack.cards['EVA-1-049'].impactNull,true);
 assert.equal(pack.cards['EVA-1-110'].effects.onRetire[0].op,'draw');
 assert.equal(pack.cards['EVA-1-004'].impactNull,true);
 assert.equal(pack.cards['EVA-1-004'].effects.onPlay[0].excludeSelf,false);
 assert.equal(pack.cards['EVA-1-010'].effects.onPlay[0].includeSelf,true);
 assert.equal(pack.cards['EVA-1-020'].trigger,'special');
 assert.deepEqual(pack.cards['EVA-1-020'].triggerEffect,{op:'retireOppFront'});
 assert.equal(pack.cards['EVA-1-020'].effects.onPlay[0].bonusBp,5000);
 assert.equal(pack.cards['EVA-1-038'].effects.onPlay[0].filters.length,3);
 assert.equal(pack.cards['EVA-1-046'].mainAbility.trait,'WILLE');
 assert.equal(pack.cards['EVA-1-050'].mainAbility.then[0].payment.value,'WILLE');
 assert.equal(pack.cards['EVA-1-055'].effects.onPlay[0].filter.value,'WILLE');
 assert.equal(pack.cards['EVA-1-060'].effects.onPlay[0].draw,3);
 assert.equal(pack.cards['EVA-1-061'].effects.onPlay.length,2);
 assert.equal(pack.cards['EVA-1-066'].effects.onPlay[1].count,1);
 assert.equal(pack.cards['EVA-1-070'].effects.onPlay[0].maxOutside,1);
 assert.deepEqual(pack.cards['EVA-1-025'].effects.onPlay,[{op:'peekTopOrOutside'}]);
 assert.equal(pack.cards['EVA-1-028'].mainAbility.frontOnly,false);
 assert.equal(pack.cards['EVA-1-028'].mainAbility.then[0].op,'millTop');
 assert.equal(pack.cards['EVA-1-072'].mainAbility.then[0].op,'drawDiscard');
 assert.equal(evaSharedProgram(catalog.byId.get('EVA-1-085')).ready,false);
 assert.equal(pack.cards['EVA-1-102'].effects.onPlay[0].count,2);
 assert.equal(pack.cards['EVA-1-111'].mainAbility.op,'restSelfBuffOther');
 for(const id of ['EVA-1-002','EVA-1-003','EVA-1-074','EVA-1-085','EVA-1-099'])
  assert.equal(evaSharedProgram(catalog.byId.get(id)).ready,false,id);
 assert.equal(evaSharedProgram(catalog.byId.get('EVA-1-002')).blocker,EVA_SHARED_BLOCKER);
 assert.equal(evaSharedCard(catalog.byId.get('EVA-1-033')),null);
 const original=catalog.byId.get('EVA-1-001');
 assert.throws(()=>evaSharedCard(original,{
  ...evaSharedProgram(original),evaPrivate:true
 }),/unsupported EVA program field/);
 const corrupted=evaSharedCard(original,{
  ...evaSharedProgram(original),effects:{onPlay:[{op:'evaSpecial'}]}
 });
 assert.throws(()=>createUniversalPack({id:'eva',cards:[corrupted]}),/effect op unsupported/);
 assert.throws(()=>createEvaSharedStagingPack({
  cards:[original,original],version:'duplicate'
 }),/Duplicate EVA/);
});

test('a red staging deck can open a match and the active energy bonus is live',()=>{
 const pack=createEvaStagingPack();
 const ids=['EVA-1-068','EVA-1-069','EVA-1-073','EVA-1-076','EVA-1-083','EVA-1-084',
  'EVA-1-086','EVA-1-089','EVA-1-101','EVA-1-103','EVA-1-107','EVA-1-110'];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts['EVA-1-097']=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 const match=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:3});
 const ritsuko=match.players[0].deck.find(card=>card.cardId==='EVA-1-068')||
  match.players[0].hand.find(card=>card.cardId==='EVA-1-068')||
  match.players[0].life.find(card=>card.cardId==='EVA-1-068');
 assert.ok(ritsuko);
 const resting={...ritsuko,ready:false};
 const active={...ritsuko,ready:true};
 match.players[0].energy[0]=resting;
 assert.equal(universalCardEnergy(pack,match,0,resting),1);
 match.players[0].energy[0]=active;
 assert.equal(universalCardEnergy(pack,match,0,active),2);
});
