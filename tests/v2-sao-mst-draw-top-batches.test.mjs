import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {requireRegisteredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_V2_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=requireRegisteredV2TitlePack('sword-art-online');
function physical(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[p][zone],at=cards.findIndex(x=>x.cardId===id);
  if(at!==-1)return cards.splice(at,1)[0];
 }
 throw Error('No physically registered '+id);
}
function fixture(id,{energyId,ap=1}={}){
 const counts={...SAO_V2_REAL_DECK_COUNTS};
 counts['SAO-1-035']-=2;counts[id]=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:208107,first:0});
 const source=physical(s,0,id),producer=physical(s,0,energyId);
 s.players[0].hand.push(source);s.players[0].energy[0]=producer;
 for(let i=0;i<ap;i++){s.players[0].apCards[i].ready=true;s.players[0].apCards[i].inPlay=true;}
 for(let i=0;i<2;i++)s=dispatchUniversalAction([pack,pack],s,{type:'next'});
 assert.equal(s.phase,'main');
 const a=legalUniversalActions([pack,pack],s)
  .find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(a,id+' cost '+ap+' is not legally payable');
 return {s,a,source,counts};
}
const same=(s)=>assert.equal(assertUniversalMatch([pack,pack],s),true);
test('SAO-1-107 exact official AP2 blue 3 draw three, discard exactly ONE; no hidden loss',()=>{
 const id='SAO-1-107',print=SAO_OFFICIAL_CARDS.find(x=>x.id===id);
 assert.equal(print.effectJa,'【登場時】カードを3枚引き、自分の手札を1枚場外に置く。');
 assert.equal(print.ap,2);assert.equal(print.trigger,'draw');
 assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'drawDiscard',count:3}]);
 const {s,a}=fixture(id,{energyId:'SAO-1-102',ap:2});
 const before=s.players[0].deck.length,prevHand=s.players[0].hand.length;
 const q=dispatchUniversalAction([pack,pack],s,a);
 assert.equal(q.pending?.kind,'effect-discard');
 assert.equal(q.players[0].deck.length,before-3);
 assert.equal(q.players[0].hand.length,prevHand-1+3);
 assert.equal(q.players[0].apCards.filter(c=>c.ready).length,0);
 const legal=legalUniversalActions([pack,pack],q);
 assert.ok(legal.every(x=>x.type==='chooseDiscard'));
 assert.throws(()=>dispatchUniversalAction([pack,pack],q,
  {type:'chooseDiscard',uid:'forged'}),/not currently legal/);
 const done=dispatchUniversalAction([pack,pack],q,legal[0]);
 assert.equal(done.players[0].hand.length,prevHand+1);
 assert.equal(done.pending,null);same(done);same(q);
});
test('SAO-2-072 peek top or BOTTOM is private, never discards the top',()=>{
 const id='SAO-2-072',print=SAO_OFFICIAL_CARDS.find(x=>x.id===id);
 assert.equal(print.effectJa,'【登場時】自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。');
 assert.equal(print.trigger,'draw');
 assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'peekTopOrBottom'}]);
 const {s,a}=fixture(id,{energyId:id});
 const q=dispatchUniversalAction([pack,pack],s,a);
 assert.equal(q.pending?.kind,'private-top-place');
 const before=q.players[0].deck.map(c=>c.uid),outside=q.players[0].outside.length;
 assert.ok(before.length>=2);
 assert.equal(universalPrivateChoices([pack,pack],q,1),null);
 assert.equal(universalPrivateChoices([pack,pack],q,0).options[0].card.cardId,
  q.players[0].deck[0].cardId);
 assert.ok(!JSON.stringify(universalPublicView([pack,pack],q,1)).includes(before[0]));
 assert.throws(()=>dispatchUniversalAction([pack,pack],q,
  {type:'chooseTopCard',mode:'outside'}),/not currently legal/);
 const top=dispatchUniversalAction([pack,pack],q,{type:'chooseTopCard',mode:'top'});
 const bottom=dispatchUniversalAction([pack,pack],q,{type:'chooseTopCard',mode:'bottom'});
 assert.deepEqual(top.players[0].deck.map(c=>c.uid),before);
 assert.deepEqual(bottom.players[0].deck.map(c=>c.uid),[...before.slice(1),before[0]]);
 assert.equal(bottom.players[0].outside.length,outside);
 same(bottom);same(top);
});
