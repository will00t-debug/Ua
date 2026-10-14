import test from 'node:test';
import assert from 'node:assert/strict';

test('title selector opens SLG isolated match; UI actions route to the SOLO engine and do not touch BLEACH save slot',async()=>{
 const old={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}},data=new Map();
 globalThis.document={querySelector(sel){if(sel==='#app')return app;if(sel==='#toast')return toast;return null;},onkeydown:null};
 globalThis.window={scrollTo(){}};
 globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};
 const click=(dataset)=>app.onclick({target:{closest(){return {dataset,disabled:false};}}});
 try{
  await import('../dist/app.mjs?solo-ui-'+Date.now());
  click({view:'builder'});
  click({title:'solo-leveling'});
  assert.match(app.innerHTML,/我獨自升級 · 牌組構築/);
  assert.match(app.innerHTML,/SLG-1-080/);
  click({action:'soloTrainingStartShadow'});
  assert.match(app.innerHTML,/我獨自升級 · Beta 自動對戰/);
  const saved=JSON.parse(data.get('ua-slg-training-v1'));
  assert.equal(saved.title,'solo-leveling');
  assert.equal(saved.players[0].hand.length,7);
  assert.equal(data.has('bleach-arena-game-v1'),false);
  const m=app.innerHTML.match(/data-solo-act="([^"]+)"/);
  assert.ok(m,'at least one real action should be shown');
  click({soloAct:m[1]});
  assert.notEqual(JSON.stringify(JSON.parse(data.get('ua-slg-training-v1'))),JSON.stringify(saved));
  click({view:'builder'});
  assert.match(app.innerHTML,/我獨自升級 · 牌組構築/);
 }finally{Object.assign(globalThis,old);}
});
