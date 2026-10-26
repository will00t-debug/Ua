import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalCardEnergy,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {c10BlcAliasFieldEnergy} from '../scripts/v2-c10-blc-alias-field-energy.mjs';

// EX15BT/BLC-4-074 official page, 2026-10-24. No FAQ.
// 緑- / AP1 / BP1000 / 護廷十三隊 / 発生緑+ / no trigger.
// このカードは〈山本 元柳斎 重國〉としても扱う。
// 【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+緑
// と「メインフェイズ終了時、このキャラを退場させる。」を得る。
// 緑+ is one green pip. The plus is this activate, so REST generation is 1.
// The same resolved REST, +1, and end-of-MAIN retirement is SAO-2-050.
// No line word is printed, so FRONT and ENERGY may both activate.
// Generation still comes only from the energy line.

const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
const ALIAS='山本 元柳斎 重國';
const ID='BLC-4-074';
function deck(){
 const required=[ID,'BLC-1-075','BLC-1-001'];
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function occupy(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toMain(s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1;
 return n;
}
function activate(uid){return {type:'activate',uid,mode:'selfRestEnergyRetire'};}
function silence(s,uid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,
  targetUid:uid,until:{player:0,phase:'attack',edge:'start'},sourceLinked:false});
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('C10 registers only the whole-print alias and field energy retirement',()=>{
 const x=c10BlcAliasFieldEnergy();
 assert.deepEqual(x.registered,[ID]);
 assert.equal(x.report.bleach,160);
 assert.equal(x.report.mst,57);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.bleachUnported,116);
 assert.equal(x.report.readyFromKeywords,0);
 assert.equal(EXPECTED_V2_IDS.bleach.includes(ID),true);
});

test('BLC-4-074 keeps the printed alias and REST base of 1',()=>{
 const printed=CARDS.find(c=>c.identity===ID);
 assert.equal(printed.gen,2);
 assert.equal(printed.effect,'此卡也視為《山本元柳齋重國》。啟動・主要〔改為Rest／每回合1次〕：此角色本回合額外產生1個綠色能量，並獲得「主要階段結束時，使此角色退場」。');
 const {sourceRecord,definition}=contribution.entries.find(x=>x.id===ID);
 assert.equal(sourceRecord.legacyImportedGen,2);
 assert.equal(sourceRecord.gen,1);
 const card=bleach.cards[ID];
 assert.equal(card.name,'山本 重國');
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger],
  ['green',0,1,1000,1,null]);
 assert.equal(card.activeExtraEnergy||0,0);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.nameAliases,[ALIAS]);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(definition.mainAbility,{op:'restSelfGainEnergyRetireEndMain',
  lines:'field',oncePerTurn:true,extraEnergy:1});
 assert.equal(cardHasName(card,ALIAS),true);
 assert.equal(cardHasName(card,'山本 重國',true),true);
 assert.equal(cardHasName(card,ALIAS,true),false);
});

test('energy-line activation pays the green-2 character and retires at end of MAIN',()=>{
 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],seed:4074,first:0}));
 const source=occupy(s,0,ID,'energy',0);
 const payer=take(s,0,'BLC-1-075');
 s.players[0].hand.push(payer);
 assert.equal(universalEnergyByColor(packs,s,0).green,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===payer.uid),false);
 const action=activate(source.uid);
 assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 aiOk(s);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 assert.equal(universalPublicView(packs,s,1).players[0].energy[0].produces,2);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===payer.uid&&a.line==='energy');
 assert.ok(play);
 s.players[0].energy[0].ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal/);
 s=dispatchUniversalAction(packs,s,play);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].energy.some(c=>c?.uid===payer.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.turnRetireEvents.length,1);
 assert.equal(s.turnRetireEvents[0].line,'energy');
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('front activation rests without generating, and silence has the shared timing',()=>{
 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],seed:4075,first:0}));
 let source=occupy(s,0,ID,'front',0);
 assert.equal(universalEnergyByColor(packs,s,0).green||0,0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].front[0]),0);
 assert.equal(s.delayedEffects.length,1);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.turnRetireEvents[0].line,'front');
 assert.equal(countCards(s.players[0]),50);

 s=toMain(newUniversalMatch(packs,{decks:[counts,counts],seed:4076,first:0}));
 source=occupy(s,0,ID,'energy',0);
 silence(s,source.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 assert.equal(universalEnergyByColor(packs,s,0).green,1);
 assert.equal(cardHasName(bleach.cards[ID],ALIAS,true),false);

 s=toMain(newUniversalMatch(packs,{decks:[counts,counts],seed:4077,first:0}));
 source=occupy(s,0,ID,'energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 silence(s,source.uid);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.turnRetireEvents.length,1);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});
