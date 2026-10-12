import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS} from '../dist/cards.mjs';
import {formatDeck,sameCounts} from '../dist/decks.mjs';
import {assertState} from '../dist/engine.mjs';

test('named decks remain independent, reload, validate imports and are used by both players',async()=>{
 const app={innerHTML:'',onclick:null},toast={textContent:'',classList:{add(){},remove(){}}};
 const inputs={deckName:{value:''},deckSourceSelect:{value:''},playerDeckSelect:{value:''},opponentDeckSelect:{value:''},deckCode:{value:''}};
 const status={textContent:''},stored=new Map();
 globalThis.document={querySelector(sel){
  if(sel==='#app')return app;if(sel==='#toast')return toast;
  if(sel==='.deckSaveStatus')return app.innerHTML.includes('deckSaveStatus')?status:null;
  if(sel.startsWith('#')&&inputs[sel.slice(1)]&&app.innerHTML.includes(`id="${sel.slice(1)}"`))return inputs[sel.slice(1)];
  return null;
 },onkeydown:null};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.window={scrollTo(){}};
 const oldSet=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 const name=value=>{inputs.deckName.value=value;inputs.deckName.oninput();};
 const readSaved=()=>JSON.parse(stored.get('bleach-arena-saved-decks-v1')||'[]');
 try{
  await import('../dist/app.mjs?deck-editor-test');click({view:'builder'});
  name('一護 A');click({action:'saveDeck'});let records=readSaved();assert.equal(records.length,1);const a=records[0].id;
  click({count:'034',delta:'-1'});click({count:'105',delta:'1'});name('一護 B');click({action:'copySavedDeck'});records=readSaved();assert.equal(records.length,2);const b=records[1].id;
  assert.equal(records[0].counts['034'],4);assert.equal(records[1].counts['034'],3);
  click({count:'034',delta:'-1'});click({action:'saveDeck'});assert.ok(toast.textContent.includes('50 張'));assert.equal(readSaved()[1].counts['034'],3);
  click({action:'newDeck'});assert.equal(Object.values(JSON.parse(stored.get('bleach-arena-deck-v1'))).reduce((x,n)=>x+n,0),0);assert.equal(readSaved().length,2);
  inputs.deckSourceSelect.value='saved:'+a;inputs.deckSourceSelect.onchange();assert.ok(sameCounts(JSON.parse(stored.get('bleach-arena-deck-v1')),PRESETS[0].counts));
  name('一護 A 改');assert.ok(status.textContent.includes('草稿'));click({action:'saveDeck'});assert.equal(readSaved().length,2);assert.equal(readSaved()[0].name,'一護 A 改');
  click({view:'lobby'});inputs.opponentDeckSelect.value='saved:'+b;inputs.opponentDeckSelect.onchange();click({action:'start'});
  const g=JSON.parse(stored.get('bleach-arena-game-v1'));assertState(g);assert.deepEqual(g.deckNames,['一護 A 改','一護 B']);
  const cardCount=p=>[...g.players[p].deck,...g.players[p].hand,...g.players[p].life].filter(c=>c.cardId==='034').length;
  assert.equal(cardCount(0),4);assert.equal(cardCount(1),3);
  click({view:'builder'});click({action:'deckCode'});const before=stored.get('bleach-arena-deck-v1');inputs.deckCode.value='4 UA08BT/BLC-1-104';click({action:'importDeck'});assert.equal(stored.get('bleach-arena-deck-v1'),before);
  inputs.deckCode.value=formatDeck(PRESETS[1].counts,'匯入牌組');click({action:'importDeck'});assert.ok(sameCounts(JSON.parse(stored.get('bleach-arena-deck-v1')),PRESETS[1].counts));click({action:'saveDeck'});assert.equal(readSaved().length,3);
  await import('../dist/app.mjs?deck-editor-reloaded');click({view:'builder'});assert.ok(app.innerHTML.includes('匯入牌組'));assert.ok(app.innerHTML.includes('已儲存 3 副'));assert.ok(sameCounts(JSON.parse(stored.get('bleach-arena-deck-v1')),PRESETS[1].counts));
 }finally{globalThis.setTimeout=oldSet;}
});
