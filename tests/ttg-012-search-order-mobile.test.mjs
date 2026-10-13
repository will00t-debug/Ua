import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_BETA_PRESET,ttg012SearchChoice,ttgCardByUid} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
const deck={...TTG_GREEN_BETA_PRESET,'TTG-1-015':0,'TTG-1-012':4,'TTG-1-016':3,'TTG-1-031':1};
function take(pl,id){
 for(const zone of ['hand','deck','life']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw Error('missing physical card '+id);
}
function fixture(){
 let s=newTtgCoreMatch({decks:[deck,deck],first:0,seed:612});
 s.phase='main';
 const pl=s.players[0],source=take(pl,'TTG-1-012'),eligible=take(pl,'TTG-1-031');
 source.ready=true;pl.front[0]=source;pl.deck.unshift(eligible);
 s.pending={kind:'green012Search',player:0,uid:source.uid};
 const legal=legalTtgCoreActions(s).find(a=>a.type==='green012Search');
 assert.ok(legal);
 assert.equal(legal.revealed.length,6);
 assert.ok(legal.candidates.includes(eligible.uid));
 assert.equal(ttgCardByUid(s,eligible.uid).cardId,'TTG-1-031');
 assert.ok(assertTtgCoreState(s));
 return {s,legal,eligible};
}
test('012 top-six: selectable printed cost >=8 and arbitrary physical bottom order',()=>{
 const {s,legal,eligible}=fixture();
 const rem=legal.revealed.filter(uid=>uid!==eligible.uid);
 const order=[...rem].reverse();
 const action=ttg012SearchChoice(s,{takeUid:eligible.uid,bottomOrderUids:order});
 assert.deepEqual(action.bottomOrderUids,order);
 const after=dispatchTtgCoreAction(s,action);
 assert.equal(after.pending?.kind,'green012Discard');
 assert.ok(after.players[0].hand.some(c=>c.uid===eligible.uid));
 assert.deepEqual(after.players[0].deck.slice(-order.length).map(c=>c.uid),order);
 assert.ok(assertTtgCoreState(after));
});
test('012 top-six: skip pickup, preserve 6 distinct cards, and reject illegal physical ordering',()=>{
 const {s,legal,eligible}=fixture();
 const order=[...legal.revealed];
 const skip=ttg012SearchChoice(s,{takeUid:null,bottomOrderUids:order});
 const after=dispatchTtgCoreAction(s,skip);
 assert.deepEqual(after.players[0].deck.slice(-6).map(c=>c.uid),order);
 assert.ok(!after.players[0].hand.some(c=>c.uid===eligible.uid));
 assert.ok(assertTtgCoreState(after));
 assert.throws(()=>ttg012SearchChoice(s,{takeUid:eligible.uid,bottomOrderUids:order}),/順序/);
 assert.throws(()=>ttg012SearchChoice(s,{takeUid:'fake-uid',bottomOrderUids:order}),/合法/);
 assert.throws(()=>ttg012SearchChoice(s,{takeUid:null,bottomOrderUids:[order[0],order[0],...order.slice(2)]}),/順序/);
});
test('012 mobile: tap eligible card, adjust two bottom cards and submit exact ordering',async()=>{
 const {s,legal,eligible}=fixture();
 const storage=new Map([['ua-ttg-beta-game-v1',JSON.stringify(s)]]);
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const document={querySelector(sel){return sel==='#app'?app:sel==='#toast'?toast:null;},onkeydown:null};
 const window={scrollTo(){},open(){throw Error('Unexpected external tab')}};
 globalThis.document=document;globalThis.window=window;
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const press=dataset=>{assert.equal(typeof app.onclick,'function');app.onclick({target:{closest:()=>({dataset,disabled:false})}});};
 try{
  await import('../dist/app.mjs?ttg012-search-order-ui');
  press({view:'ttgArena'});
  assert.match(app.innerHTML,/西蒙 012 · 查看牌庫頂與牌庫底排序/);
  press({ttg012Take:eligible.uid});
  const remaining=legal.revealed.filter(uid=>uid!==eligible.uid),order=[...remaining];
  press({ttg012Down:remaining[0]});
  [order[0],order[1]]=[order[1],order[0]];
  press({action:'ttg012SearchSubmit'});
  const after=JSON.parse(storage.get('ua-ttg-beta-game-v1'));
  assert.equal(after.pending?.kind,'green012Discard');
  assert.deepEqual(after.players[0].deck.slice(-5).map(c=>c.uid),order);
  assert.ok(after.players[0].hand.some(c=>c.uid===eligible.uid));
  assert.ok(assertTtgCoreState(after));
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;}
});
