import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onlineRevealFocus} from '../server/domain.mjs';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';

const packs=[
 {cards:{SECRET:{name:'不該出現'},SHOWN:{name:'公開的牌'},MINE:{name:'自己的牌頂'}}},
 {cards:{SECRET:{name:'不該出現'},SHOWN:{name:'公開的牌'},MINE:{name:'自己的牌頂'}}}
];
function match(step,extra={}){
 return {
  pending:{player:0,kind:'kmr',step,actions:extra.actions||[
   {type:'kmr',mode:'top'},{type:'kmr',mode:'outside'}
  ],data:extra.data||{uid:'1-top',owner:1}},
  publicReveals:extra.publicReveals===undefined?[{kind:'deck-top',owner:1,cardId:'SHOWN',uid:'1-top',turn:1}]:extra.publicReveals,
  players:[
   {deck:[{uid:'0-top',cardId:'MINE'},{uid:'0-next',cardId:'SECRET'}]},
   {deck:extra.deck||[{uid:'1-top',cardId:'SECRET'},{uid:'1-next',cardId:'SECRET'}],
    hand:[{uid:'1-hand',cardId:'SECRET'}],life:[{uid:'1-life',cardId:'SECRET'}]}
  ]
 };
}

test('Muse art stays available when a catalogue only stores the printing image',()=>{
 const muse=KMR_CARDS.find(card=>card.id==='KMR-1-113');
 assert.match(muse.printings[0].image,/UA29ST_KMR-1-113\.png$/);
 assert.match(readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8'),
  /card\?\.onlineImage\|\|card\?\.image\|\|printing\?\.image/);
 assert.match(readFileSync(new URL('../server/domain.mjs',import.meta.url),'utf8'),
  /payload\.reveal=onlineRevealFocus\(room\.packs,room\.match,seat\)/);
});

test('a published opponent top is shown to both seats and the next card stays closed',()=>{
 const state=match('oppTop');
 for(const seat of [0,1]){
  const shown=onlineRevealFocus(packs,state,seat);
  assert.equal(shown.cardId,'SHOWN',String(seat));
  assert.equal(shown.name,'公開的牌');
  assert.equal(shown.zone,'對手牌組頂');
  assert.equal(shown.uid,'1-top');
  assert.equal(JSON.stringify(shown).includes('SECRET'),false);
  assert.equal(JSON.stringify(shown).includes('1-next'),false);
  assert.equal(JSON.stringify(shown).includes('1-hand'),false);
 }
 const buried={...state,players:state.players.map((player,index)=>index===1?
  {...player,deck:[{uid:'1-other',cardId:'SECRET'},{uid:'1-top',cardId:'SECRET'}]}:player)};
 assert.equal(onlineRevealFocus(packs,buried,0),null);
 assert.equal(onlineRevealFocus(packs,buried,1),null);
});

test('a dropped public list still shows the controller only the matching top card',()=>{
 const hidden=match('oppTop',{publicReveals:[]});
 const shown=onlineRevealFocus(packs,hidden,0);
 assert.equal(shown.cardId,'SECRET');
 assert.equal(shown.uid,'1-top');
 assert.equal(JSON.stringify(shown).includes('1-next'),false);
 assert.equal(onlineRevealFocus(packs,hidden,1),null);
});

test('looking at your own deck top is private to the acting player',()=>{
 const state=match('topPlace',{
  actions:[{type:'kmr',mode:'top',uid:'0-top'},{type:'kmr',mode:'outside',uid:'0-top'}],
  data:{uid:'0-top'},publicReveals:[]
 });
 const shown=onlineRevealFocus(packs,state,0);
 assert.equal(shown.cardId,'MINE');
 assert.equal(shown.name,'自己的牌頂');
 assert.equal(shown.zone,'你的牌組頂');
 assert.equal(JSON.stringify(shown).includes('0-next'),false);
 assert.equal(onlineRevealFocus(packs,state,1),null);
 assert.equal(onlineRevealFocus(packs,{...state,pending:{...state.pending,step:'gearTop'}},0),null);
 const mixed=match('topPlace',{
  actions:[{type:'kmr',mode:'top',uid:'0-top'},{type:'kmr',mode:'take',uid:'0-next'}],
  data:{uid:'0-top'},publicReveals:[]
 });
 assert.equal(onlineRevealFocus(packs,mixed,0),null);
});
