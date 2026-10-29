import test from 'node:test';
import assert from 'node:assert/strict';
import {onlinePrivateGallery} from '../server/domain.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const TITLES=[
 'bleach','gurren-lagann','sword-art-online','solo-leveling','mushoku-tensei',
 'rezero','steins-gate','madoka','inuyasha','kjn'
];
const typeByKind={
 'effect-top-filter-choice':'chooseTopFiltered',
 'effect-top-filter-many-choice':'chooseTopFilteredMany',
 'effect-top-trait-event':'chooseTopTraitEvent',
 'effect-top-trait-outside':'chooseTopTraitOutside',
 'effect-search-deck':'chooseDeckSearch',
 'effect-search-deck-multi':'chooseDeckSearchMulti',
 'effect-wyrm-look':'chooseWyrmLook',
 'effect-top-character-outside':'chooseTopCharacterOutside',
 'effect-top-deploy':'chooseTopDeploy',
 'effect-top-deploy-rest':'chooseTopDeployRest'
};
const pending=kind=>({pending:{kind}});
const looked=cardId=>[
 {uid:'mine-0',cardId,name:'可選卡',color:'purple'},
 {uid:'mine-1',cardId,name:'不符合條件卡',color:'purple'}
];

test('all ten official title packs can render a private full-deck search with ineligible cards',()=>{
 for(const title of TITLES){
  const pack=officialV2Pack(title);
  assert.ok(pack&&Object.keys(pack.cards).length>0,title);
  const cardId=Object.keys(pack.cards)[0];
  const legal=[{type:'next'},{type:'chooseDeckSearch',uid:'mine-0'}];
  const shown=onlinePrivateGallery(
   {kind:'effect-search-deck',inspected:looked(cardId),options:[]},
   legal,[pack,pack],pending('effect-search-deck'));
  assert.deepEqual(shown.cards.map(card=>card.uid),['mine-0','mine-1'],title);
  assert.deepEqual(shown.cards[0].actions.map(a=>a.index),[1],title);
  assert.deepEqual(shown.cards[1].actions,[],title);
  assert.ok(shown.cards.every(card=>card.cardId===cardId),title);
 }
});

test('every filtered search / TOP-N kind keeps nonmatching artwork but no illegal action',()=>{
 for(const [kind,type] of Object.entries(typeByKind)){
  const legal=[{type:'next'},{type,uid:'mine-0'}];
  const shown=onlinePrivateGallery(
   {kind,inspected:looked('CARD-001'),options:[]},legal,[{},{}],pending(kind));
  assert.equal(shown.cards.length,2,kind);
  assert.deepEqual(shown.cards[0].actions.map(a=>a.index),[1],kind);
  assert.deepEqual(shown.cards[1].actions,[],kind);
 }
});

test('a card with two positions offers both exact server action indices, not a fabricated selection',()=>{
 const kind='effect-top-deploy';
 const legal=[{type:'chooseTopDeploy',uid:null},
  {type:'chooseTopDeploy',uid:'mine-0',line:'front',slot:1},
  {type:'chooseTopDeploy',uid:'mine-0',line:'front',slot:2}];
 const shown=onlinePrivateGallery(
  {kind,inspected:looked('SAO-1-054'),options:[]},legal,[{},{}],pending(kind));
 assert.deepEqual(shown.cards[0].actions.map(a=>a.index),[1,2]);
 assert.deepEqual(shown.cards[1].actions,[]);
 assert.ok(shown.cards[0].actions.every(a=>typeof a.label==='string'&&a.label.length));
});

test('IYS only offers the legal take/next action, not skip or unrelated effect actions',()=>{
 const legal=[
  {type:'iys',mode:'skip',uid:'mine-0'},
  {type:'iys',mode:'take',uid:'mine-0'},
  {type:'iys',mode:'next',uid:'mine-0'},
  {type:'iys',mode:'take',uid:null}
 ];
 const shown=onlinePrivateGallery({kind:'iys',inspected:looked('IYS-1-005'),options:[]},
  legal,[{},{}],pending('iys'));
 assert.deepEqual(shown.cards[0].actions.map(a=>a.index),[1,2]);
 assert.deepEqual(shown.cards[1].actions,[]);
});

test('other private choice types may use authorized option artwork without serializing unseen actions',()=>{
 const action={type:'chooseInspectedOutside',uid:'mine-0'};
 const shown=onlinePrivateGallery({
  kind:'effect-top-inspect',
  options:[{action,card:{cardId:'BLC-4-009',name:'查看的卡'}},
   {action:{type:'chooseInspectedOutside',uid:null}}]
 },[{type:'next'},action],[{},{}],pending('effect-top-inspect'));
 assert.equal(shown.cards.length,1);
 assert.equal(shown.cards[0].uid,'mine-0');
 assert.equal(shown.cards[0].cardId,'BLC-4-009');
 assert.deepEqual(shown.cards[0].actions.map(a=>a.index),[1]);
 assert.equal(onlinePrivateGallery(null,[action],[{},{}],pending('effect-top-inspect')),null);
 assert.equal(onlinePrivateGallery({kind:'effect-search-deck',inspected:looked('X'),options:[]},
  [action],[{},{}],{pending:null}),null);
});
