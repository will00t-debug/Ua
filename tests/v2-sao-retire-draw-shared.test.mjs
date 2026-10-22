import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_PILOT_IDS} from '../dist/universal-v2/sao-pack.mjs';
import {validateUniversalDeck,createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const sao=registeredV2TitlePack('sword-art-online'),ttg=registeredV2TitlePack('gurren-lagann'),
 mst=registeredV2TitlePack('mushoku-tensei'),slg=registeredV2TitlePack('solo-leveling');
const saoIds=['SAO-1-035','SAO-1-039','SAO-1-054','SAO-1-055','SAO-1-061',
 'SAO-1-068','SAO-1-069','SAO-1-082','SAO-1-084','SAO-1-105',
 'SAO-2-016','SAO-2-021','SAO-2-035'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));saoDeck['SAO-2-035']=2;
const ttgIds=['042','043','047','049','051','052','053','063','064','065','066','072','073'];
const ttgDeck=Object.fromEntries(ttgIds.map(id=>['TTG-1-'+id,4]));ttgDeck['TTG-1-073']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing physical UID '+id);
}
function put(s,p,id,line,index){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=true;s.players[p][line][index]=c;return c;
}
function phase(packs,s,wanted){
 for(let i=0;i<5&&s.phase!==wanted;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,wanted);return s;
}
test('both original SAO printed cards are native mandatory onRetire draw, not Life triggers',()=>{
 for(const [id,num,name,energy,bp] of [
  ['SAO-2-016','EX08BT/SAO-2-016','クラディール',0,1000],
  ['SAO-1-105','UA15ST/SAO-1-105','サチ',1,2000]
 ]){
  const records=SAO_OFFICIAL_CARDS.filter(c=>c.id===id);
  assert.equal(records.length,1);
  const source=records[0],def=sao.cards[id];
  assert.equal(source.number,num);
  assert.equal(source.effectJa,'【退場時】カードを1枚引く。');
  assert.equal(source.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+num.replace('/','%2F'));
  assert.deepEqual([def.name,def.color,def.energy,def.ap,def.bp,def.gen,def.type,
   def.traits,def.trigger],
   [name,'blue',energy,1,bp,1,'character',['アインクラッド'],null]);
  assert.deepEqual(def.effects.onRetire,[{op:'draw',count:1}]);
  assert.deepEqual(def.effects.onRetire,mst.cards['MST-1-013'].effects.onRetire);
  assert.deepEqual(def.effects.onRetire,slg.cards['SLG-1-007'].effects.onRetire);
  assert.ok(Object.isFrozen(def.effects.onRetire));
  assert.equal(def.implementation,'dsl');
  assert.ok(SAO_V2_PILOT_IDS.includes(id));
 }
 assert.equal(Object.keys(sao.cards).length,EXPECTED_V2_COUNTS['sword-art-online']);
 assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
});
for(const [id,seed] of [['SAO-2-016',2016],['SAO-1-105',1105]]){
 test(id+' actual TTG attack retires SAO P1 and owner draws exactly one card',()=>{
  const packs=[ttg,sao];let s=newUniversalMatch(packs,{decks:[ttgDeck,saoDeck],first:0,seed});
  const attacker=put(s,0,'TTG-1-043','front',0);
  const defender=put(s,1,id,'front',0);
  s=phase(packs,s,'attack');
  const oldDeck=s.players[1].deck.length,oldHand=s.players[1].hand.length,
   foeDeck=s.players[0].deck.length;
  const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
  assert.ok(attack);
  s=dispatchUniversalAction(packs,s,attack,{actor:0});
  assert.equal(s.pending?.kind,'block');
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:'1-fake'},{actor:1}),/not currently legal/);
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid},{actor:1});
  assert.ok(s.players[1].outside.some(c=>c.uid===defender.uid));
  assert.equal(s.players[1].hand.length,oldHand+1);
  assert.equal(s.players[1].deck.length,oldDeck-1);
  assert.equal(s.players[0].deck.length,foeDeck);
  assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
test('SAO P0 defending TTG P1: retirement draw belongs only to the printed source owner',()=>{
 const packs=[sao,ttg];let s=newUniversalMatch(packs,{decks:[saoDeck,ttgDeck],first:1,seed:2105});
 const defender=put(s,0,'SAO-1-105','front',0);
 const attacker=put(s,1,'TTG-1-043','front',0);
 s=phase(packs,s,'attack');
 const deck=s.players[0].deck.length,hand=s.players[0].hand.length,enemy=s.players[1].deck.length;
 const a=legalUniversalActions(packs,s).find(x=>x.type==='attack'&&x.uid===attacker.uid);
 assert.ok(a);s=dispatchUniversalAction(packs,s,a,{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===defender.uid));
 assert.equal(s.players[0].deck.length,deck-1);assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.players[1].deck.length,enemy);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('normal SAO105 play spends AP but cannot fire an onRetire draw',()=>{
 const packs=[sao,sao];let s=newUniversalMatch(packs,{decks:[saoDeck,saoDeck],first:0,seed:11050});
 put(s,0,'SAO-1-039','energy',0);
 const source=take(s,0,'SAO-1-105');s.players[0].hand.push(source);
 s=phase(packs,s,'main');
 const deck=s.players[0].deck.length,ap=s.players[0].apCards.filter(c=>c.ready).length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('full energy line replacement removes SAO016 without retirement or free draw',()=>{
 const packs=[sao,sao];let s=newUniversalMatch(packs,{decks:[saoDeck,saoDeck],first:0,seed:2160});
 const source=put(s,0,'SAO-2-016','energy',0);
 for(let i=1;i<4;i++)put(s,0,'SAO-1-039','energy',i);
 const incoming=take(s,0,'SAO-1-105');s.players[0].hand.push(incoming);
 s=phase(packs,s,'main');
 const deck=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===incoming.uid&&
  a.line==='energy'&&a.slot===0&&a.replaceUid===source.uid);
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 assert.ok(s.players[0].removed.some(c=>c.uid===source.uid));
 assert.ok(!s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('generic onRetire rejects fabricated cost-free alternative effects and vanilla bypass',()=>{
 const base={id:'SYN',name:'Synthetic',type:'character',color:'blue',energy:0,
  ap:1,bp:1000,gen:1,implementation:'dsl',effects:{}};
 const make=c=>createUniversalPack({id:'strict-retirement-proof',cards:[c]});
 assert.deepEqual(make({...base,effects:{onRetire:[{op:'draw',count:1}]}}).cards.SYN.effects.onRetire,[{op:'draw',count:1}]);
 assert.throws(()=>make({...base,effects:{onRetire:[{op:'recoverAp',count:1}]}}),/unsupported onRetire/);
 assert.throws(()=>make({...base,implementation:'vanilla',effects:{onRetire:[{op:'draw',count:1}]}}),/vanilla/);
});
