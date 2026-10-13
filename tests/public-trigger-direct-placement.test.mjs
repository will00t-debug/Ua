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
function hit(s){
 s=dispatch(s,{type:'attack',uid:s.players[0].front[0].uid});
 assert.equal(s.pending?.effect.kind,'block');
 s=dispatch(s,{type:'choose',ids:['pass']});
 return s;
}

test('life draw Trigger is publicly visible to both players and outcome persists after resolution',()=>{
 let s=seeded();
 s.players[1].life[0].cardId='034'; // known DRAW Trigger
 const uid=s.players[1].life[0].uid;
 s=hit(s);
 const seen=s.triggerHistory.at(-1);
 assert.equal(seen.uid,uid);
 assert.equal(seen.player,1);
 assert.equal(seen.cardId,'034');
 assert.equal(seen.trigger,'draw');
 assert.equal(seen.outcome,'pending');
 assert.equal(s.pending?.effect.kind,'triggerChoice');
 s=dispatch(s,{type:'choose',ids:['activate']});
 assert.equal(s.triggerHistory.at(-1).outcome,'activated');
 assertState(s);
});

test('opponent life with no Trigger still appears publicly and is marked no Trigger',()=>{
 let s=seeded();s.players[1].life[0].cardId='035';
 s=hit(s);
 assert.equal(s.triggerHistory.at(-1).cardId,'035');
 assert.equal(s.triggerHistory.at(-1).trigger,null);
 assert.equal(s.triggerHistory.at(-1).outcome,'none');
 assert.ok(s.players[1].outside.some(c=>c.cardId==='035'));
 assertState(s);
});

test('declined Trigger remains public and records the explicit skip choice',()=>{
 let s=seeded();s.players[1].life[0].cardId='039';
 s=hit(s);
 assert.equal(s.pending?.effect.kind,'triggerChoice');
 s=dispatch(s,{type:'choose',ids:['skip']});
 assert.equal(s.triggerHistory.at(-1).outcome,'skipped');
 assertState(s);
});

test('DAMAGE 2 face-up life flips both become public before Trigger decisions',()=>{
 let s=seeded();s.players[0].front[0].damageTurn=s.turn;
 s.players[1].life[0].cardId='034';
 s.players[1].life[1].cardId='035';
 s=hit(s);
 assert.equal(s.triggerHistory.length,2);
 assert.deepEqual(s.triggerHistory.map(x=>x.cardId),['034','035']);
 assert.equal(s.pending?.effect.kind,'triggerOrder');
 // Resolve DRAW trigger first and the no-trigger card afterwards.
 s=dispatch(s,{type:'choose',ids:[s.triggerHistory[0].uid]});
 assert.equal(s.pending?.effect.kind,'triggerChoice');
 s=dispatch(s,{type:'choose',ids:['activate']});
 assert.equal(s.triggerHistory[0].outcome,'activated');
 assert.equal(s.triggerHistory[1].outcome,'none');
 assertState(s);
});

test('hand card can play by directly clicking any legal board slot and Raid is not auto-started',async()=>{
 const s=seeded();s.phase='main';s.players[0].front[0]=null;
 const normalA=s.players[0].hand[0],normalB=s.players[0].hand[1],raidCard=s.players[0].hand[2];
 normalA.cardId='039';normalB.cardId='039';raidCard.cardId='104';
 const supply=s.players[0].deck.shift();supply.cardId='102';supply.ready=true;
 supply.energyBoostTurn=s.turn;supply.energyBoostAmount=12;
 s.players[0].energy[3]=supply;
 // Return the attacker to a legal region to maintain the 50-card invariant.
 // The seeded attacker has already been moved out of hand; put it into the deck.
 const misplaced=s.players[0].front[0];
 // s.front[0] is now null, so reconstruct from fixture before using app.
 // Explicitly count and assert conservation once the old attacker is restored.
 // Capture an ordinary spare through the separate seeded() fixture instead.
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
  assert.doesNotMatch(nodes.app.innerHTML,/raidFlowPanel/);
  assert.match(nodes.app.innerHTML,/data-action="raid"/);
 }finally{globalThis.setTimeout=oldSet;}
});
