import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView
} from '../dist/universal-v2/engine.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const ids=[
 'BLC-4-009','BLC-4-067','BLC-1-071','BLC-1-072',
 'BLC-1-075','BLC-1-082','BLC-1-086','BLC-1-089',
 'BLC-1-090','BLC-1-094','BLC-1-097','BLC-4-061'
];
const deck={...Object.fromEntries(ids.map(id=>[id,4])),'BLC-1-100':2};
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:40967});
function take(s,id) {
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[0][zone],i=cards.findIndex(c=>c.cardId===id);
  if(i>=0)return cards.splice(i,1)[0];
 }
 throw Error('Missing official physical card '+id);
}
function main(s){for(let i=0;i<3&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});assert.equal(s.phase,'main');return s;}
function play(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}
test('EX15BT printed BLC-4-009/067 exactly match top 2/3 inspect templates and retain DRAW trigger',()=>{
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS.bleach);
 for(const [id,count] of [['BLC-4-009',2],['BLC-4-067',3]]){
  assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'inspectTopArrange',count,toOutside:true,rest:'top'}]);
  assert.equal(pack.cards[id].trigger,'draw');
  assert.equal(pack.cards[id].type,'character');
 }
});
test('BLC-4-009 sees two, refuses illegal UID, may send exactly one outside and orders rest on TOP',()=>{
 let s=fresh(),c=take(s,'BLC-4-009');
 s.players[0].hand.push(c);
 s=main(s);
 const n=s.players[0].deck.length;
 const before=structuredClone(s);
 let waiting=play(s,c.uid);
 assert.equal(waiting.pending?.kind,'effect-top-inspect');
 assert.equal(waiting.pending.uids.length,2);
 assert.equal(waiting.pending.rest,'top');
 assert.equal(universalPrivateChoices(packs,waiting,0)?.options.length,3);
 assert.equal(universalPrivateChoices(packs,waiting,1),null);
 const exposed=JSON.stringify(universalPublicView(packs,waiting,1));
 for(const uid of waiting.pending.uids)assert.equal(exposed.includes(uid),false);
 const uid=waiting.pending.uids[0],other=waiting.pending.uids[1];
 assert.throws(()=>dispatchUniversalAction(packs,waiting,{type:'chooseInspectedOutside',uid:'ILLEGAL'},{actor:0}),/not currently legal/);
 const sent=dispatchUniversalAction(packs,waiting,{type:'chooseInspectedOutside',uid},{actor:0});
 assert.equal(sent.pending?.kind,'effect-top-order');
 assert.deepEqual(legalUniversalActions(packs,sent),[{type:'chooseTopOrder',uid:other}]);
 const end=dispatchUniversalAction(packs,sent,{type:'chooseTopOrder',uid:other},{actor:0});
 assert.equal(end.pending,null);
 assert.equal(end.players[0].deck[0].uid,other);
 assert.equal(end.players[0].deck.length,n-1);
 assert.ok(end.players[0].outside.some(x=>x.uid===uid));
 assert.deepEqual(s,before);
 assert.equal(assertUniversalMatch(packs,end),true);
});
test('BLC-4-067 may decline outside and reorder all three TOP cards without a shuffle',()=>{
 let s=fresh(),c=take(s,'BLC-4-067'),producer=take(s,'BLC-1-071');
 s.players[0].energy[0]=producer;s.players[0].hand.push(c);
 s=main(s);
 const n=s.players[0].deck.length;
 let waiting=play(s,c.uid);
 assert.equal(waiting.pending?.kind,'effect-top-inspect');
 const uids=[...waiting.pending.uids];
 assert.equal(uids.length,3);
 let state=dispatchUniversalAction(packs,waiting,{type:'chooseInspectedOutside',uid:null},{actor:0});
 assert.equal(state.pending?.kind,'effect-top-order');
 for(const uid of [...uids].reverse())state=dispatchUniversalAction(packs,state,{type:'chooseTopOrder',uid},{actor:0});
 assert.equal(state.pending,null);
 assert.deepEqual(state.players[0].deck.slice(0,3).map(x=>x.uid),[...uids].reverse());
 assert.equal(state.players[0].deck.length,n);
 assert.equal(assertUniversalMatch(packs,state),true);
});

test('BLC-2-055 uses exact top/bottom instead of top/outside',()=>{
 const original=CARDS.find(c=>c.identity==='BLC-2-055');
 assert.match(original.effect,/牌堆頂或牌堆底/);
 assert.deepEqual(pack.cards['BLC-2-055'].effects.onPlay,[{op:'peekTopOrBottom'}]);
 assert.equal(pack.cards['BLC-2-055'].color,'purple');
 assert.equal(pack.cards['BLC-2-055'].trigger,null);
});
test('BLC-4-013 uses exact arbitrary outside 0..2 effect (not at most one)',()=>{
 const original=CARDS.find(c=>c.identity==='BLC-4-013');
 assert.match(original.effect,/任意張/);
 assert.deepEqual(pack.cards['BLC-4-013'].effects.onPlay,[
  {op:'inspectTopAnyOutside',count:2,rest:'top'}]);
 assert.equal(pack.cards['BLC-4-013'].color,'yellow');
 assert.equal(pack.cards['BLC-4-013'].trigger,null);
});
