import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,assertState} from '../dist/engine.mjs';

function seeded(){
 let s=newGame({seed:154,first:0,mode:'solo'});
 s=dispatch(s,{type:'keep'});
 s=dispatch(s,{type:'keep'});
 s.active=0;s.turn=4;s.phase='attack';s.players[0].turnCount=2;
 const attacker=s.players[0].hand.pop();
 attacker.cardId='103';attacker.ready=true;s.players[0].front[0]=attacker;
 return s;
}

test('hand card can play by directly clicking any legal board slot and Raid is not auto-started',async()=>{
 const s=seeded();s.phase='main';s.players[0].deck.push(s.players[0].front[0]);s.players[0].front[0]=null;s.players[0].ap=3;s.players[0].maxAp=3;
 const normalA=s.players[0].hand[0],normalB=s.players[0].hand[1],raidCard=s.players[0].hand[2];
 normalA.cardId='039';normalB.cardId='039';raidCard.cardId='104';
 const supply=s.players[0].deck.shift();supply.cardId='102';supply.ready=true;
 supply.energyBoostTurn=s.turn;supply.energyBoostAmount=12;
 s.players[0].energy[3]=supply;
 // A previous publicly revealed opponent life card stays reviewable even
 // after it has entered the public outside zone.
 const flipped=s.players[1].deck.shift();
 flipped.cardId='034';s.players[1].outside.push(flipped);
 s.triggerHistory=[{uid:flipped.uid,player:1,turn:3,cardId:'034',trigger:'draw',outcome:'activated'}];
 const nodes={app:{innerHTML:'',onclick:null},toast:{textContent:'',classList:{add(){},remove(){}}}};
 const stored=new Map([['bleach-arena-game-v1',JSON.stringify(s)]]);
 globalThis.document={querySelector:q=>q==='#app'?nodes.app:q==='#toast'?nodes.toast:null,onkeydown:null};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.window={scrollTo(){}};
 const oldSet=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 try{
  await import('../dist/app.mjs?direct-place-life-trigger-test');
  const click=dataset=>nodes.app.onclick({target:{closest(){return {dataset,disabled:false};}}});
  click({view:'arena'});
  assert.doesNotMatch(nodes.app.innerHTML,/class="slot[^\"]*raid-base-selected/,'empty slots must not look like selected Raid bases');
  assert.match(nodes.app.innerHTML,/生命區翻牌 · 公開資訊/);
  assert.match(nodes.app.innerHTML,/石田雨龍/);
  assert.match(nodes.app.innerHTML,/DRAW Trigger/);
  assert.match(nodes.app.innerHTML,/已發動/);
  click({action:'triggerHistory'});
  assert.match(nodes.app.innerHTML,/公開生命翻牌紀錄（最近 60 次）/);
  assert.match(nodes.app.innerHTML,/石田雨龍/);
  click({action:'closeModal'});
  click({hand:normalA.uid});
  assert.match(nodes.app.innerHTML,/普通登場：請直接點選場上高亮的前線或能源線位置/);
  assert.doesNotMatch(nodes.app.innerHTML,/data-line="front"/);
  assert.doesNotMatch(nodes.app.innerHTML,/data-line="energy"/);
  assert.match(nodes.app.innerHTML,/data-slot="0\\|front\\|0"[^>]*data-placement="放置"/);
  assert.match(nodes.app.innerHTML,/data-slot="0\\|energy\\|0"[^>]*data-placement="放置"/);
  click({slot:'0|front|0'});
  let state=JSON.parse(stored.get('bleach-arena-game-v1'));
  assert.equal(state.players[0].front[0].uid,normalA.uid);
  click({hand:normalB.uid});click({slot:'0|energy|0'});
  state=JSON.parse(stored.get('bleach-arena-game-v1'));
  assert.equal(state.players[0].energy[0].uid,normalB.uid);
  click({hand:raidCard.uid});
  assert.match(nodes.app.innerHTML,/data-action="normalDeployment"/);
  assert.match(nodes.app.innerHTML,/1 \/ 3 選擇底板/);
  assertState(state);
  click({action:'normalDeployment'});
  assert.doesNotMatch(nodes.app.innerHTML,/突襲流程 ·/);
  assert.match(nodes.app.innerHTML,/data-action="raid"/);
  click({action:'raid'});
  assert.match(nodes.app.innerHTML,/1 \/ 3 選擇底板/);
  assert.equal(JSON.parse(stored.get('bleach-arena-game-v1')).players[0].ap,state.players[0].ap);
 }finally{globalThis.setTimeout=oldSet;}
});
