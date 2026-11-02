import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {UA54BT_VERIFIED} from '../dist/mushoku-tensei.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {verifiedSaoV2Cards} from '../dist/universal-v2/sao-pack.mjs';
import {newUniversalMatch,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';

// Official generated energy is the pip count in the card-list alt text.
// ico_resource_energy_*3.png is two pips (alt 色色). *4.png is two pips plus
// a plus. A dash on the HTML page is not authority when the card image
// still prints pips; those Re:Zero rows were left unchanged.
// EX15BT/BLC-4-054 朽木 ルキア: required 紫3, generated 紫紫.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-054

const BLEACH={
 'BLC-4-006':2,'BLC-4-011':2,'BLC-4-014':1,'BLC-4-016':2,'BLC-4-017':2,
 'BLC-4-024':2,'BLC-4-027':2,'BLC-4-032':2,'BLC-4-037':2,'BLC-4-042':2,
 'BLC-4-051':2,'BLC-4-054':2,'BLC-4-055':2,'BLC-4-060':2,'BLC-4-063':2,
 'BLC-4-065':2,'BLC-4-071':2,'BLC-4-074':1,'BLC-4-075':2,'BLC-4-077':2
};
const SAO={
 'SAO-1-006':2,'SAO-1-016':2,'SAO-1-046':2,'SAO-1-048':2,'SAO-1-062':2,
 'SAO-1-075':2,'SAO-1-086':2,'SAO-1-095':2,'SAO-1-096':1,'SAO-1-102':2,
 'SAO-1-103':2,'SAO-1-107':2,'SAO-2-014':2,'SAO-2-038':2,'SAO-2-044':2,
 'SAO-2-046':2,'SAO-2-053':2,'SAO-2-063':2
};
const KMR={
 'KMR-2-004':2,'KMR-2-006':1,'KMR-2-008':2,'KMR-2-014':2,'KMR-2-017':1,
 'KMR-2-018':2,'KMR-2-025':2,'KMR-2-031':1,'KMR-2-038':2,'KMR-2-040':2,
 'KMR-2-045':2,'KMR-2-047':1,'KMR-2-059':2,'KMR-2-066':1,'KMR-2-067':2,
 'KMR-2-071':2,'KMR-2-075':2,'KMR-2-082':2,'KMR-2-085':2,'KMR-2-091':2,
 'KMR-2-092':1,'KMR-2-096':2
};
const STG={'STG-1-031':1,'STG-1-071':1,'STG-1-072':2,'STG-1-073':1};
const MST={
 'MST-1-010':2,'MST-1-011':1,'MST-1-013':1,'MST-1-015':1,'MST-1-019':2,
 'MST-1-023':1,'MST-1-044':2,'MST-1-045':1,'MST-1-061':1,'MST-1-064':2,
 'MST-1-078':0,'MST-1-079':0
};

test('card tables store official generated-energy pip counts',()=>{
 const bleach=createBleachV2Pack();
 for(const [id,gen] of Object.entries(BLEACH)){
  const printed=CARDS.find(c=>c.identity===id);
  assert.equal(printed.gen,gen,id);
  assert.equal(bleach.cards[id].gen,gen,id+' engine');
 }
 const sao=Object.fromEntries(verifiedSaoV2Cards().map(c=>[c.id,c]));
 for(const [id,gen] of Object.entries(SAO)){
  const rows=SAO_OFFICIAL_CARDS.filter(c=>c.id===id);
  assert.ok(rows.length>=1,id);
  assert.ok(rows.every(c=>c.gen===gen),id);
  assert.equal(sao[id].gen,gen,id+' engine');
  if(id==='SAO-2-063'||id==='SAO-1-096'||id==='SAO-1-103')assert.equal(rows[0].energy,3);
 }
 for(const [id,gen] of Object.entries(KMR))
  assert.equal(KMR2_CARDS.find(c=>c.id===id).gen,gen,id);
 for(const [id,gen] of Object.entries(STG))
  assert.equal(STEINS_GATE_CARDS.find(c=>c.id===id).gen,gen,id);
 for(const [id,gen] of Object.entries(MST))
  assert.equal(UA54BT_VERIFIED.find(c=>c.id===id).gen,gen,id);
});

test('EX15BT/BLC-4-054 produces two purple on the energy line',()=>{
 const pack=createBleachV2Pack();
 const purple=summarizeDesignatedDecks(id=>!!pack.cards[id]).find(r=>r.key==='renruki');
 const counts=designatedPlayableCounts(purple);
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:4054});
 const zones=['hand','deck','life','outside'];
 let card=null;
 for(const zone of zones){
  const list=s.players[0][zone];
  const i=list.findIndex(c=>c.cardId==='BLC-4-054');
  if(i>=0){card=list.splice(i,1)[0];break;}
 }
 assert.ok(card);
 card.ready=false;
 s.players[0].energy[0]=card;
 assert.equal(pack.cards['BLC-4-054'].energy,3);
 assert.equal(pack.cards['BLC-4-054'].gen,2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
});
