import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// Official: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-076
const pack=registeredV2TitlePack('mushoku-tensei'),packs=[pack,pack];
const deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,'MST-1-050':1,'MST-1-055':1,
 'MST-1-052':2,'MST-1-053':1,'MST-1-074':1,'MST-1-076':1,'MST-1-046':1};
function take(s,id){
 for(const z of ['deck','hand','life','outside']){
  const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing genuine '+id);
}
function scenario(extra,baseLine='front'){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:9760+extra,first:0});
 const source=take(s,'MST-1-076');s.players[0].hand.push(source);
 const roxy=take(s,'MST-1-053');roxy.ready=true;s.players[0].front[1]=roxy;
 const generator=take(s,'MST-1-046');generator.ready=true;s.players[0].energy[0]=generator;
 const field=take(s,'MST-1-075');field.ready=true;s.players[0].energy[1]=field;
 const base=take(s,'MST-1-052');base.ready=true;
 s.players[0][baseLine][baseLine==='front'?0:2]=base;
 const low=take(s,'MST-1-052'),raid=take(s,'MST-1-054');
 s.players[0].outside.push(low,raid);
 for(let i=0;i<extra;i++)
  s.players[0].outside.push(take(s,i===0?'MST-1-074':'MST-1-075'));
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===source.uid&&a.line==='energy'&&a.slot===3);
 assert.ok(play,'paid printed green3/AP1 FIELD on own first turn');
 s=dispatchUniversalAction(packs,s,play);
 const ability=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&
  a.mode==='retireFieldThen'&&a.uid===roxy.uid);
 assert.ok(ability);
 s=dispatchUniversalAction(packs,s,ability);
 assert.equal(s.pending?.kind,'effect-retire-own-field');
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:source.uid});
 assert.equal(s.pending?.kind,'effect-outside-traitless-rest');
 assert.equal(countRetirementsThisTurn(s,0,'field'),1);
 return {s,source,base,low,raid};
}
test('source-pinned MST076 full JP effect, SPECIAL trigger, green 3 / AP1 / gen2',()=>{
 const source=MST_V2_OFFICIAL_BY_ID['MST-1-076'],c=pack.cards['MST-1-076'];
 assert.equal(source.verified,true);
 assert.equal(source.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-076');
 assert.deepEqual([c.name,c.color,c.type,c.energy,c.ap,c.bp,c.gen,c.trigger],
  ['迷宮の守護者 マナタイトヒュドラ','green','field',3,1,0,2,'special']);
 assert.deepEqual(c.effects.onRetire,[{op:'deployOutsideTraitlessRestOrRaid',
  color:'green',energy:1,ap:1,optional:true,perOtherOutsideField:1}]);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
});
test('no other FIELD: source own retirement is excluded; only genuinely <=green1 traitless may REST enter',()=>{
 let {s,source,raid,low}=scenario(0);
 assert.equal(s.pending.energyLimit,1);
 const a=legalUniversalActions(packs,s);
 assert.ok(a.some(x=>x.uid===low.uid&&x.mode==='enter'));
 assert.ok(!a.some(x=>x.uid===raid.uid));
 const action=a.find(x=>x.uid===low.uid&&x.mode==='enter'&&x.line==='front');
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 assert.ok(s.players[0].front.some(x=>x?.uid===low.uid&&!x.ready));
 assert.ok(s.players[0].outside.some(x=>x.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('three OTHER outside FIELD cards unlock free true REST Raid onto actual Roxy base in FRONT',()=>{
 let {s,base,raid}=scenario(3);
 assert.equal(s.pending.energyLimit,4);
 const actions=legalUniversalActions(packs,s);
 const candidate=actions.find(x=>x.uid===raid.uid&&x.mode==='raid'&&
  x.baseUid===base.uid&&x.line==='front'&&x.slot===0);
 assert.ok(candidate);
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.equal(ai.mode,'raid');
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,candidate);
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(s.players[0].front[0].ready,false,'printed REST applies even to Raid');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap,'effect Raid costs no AP');
 assert.equal(countRetirementsThisTurn(s,0,'character'),0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('effect-initiated REST Raid may remain at legal ENERGY base without forcing FRONT',()=>{
 let {s,base,raid}=scenario(3,'energy');
 const candidate=legalUniversalActions(packs,s).find(a=>a.uid===raid.uid&&
  a.mode==='raid'&&a.baseUid===base.uid&&a.line==='energy'&&a.slot===2);
 assert.ok(candidate);
 s=dispatchUniversalAction(packs,s,candidate);
 assert.equal(s.players[0].energy[2].uid,raid.uid);
 assert.equal(s.players[0].energy[2].stack[0].uid,base.uid);
 assert.equal(s.players[0].energy[2].ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
