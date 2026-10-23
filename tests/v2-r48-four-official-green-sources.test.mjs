// R48 Batch A: four OFFICIAL, already registered green EVENT/FIELD printed names.
// Full 50 real cards only; this fixture does not authorize BLC-4-069 itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';
import {countOwnOutsideDistinctPrintedNames} from '../dist/universal-v2/field-conditions.mjs';

export const R48_GREEN_REAL_COUNTS=Object.freeze({
 ...Object.fromEntries(Object.entries(BLEACH_GREEN_V2_COUNTS).filter(([id])=>id!=='BLC-4-061')),
 'BLC-1-099':4
});
export const R48_GREEN_FOUR_SOURCES=Object.freeze([
 ['BLC-1-094','尸魂界','field','UA08BT/BLC-1-094'],
 ['BLC-1-097','隊首羽織','event','UA08BT/BLC-1-097'],
 ['BLC-1-099','天地灰尽','event','UA08BT/BLC-1-099'],
 ['BLC-1-100','卍解','event','UA08BT/BLC-1-100']
]);
const pack=registeredV2TitlePack('bleach');
test('R48 A: legally buildable BLEACH real fifty has FOUR distinct official GREEN outside sources',()=>{
 const deck={...R48_GREEN_REAL_COUNTS};
 assert.equal(Object.values(deck).reduce((a,b)=>a+b,0),50);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 assert.ok(Object.keys(deck).every(id=>pack.cards[id]&&
  pack.cards[id].color==='green'&&!id.includes('TEST')));
 const sourceNames=new Set();
 for(const [id,name,type,number] of R48_GREEN_FOUR_SOURCES){
  const original=CARDS.find(c=>c.identity===id),card=pack.cards[id];
  assert.ok(original&&card,'source must already be fully registered: '+id);
  assert.equal(original.number,number);
  assert.equal(original.nameJa,name);
  assert.equal(card.name,name);
  assert.equal(card.type,type);
  assert.equal(card.color,'green');
  assert.ok(deck[id]>0);
  assert.ok(original.source.includes('unionarena-tcg.com/jp/cardlist/'));
  sourceNames.add(card.name);
 }
 assert.equal(sourceNames.size,4,'four physical copies of one printed name never qualify');
 assert.equal(deck['BLC-1-100'],2);
 assert.equal(deck['BLC-1-099'],4);
});
test('R48 A: distinct PRINTED name outside counter rejects duplicates, wrong type and color',()=>{
 const p={outside:[]},lookup=c=>pack.cards[c.cardId];
 const rule={color:'green',types:['event','field'],minDistinctNames:4};
 // The existing canonical counter is tested against actual registered definitions,
 // with physical instances representative of real moves, NOT synthetic card IDs.
 const physical=(id,n)=>({uid:'0-'+n,cardId:id});
 R48_GREEN_FOUR_SOURCES.forEach(([id],i)=>p.outside.push(physical(id,i)));
 // See countOwnOutsideDistinctPrintedNames signature: state owns both players.
 const s={players:[p,{outside:[]}]};
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),4);
 p.outside[3]=physical('BLC-1-100',5);
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
 p.outside[3]=physical('BLC-2-049',6); // Registered BLUE event, same printed name.
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
 p.outside[3]=physical('BLC-1-071',7); // GREEN character is not EVENT/FIELD.
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
 s.players[1].outside.push(physical('BLC-1-100',8));
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
});
