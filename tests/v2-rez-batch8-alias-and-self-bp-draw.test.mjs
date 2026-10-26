import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const ids=['REZ-2-014','REZ-2-015','REZ-2-033','REZ-2-035','REZ-2-040','REZ-2-041',
 'REZ-2-042','REZ-2-043','REZ-2-049','REZ-2-055','REZ-2-056','REZ-2-059','REZ-2-060'];
const deck=rezDeck(ids,'REZ-2-015');

test('REZ-2-041 is also シルフィ and REZ-2-015 draws only with Crusch and current BP 4000',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-041'].effectJa,'このカードは〈シルフィ〉としても扱う。');
 assert.deepEqual(REZERO_VOL2_BY_ID['REZ-2-041'].faq,['Q2416','Q2417']);
 const alias=rez.cards['REZ-2-041'];
 assert.equal(alias.name,'184番');
 assert.deepEqual(alias.nameAliases,['シルフィ']);
 assert.deepEqual(alias.effects,{});
 assert.equal(alias.trigger,'active');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-015'].effectJa,
  '[アタック時]自分の場に〈クルシュ・カルステン〉があり、このキャラのBPが4000以上の場合、カードを1枚引く。');
 assert.deepEqual(rez.cards['REZ-2-015'].effects.onAttack,
  [{op:'drawIfOwnName',name:'クルシュ・カルステン',count:1,minSelfBp:4000}]);
 assert.deepEqual(expandAbilityTemplates({onAttack:[
  {template:'drawIfOwnNameMinSelfBp',name:'クルシュ・カルステン',count:1,minSelfBp:4000}]}).onAttack,
  rez.cards['REZ-2-015'].effects.onAttack);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const body={id:'GATE',name:'フェリス',color:'blue',type:'character',energy:0,ap:1,bp:3000,gen:1,
  implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'self-bp',cards:[{...body,effects:{onPlay:[
  {op:'drawIfOwnName',name:'クルシュ・カルステン',count:1,minSelfBp:4000}]}}]}),/onAttack/);
 assert.throws(()=>createUniversalPack({id:'self-bp',cards:[{...body,effects:{onAttack:[
  {op:'drawIfOwnName',name:'クルシュ・カルステン',count:1,minSelfBp:300}]}}]}),/own-field-name/);
 assert.throws(()=>expandAbilityTemplates({onAttack:[
  {template:'drawIfOwnName',name:'クルシュ・カルステン',count:1,minSelfBp:4000}]}),/invalid template arguments/);
});

function attack({where='energy',bp=1000,owner=0}={}){
 let s=fresh(deck,1015);
 const ferris=take(s,0,'REZ-2-015');ferris.ready=true;
 if(bp)ferris.buffs=[{bp,untilTurn:s.turn}];
 s.players[0].front[0]=ferris;
 const crusch=take(s,owner,'REZ-2-059');crusch.ready=true;
 if(where==='energy')s.players[owner].energy[0]=crusch;
 else if(where==='front')s.players[owner].front[1]=crusch;
 else if(where==='hand')s.players[owner].hand.push(crusch);
 else s.players[owner].outside.push(crusch);
 s=toPhase(rezPacks,s,'attack');
 const before=s.players[0].deck.length;
 const hand=s.players[0].hand.length;
 const top=s.players[0].deck[0]?.uid;
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:ferris.uid},{actor:0});
 return {s,before,hand,top,ferris};
}

test('REZ-2-015 draws when own field has Crusch and this character is at 4000 BP',()=>{
 for(const where of ['energy','front']){
  const {s,before,hand,top}=attack({where,bp:1000});
  assert.equal(s.players[0].deck.length,before-1);
  assert.equal(s.players[0].hand.at(-1).uid,top);
  assert.equal(s.players[0].hand.length,hand+1);
  assert.equal(s.pending?.kind,'block');
  assert.equal(universalPublicView(rezPacks,s,1).players[0].hand,null);
  assert.equal(assertUniversalMatch(rezPacks,s),true);
 }
 const exact=attack({bp:1000});
 assert.equal(exact.s.players[0].deck.length,exact.before-1);
});

test('REZ-2-015 does not draw below 4000, or when Crusch is only in hand, outside, or on the opponent field',()=>{
 for(const scene of [
  {where:'energy',bp:0},
  {where:'hand',bp:1000},
  {where:'outside',bp:1000},
  {where:'front',bp:1000,owner:1}
 ]){
  const {s,before,hand}=attack(scene);
  assert.equal(s.players[0].deck.length,before,JSON.stringify(scene));
  assert.equal(s.players[0].hand.length,hand);
  assert.equal(s.pending?.kind,'block');
  assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='chooseBlock'),true);
 }
});
