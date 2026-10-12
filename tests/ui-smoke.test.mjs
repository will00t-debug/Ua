import test from 'node:test';
import assert from 'node:assert/strict';

test('application renders and handles navigation, catalog, match phases, and private hotseat handoff',async()=>{
 const nodes={app:{innerHTML:'',onclick:null},toast:{textContent:'',classList:{add(){},remove(){}}}};
 const stored=new Map();
 globalThis.document={querySelector(s){return s==='#app'?nodes.app:s==='#toast'?nodes.toast:null;},onkeydown:null};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.window={scrollTo(){}};
 const oldSet=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 try{
  await import('../dist/app.mjs');
  const click=dataset=>nodes.app.onclick({target:{closest(){return {dataset,disabled:false};}}});
  assert.ok(nodes.app.innerHTML.includes('構築牌組，開始你的 UNION ARENA 對局'));
  click({view:'builder'});assert.ok(nodes.app.innerHTML.includes('牌組概覽'));
  click({inspect:'104'});assert.ok(nodes.app.innerHTML.includes('aria-modal="true"'));
  click({action:'closeModal'});click({view:'library'});click({filter:'event'});assert.ok(nodes.app.innerHTML.includes('月牙天衝'));
  click({view:'rules'});assert.ok(nodes.app.innerHTML.includes('回合流程'));
  click({view:'lobby'});click({action:'start'});assert.ok(nodes.app.innerHTML.includes('確認你的起手'));
  click({do:JSON.stringify({type:'keep'})});click({view:'lobby'});click({mode:'hotseat'});click({action:'start'});
  assert.ok(nodes.app.innerHTML.includes('handoffInner'));
  assert.ok(!/class="mulliganHand"[^>]*><button/.test(nodes.app.innerHTML));
  click({action:'handoff'});assert.ok(/class="mulliganHand"[^>]*><button/.test(nodes.app.innerHTML));
  click({do:JSON.stringify({type:'keep'})});assert.ok(nodes.app.innerHTML.includes('handoffInner'));
  click({action:'handoff'});click({do:JSON.stringify({type:'keep'})});click({action:'handoff'});
  assert.ok(nodes.app.innerHTML.includes('phaseBar'));
  click({do:JSON.stringify({type:'next'})});click({do:JSON.stringify({type:'next'})});
  const game=JSON.parse(stored.get('bleach-arena-game-v1'));
  click({hand:game.players[0].hand[0].uid});assert.ok(nodes.app.innerHTML.includes('selectionBar'));
  click({action:'newMatch'});assert.ok(nodes.app.innerHTML.includes('開始新的對局'));
  click({action:'closeModal'});click({view:'builder'});const d=JSON.parse(stored.get('bleach-arena-deck-v1')||'null');
  click({count:'034',delta:'-1'});assert.equal(JSON.parse(stored.get('bleach-arena-deck-v1'))['034'],(d?.['034']??4)-1);
  click({action:'useDeck'});assert.ok(nodes.toast.textContent.includes('50 張'));
 }finally{globalThis.setTimeout=oldSet;}
});
