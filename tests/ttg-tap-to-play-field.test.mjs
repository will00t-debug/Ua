import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_BETA_PRESET,ttgNormalPlacementAction} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';

const deck={...TTG_GREEN_BETA_PRESET,'TTG-1-003':3,'TTG-1-001':1};
function readyState(){
 const s=newTtgCoreMatch({decks:[deck,deck],first:0,seed:20261014});
 s.phase='main';
 const p=s.players[0];
 for(const zone of ['hand','deck','life']){
  const i=p[zone].findIndex(c=>c.cardId==='TTG-1-001');
  if(i>=0){
   const card=p[zone].splice(i,1)[0];
   p.hand.push(card);
   assert.ok(assertTtgCoreState(s));
   return {s,card};
  }
 }
 throw Error('001 physical card missing from green deck');
}
test('TTG tap-to-play returns exactly legal ordinary deployment and preserves physical cards',()=>{
 const {s,card}=readyState();
 const apBefore=s.players[0].apCards.filter(x=>x.ready).length;
 const action=ttgNormalPlacementAction(s,card.uid,'energy',0);
 assert.ok(action,'0-energy 001 should have an energy-line slot');
 assert.equal(action.type,'play');assert.equal(action.handUid,card.uid);
 assert.equal(action.line,'energy');assert.equal(action.slot,0);
 const played=dispatchTtgCoreAction(s,action);
 assert.equal(played.players[0].energy[0].uid,card.uid);
 assert.ok(!played.players[0].hand.some(x=>x.uid===card.uid));
 assert.equal(played.players[0].apCards.filter(x=>x.ready).length,apBefore-1);
 assert.ok(assertTtgCoreState(played));
 assert.equal(ttgNormalPlacementAction(played,card.uid,'energy',0),null,'occupied slot and no hand copy must not be offered');
});
test('TTG tap-to-play rejects invalid ownership, location, phase and pending effect',()=>{
 const {s,card}=readyState();
 assert.equal(ttgNormalPlacementAction(s,card.uid,'front',-1),null);
 assert.equal(ttgNormalPlacementAction(s,card.uid,'front',4),null);
 assert.equal(ttgNormalPlacementAction(s,card.uid,'unknown',0),null);
 assert.equal(ttgNormalPlacementAction(s,'other-player-private-uid','energy',0),null);
 const pause=structuredClone(s);pause.phase='attack';
 assert.equal(ttgNormalPlacementAction(pause,card.uid,'energy',0),null);
 const pending=structuredClone(s);pending.pending={kind:'block',attackerUid:'test'};
 assert.equal(ttgNormalPlacementAction(pending,card.uid,'energy',0),null);
 const occupied=structuredClone(s);occupied.energy??=[];occupied.players[0].energy[0]=occupied.players[0].hand.find(x=>x.uid===card.uid);
 assert.equal(ttgNormalPlacementAction(occupied,card.uid,'energy',0),null);
 assert.ok(assertTtgCoreState(s),'source state must be untouched');
});
test('Phone UI: choose physical TTG hand card, then tap highlighted own empty energy slot',async()=>{
 const {s,card}=readyState(),storage=new Map([['ua-ttg-beta-game-v1',JSON.stringify(s)]]);
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 globalThis.document={querySelector:sel=>sel==='#app'?app:sel==='#toast'?toast:null,onkeydown:null};
 globalThis.window={scrollTo(){},open(){throw Error('No external links expected')}};
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const tap=dataset=>{assert.equal(typeof app.onclick,'function');app.onclick({target:{closest:()=>({dataset,disabled:false})}});};
 try{
  await import('../dist/app.mjs?ttg-tap-field-20261014');
  tap({view:'ttgArena'});
  assert.match(app.innerHTML,/你的手牌/);
  tap({ttgSelect:card.uid});
  assert.match(app.innerHTML,/data-ttg-place='energy:0'/);
  assert.match(app.innerHTML,/放到這格/);
  assert.doesNotMatch(app.innerHTML,/data-ttg-place='front:4'/);
  tap({ttgPlace:'energy:0'});
  const saved=JSON.parse(storage.get('ua-ttg-beta-game-v1'));
  assert.equal(saved.players[0].energy[0].uid,card.uid);
  assert.ok(!saved.players[0].hand.some(c=>c.uid===card.uid));
  assert.ok(assertTtgCoreState(saved));
  assert.doesNotMatch(app.innerHTML,/data-ttg-place='energy:0'/,'selection must clear after real deployment');
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;}
});
