import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch,legalActions,assertState} from '../dist/engine.mjs';

function fixture({energyBase=false,twoBases=false}={}){
 let s=newGame({seed:23});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const pl of s.players){pl.deck=[...pl.deck,...pl.hand,...pl.life];pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);pl.ap=3;pl.maxAp=3;pl.turnCount=3;}
 s.phase='main';s.turn=5;s.active=0;
 const take=id=>{const a=s.players[0].deck,i=a.findIndex(c=>c.cardId===id);assert.notEqual(i,-1);return a.splice(i,1)[0];};
 const put=(id,line,slot)=>{const c=take(id);c.ready=false;s.players[0][line][slot]=c;return c;};
 put('102','energy',0);
 const base=energyBase?put('103','energy',1):put('039','front',0);
 if(!energyBase)put('102','energy',1);
 if(twoBases)put('039','energy',2);
 const raid=take('104');s.players[0].hand.push(raid);assertState(s);return {s,base,raid};
}
async function harness(s,tag,run){
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const stored=new Map([['bleach-arena-game-v1',JSON.stringify(s)]]);
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:null,onkeydown:null};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.window={scrollTo(){}};
 const old=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 const current=()=>JSON.parse(stored.get('bleach-arena-game-v1'));
 const slot=(line,n)=>app.innerHTML.match(new RegExp('<button class="slot[^>]*data-slot="0\\|'+line+'\\|'+n+'"[^>]*>[\\s\\S]*?</button>'))?.[0]||'';
 try{await import('../dist/app.mjs?'+tag);click({view:'arena'});await run({app,click,current,slot});}finally{globalThis.setTimeout=old;}
}

test('rested Front Raid base is selected before position and confirmation; Raid readies and can attack',async()=>{
 const {s,base,raid}=fixture();
 await harness(s,'guided-front',({app,click,current,slot})=>{
  click({hand:raid.uid});
  assert.match(app.innerHTML,/1 \/ 3 選擇底板/);
  assert.ok(slot('front',0).includes('data-placement="底板"'));
  assert.equal(current().players[0].ap,3);
  click({slot:'0|front|0'});
  assert.match(app.innerHTML,/2 \/ 3 選擇位置/);
  assert.ok(slot('front',0).includes('data-placement="突襲"'));
  click({slot:'0|front|0'});
  assert.match(app.innerHTML,/3 \/ 3 確認突襲/);
  assert.equal(current().players[0].hand[0].uid,raid.uid);
  assert.equal(current().players[0].ap,3);
  click({action:'raidConfirm'});
  const g=current(),c=g.players[0].front[0];
  assert.equal(c.uid,raid.uid);assert.equal(c.ready,true);assert.equal(c.stack[0].uid,base.uid);
  assert.equal(g.players[0].ap,2);assertState(g);
  click({do:JSON.stringify({type:'next'})});
  const attack=legalActions(current()).find(a=>a.type==='attack'&&a.uid===raid.uid);
  assert.ok(attack);click({do:JSON.stringify(attack)});
  assert.equal(current().players[0].front[0].ready,false);
 });
});
test('Energy Raid base must be selected before a legal Front destination',async()=>{
 const {s,base,raid}=fixture({energyBase:true});
 await harness(s,'guided-energy',({app,click,current,slot})=>{
  click({hand:raid.uid});
  assert.ok(slot('energy',1).includes('data-placement="底板"'));
  assert.ok(!slot('front',0).includes('data-placement="突襲"'));
  click({slot:'0|front|0'});assert.match(app.innerHTML,/1 \/ 3 選擇底板/);
  click({slot:'0|energy|1'});assert.match(app.innerHTML,/2 \/ 3 選擇位置/);
  assert.ok(slot('front',0).includes('data-placement="突襲"'));
  click({slot:'0|front|0'});click({action:'raidConfirm'});
  const g=current();assert.equal(g.players[0].front[0].ready,true);
  assert.equal(g.players[0].front[0].stack[0].uid,base.uid);
  assert.equal(g.players[0].energy[1],null);assertState(g);
 });
});
test('two legal bases remain distinct and cannot be auto-selected',async()=>{
 const {s,base,raid}=fixture({energyBase:true,twoBases:true}),other=s.players[0].energy[2];
 await harness(s,'guided-choose',({app,click,current,slot})=>{
  click({hand:raid.uid});assert.ok(slot('energy',1).includes('data-placement="底板"'));assert.ok(slot('energy',2).includes('data-placement="底板"'));
  click({slot:'0|energy|2'});click({slot:'0|front|0'});assert.equal(current().players[0].ap,3);
  click({action:'raidConfirm'});
  const g=current();assert.equal(g.players[0].front[0].stack[0].uid,other.uid);
  assert.equal(g.players[0].energy[1].uid,base.uid);assertState(g);
 });
});
test('back, restart and cancel restore choices without mutating game',async()=>{
 const {s,base,raid}=fixture({energyBase:true});
 await harness(s,'guided-navigation',({app,click,current,slot})=>{
  click({hand:raid.uid});click({slot:'0|energy|1'});click({slot:'0|front|0'});
  click({action:'raidBack'});assert.match(app.innerHTML,/2 \/ 3 選擇位置/);
  click({action:'raidBack'});assert.match(app.innerHTML,/1 \/ 3 選擇底板/);
  click({slot:'0|energy|1'});click({action:'raidRestart'});assert.match(app.innerHTML,/1 \/ 3 選擇底板/);
  click({action:'cancelRaid'});assert.ok(!app.innerHTML.includes('raidFlowPanel'));
  assert.equal(current().players[0].hand[0].uid,raid.uid);
  assert.equal(current().players[0].energy[1].uid,base.uid);
  assert.equal(current().players[0].ap,3);assertState(current());
 });
});
test('eligible Raid offers normal deployment override: REST and original base preserved',async()=>{
 const {s,base,raid}=fixture({energyBase:true});
 await harness(s,'guided-normal',({app,click,current})=>{
  click({hand:raid.uid});assert.match(app.innerHTML,/1 \/ 3 選擇底板/);click({action:'normalDeployment'});click({slot:'0|front|0'});
  const g=current(),c=g.players[0].front[0];
  assert.equal(c.uid,raid.uid);assert.equal(c.ready,false);assert.equal(c.stack.length,0);
  assert.equal(g.players[0].energy[1].uid,base.uid);assertState(g);
 });
});
test('illegal placement and non-owner spaces do not commit a Raid',async()=>{
 const {s,raid}=fixture({energyBase:true});
 await harness(s,'guided-illegal',({app,click,current})=>{
  click({hand:raid.uid});click({slot:'1|front|0'});click({slot:'0|energy|1'});
  click({slot:'1|front|0'});assert.match(app.innerHTML,/2 \/ 3 選擇位置/);
  click({slot:'0|front|0'});assert.match(app.innerHTML,/3 \/ 3 確認突襲/);
  assert.equal(current().players[0].ap,3);
  assert.equal(current().players[0].hand.length,1);
 });
});


test('Raid-printed card without an eligible base shows why Raid is unavailable and can still play normally',async()=>{
 const {s,base,raid}=fixture({energyBase:true});
 const slot=s.players[0].energy.findIndex(c=>c?.uid===base.uid);
 assert.ok(slot>=0);
 s.players[0].energy[slot]=null;
 s.players[0].deck.push(base);
 // Ensure the card remains payable without the Ichigo base: this tests
 // Raid eligibility, not an unrelated energy shortfall.
 s.players[0].energy[0].energyBoostTurn=s.turn;
 s.players[0].energy[0].energyBoostAmount=10;
 assertState(s);
 await harness(s,'raid-no-eligible-base',({app,click,current})=>{
  click({hand:raid.uid});
  assert.doesNotMatch(app.innerHTML,/突襲流程 ·/);
  assert.match(app.innerHTML,/目前無法突襲：需要主要階段/);
  assert.match(app.innerHTML,/普通登場：請直接點選場上高亮/);
  click({slot:'0|front|0'});
  const g=current();
  assert.equal(g.players[0].front[0].uid,raid.uid);
  assert.equal(g.players[0].front[0].stack.length,0);
  assert.equal(g.players[0].front[0].ready,false);
  assertState(g);
 });
});
