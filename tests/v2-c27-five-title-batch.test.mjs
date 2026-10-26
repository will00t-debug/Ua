import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// UA15BT/SAO-1-083 generated energy: ico_resource_energy_green3.png is the
// two-pip sprite (alt 緑緑). Required energy stays green 3. GPT FAQ branch
// had not corrected the imported gen 3.

test('SAO-1-083 generated energy is two green pips and required energy stays 3',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-083');
 const card=registeredV2TitlePack('sword-art-online').cards['SAO-1-083'];
 assert.equal(source.number,'UA15BT/SAO-1-083');
 assert.match(source.source,/unionarena-tcg\.com\/jp\/cardlist/);
 assert.equal(source.energy,3);
 assert.equal(source.ap,2);
 assert.equal(source.bp,3000);
 assert.equal(source.gen,2);
 assert.equal(card.energy,3);
 assert.equal(card.gen,2);
 assert.equal(card.ap,2);
 assert.equal(card.name,'リズベット');
});

const slg=registeredV2TitlePack('solo-leveling');
const packs=[slg,slg];
function deckOf(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.maxCopies!==1&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.filter(id=>!required.includes(id))].slice(0,13);
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const card=take(s,p,id);
 card.ready=false;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toMain(s,use=packs){
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(use,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function aiOk(s,use=packs){
 const legal=legalUniversalActions(use,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(use,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function readyAp(s,p,n){
 for(let i=0;i<3;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(s,uid,line='front',slot=0,use=packs){
 return dispatchUniversalAction(use,s,legalUniversalActions(use,s)
  .find(a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.slot===slot));
}

test('C27 class A registers three SLG prints on existing deck and discount DSL',()=>{
 assert.equal(EXPECTED_V2_TOTAL,531);
 assert.equal(EXPECTED_V2_COUNTS['solo-leveling'],52);
 assert.equal(EXPECTED_V2_COUNTS['gurren-lagann'],39);
 for(const id of ['SLG-1-017','SLG-1-054','SLG-1-063']){
  assert.equal(EXPECTED_V2_IDS['solo-leveling'].includes(id),true);
  const source=SOLO_LEVELING_CARDS.find(c=>c.id===id);
  assert.match(source.source,/UA51BT%2F/);
  assert.equal(slg.cards[id].name,source.nameJa);
 }
 assert.equal(slg.cards['SLG-1-017'].emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(slg.cards['SLG-1-017'].effects.onPlay,[{op:'peekTopOne'}]);
 assert.deepEqual(slg.cards['SLG-1-054'].effects.onPlay,[{op:'inspectTopTraitOutside',
  count:2,trait:'第四次架南島レイド',rest:'top'}]);
 assert.deepEqual(slg.cards['SLG-1-054'].traits,['第四次架南島レイド']);
 assert.deepEqual(slg.cards['SLG-1-063'].effects.onPlay,[{op:'searchTopOneBottomDiscard',
  count:3,filter:{field:'trait',value:'第四次架南島レイド'}}]);
 assert.equal(slg.cards['SLG-1-063'].triggerEffect,null);
});

test('SLG-1-017 discounts purple 2 only while the own field is empty',()=>{
 const counts=deckOf(slg,['SLG-1-017','SLG-1-007','SLG-1-013']);
 let empty=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17017}));
 const free=hold(empty,0,'SLG-1-017');
 assert.ok(legalUniversalActions(packs,empty).some(a=>a.type==='play'&&a.uid===free.uid));
 empty=play(empty,free.uid);
 assert.equal(empty.pending.kind,'private-top-choice');
 assert.deepEqual(universalPublicView(packs,empty).pending,{kind:'private-top-choice',player:0});
 const top=empty.players[0].deck[0].uid;
 aiOk(empty);
 empty=dispatchUniversalAction(packs,empty,{type:'chooseTopCard',mode:'top'});
 assert.equal(empty.players[0].deck[0].uid,top);
 assert.equal(empty.pending,null);
 assert.equal(assertUniversalMatch(packs,empty),true);

 let blocked=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17018}));
 place(blocked,0,'SLG-1-007','energy',0);
 const costly=hold(blocked,0,'SLG-1-017');
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='play'&&a.uid===costly.uid),false);
 place(blocked,0,'SLG-1-013','energy',1);
 blocked=play(blocked,costly.uid);
 assert.equal(blocked.pending.kind,'private-top-choice');
 blocked=dispatchUniversalAction(packs,blocked,{type:'chooseTopCard',mode:'outside'});
 assert.equal(blocked.pending,null);
 assert.equal(assertUniversalMatch(packs,blocked),true);
});

test('SLG-1-054 puts at most one island-raid card from the top two outside',()=>{
 const counts=deckOf(slg,['SLG-1-054','SLG-1-056','SLG-1-053']);
 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17054}));
 const hit=take(s,0,'SLG-1-056'),miss=take(s,0,'SLG-1-053');
 s.players[0].deck.unshift(hit,miss);
 const source=hold(s,0,'SLG-1-054');
 s=play(s,source.uid);
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 assert.deepEqual(s.pending.choices,[hit.uid]);
 aiOk(s);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseTopTraitOutside',uid:null});
 assert.equal(skipped.pending.kind,'effect-top-order');
 assert.equal(skipped.players[0].outside.some(c=>c.uid===hit.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopTraitOutside',uid:hit.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===hit.uid));
 assert.deepEqual(s.pending.uids,[miss.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:miss.uid});
 assert.equal(s.players[0].deck[0].uid,miss.uid);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SLG-1-063 adds one island-raid card from the top three and discards only after a take',()=>{
 const counts=deckOf(slg,['SLG-1-063','SLG-1-056','SLG-1-053','SLG-1-007']);
 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17063}));
 place(s,0,'SLG-1-056','energy',0);
 const hit=take(s,0,'SLG-1-056'),miss=take(s,0,'SLG-1-053'),other=take(s,0,'SLG-1-007');
 s.players[0].deck.unshift(hit,miss,other);
 const source=hold(s,0,'SLG-1-063');
 s=play(s,source.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[hit.uid]);
 const declined=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 assert.equal(declined.pending.kind,'effect-top-order');
 assert.equal(declined.pending.discardAfter,undefined);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:hit.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===hit.uid));
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.rest,'bottom');
 assert.equal(s.pending.discardAfter,true);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:miss.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:other.uid});
 assert.equal(s.pending.kind,'effect-discard');
 const discard=s.players[0].hand.find(c=>c.uid!==hit.uid);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:discard.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(s.players[0].deck.at(-2).uid,miss.uid);
 assert.equal(s.players[0].deck.at(-1).uid,other.uid);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SLG-1-050 rests, truly retires, then may add one outside 水篠 旬',()=>{
 const card=slg.cards['SLG-1-050'];
 assert.deepEqual(card.mainAbility,{op:'restRetireRecoverOutside',optional:true,
  filter:{field:'name',value:'水篠 旬'}});
 const counts=deckOf(slg,['SLG-1-050','SLG-1-046','SLG-1-053']);
 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17050}));
 const source=place(s,0,'SLG-1-050','front',0);
 source.ready=true;
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='restRetireRecover'));
 const named=take(s,0,'SLG-1-046'),other=take(s,0,'SLG-1-053');
 s.players[0].outside.push(named,other);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'restRetireRecover'});
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.deepEqual(s.pending.choices,[named.uid]);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:null});
 assert.equal(skipped.players[0].outside.some(c=>c.uid===named.uid),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:named.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===named.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===other.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('TTG-1-069 requires an outside ガンメン before REST and true retirement',()=>{
 const ttg=registeredV2TitlePack('gurren-lagann');
 const use=[ttg,ttg];
 const sourceCard=ttg.cards['TTG-1-069'];
 assert.equal(sourceCard.mainAbility.optional,false);
 assert.equal(sourceCard.mainAbility.filter.value,'ガンメン');
 assert.match(TTG_BY_ID['TTG-1-069'].source,/UA56BT%2FTTG-1-069/);
 assert.equal(EXPECTED_V2_IDS['gurren-lagann'].includes('TTG-1-069'),true);
 const counts=deckOf(ttg,['TTG-1-069','TTG-1-028','TTG-1-010']);
 let bare=toMain(newUniversalMatch(use,{decks:[counts,counts],first:0,seed:17069}),use);
 const blocked=place(bare,0,'TTG-1-069','energy',0);
 blocked.ready=true;
 bare.players[0].outside.push(take(bare,0,'TTG-1-010'));
 assert.equal(legalUniversalActions(use,bare).some(a=>a.type==='activate'&&a.uid===blocked.uid),false);

 let s=toMain(newUniversalMatch(use,{decks:[counts,counts],first:0,seed:17070}),use);
 const source=place(s,0,'TTG-1-069','energy',0);
 source.ready=true;
 const gunmen=take(s,0,'TTG-1-028'),notGunmen=take(s,0,'TTG-1-010');
 s.players[0].outside.push(gunmen,notGunmen);
 aiOk(s,use);
 s=dispatchUniversalAction(use,s,{type:'activate',uid:source.uid,mode:'restRetireRecover'});
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.optional,false);
 assert.deepEqual(s.pending.choices,[gunmen.uid]);
 assert.equal(legalUniversalActions(use,s).some(a=>a.uid===null),false);
 s=dispatchUniversalAction(use,s,{type:'chooseOutsideRecovery',uid:gunmen.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===gunmen.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===notGunmen.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(use,s),true);
});

test('SLG-1-071 buffs another character once, then returns itself to hand',()=>{
 assert.deepEqual(slg.cards['SLG-1-071'].mainAbility,
  {op:'restOnceBuffReturnSelf',oncePerTurn:true,bp:1000});
 assert.deepEqual(slg.cards['SLG-1-071'].traits,['DFN／第四次架南島レイド']);
 const counts=deckOf(slg,['SLG-1-071','SLG-1-053']);
 let alone=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17071}));
 const lone=place(alone,0,'SLG-1-071','front',0);
 lone.ready=true;
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.uid===lone.uid&&a.type==='activate'),false);

 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17072}));
 const source=place(s,0,'SLG-1-071','front',0);
 source.ready=true;
 const other=place(s,0,'SLG-1-053','energy',0);
 other.ready=true;
 const before=universalBp(packs,s,other);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'restOnceBuffReturn'});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[other.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:other.uid});
 const buffed=[...s.players[0].front,...s.players[0].energy].find(c=>c&&c.uid===other.uid);
 assert.equal(universalBp(packs,s,buffed),before+1000);
 assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].front[0],null);
 readyAp(s,0,2);
 s=play(s,source.uid);
 const replayed=s.players[0].front.find(c=>c&&c.uid===source.uid);
 replayed.ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SLG-1-074 gives Impact 1 to at most one other own DFN',()=>{
 assert.deepEqual(slg.cards['SLG-1-074'].effects.onPlay,[{op:'grantOtherImpactThisTurn',
  trait:'DFN',amount:1,optional:true}]);
 const counts=deckOf(slg,['SLG-1-074','SLG-1-072','SLG-1-053']);
 let none=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17074}));
 place(none,0,'SLG-1-053','energy',0);
 const lonely=hold(none,0,'SLG-1-074');
 none=play(none,lonely.uid);
 assert.equal(none.pending,null);
 assert.equal(universalImpact(packs,none,none.players[0].front[0]),0);

 let s=toMain(newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:17075}));
 const target=place(s,0,'SLG-1-072','energy',0);
 const miss=place(s,0,'SLG-1-053','front',1);
 const source=hold(s,0,'SLG-1-074');
 s=play(s,source.uid);
 assert.equal(s.pending.kind,'effect-grant-impact');
 assert.deepEqual(s.pending.choices,[target.uid]);
 assert.equal(s.pending.choices.includes(miss.uid),false);
 assert.equal(s.pending.choices.includes(source.uid),false);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseGrantImpact',uid:null});
 assert.equal(universalImpact(packs,skipped,skipped.players[0].energy[0]),0);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantImpact',uid:target.uid});
 const granted=s.players[0].energy.find(c=>c&&c.uid===target.uid);
 assert.equal(universalImpact(packs,s,granted),1);
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),0);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-2-066 sends at most one green ALO from the top two outside',()=>{
 const sao=registeredV2TitlePack('sword-art-online');
 const use=[sao,sao];
 const card=sao.cards['SAO-2-066'];
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-066');
 assert.equal(source.number,'EX08BT/SAO-2-066');
 assert.match(source.source,/unionarena-tcg\.com\/jp\/cardlist/);
 assert.match(source.effectJa,/上から2枚見る。その中から緑の［特徴：ALO］を1枚まで場外/);
 assert.equal(card.name,'シノン');
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'inspectTopTraitOutside',count:2,
  trait:'ALO',color:'green',rest:'top'}]);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],125);
 assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-066'),true);

 const counts=deckOf(sao,['SAO-2-066','SAO-1-082','SAO-1-051','SAO-1-092']);
 let s=toMain(newUniversalMatch(use,{decks:[counts,counts],first:0,seed:2066}),use);
 const hit=take(s,0,'SAO-1-082'),blue=take(s,0,'SAO-1-051');
 s.players[0].deck.unshift(hit,blue);
 const played=hold(s,0,'SAO-2-066');
 s=play(s,played.uid,'front',0,use);
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 assert.equal(s.pending.color,'green');
 assert.equal(s.pending.trait,'ALO');
 assert.equal(s.pending.orName,undefined);
 assert.deepEqual(s.pending.choices,[hit.uid]);
 assert.deepEqual(universalPublicView(use,s).pending,{kind:'effect-top-trait-outside',player:0});
 assert.throws(()=>dispatchUniversalAction(use,s,{type:'chooseTopTraitOutside',uid:blue.uid}),
  /not currently legal/);
 aiOk(s,use);
 const skipped=dispatchUniversalAction(use,s,{type:'chooseTopTraitOutside',uid:null});
 assert.equal(skipped.pending.kind,'effect-top-order');
 assert.equal(skipped.players[0].outside.some(c=>c.uid===hit.uid),false);
 s=dispatchUniversalAction(use,s,{type:'chooseTopTraitOutside',uid:hit.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===hit.uid));
 assert.deepEqual(s.pending.uids,[blue.uid]);
 s=dispatchUniversalAction(use,s,{type:'chooseTopOrder',uid:blue.uid});
 assert.equal(s.players[0].deck[0].uid,blue.uid);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(use,s),true);

 let miss=toMain(newUniversalMatch(use,{decks:[counts,counts],first:0,seed:2067}),use);
 const notAlo=take(miss,0,'SAO-1-092'),blueOnly=take(miss,0,'SAO-1-051');
 miss.players[0].deck.unshift(notAlo,blueOnly);
 const again=hold(miss,0,'SAO-2-066');
 miss=play(miss,again.uid,'front',0,use);
 assert.equal(miss.pending.kind,'effect-top-order');
 assert.deepEqual([...miss.pending.uids].sort(),[notAlo.uid,blueOnly.uid].sort());
 assert.equal(miss.players[0].outside.some(c=>c.uid===notAlo.uid||c.uid===blueOnly.uid),false);
 miss=dispatchUniversalAction(use,miss,{type:'chooseTopOrder',uid:blueOnly.uid});
 miss=dispatchUniversalAction(use,miss,{type:'chooseTopOrder',uid:notAlo.uid});
 assert.equal(miss.players[0].deck[0].uid,blueOnly.uid);
 assert.equal(miss.players[0].deck[1].uid,notAlo.uid);
 assert.equal(miss.pending,null);
 assert.equal(assertUniversalMatch(use,miss),true);
});
