import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS} from '../dist/cards.mjs';
import {newGame, dispatch, assertState} from '../dist/engine.mjs';

function fixture(){
 const deck={...PRESETS[0].counts};deck['034']-=1;deck['BLC-4-034']=1;
 let s=newGame({decks:[deck,deck],mode:'hotseat',seed:2316});
 s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 function extract(p,id){
  const pl=s.players[p];
  for(const zone of ['deck','hand','life']){const i=pl[zone].findIndex(c=>c.cardId===id);if(i>=0)return pl[zone].splice(i,1)[0];}
  assert.fail(`Could not find ${id}`);
 }
 for(let p=0;p<2;p++){
  const liluka=extract(p,'BLC-4-034');liluka.under=[extract(p,'064')];liluka.ready=true;
  s.players[p].energy[0]=liluka;
 }
 s.phase='main';s.active=0;s.turn=4;s.players[0].turnCount=3;s.players[1].turnCount=3;s.status='playing';
 assertState(s);return s;
}

test('FAQ Q2316: inspect owner facedown card only, never the opposing facedown card',async()=>{
 const nodes={app:{innerHTML:'',onclick:null},toast:{textContent:'',classList:{add(){},remove(){}}}};
 const stored=new Map([['bleach-arena-game-v1',JSON.stringify(fixture())]]);
 globalThis.document={querySelector(s){return s==='#app'?nodes.app:s==='#toast'?nodes.toast:null;},onkeydown:null};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.window={scrollTo(){}};
 const oldSet=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 try {
  await import('../dist/app.mjs');
  const click=dataset=>nodes.app.onclick({target:{closest(){return {dataset,disabled:false};}}});
  click({view:'arena'});click({action:'handoff'});
  click({slot:'1|energy|0'});
  assert.ok(!nodes.app.innerHTML.includes('data-action="showUnder"'),'enemy facedown has no reveal action');
  click({slot:'0|energy|0'});
  assert.ok(nodes.app.innerHTML.includes('data-action="showUnder"'));
  click({action:'showUnder'});
  const modal=nodes.app.innerHTML.split('class="modalBackdrop"')[1];
  assert.ok(modal.includes('月牙天衝'),'own underneath card is revealed');
  // Hotseat opponent cannot inspect once handed off.
  click({view:'lobby'});click({view:'arena'});
  assert.ok(!nodes.app.innerHTML.includes('class="modalBackdrop"'));
  assert.ok(!nodes.app.innerHTML.includes('data-action="showUnder"'));
 }finally{globalThis.setTimeout=oldSet;}
});
