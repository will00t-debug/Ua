import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName,matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Batch E uses only rules already shipped in rounds 12–14.
// Official pages checked 2026-10-22. SAO-2-003 generated energy is two yellow
// icons (gen 2), the same reading as SAO-1-009. Q1195 (2024-11-08): one copy
// of キリト＆ユージオ satisfies both 〈キリト〉 and 〈ユージオ〉.
// SLG catalogue traits for 056/069 are the known wrong tokens; the registered
// traits are the official Japanese tokens. No engine file is edited here.

const ZERO_ENGINE_IDS=Object.freeze([
 'SAO-1-010','SAO-1-011','SAO-2-003','SAO-2-051',
 'SLG-1-023','SLG-1-056','SLG-1-069'
]);
const sao=registeredV2TitlePack('sword-art-online');
const slg=registeredV2TitlePack('solo-leveling');
const saoPacks=[sao,sao];
const slgPacks=[slg,slg];
function deck(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 return counts;
}
const saoDeck=deck(sao,['SAO-1-010','SAO-1-011','SAO-2-003','SAO-2-051']);
const slgDeck=deck(slg,['SLG-1-023','SLG-1-056','SLG-1-069','SLG-1-042','SLG-1-053']);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function toPhase(packs,s,phase){
 for(let n=0;n<6&&s.phase!==phase;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'no next from '+s.phase);
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function place(s,p,id,line,slot,ready){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
const printedOf=pack=>c=>pack.cards[c.cardId];

test('seven existing-DSL cards keep official text, ids, and a legal 50-card deck',()=>{
 const saoSpecs=[
  ['SAO-1-010','アリス・シンセシス・サーティ','このカードは〈アリス〉としても扱う。',1,0,1500,'get',['アリス']],
  ['SAO-1-011','アリス・シンセシス・サーティ',
   'このカードは〈アリス〉としても扱う。\n【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）',
   1,1,2500,null,['アリス']],
  ['SAO-2-003','キリト＆ユージオ','このカードは〈キリト〉としても〈ユージオ〉としても扱う。',
   2,3,3000,'draw',['キリト','ユージオ']],
  ['SAO-2-051','兎沢 深澄','このカードは〈ミト〉としても扱う。',1,0,1500,'get',['ミト']]
 ];
 for(const [id,name,effect,gen,energy,bp,trigger,aliases] of saoSpecs){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id);
  assert.equal(source.effectJa,effect);
  assert.equal(source.gen,gen);
  const card=sao.cards[id];
  assert.equal(card.id,id);
  assert.equal(card.name,name);
  assert.deepEqual(card.nameAliases,aliases);
  assert.equal(card.energy,energy);
  assert.equal(card.bp,bp);
  assert.equal(card.trigger,trigger);
  assert.equal(card.step,id==='SAO-1-011');
  assert.deepEqual(card.effects,{});
  assert.equal(card.templateEffects,undefined);
  assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes(id));
 }
 assert.equal(sao.cards['SAO-1-012'].triggerEffect.op,'restOppFrontSkipNextActive');
 const slgSpecs=[
  ['SLG-1-023',4000,'active',0,[]],
  ['SLG-1-056',3000,null,1,['第四次架南島レイド']],
  ['SLG-1-069',2500,null,1,['DFN／第四次架南島レイド']]
 ];
 for(const [id,bp,trigger,impact,traits] of slgSpecs){
  const card=slg.cards[id];
  assert.equal(card.bp,bp);
  assert.equal(card.trigger,trigger);
  assert.equal(card.printedImpact,id==='SLG-1-056'?impact:0);
  assert.deepEqual(card.traits,traits);
  assert.deepEqual(card.effects,{});
  assert.ok(EXPECTED_V2_IDS['solo-leveling'].includes(id));
 }
 assert.equal(slg.cards['SLG-1-023'].readyOnBlockCount,1);
 assert.deepEqual(slg.cards['SLG-1-069'].passiveBonuses,
  [{condition:{kind:'ownHandCountAtLeast',turn:'own',min:5},bp:1500}]);
 const catalogue=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c.traits]));
 assert.deepEqual(catalogue['SLG-1-056'],['第四次架南島Raid']);
 assert.deepEqual(catalogue['SLG-1-069'],['DFN','第四次架南島Raid']);
 assert.equal(catalogue['SLG-1-023'].length,0);
 assert.equal(ZERO_ENGINE_IDS.length,7);
});

test('SAO-1-010 has no on-play draw, and GET puts that life card into hand',()=>{
 let s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:1010,first:0});
 s=toPhase(saoPacks,s,'main');
 const alice=take(s,0,'SAO-1-010');s.players[0].hand.push(alice);
 const deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(saoPacks,s,{type:'play',uid:alice.uid,line:'front',slot:0});
 assert.equal(s.players[0].front[0].uid,alice.uid);
 assert.equal(s.players[0].front[0].cardId,'SAO-1-010');
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(saoPacks,s),true);

 s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:1011,first:0});
 const attacker=place(s,0,'SAO-1-011','front',0,true);
 const revealed=take(s,1,'SAO-1-010');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(revealed);
 s=toPhase(saoPacks,s,'attack');
 s=dispatchUniversalAction(saoPacks,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(saoPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.trigger,'get');
 const hand=s.players[1].hand.length;
 const skipped=dispatchUniversalAction(saoPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[1].hand.length,hand);
 assert.ok(skipped.players[1].outside.some(c=>c.uid===revealed.uid));
 s=dispatchUniversalAction(saoPacks,s,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.equal(s.players[1].hand.length,hand+1);
 assert.ok(s.players[1].hand.some(c=>c.uid===revealed.uid&&c.cardId==='SAO-1-010'));
 assert.equal(s.players[1].outside.some(c=>c.uid===revealed.uid),false);
 assert.equal(assertUniversalMatch(saoPacks,s),true);
});

test('SAO-2-051 GET adds the revealed card, and a fake trigger mode is illegal',()=>{
 let s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:2051,first:0});
 const attacker=place(s,0,'SAO-1-011','front',0,true);
 const revealed=take(s,1,'SAO-2-051');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(revealed);
 s=toPhase(saoPacks,s,'attack');
 s=dispatchUniversalAction(saoPacks,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(saoPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.uid,revealed.uid);
 assert.throws(()=>dispatchUniversalAction(saoPacks,s,{type:'chooseTrigger',mode:'draw'},{actor:1}),
  /not currently legal/);
 s=dispatchUniversalAction(saoPacks,s,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.ok(s.players[1].hand.some(c=>c.uid===revealed.uid&&c.cardId==='SAO-2-051'));
 assert.equal(assertUniversalMatch(saoPacks,s),true);
});

test('SAO-1-011 steps front to energy once, and silence hides the step and the alias',()=>{
 let s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:1012,first:0});
 s=toPhase(saoPacks,s,'move');
 const alice=place(s,0,'SAO-1-011','front',0,false);
 const names={kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'アリス'};
 assert.equal(matchesV2LiveCondition(s,0,alice.uid,names,printedOf(sao),()=>0),true);
 assert.equal(cardHasName(sao.cards['SAO-1-011'],'アリス・シンセシス・サーティ',true),true);
 const step=legalUniversalActions(saoPacks,s).find(a=>a.type==='step'&&a.uid===alice.uid&&a.slot===0);
 assert.ok(step);
 s=dispatchUniversalAction(saoPacks,s,step);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].energy[0].uid,alice.uid);
 assert.equal(s.players[0].energy[0].cardId,'SAO-1-011');
 assert.equal(legalUniversalActions(saoPacks,s).some(a=>a.type==='step'&&a.uid===alice.uid),false);
 assert.throws(()=>dispatchUniversalAction(saoPacks,s,{type:'step',uid:alice.uid,slot:1}),
  /not currently legal/);
 assert.equal(assertUniversalMatch(saoPacks,s),true);

 s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:1013,first:0});
 s=toPhase(saoPacks,s,'move');
 const hidden=place(s,0,'SAO-1-011','front',0,true);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:hidden.uid,
  targetUid:hidden.uid,sourceLinked:false,until:{player:0,phase:'move',edge:'end'}});
 assert.equal(matchesV2LiveCondition(s,0,hidden.uid,names,printedOf(sao),()=>0),false);
 assert.equal(cardHasName(sao.cards['SAO-1-011'],'アリス・シンセシス・サーティ'),true);
 assert.equal(legalUniversalActions(saoPacks,s).some(a=>a.type==='step'),false);
 assert.throws(()=>dispatchUniversalAction(saoPacks,s,{type:'step',uid:hidden.uid,slot:0}),
  /not currently legal/);
 s=toPhase(saoPacks,s,'main');
 assert.throws(()=>dispatchUniversalAction(saoPacks,s,{type:'step',uid:hidden.uid,slot:0}),
  /not currently legal/);
});

test('one SAO-2-003 satisfies both printed aliases, and its DRAW trigger draws one',()=>{
 let s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:2003,first:0});
 const pair=place(s,0,'SAO-2-003','front',0,true);
 assert.equal(pair.cardId,'SAO-2-003');
 assert.equal(sao.cards['SAO-2-003'].name,'キリト＆ユージオ');
 const both={kind:'ownFieldHasAllNames',turn:'any',zone:'field',excludeSelf:false,
  names:['キリト','ユージオ']};
 assert.equal(matchesV2LiveCondition(s,0,pair.uid,both,printedOf(sao),()=>0),true);
 assert.equal(matchesV2LiveCondition(s,0,pair.uid,
  {...both,names:['キリト','アスナ']},printedOf(sao),()=>0),false);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:pair.uid,
  targetUid:pair.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(matchesV2LiveCondition(s,0,pair.uid,both,printedOf(sao),()=>0),false);
 assert.equal(cardHasName(sao.cards['SAO-2-003'],'キリト',true),false);
 assert.equal(cardHasName(sao.cards['SAO-2-003'],'キリト＆ユージオ',true),true);
 assert.equal(assertUniversalMatch(saoPacks,s),true);

 s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:2004,first:0});
 const attacker=place(s,0,'SAO-1-011','front',0,true);
 const life=take(s,1,'SAO-2-003');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(life);
 s=toPhase(saoPacks,s,'attack');
 s=dispatchUniversalAction(saoPacks,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(saoPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.trigger,'draw');
 const hand=s.players[1].hand.length,deck=s.players[1].deck.length;
 const skipped=dispatchUniversalAction(saoPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[1].hand.length,hand);
 assert.equal(skipped.players[1].deck.length,deck);
 s=dispatchUniversalAction(saoPacks,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.players[1].hand.length,hand+1);
 assert.equal(s.players[1].deck.length,deck-1);
 assert.ok(s.players[1].outside.some(c=>c.uid===life.uid));
 assert.equal(assertUniversalMatch(saoPacks,s),true);
});

test('SLG-1-023 becomes ACTIVE on the first block and its ACTIVE trigger is generic',()=>{
 let s=newUniversalMatch(slgPacks,{decks:[slgDeck,slgDeck],seed:1023,first:0});
 s=toPhase(slgPacks,s,'attack');
 const small=place(s,0,'SLG-1-056','front',0,true);
 const smaller=place(s,0,'SLG-1-042','front',1,true);
 const jun=place(s,1,'SLG-1-023','front',0,true);
 const rested=place(s,1,'SLG-1-069','front',1,false);
 const lives=s.players[1].life.length;
 s=dispatchUniversalAction(slgPacks,s,{type:'attack',uid:small.uid});
 assert.equal(s.pending.kind,'block');
 const legal=legalUniversalActions(slgPacks,s);
 assert.equal(legal.some(a=>a.uid===rested.uid),false);
 assert.throws(()=>dispatchUniversalAction(slgPacks,s,{type:'chooseBlock',uid:rested.uid},{actor:1}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(slgPacks,s,{type:'chooseBlock',uid:'1-nope'},{actor:1}),
  /not currently legal/);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(slgPacks,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  assert.equal(ai.uid,jun.uid);
 }
 const easy=chooseUniversalAiAction(slgPacks,s,{difficulty:'easy'});
 assert.equal(easy.uid,null);
 assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(easy)));
 s=dispatchUniversalAction(slgPacks,s,{type:'chooseBlock',uid:jun.uid},{actor:1});
 assert.equal(s.players[1].front[0].uid,jun.uid);
 assert.equal(s.players[1].front[0].ready,true);
 assert.equal(s.blocksByUid[jun.uid],1);
 assert.equal(s.players[1].life.length,lives);
 s=dispatchUniversalAction(slgPacks,s,{type:'attack',uid:smaller.uid});
 s=dispatchUniversalAction(slgPacks,s,{type:'chooseBlock',uid:jun.uid},{actor:1});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.blocksByUid[jun.uid],2);
 assert.equal(s.players[1].life.length,lives);
 assert.equal(assertUniversalMatch(slgPacks,s),true);

 let silenced=newUniversalMatch(slgPacks,{decks:[slgDeck,slgDeck],seed:1024,first:0});
 silenced=toPhase(slgPacks,silenced,'attack');
 const hammer=place(silenced,0,'SLG-1-042','front',0,true);
 const locked=place(silenced,1,'SLG-1-023','front',0,true);
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:0,sourceUid:hammer.uid,
  targetUid:locked.uid,sourceLinked:false,until:{player:1,phase:'attack',edge:'end'}});
 silenced=dispatchUniversalAction(slgPacks,silenced,{type:'attack',uid:hammer.uid});
 silenced=dispatchUniversalAction(slgPacks,silenced,{type:'chooseBlock',uid:locked.uid},{actor:1});
 assert.equal(silenced.players[1].front[0].ready,false);
 assert.equal(silenced.blocksByUid[locked.uid],1);

 let flip=newUniversalMatch(slgPacks,{decks:[slgDeck,slgDeck],seed:1025,first:0});
 flip=toPhase(slgPacks,flip,'attack');
 const striker=place(flip,0,'SLG-1-056','front',0,true);
 const target=place(flip,1,'SLG-1-042','front',0,false);
 const revealed=take(flip,1,'SLG-1-023');
 flip.players[1].deck.push(flip.players[1].life.shift());
 flip.players[1].life.unshift(revealed);
 flip=dispatchUniversalAction(slgPacks,flip,{type:'attack',uid:striker.uid});
 flip=dispatchUniversalAction(slgPacks,flip,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(flip.pending.trigger,'active');
 assert.ok(legalUniversalActions(slgPacks,flip).some(a=>a.mode==='active'&&a.uid===target.uid));
 assert.equal(legalUniversalActions(slgPacks,flip).some(a=>a.uid===striker.uid),false);
 flip=dispatchUniversalAction(slgPacks,flip,{type:'chooseTrigger',mode:'active',uid:target.uid},{actor:1});
 assert.equal(flip.players[1].front[0].ready,true);
 assert.equal(universalBp(slgPacks,flip,flip.players[1].front[0]),4000);
 assert.equal(assertUniversalMatch(slgPacks,flip),true);
});

test('SLG-1-056 impact is one life after a won battle and one life when unblocked',()=>{
 function livesOf(seed){
  let s=newUniversalMatch(slgPacks,{decks:[slgDeck,slgDeck],seed,first:0});
  s=toPhase(slgPacks,s,'attack');
  s.players[1].deck.push(...s.players[1].life.splice(0));
  const first=take(s,1,'SLG-1-069'),second=take(s,1,'SLG-1-069');
  s.players[1].life.unshift(first,second);
  const attacker=place(s,0,'SLG-1-056','front',0,true);
  return {s,attacker,before:s.players[1].life.length};
 }
 let won=livesOf(1056);
 const weak=place(won.s,1,'SLG-1-042','front',0,true);
 won.s=dispatchUniversalAction(slgPacks,won.s,{type:'attack',uid:won.attacker.uid});
 won.s=dispatchUniversalAction(slgPacks,won.s,{type:'chooseBlock',uid:weak.uid},{actor:1});
 assert.ok(won.s.players[1].outside.some(c=>c.uid===weak.uid));
 assert.equal(won.s.pending,null);
 assert.equal(won.s.players[1].life.length,won.before-1);
 assert.equal(won.s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);
 assert.equal(won.s.status,'playing');
 assert.equal(assertUniversalMatch(slgPacks,won.s),true);

 let open=livesOf(1057);
 open.s=dispatchUniversalAction(slgPacks,open.s,{type:'attack',uid:open.attacker.uid});
 open.s=dispatchUniversalAction(slgPacks,open.s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(open.s.pending,null);
 assert.equal(open.s.players[1].life.length,open.before-1);
 assert.equal(open.s.effectQueue.some(e=>e.op==='additionalBattleDamage'),false);

 let nulled=livesOf(1058);
 const wall=place(nulled.s,1,'SLG-1-053','front',0,true);
 nulled.s=dispatchUniversalAction(slgPacks,nulled.s,{type:'attack',uid:nulled.attacker.uid});
 nulled.s=dispatchUniversalAction(slgPacks,nulled.s,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(nulled.s.players[1].life.length,nulled.before);
 assert.equal(nulled.s.pending,null);

 let quiet=livesOf(1059);
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:quiet.attacker.uid,
  targetUid:quiet.attacker.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 const victim=place(quiet.s,1,'SLG-1-042','front',0,true);
 quiet.s=dispatchUniversalAction(slgPacks,quiet.s,{type:'attack',uid:quiet.attacker.uid});
 quiet.s=dispatchUniversalAction(slgPacks,quiet.s,{type:'chooseBlock',uid:victim.uid},{actor:1});
 assert.equal(quiet.s.players[1].life.length,quiet.before);
 assert.equal(assertUniversalMatch(slgPacks,quiet.s),true);
});

test('SLG-1-069 gains 1500 BP only on its own turn with five or more hand cards',()=>{
 let s=newUniversalMatch(slgPacks,{decks:[slgDeck,slgDeck],seed:1069,first:0});
 const ken=place(s,0,'SLG-1-069','front',0,true);
 assert.ok(s.players[0].hand.length>=5);
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),4000);
 assert.equal(universalPublicView(slgPacks,s,1).players[0].hand,null);
 const enemyTurn=structuredClone(s);
 enemyTurn.active=1;
 assert.equal(universalBp(slgPacks,enemyTurn,enemyTurn.players[0].front[0]),2500);
 while(s.players[0].hand.length>4)s.players[0].outside.push(s.players[0].hand.shift());
 assert.equal(s.players[0].hand.length,4);
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),2500);
 s.players[0].hand.push(...s.players[0].outside.splice(0));
 assert.ok(s.players[0].hand.length>=5);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:ken.uid,
  targetUid:ken.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),2500);
 assert.equal(assertUniversalMatch(slgPacks,s),true);
 assert.equal(assertUniversalMatch(slgPacks,enemyTurn),true);
});
