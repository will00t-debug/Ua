import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicLifeOrderChoiceCard} from '../dist/universal-v2/preview-actions.mjs';

const view={
 publicReveals:[
  {owner:0,uid:'0-revealed',cardId:'TTG-1-035',trigger:'special'},
  {owner:0,uid:'0-old',cardId:'TTG-1-012',trigger:'get'},
  {owner:1,uid:'1-revealed',cardId:'BLC-1-001',trigger:'draw'}
 ],
 players:[
  {hand:[{uid:'0-in-hand',cardId:'TTG-1-029'}],
   front:[{uid:'0-source',cardId:'TTG-1-074'}],energy:[],
   outside:[],removed:[]},
  {hand:null,front:[{uid:'1-source',cardId:'BLC-1-020'}],
   energy:[],outside:[],removed:[]}
 ]
};
const pending={
 kind:'life-batch-order',player:0,choices:['0-revealed'],
 entries:[{key:'effect',sourceUid:'0-source',jobs:[{op:'draw',count:1}]}]
};

test('LIFE ordering uses only matching publicly revealed physical card identities',()=>{
 const card=publicLifeOrderChoiceCard(view,pending,{type:'chooseLifeOrder',uid:'0-revealed'});
 assert.deepEqual(card,{cardId:'TTG-1-035',side:0,uid:'0-revealed'});
 assert.equal(publicLifeOrderChoiceCard(view,pending,{type:'chooseLifeOrder',uid:'0-old'}),null,
  'previously revealed card cannot be reused for current pending choice');
 assert.equal(publicLifeOrderChoiceCard(view,pending,{type:'chooseLifeOrder',uid:'1-revealed'}),null,
  'other controller cannot be selected');
 assert.equal(publicLifeOrderChoiceCard(view,pending,{type:'chooseLifeOrder',uid:'0-hidden'}),null,
  'hidden, unrevealed life remains concealed');
});

test('earned entry effect order uses controller-visible source card art without revealing a deck',()=>{
 assert.deepEqual(publicLifeOrderChoiceCard(view,pending,{type:'chooseLifeEffect',key:'effect'}),
  {cardId:'TTG-1-074',side:0,uid:'0-source'});
 const handPending={...pending,entries:[{key:'hand',sourceUid:'0-in-hand'}]};
 assert.equal(publicLifeOrderChoiceCard(view,handPending,{type:'chooseLifeEffect',key:'hand'})?.cardId,
  'TTG-1-029');
 const hidden={...pending,entries:[{key:'secret',sourceUid:'0-hidden-deck'}]};
 assert.equal(publicLifeOrderChoiceCard(view,hidden,{type:'chooseLifeEffect',key:'secret'}),null);
 assert.equal(publicLifeOrderChoiceCard(view,pending,{type:'chooseLifeEffect',key:'forged'}),null);
 assert.equal(publicLifeOrderChoiceCard(view,{...pending,kind:'life-trigger'},
  {type:'chooseLifeOrder',uid:'0-revealed'}),null);
});

test('solo LIFE order renders a card-art gallery and never appends null as a DOM child',()=>{
 const src=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(src,/publicLifeOrderChoiceCard\(view,s\.pending,row\.action\)/);
 assert.match(src,/publicLifeOrderChoiceCard\(view,app\.state\?\.pending,action\)/);
 assert.match(src,/if\(canPeek\)dialog\.append\(el\('div'/);
 assert.doesNotMatch(src,/canPeek\?el\('div',\{class:'v2-inspection-peek-tools'/);
 assert.match(src,/class:'choice-card recommended'/);
});

test('online LIFE chooser uses published life reveals and unchanged legal action indices',()=>{
 const src=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 assert.match(src,/function onlineLifeOrderGallery\(room\)/);
 assert.match(src,/room\.view\?\.publicReveals\|\|\[\]/);
 assert.match(src,/item\.uid===action\.uid/);
 assert.match(src,/onClick:\(\)=>sendAction\(action\.index\)/);
 assert.match(src,/lifeOrder\?\.node/);
});
