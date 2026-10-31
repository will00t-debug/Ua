import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onlinePrivateGallery} from '../server/domain.mjs';
import {controllerChoiceArt,controllerDeckWindowCards} from '../dist/universal-v2/preview-actions.mjs';

const packs=[{cards:{
 A:{name:'超銀河グレンラガン'},
 B:{name:'俺達を誰だと思っているやがる!!'},
 SECRET:{name:'不該出現'},
 PAY:{name:'手牌棄牌'},
 FRONT:{name:'敵方前線'}
}},{cards:{FRONT:{name:'敵方前線'},SECRET:{name:'對手隱藏'}}}];

function lookState(){
 return {
  pending:{player:0,kind:'effect-look-take',phase:'take',uids:['0-a','0-b']},
  players:[
   {deck:[{uid:'0-a',cardId:'A'},{uid:'0-b',cardId:'B'},{uid:'0-secret',cardId:'SECRET'}],
    hand:[{uid:'0-pay',cardId:'PAY'}],front:[],energy:[],outside:[],removed:[],life:[]},
   {deck:[{uid:'1-deck',cardId:'SECRET'}],hand:[{uid:'1-hand',cardId:'SECRET'}],
    front:[{uid:'1-front',cardId:'FRONT'}],energy:[],outside:[],removed:[],
    life:[{uid:'1-life',cardId:'SECRET'}]}
  ]
 };
}

test('a deck look shows every looked card and only the legal one can be taken',()=>{
 const state=lookState();
 const legal=[
  {type:'chooseLookTake',uid:null},
  {type:'chooseLookTake',uid:'0-a'}
 ];
 const shown=controllerDeckWindowCards(state,packs,legal);
 assert.deepEqual(shown.map(card=>card.cardId),['A','B']);
 assert.equal(shown[0].action.uid,'0-a');
 assert.equal(shown[0].keepLegal,false);
 assert.equal(shown[1].action,null);
 assert.equal(shown[1].keepLegal,false);
 assert.equal(JSON.stringify(shown).includes('SECRET'),false);
});

test('choice art uses the named public or own card and never the opponent hidden zones',()=>{
 const state=lookState();
 assert.equal(controllerChoiceArt(packs,state,{uid:'0-a'})[0].name,'超銀河グレンラガン');
 assert.equal(controllerChoiceArt(packs,state,{uid:'0-pay'})[0].name,'手牌棄牌');
 assert.equal(controllerChoiceArt(packs,state,{uid:'1-front'})[0].name,'敵方前線');
 assert.equal(controllerChoiceArt(packs,state,{retireUid:'1-front'})[0].cardId,'FRONT');
 assert.deepEqual(controllerChoiceArt(packs,state,{uid:'1-deck'}),[]);
 assert.deepEqual(controllerChoiceArt(packs,state,{uid:'1-hand'}),[]);
 assert.deepEqual(controllerChoiceArt(packs,state,{uid:'1-life'}),[]);
 assert.deepEqual(controllerChoiceArt(packs,state,{uid:null}),[]);
});

test('online look-take publishes the controller deck window and not the rest of the deck',()=>{
 const state=lookState();
 const legal=[
  {type:'chooseLookTake',uid:null},
  {type:'chooseLookTake',uid:'0-a'}
 ];
 const shown=onlinePrivateGallery(null,legal,packs,{pending:state.pending,players:state.players});
 assert.equal(shown.kind,'effect-look-take');
 assert.deepEqual(shown.cards.map(card=>card.name),
  ['超銀河グレンラガン','俺達を誰だと思っているやがる!!']);
 assert.deepEqual(shown.cards[0].actions.map(action=>action.index),[1]);
 assert.deepEqual(shown.cards[1].actions,[]);
 assert.equal(shown.cards[1].caption,'目前不能選');
 assert.equal(JSON.stringify(shown).includes('SECRET'),false);
 assert.equal(JSON.stringify(shown).includes('0-secret'),false);
});

test('choice dialogs render deck looks and visible effect targets as card art',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 const online=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server/domain.mjs',import.meta.url),'utf8');
 assert.match(preview,/controllerDeckWindowCards\(s,app\.packs,legal\)/);
 assert.match(preview,/controllerChoiceArt\(app\.packs,s,row\.action\)/);
 assert.match(preview,/controllerChoiceArt\(app\.packs,app\.state,action\)/);
 assert.match(online,/function onlineVisibleChoiceGallery\(/);
 assert.match(online,/visibleChoices\?\.node/);
 assert.match(server,/function deckWindowGallery\(/);
 assert.match(server,/'retireUid'/);
});
