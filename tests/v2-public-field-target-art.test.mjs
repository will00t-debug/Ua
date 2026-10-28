import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicPendingTargetCard,pendingChoiceCards} from '../dist/universal-v2/preview-actions.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

const view={players:[
 {front:[{uid:'0-friendly-1',cardId:'BLEACH-FRONT',bp:4000},null],
  energy:[null,{uid:'0-friendly-energy',cardId:'BLEACH-ENERGY'}],
  hand:[{uid:'0-hand',cardId:'SECRET-HAND'}],
  outside:[{uid:'0-outside',cardId:'OUTSIDE-CARD'}]},
 {front:[{uid:'1-enemy-1',cardId:'ENEMY-FRONT',bp:3500},
         {uid:'1-enemy-2',cardId:'ENEMY-FRONT-2',bp:2000}],
  energy:[{uid:'1-enemy-energy',cardId:'ENEMY-ENERGY'}],
  hand:null,deckCount:42,lifeCount:6}
]};

test('public pending target resolves exact friendly and enemy characters',()=>{
 assert.deepEqual(publicPendingTargetCard(view,{type:'chooseRetireBp',uid:'1-enemy-1'}),
  {side:1,line:'front',index:0,cardId:'ENEMY-FRONT',bp:3500});
 assert.deepEqual(publicPendingTargetCard(view,{type:'chooseRetireBp',uid:'1-enemy-2'}),
  {side:1,line:'front',index:1,cardId:'ENEMY-FRONT-2',bp:2000});
 assert.deepEqual(publicPendingTargetCard(view,{type:'chooseOwnCharacterRetire',uid:'0-friendly-1'}),
  {side:0,line:'front',index:0,cardId:'BLEACH-FRONT',bp:4000});
 assert.deepEqual(publicPendingTargetCard(view,{type:'chooseActiveEnergy',uid:'0-friendly-energy'}),
  {side:0,line:'energy',index:1,cardId:'BLEACH-ENERGY',bp:null});
 assert.deepEqual(publicPendingTargetCard(view,{type:'chooseEnemyEnergy',uid:'1-enemy-energy'}),
  {side:1,line:'energy',index:0,cardId:'ENEMY-ENERGY',bp:null});
});

test('hidden cards, other zones and skip options never expose artwork',()=>{
 for(const uid of ['0-hand','0-outside','1-enemy-hidden','1-life',null,undefined,'']){
  assert.equal(publicPendingTargetCard(view,{type:'chooseRetireBp',uid}),null);
 }
 assert.deepEqual(publicPendingTargetCard(view,{
  type:'chooseRetireBp',uid:'0-friendly-1',cardId:'FORGED'
 }),{side:0,line:'front',index:0,cardId:'BLEACH-FRONT',bp:4000});
 assert.equal(publicPendingTargetCard(null,{uid:'0-friendly-1'}),null);
 assert.equal(publicPendingTargetCard({players:[]},{uid:'0-friendly-1'}),null);
});

test('pending choice renderer prefers authorized private choices, else uses public field card',()=>{
 const js=read('dist/universal-v2-preview.mjs');
 const choice=js.split('function pendingChoiceControl(')[1]?.split('function attackShowcase(')[0];
 const dialog=js.split('function pendingDialog(')[1]?.split('function finishMessage(')[0];
 assert.ok(choice&&dialog);
 assert.match(choice,/pendingChoiceCards\(option\)\.map\(card=>\(\{\.\.\.card,side:0\}\)\)/);
 assert.match(choice,/authorized\.length\?null:publicPendingTargetCard\(view,action\)/);
 assert.match(choice,/choicePicture\(card\.cardId,card\.name,card\.side\)/);
 assert.match(choice,/target\.side===0\?'我方':'敵方'/);
 assert.match(choice,/class:'choice-card-location'/);
 assert.match(dialog,/publicPendingTargetCard\(view,row\.action\)!==null/);
 assert.match(dialog,/pendingChoiceControl\(row\.action,row\.option,gallery\|\|blockGallery,view\)/);
 assert.match(choice,/onClick:\(\)=>applyAction\(action\)/);
 assert.doesNotMatch(choice,/dispatchUniversalAction/);
 const style=read('dist/universal-v2-legacy.css');
 assert.match(style,/\.choice-card-location\{/);
});

test('controller-private choices remain untouched',()=>{
 const items=pendingChoiceCards({card:{cardId:'SECRET',name:'自家可見手牌'}});
 assert.deepEqual(items,[{cardId:'SECRET',name:'自家可見手牌',color:''}]);
});
