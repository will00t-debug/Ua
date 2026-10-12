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
test('tapping a rested front Raid base performs Raid, readies it, and enables attack',async()=>{
 const {s,base,raid}=fixture();
 await harness(s,'raid-front',({app,click,current,slot})=>{
  assert.ok(slot('front',0).includes('rested'));assert.ok(slot('front',0).includes('slotFace'));assert.ok(!slot('front',0).includes('slotState'));
  click({hand:raid.uid});assert.ok(app.innerHTML.includes('data-placement="突襲"'));click({slot:'0|front|0'});
  const g=current(),c=g.players[0].front[0];assert.equal(c.uid,raid.uid);assert.equal(c.ready,true);assert.equal(c.stack[0].uid,base.uid);assert.equal(g.players[0].ap,2);assert.ok(!slot('front',0).includes('rested'));assertState(g);
  click({do:JSON.stringify({type:'next'})});const action=legalActions(current()).find(a=>a.type==='attack'&&a.uid===raid.uid);assert.ok(action);click({do:JSON.stringify(action)});assert.equal(current().players[0].front[0].ready,false);assert.ok(slot('front',0).includes('rested'));assert.ok(!slot('front',0).includes('slotState'));
 });
});
test('tapping a free front position Raids the only eligible energy base',async()=>{
 const {s,base,raid}=fixture({energyBase:true});
 await harness(s,'raid-energy',({click,current,slot})=>{click({hand:raid.uid});click({slot:'0|front|0'});const g=current();assert.equal(g.players[0].front[0].ready,true);assert.equal(g.players[0].front[0].stack[0].uid,base.uid);assert.equal(g.players[0].energy[1],null);assert.ok(!slot('front',0).includes('rested'));assertState(g);});
});
test('multiple eligible bases ask the user and preserve the unchosen base',async()=>{
 const {s,base,raid}=fixture({energyBase:true,twoBases:true}),second=s.players[0].energy[2];
 await harness(s,'raid-choose-base',({app,click,current})=>{click({hand:raid.uid});click({slot:'0|front|0'});assert.ok(app.innerHTML.includes('選擇 Raid 基底與位置'));assert.equal(current().players[0].hand[0].uid,raid.uid);click({raidAction:'1'});const g=current();assert.equal(g.players[0].front[0].ready,true);assert.equal(g.players[0].front[0].stack[0].uid,second.uid);assert.equal(g.players[0].energy[1].uid,base.uid);assertState(g);});
});
test('explicit normal deployment remains rested and does not consume a Raid base',async()=>{
 const {s,base,raid}=fixture({energyBase:true});
 await harness(s,'raid-normal',({click,current,slot})=>{click({hand:raid.uid});click({action:'normalDeployment'});click({slot:'0|front|0'});const g=current(),c=g.players[0].front[0];assert.equal(c.uid,raid.uid);assert.equal(c.ready,false);assert.equal(c.stack.length,0);assert.equal(g.players[0].energy[1].uid,base.uid);assert.ok(slot('front',0).includes('rested'));assert.ok(!slot('front',0).includes('slotState'));assertState(g);});
});
