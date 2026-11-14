import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onlinePendingDisplay} from '../server/domain.mjs';

const packs=[
 {cards:{
  'REZ-1-106':{name:'愛蜜莉雅',type:'character'},
  'REZ-1-007':{name:'牌庫頂卡',type:'character'},
  'SECRET':{name:'不能公開',type:'event'}
 }},
 {cards:{'SECRET':{name:'對手隱藏卡',type:'event'}}}
];
const card=(uid,cardId)=>({uid,cardId});
function state(){
 return {
  pending:{kind:'private-top-choice',player:0,sourceUid:'0-emilia'},
  players:[
   {front:[card('0-emilia','REZ-1-106')],energy:[],hand:[],outside:[],
    removed:[],resolvingEvents:[],lifeRevealed:[],
    deck:[card('0-top','REZ-1-007'),card('0-secret','SECRET')]},
   {front:[],energy:[],hand:[card('1-hand','SECRET')],outside:[],
    removed:[],resolvingEvents:[],lifeRevealed:[],deck:[card('1-deck','SECRET')]}
  ]
 };
}
const privateChoices={
 kind:'private-top-choice',player:0,options:[
  {action:{type:'chooseTopCard',mode:'top'},
   card:{cardId:'REZ-1-007',name:'牌庫頂卡'}},
  {action:{type:'chooseTopCard',mode:'outside'},
   card:{cardId:'REZ-1-007',name:'牌庫頂卡'}}
 ]
};
test('the acting owner sees Emilia as effect source and the authorized inspected top only',()=>{
 const shown=onlinePendingDisplay(packs,state(),0,privateChoices);
 assert.deepEqual(shown,{
  effectSource:{cardId:'REZ-1-106',name:'愛蜜莉雅'},
  lookedAt:{cardId:'REZ-1-007',name:'牌庫頂卡'}
 });
 const serialized=JSON.stringify(shown);
 assert.equal(serialized.includes('0-emilia'),false);
 assert.equal(serialized.includes('0-top'),false);
 assert.equal(serialized.includes('SECRET'),false);
});
test('non-controller, missing private grant or changed top reveals no hidden card',()=>{
 const s=state();
 assert.deepEqual(onlinePendingDisplay(packs,s,1,privateChoices),
  {effectSource:null,lookedAt:null});
 assert.equal(onlinePendingDisplay(packs,s,0,null).lookedAt,null);
 assert.equal(onlinePendingDisplay(packs,s,0,{...privateChoices,player:1}).lookedAt,null);
 assert.equal(onlinePendingDisplay(packs,s,0,{...privateChoices,kind:'private-top-place'}).lookedAt,null);
 s.players[0].deck[0]=card('0-changed','SECRET');
 assert.equal(onlinePendingDisplay(packs,s,0,privateChoices).lookedAt,null);
});
test('cannot infer source from the deck, life or opponent private zones',()=>{
 const s=state();
 s.pending.sourceUid='0-secret';
 assert.equal(onlinePendingDisplay(packs,s,0,privateChoices).effectSource,null);
 s.pending.sourceUid='1-hand';
 assert.equal(onlinePendingDisplay(packs,s,0,privateChoices).effectSource,null);
 s.pending.sourceUid='0-under';
 s.players[0].front[0].stack=[card('0-under','REZ-1-106')];
 assert.equal(onlinePendingDisplay(packs,s,0,privateChoices).effectSource?.cardId,'REZ-1-106');
 s.pending.player=1;
 assert.equal(onlinePendingDisplay(packs,s,0,privateChoices).effectSource,null);
});
test('online modal includes source and peeked card art, print and legal-choice actions',()=>{
 const read=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
 const ui=read('universal-v2/online-battle-ui.mjs');
 const css=read('online-battle.css');
 assert.match(ui,/room\.pendingDisplay/);
 assert.match(ui,/label:'發動效果的卡牌'/);
 assert.match(ui,/label:'目前查看的牌庫頂'/);
 assert.match(ui,/printed\.effect/);
 assert.match(ui,/effectSource,lookedAt,actions/);
 assert.match(ui,/class:'online-pending-card-effect'/);
 assert.match(ui,/text:'查看完整卡圖'/);
 assert.match(css,/\.online-pending-card-effect\{/);
 assert.match(css,/white-space:pre-wrap/);
 assert.match(css,/max-height:30dvh/);
 assert.match(read('online.mjs'),/20261114sourceeffect1/);
});
