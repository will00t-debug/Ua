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
 'EVA-1-001','EVA-1-002','EVA-1-003','EVA-1-004','EVA-1-005','EVA-1-006','EVA-1-007','EVA-1-008','EVA-1-009','EVA-1-010',
 'EVA-1-011','EVA-1-012','EVA-1-013','EVA-1-014','EVA-1-015','EVA-1-016','EVA-1-017','EVA-1-018','EVA-1-019',
 'EVA-1-020','EVA-1-021','EVA-1-022','EVA-1-023','EVA-1-024','EVA-1-025','EVA-1-026','EVA-1-027',
 'EVA-1-028','EVA-1-029','EVA-1-030','EVA-1-031','EVA-1-032','EVA-1-033','EVA-1-034','EVA-1-035','EVA-1-036','EVA-1-037',
 'EVA-1-038','EVA-1-039','EVA-1-040','EVA-1-041','EVA-1-042','EVA-1-043','EVA-1-044','EVA-1-045','EVA-1-046','EVA-1-047','EVA-1-048',
 'EVA-1-049','EVA-1-050','EVA-1-051','EVA-1-052','EVA-1-053','EVA-1-054','EVA-1-055',
 'EVA-1-056','EVA-1-057','EVA-1-058','EVA-1-059','EVA-1-060','EVA-1-061','EVA-1-062','EVA-1-063','EVA-1-064',
 'EVA-1-065','EVA-1-066','EVA-1-067','EVA-1-068','EVA-1-069','EVA-1-070','EVA-1-071',
 'EVA-1-072','EVA-1-073','EVA-1-074','EVA-1-075','EVA-1-076','EVA-1-077','EVA-1-078','EVA-1-079',
 'EVA-1-080','EVA-1-081','EVA-1-082','EVA-1-083','EVA-1-084','EVA-1-085','EVA-1-086','EVA-1-087','EVA-1-088',
 'EVA-1-089','EVA-1-090','EVA-1-091','EVA-1-092','EVA-1-093','EVA-1-094','EVA-1-095','EVA-1-096',
 'EVA-1-097','EVA-1-098','EVA-1-099','EVA-1-100','EVA-1-101','EVA-1-102','EVA-1-103',
 'EVA-1-104','EVA-1-105','EVA-1-106','EVA-1-107','EVA-1-108','EVA-1-109','EVA-1-110',
 'EVA-1-111','EVA-1-112','EVA-1-113'
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
 assert.equal(getTitle('eva').playable,true);
 assert.equal(getTitle('eva').cards.length,113);
 assert.equal(getTitle('eva').cards.every(card=>card.battleReady===false&&card.playable===false),true);
 assert.equal(catalog.ap.every(card=>card.deckLegal===false),true);
 const battle=officialV2Pack('eva');
 assert.equal(Object.keys(battle.cards).length,113);
 assert.equal(registeredPackForEditor('eva'),battle);
 const opened=editorV2Status('eva',{
  'EVA-1-068':4,'EVA-1-069':4,'EVA-1-070':4,'EVA-1-071':4,'EVA-1-072':4,
  'EVA-1-073':4,'EVA-1-074':4,'EVA-1-076':4,'EVA-1-077':4,'EVA-1-078':4,
  'EVA-1-079':4,'EVA-1-080':4,'EVA-1-081':2
 });
 assert.equal(opened.registered,113);
 assert.equal(opened.ready,true);
 assert.equal(opened.issues.length,0);
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
 assert.equal(pack.cards['EVA-1-074'].emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(pack.cards['EVA-1-074'].effects.onPlay[0].op,'peekTopOrOutside');
 assert.equal(pack.cards['EVA-1-085'].effects.onPlay[0].options[1].then[0].op,'mayShiftOwnCharacter');
 assert.equal(pack.cards['EVA-1-102'].effects.onPlay[0].count,2);
 assert.equal(pack.cards['EVA-1-111'].mainAbility.op,'restSelfBuffOther');
 assert.equal(pack.cards['EVA-1-005'].fieldLeaveThenDeploy.name,'綾波 レイ');
 assert.equal(pack.cards['EVA-1-008'].getInsteadRestDeploy.once,'name');
 assert.equal(pack.cards['EVA-1-013'].mainAbility.op,'payHandSelfKit');
 assert.equal(pack.cards['EVA-1-018'].triggerSwapToGet.line,'front');
 assert.equal(pack.cards['EVA-1-033'].printedImpact,1);
 assert.equal(pack.cards['EVA-1-041'].raidTopRetireInstead,true);
 assert.equal(pack.cards['EVA-1-043'].effects.onPlay[0].op,'grantDoubleAttackIfOppBelowPrinted');
 assert.equal(pack.cards['EVA-1-079'].facedownTriggerImmuneAt,4);
 assert.equal(pack.cards['EVA-1-003'].passiveBonuses[0].condition.trigger,'get');
 assert.equal(pack.cards['EVA-1-017'].triggerEffect.op,'restOppFrontSkipNextActive');
 assert.equal(pack.cards['EVA-1-031'].handOutsideEnergyDiscount,2);
 assert.equal(pack.cards['EVA-1-062'].effects.onPlay[0].includeRaid,true);
 assert.equal(pack.cards['EVA-1-088'].effects.onPlay[0].op,'peekTopTriggerlessMayHand');
 assert.equal(pack.cards['EVA-1-093'].mainAbility.op,'activeEnergyOnce');
 assert.equal(pack.cards['EVA-1-106'].passiveBonuses[0].impact,1);
 assert.equal(pack.cards['EVA-1-065'].handApDiscountWhileAnyNames.amount,1);
 assert.equal(pack.cards['EVA-1-036'].ownTurnBp,500);
 assert.equal(pack.cards['EVA-1-053'].raidName,'葛\u{E0100}城 ミサト');
 assert.equal(pack.cards['EVA-1-071'].mainAbility.op,'distinctNameEnergyPlus');
 assert.equal(pack.cards['EVA-1-075'].outsideActivate.hand,2);
 assert.equal(pack.cards['EVA-1-087'].lifeLeave.once,'name');
 assert.equal(pack.cards['EVA-1-104'].printedImpact,1);
 assert.equal(pack.cards['EVA-1-105'].readyOnBlockCount,1);
 assert.equal(pack.cards['EVA-1-112'].mainAbility.op,'restTuckUnderName');
 assert.equal(pack.cards['EVA-1-113'].effects.onRaided[0].op,'chooseOne');
 assert.equal(pack.cards['EVA-1-002'].oppTurnWard,true);
 assert.equal(pack.cards['EVA-1-034'].raidBaseNames.join(','),'碇 シンジ,渚 カヲル');
 assert.equal(pack.cards['EVA-1-082'].printedAttackDamage,2);
 assert.equal(evaSharedCard(catalog.byId.get('EVA-1-033')).printedImpact,1);
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
