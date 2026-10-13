import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_BETA_PRESET,ttg012ManualChoice,ttgExecutableActions} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
const deck={...TTG_GREEN_BETA_PRESET,'TTG-1-015':0,'TTG-1-012':4};
function take(p,id){
 for(const area of ['hand','life','deck']){
  const i=p[area].findIndex(x=>x.cardId===id);
  if(i>=0)return p[area].splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function fixture(){
 const s=newTtgCoreMatch({decks:[deck,deck],seed:12012,first:0});
 s.phase='main';
 const p=s.players[0],o=s.players[1],source=take(p,'TTG-1-012');
 source.ready=true;p.front[0]=source;
 const three=Array.from({length:3},()=>take(p,'TTG-1-012'));
 const discard=three.map(c=>c.uid);assert.equal(new Set(discard).size,3,'three DISTINCT 012 physical cards');p.hand.push(...three);
 const foe=take(o,'TTG-1-003');foe.ready=true;o.front[0]=foe;
 s.pending={kind:'green012Discard',player:0,uid:source.uid};
 assert.ok(assertTtgCoreState(s));return {s,discard,foe};
}
test('Simon 012 Q2266: any 3 selected hand cards (not only first) can total >=15 to retire target',()=>{
 const {s,discard,foe}=fixture();
 const a=ttg012ManualChoice(s,{discardUids:discard,mode:'retire',targetUid:foe.uid});
 assert.equal(a.type,'green012Discard');assert.deepEqual(a.discardUids,discard);
 const after=dispatchTtgCoreAction(s,a);
 assert.equal(after.players[1].front[0],null);
 assert.ok(after.players[1].outside.some(c=>c.uid===foe.uid));
 assert.ok(discard.every(uid=>after.players[0].outside.some(c=>c.uid===uid)));
 assert.equal(after.pending,null);
 assert.ok(assertTtgCoreState(after));
});
test('Simon 012 Q2266: ready AP alternative and illegal/empty hand choices',()=>{
 const {s,discard,foe}=fixture(),p=s.players[0];
 p.apCards[0].ready=false;
 const chosen=discard.at(-1),ap=p.apCards[0].uid;
 const a=ttg012ManualChoice(s,{discardUids:[chosen],mode:'readyAP',apUid:ap});
 const after=dispatchTtgCoreAction(s,a);
 assert.equal(after.players[0].apCards[0].ready,true);
 assert.ok(after.players[0].outside.some(c=>c.uid===chosen));
 assert.ok(assertTtgCoreState(after));
 assert.throws(()=>ttg012ManualChoice(s,{discardUids:[],mode:'readyAP',apUid:ap}),/至少棄一張/);
 assert.throws(()=>ttg012ManualChoice(s,{discardUids:[chosen,chosen],mode:'readyAP',apUid:ap}),/重複/);
 assert.throws(()=>ttg012ManualChoice(s,{discardUids:[chosen],mode:'retire',targetUid:foe.uid}),/至少 15/);
 assert.throws(()=>ttg012ManualChoice(s,{discardUids:discard,mode:'retire',targetUid:'enemy-fake'}),/敵方|對手|前線/);
 assert.ok(ttgExecutableActions(s).some(x=>x.type==='green012Discard'));
});
test('TTG 012 actual mobile buttons show hand multi-select and both AP/retire modes',async()=>{
 const {s,discard,foe}=fixture();
 const storage=new Map([['ua-ttg-beta-game-v1',JSON.stringify(s)]]);
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const document={querySelector(sel){return sel==='#app'?app:sel==='#toast'?toast:null;},onkeydown:null};
 const window={scrollTo(){},open(){throw Error('Unexpected new tab')}};
 globalThis.document=document;globalThis.window=window;
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const press=dataset=>{assert.equal(typeof app.onclick,'function');app.onclick({target:{closest:()=>({dataset,disabled:false})}});};
 try{
  await import('../dist/app.mjs?ttg-012-human-buttons');
  press({view:'ttgArena'});
  assert.match(app.innerHTML,/西蒙 012 · 手動選擇棄牌/);
  assert.match(app.innerHTML,/data-ttg-012-discard/);
  for(const uid of discard)press({ttg012Discard:uid});
  assert.match(app.innerHTML,/合計需求能源 18/);
  press({ttg012Mode:'retire'});
  press({ttg012Target:foe.uid});
  press({action:'ttg012Submit'});
  const next=JSON.parse(storage.get('ua-ttg-beta-game-v1'));
  assert.equal(next.pending,null);
  assert.equal(next.players[1].front[0],null);
  assert.ok(assertTtgCoreState(next));
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.localStorage;}
});

test('TTG 012 Q2266 empty hand can legally pay zero discard and ready one AP without stalling UI',async()=>{
 const {s}=fixture(),p=s.players[0],ap=p.apCards[0].uid;
 p.deck.push(...p.hand.splice(0));p.apCards[0].ready=false;
 assert.ok(assertTtgCoreState(s));
 const action=ttg012ManualChoice(s,{discardUids:[],mode:'readyAP',apUid:ap});
 const next=dispatchTtgCoreAction(s,action);
 assert.equal(next.pending,null);assert.equal(next.players[0].apCards[0].ready,true);
 assert.ok(assertTtgCoreState(next));
 const file=await import('node:fs');
 const src=file.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.ok(src.includes("!chosen.length&&s.players[0].hand.length"),'0 cards to discard must not disable confirmation');
});
