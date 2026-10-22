import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
const mst=registeredV2TitlePack('mushoku-tensei'),packs=[mst,mst];
const deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,
 'MST-1-050':3,'MST-1-052':1};
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}
 throw Error('Missing genuine printed '+id);}
const next=s=>dispatchUniversalAction(packs,s,{type:'next'});
function duel({ownField=false,otherField=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:5200+Number(ownField)+Number(otherField)*2});
 const attacker=take(s,0,'MST-1-054');attacker.ready=true;s.players[0].front[0]=attacker;
 const roxy=take(s,1,'MST-1-052');roxy.ready=true;s.players[1].front[0]=roxy;
 if(ownField)s.players[1].energy[0]=take(s,1,'MST-1-075');
 if(otherField)s.players[0].energy[0]=take(s,0,'MST-1-075');
 s=next(next(next(s)));assert.equal(s.phase,'attack');
 return {s,attacker,roxy};
}
test('source-locked MST052 full printed Japanese retirement and empty LIFE trigger',()=>{
 const print=MST_V2_OFFICIAL_BY_ID['MST-1-052'],d=mst.cards['MST-1-052'];
 assert.equal(print.verified,true);
 assert.equal(print.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-052');
 assert.equal(print.effectJa,'〖退場時〗 自分の場にフィールドがある場合、カードを1枚引く。');
 assert.deepEqual([d.name,d.color,d.energy,d.ap,d.bp,d.gen,d.type,d.trigger,d.traits],
  ['ロキシー','green',0,1,2000,1,'character',null,[]]);
 assert.deepEqual(d.effects.onRetire,[{op:'drawIfOwnFieldExists',count:1}]);
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,deck),[]);
 assert.ok(Object.isFrozen(d.effects.onRetire));
});
test('actual MST-vs-MST blocked battle: onRetire draws only when controlling player has live FIELD',()=>{
 for(const [ownField,otherField] of [[true,false],[false,false],[false,true]]){
  let {s,attacker,roxy}=duel({ownField,otherField});
  const beforeHand=s.players[1].hand.length,beforeDeck=s.players[1].deck.length;
  const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
  assert.ok(attack);s=dispatchUniversalAction(packs,s,attack);
  assert.equal(s.pending?.kind,'block');
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:roxy.uid});
  assert.ok(s.players[1].outside.some(c=>c.uid===roxy.uid));
  assert.equal(s.players[1].hand.length,beforeHand+Number(ownField));
  assert.equal(s.players[1].deck.length,beforeDeck-Number(ownField));
  assert.equal(s.turnRetireEvents.length,1);
  assert.equal(s.turnRetireEvents[0].controller,1);
  assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('MST052 is never entitled to onRetire after ordinary full-line removal',()=>{
 const counts={...deck,'MST-1-054':0,'MST-1-001':4};
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:5232});
 const roxy=take(s,0,'MST-1-052');s.players[0].energy[0]=roxy;
 for(let i=1;i<4;i++)s.players[0].energy[i]=take(s,0,'MST-1-001');
 const incoming=take(s,0,'MST-1-001');s.players[0].hand.push(incoming);
 s=next(next(s));const before=s.players[0].hand.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===incoming.uid&&
  a.line==='energy'&&a.slot===0&&a.replaceUid===roxy.uid);
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 assert.ok(s.players[0].removed.some(c=>c.uid===roxy.uid));
 assert.equal(s.players[0].hand.length,before-1);
 assert.deepEqual(s.turnRetireEvents,[]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
