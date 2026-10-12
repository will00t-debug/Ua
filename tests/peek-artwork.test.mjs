import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch} from '../dist/engine.mjs';
import {BY_ID} from '../dist/cards.mjs';

test('BLC-4-083 deck-top choice displays actual revealed card art and both destinations',async()=>{
 let s=newGame({seed:831});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 const top=s.players[0].deck[0],def=BY_ID[top.cardId];
 assert.ok(top&&def);
 s.pending={player:0,title:'查看 '+def.name+'，選擇去向',choices:[{id:'top',label:'放回牌堆頂'},{id:'outside',label:'送到場外'}],
  effect:{kind:'peekChoice',p:0,rule:{op:'peekTop',count:1,destinations:['top','outside']},cards:[top.uid]},min:1,max:1};
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const data=new Map([['bleach-arena-game-v1',JSON.stringify(s)]]);
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:null,onkeydown:null};
 globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 globalThis.window={scrollTo(){}};
 const timer=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 try{
  await import('../dist/app.mjs?peek-art-083');
  app.onclick({target:{closest:()=>({dataset:{view:'arena'},disabled:false})}});
  assert.match(app.innerHTML,/class="peekPreview"/);
  assert.ok(app.innerHTML.includes(def.image),'rendered card fallback art');
  assert.ok(app.innerHTML.includes(def.name),'rendered actual revealed card');
  assert.ok(app.innerHTML.includes('data-choice="top"'));
  assert.ok(app.innerHTML.includes('data-choice="outside"'));
 }finally{globalThis.setTimeout=timer;}
});
