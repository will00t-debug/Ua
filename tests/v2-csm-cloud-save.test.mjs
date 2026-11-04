import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/sqlite.mjs';
import {createService} from '../server/domain.mjs';
import {TITLES} from '../dist/title-registry.mjs';

test('Chainsaw Man decks round-trip through account storage, updates and sharing',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-csm-cloud-'));
 const sql=openDatabase(join(dir,'account.sqlite'));
 const service=createService({sql,now:()=>Date.parse('2026-11-04T16:00:00Z')});
 try{
  assert.ok(TITLES.some(title=>title.id==='csm'),'Chainsaw Man is listed in the editor');
  const {token}=await service.register({username:'csmtest',password:'correct-horse-123'},{ip:'127.0.0.1'});
  const initial={name:'鏈鋸人紫色測試',title:'csm',counts:{'CSM-1-001':4},
   localId:'csm-local-1',coverId:'CSM-1-001'};
  const saved=await service.saveDeck(token,initial);
  assert.match(saved.deck.id,/^d[a-f0-9]{16}$/);
  assert.equal(saved.deck.title,'csm');
  assert.equal(saved.deck.titleLabel,'鏈鋸人');
  assert.deepEqual(saved.deck.counts,initial.counts);
  assert.equal(saved.deck.coverId,'CSM-1-001');
  assert.equal(saved.deck.playable,false,'incomplete decks can be saved without being battle-ready');

  const id=saved.deck.id;
  assert.equal((await service.listDecks(token)).decks.find(deck=>deck.id===id)?.title,'csm');
  const upsert=await service.saveDeck(token,{...initial,counts:{'CSM-1-001':3}});
  assert.equal(upsert.deck.id,id,'saving the same local deck updates the cloud record');
  const updated=await service.updateDeck(token,id,{...initial,counts:{'CSM-1-001':2}});
  assert.equal(updated.deck.id,id);
  assert.equal(updated.deck.counts['CSM-1-001'],2);
  assert.equal((await service.listDecks(token)).decks.length,1);

  const shared=await service.setDeckShare(token,id,{shared:true});
  assert.equal(shared.deck.shared,true);
  assert.equal((await service.listSharedDecks(token)).decks.some(deck=>deck.id===id),true);
  await assert.rejects(
   service.saveDeck(token,{...initial,title:'not-a-real-title'}),
   error=>error?.status===400
  );
 }finally{
  sql.close();
  await rm(dir,{recursive:true,force:true});
 }
});
