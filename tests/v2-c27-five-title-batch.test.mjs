import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
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
function toMain(s){
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function play(s,uid,line='front',slot=0){
 return dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.slot===slot));
}

test('C27 class A registers three SLG prints on existing deck and discount DSL',()=>{
 assert.equal(EXPECTED_V2_TOTAL,428);
 assert.equal(EXPECTED_V2_COUNTS['solo-leveling'],49);
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
