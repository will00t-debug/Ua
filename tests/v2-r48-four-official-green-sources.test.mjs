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
 p.outside[2]=physical('BLC-1-100',5);
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
 p.outside[2]=physical('BLC-2-049',6); // Registered BLUE event, same printed name.
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
 p.outside[2]=physical('BLC-1-071',7); // GREEN character is not EVENT/FIELD.
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
 s.players[1].outside.push({uid:'1-8',cardId:'BLC-1-100'});
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,lookup,rule),3);
});


import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

function r48Take(s,owner,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[owner][zone],i=cards.findIndex(c=>c.cardId===id);
  if(i>=0)return cards.splice(i,1)[0];
 }
 throw Error('Missing existing physical printed card '+owner+'/'+id);
}
test('R48 A: three official events reach OUTSIDE, legal FIELD replacement goes REMOVED (Q2337 blocker)',()=>{
 const counts={...R48_GREEN_REAL_COUNTS},packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:48069});
 // Arrange a deterministic REAL 50-card game fixture. Genuine events go to
 // OUTSIDE, but the only registered GREEN FIELD cannot be retired via this deck.
 // Replacement goes to REMOVED; never count it as OUTSIDE.
 const p=s.players[0];
 for(let i=0;i<4;i++){
  const c=r48Take(s,0,'BLC-1-068');
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  p.energy[i]=c;
 }
 const foe=r48Take(s,1,'BLC-1-071');
 foe.ready=true;foe.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=foe;
 const source={};
 for(const id of ['BLC-1-094','BLC-1-097','BLC-1-099','BLC-1-100','BLC-1-071']){
  const c=r48Take(s,0,id);source[id]=c.uid;p.hand.push(c);
 }
 function apply(action){
  const allowed=legalUniversalActions(packs,s);
  assert.ok(allowed.some(a=>JSON.stringify(a)===JSON.stringify(action)),
   'must be actual legal action '+JSON.stringify(action));
  s=dispatchUniversalAction(packs,s,action);
 }
 function settle(){
  let bound=12;
  while(s.pending&&bound-->0){
   const actions=legalUniversalActions(packs,s);
   // A required enemy retirement and AP reactivation use the real chooser.
   const choice=actions.find(a=>a.uid!==null&&a.mode!=='skip'&&a.type!=='next')||actions[0];
   assert.ok(choice,'pending must have a legal controller action: '+s.pending.kind);
   apply(choice);
  }
  assert.ok(bound>0,'effect settlement bounded and finite');
 }
 function paid(id,line,slot){
  const action=legalUniversalActions(packs,s).find(a=>
   a.uid===source[id]&&(line===undefined?a.type==='event':
    a.type==='play'&&a.line===line&&a.slot===slot));
  assert.ok(action,'must be legal paid use of registered '+id+' '+JSON.stringify({phase:s.phase,active:s.active,pending:s.pending,ap:s.players[0].apCards.map(a=>a.ready),hand:s.players[0].hand.map(c=>c.cardId),energy:s.players[0].energy.map(c=>c?.cardId),actions:legalUniversalActions(packs,s).filter(a=>a.uid===source[id])}));
  apply(action);settle();
 }
 // Advance with normal phase actions, then perform all five paid uses.
 while(s.phase!=='main')apply(legalUniversalActions(packs,s).find(a=>a.type==='next'));
 paid('BLC-1-094','energy',0);   // genuine FIELD on-play; remains ENERGY
 paid('BLC-1-071','energy',0);   // legal overwrite sends FIELD to REMOVED, not OUTSIDE
 paid('BLC-1-100',undefined,undefined); // FINAL EVENT, recover REST AP
 paid('BLC-1-097',undefined,undefined); // EVENT, BP buff and draw
 paid('BLC-1-099',undefined,undefined); // EVENT, legal enemy retirement
 for(const id of ['BLC-1-097','BLC-1-099','BLC-1-100'])
  assert.ok(p.outside.some(c=>c.cardId===id),
   'EVENT must actually be paid and resolve into OUTSIDE: '+id);
 assert.ok(p.removed.some(c=>c.cardId==='BLC-1-094'),
  'FIELD replacement is rule removal, NEVER an outside card');
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,c=>pack.cards[c.cardId],
  {color:'green',types:['event','field']}),3);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===source['BLC-1-094']&&
  e.from==='energy'&&e.to==='removed'));
 assert.ok(!s.zoneMoveEvents.some(e=>e.uid===source['BLC-1-094']&&e.to==='outside'));
 for(const id of ['BLC-1-097','BLC-1-099','BLC-1-100'])
  assert.ok(s.zoneMoveEvents.some(e=>e.uid===source[id]&&e.to==='outside'));
});
