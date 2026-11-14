// Opening MHA for legal 50-card AI and online matches.
// This does not assign an official starter ratio.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getTitle} from '../dist/title-registry.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {practiceDeck,imcPracticeDeck,v2DeckReport,officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {prepareSoloBattle,saveSoloBattle,loadSoloBattle} from '../dist/universal-v2/solo-battle-session.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {UA10ST_PRODUCT} from '../dist/mha/ua10st-cards.mjs';
import {newUniversalMatch,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {createService} from '../server/domain.mjs';
import {openDatabase} from '../server/sqlite.mjs';

const pack=officialV2Pack('mha');
const counts=practiceDeck(pack);

test('a legal MHA deck can enter AI and online matches',async()=>{
 assert.equal(getTitle('mha').playable,true);
 assert.equal(getTitle('mha').cards.length,109);
 assert.equal(getTitle('mha').cards.every(card=>card.playable===false&&card.battleReady===false),true);
 assert.equal(Object.keys(pack.cards).length,109);
 assert.equal(pack.version,'mha-ua10-ready-109');
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(v2DeckReport('mha',counts).ok,true);
 const status=editorV2Status('mha',counts);
 assert.equal(status.ready,true);
 assert.deepEqual(status.issues,[]);
 const short=v2DeckReport('mha',{'MHA-1-001':4});
 assert.equal(short.ok,false);
 assert.equal(editorV2Status('mha',{'MHA-1-001':4}).ready,false);
 assert.equal(v2DeckReport('mha',{...counts,'MHA-1-001':5}).ok,false);
 const prepared=prepareSoloBattle({
  mine:{pack,counts,label:'英雄'},
  foe:{pack,counts,label:'英雄'},
  first:0,difficulty:'normal'
 });
 assert.deepEqual(prepared.decks.map(deck=>deck.title),['mha','mha']);
 const storage={data:new Map(),setItem(key,value){this.data.set(key,value);},
  getItem(key){return this.data.get(key)||null;},removeItem(key){this.data.delete(key);}};
 saveSoloBattle(storage,prepared);
 const loaded=loadSoloBattle(storage);
 assert.equal(loaded.decks.length,2);
 assert.equal(loaded.decks[0].pack.id,'mha');
 const match=newUniversalMatch(pack,{decks:[counts,counts],seed:14,first:0,openingMulligan:false});
 assert.equal(assertUniversalMatch(pack,match),true);

 const dir=await mkdtemp(join(tmpdir(),'ua-mha-release-'));
 const sql=openDatabase(join(dir,'account.sqlite'));
 const service=createService({sql,now:()=>Date.parse('2026-11-14T06:00:00Z')});
 try{
  const {token}=await service.register({username:'mharelease',password:'correct-horse-123'},{ip:'127.0.0.1'});
  const saved=await service.saveDeck(token,{name:'英雄完成卡',title:'mha',counts});
  assert.equal(saved.deck.playable,true);
  assert.equal(saved.deck.titleLabel,'我的英雄學院');
  const opened=await service.createRoom(token,{deckId:saved.deck.id,first:'me'});
  assert.ok(opened.room||opened.code||opened);
  const draft=await service.saveDeck(token,{name:'英雄草稿',title:'mha',counts:{'MHA-1-001':4}});
  assert.equal(draft.deck.playable,false);
  await assert.rejects(
   ()=>service.createRoom(token,{deckId:draft.deck.id,first:'me'}),
   error=>error?.status===400
  );
 }finally{
  sql.close();
  await rm(dir,{recursive:true,force:true});
 }
});

test('IMC stays open at 113 and its practice deck still starts',()=>{
 assert.equal(getTitle('imc').playable,true);
 assert.equal(getTitle('imc').cards.length,113);
 assert.equal(Object.keys(createImcV2Pack().cards).length,113);
 assert.equal(getTitle('bleach').playable,true);
 assert.equal(getTitle('gurren-lagann').playable,false);
 const practice=imcPracticeDeck();
 assert.deepEqual(validateUniversalDeck(practice.pack,practice.counts),[]);
 assert.equal(editorV2Status('imc',practice.counts).ready,true);
 assert.equal(v2DeckReport('imc',practice.counts).ok,true);
});
