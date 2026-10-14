import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,assertState} from '../dist/engine.mjs';
import {BY_ID} from '../dist/cards.mjs';

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

test('GET Trigger records hand pickup, and only the newest repeat reveal changes outcome',()=>{
 let s=seeded();s.players[1].life[0].cardId='039';const uid=s.players[1].life[0].uid;
 s=hit(s);s.triggerHistory.unshift({...s.triggerHistory[0],turn:1,outcome:'skipped'});
 s=dispatch(s,{type:'choose',ids:['activate']});
 assert.equal(s.triggerHistory[0].outcome,'skipped');assert.equal(s.triggerHistory[1].outcome,'get');
 assert.ok(s.players[1].hand.some(c=>c.uid===uid));assertState(s);
});

let uiCase=0;
async function withApp(s,check){
 const savedGlobals={document:globalThis.document,localStorage:globalThis.localStorage,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const nodes={app:{innerHTML:'',onclick:null},toast:{textContent:'',classList:{add(){},remove(){}}}};
 const stored=new Map([['bleach-arena-game-v1',JSON.stringify(s)]]),timers=new Map();let seq=0;
 globalThis.document={querySelector:q=>q==='#app'?nodes.app:q==='#toast'?nodes.toast:null,onkeydown:null};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.window={scrollTo(){}};globalThis.setTimeout=(fn)=>{timers.set(++seq,fn);return seq;};globalThis.clearTimeout=id=>timers.delete(id);
 try{
  await import('../dist/app.mjs?public-trigger-display-'+(++uiCase));
  const click=dataset=>nodes.app.onclick({target:{closest(){return {dataset,disabled:false};}}});
  click({view:'arena'});await check({nodes,stored,click,timers});
 }finally{Object.assign(globalThis,savedGlobals);}
}
test('AI Trigger is visible with card art before AND after actual scheduled AI choice',async()=>{
 let s=seeded();s.players[1].life[0].cardId='034';s=hit(s);
 await withApp(s,({nodes,click,timers,stored})=>{
  assert.match(nodes.app.innerHTML,/生命區翻牌 · 公開資訊/);
  assert.ok(nodes.app.innerHTML.includes(BY_ID['034'].image));
  assert.match(nodes.app.innerHTML,/石田雨龍/);assert.match(nodes.app.innerHTML,/DRAW Trigger/);
  assert.match(nodes.app.innerHTML,/等待結算/);
  assert.doesNotMatch(nodes.app.innerHTML,/data-choice=/,'AI private decision controls stay hidden');
  const tick=[...timers.values()].at(-1);assert.ok(tick);tick();
  assert.match(nodes.app.innerHTML,/已發動/);
  const after=JSON.parse(stored.get('bleach-arena-game-v1'));assert.equal(after.triggerHistory.at(-1).outcome,'activated');assertState(after);
  click({action:'triggerHistory'});assert.match(nodes.app.innerHTML,/公開生命翻牌紀錄（最近 60 次）/);
  assert.match(nodes.app.innerHTML,/石田雨龍/);assert.match(nodes.app.innerHTML,/已發動/);
 });
});
test('public life card remains visible while AI privately examines its deck',async()=>{
 let s=seeded();s.players[1].life[0].cardId='034';s=hit(s);s=dispatch(s,{type:'choose',ids:['skip']});
 s.pending={player:1,title:'SECRET_DECK_TITLE',min:0,max:1,effect:{kind:'peekNoMill',p:1,cards:[s.players[1].deck[0].uid]},choices:[{id:'top',label:'SECRET_PRIVATE_CHOICE',cardId:s.players[1].deck[0].cardId}]};
 await withApp(s,({nodes})=>{
  assert.match(nodes.app.innerHTML,/data-trigger-card="034"/);assert.match(nodes.app.innerHTML,/選擇不發動/);
  assert.doesNotMatch(nodes.app.innerHTML,/SECRET_DECK_TITLE|SECRET_PRIVATE_CHOICE|操作者私下查看/);
 });
});
test('old saved game pending life reveal gets a public preview without history migration',async()=>{
 let s=seeded();s.players[1].life[0].cardId='034';s=hit(s);delete s.triggerHistory;
 s.mode='hotseat';
 await withApp(s,({nodes,click,stored})=>{
  assert.match(nodes.app.innerHTML,/data-trigger-card="034"/);
  click({action:'handoff'});
  assert.match(nodes.app.innerHTML,/目前翻開的公開生命卡/);assert.match(nodes.app.innerHTML,/DRAW Trigger/);
  click({choice:'activate'});click({action:'confirmChoice'});
  const after=JSON.parse(stored.get('bleach-arena-game-v1'));
  assert.equal(after.triggerHistory.at(-1).outcome,'activated');assertState(after);
 });
});

