import test from 'node:test';
import assert from 'node:assert/strict';
import {evaCatalog} from '../dist/eva/catalog.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

// Official JP print uses 黄- / 赤- for zero required energy. The same import
// that stored 紫- as 1 also stored these twelve characters as 1.
const yellowZero=['001','006','009','014','110'].map(n=>'EVA-1-'+n);
const redZero=['069','073','084','086','089','090','107'].map(n=>'EVA-1-'+n);
const zero=[...yellowZero,...redZero];
const one={yellow:'EVA-1-003',red:'EVA-1-070'};
const pack=officialV2Pack('eva');
const counts=Object.fromEntries(zero.map(id=>[id,4]));
counts[one.yellow]=1;
counts[one.red]=1;

test('EVA yellow and red catalogs keep printed zero energy, and the one-energy prints stay one',()=>{
 const catalog=evaCatalog();
 for(const id of yellowZero){
  assert.equal(catalog.byId.get(id).color,'yellow',id);
  assert.equal(catalog.byId.get(id).energy,0,id);
  assert.equal(pack.cards[id].energy,0,id);
  assert.equal(pack.cards[id].ap,1,id);
 }
 for(const id of redZero){
  assert.equal(catalog.byId.get(id).color,'red',id);
  assert.equal(catalog.byId.get(id).energy,0,id);
  assert.equal(pack.cards[id].energy,0,id);
 }
 for(const id of Object.values(one)){
  assert.equal(catalog.byId.get(id).energy,1,id);
  assert.equal(pack.cards[id].energy,1,id);
 }
});

function mainWith(id,comparison){
 let s=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:3});
 for(let i=0;i<6&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 const player=s.players[0];
 for(const ap of player.apCards){ap.inPlay=true;ap.ready=true;}
 for(const cardId of [id,comparison]){
  if(player.hand.some(c=>c.cardId===cardId))continue;
  const zone=['deck','life'].find(z=>player[z].some(c=>c.cardId===cardId));
  assert.ok(zone,cardId);
  player.hand.push(player[zone].splice(player[zone].findIndex(c=>c.cardId===cardId),1)[0]);
 }
 return s;
}

for(const id of zero)test(id+' can enter an empty energy line for one AP',()=>{
 const comparison=yellowZero.includes(id)?one.yellow:one.red;
 let s=mainWith(id,comparison);
 const player=s.players[0];
 assert.ok(player.energy.every(c=>!c));
 const uid=player.hand.find(c=>c.cardId===id).uid;
 const paidUid=player.hand.find(c=>c.cardId===comparison).uid;
 const before=player.apCards.filter(a=>a.inPlay&&a.ready).length;
 const legal=legalUniversalActions(pack,s);
 assert.ok(!legal.some(a=>a.type==='play'&&a.uid===paidUid),'one-energy character must remain unavailable');
 const play=legal.find(a=>a.type==='play'&&a.uid===uid&&a.line==='energy'&&a.slot===0);
 assert.ok(play,id);
 s=dispatchUniversalAction(pack,s,play);
 assert.equal(s.players[0].energy[0]?.uid,uid);
 assert.equal(s.players[0].apCards.filter(a=>a.inPlay&&a.ready).length,before-1);
 assert.equal(assertUniversalMatch(pack,s),true);
});
