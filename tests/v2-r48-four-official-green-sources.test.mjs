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
test('R48 A: FOUR distinct official registered green EVENT cards reach OUTSIDE through LEGAL paid actions',()=>{
 const counts={...R48_GREEN_REAL_COUNTS};
 delete counts['BLC-1-090'];counts['BLC-1-095']=4;
 const packs=[pack,pack];
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:48069});
 // Real printed source cards are staged in hand; after setup EVERY movement
 // into OUTSIDE must be caused by an actual legal play, never fixture insertion.
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
 for(const id of ['BLC-1-095','BLC-1-097','BLC-1-099','BLC-1-100']){
  const c=r48Take(s,0,id);source[id]=c.uid;p.hand.push(c);
 }
 function apply(action){
  assert.ok(legalUniversalActions(packs,s).some(a=>
   JSON.stringify(a)===JSON.stringify(action)),'must use actual legal action '+JSON.stringify(action));
  s=dispatchUniversalAction(packs,s,action);
 }
 function settle(){
  let bound=18;
  while(s.pending&&bound-->0){
   const actions=legalUniversalActions(packs,s);
   const choice=actions.find(a=>a.uid!==null&&a.mode!=='skip'&&a.type!=='next')||actions[0];
   assert.ok(choice,'pending must have a legal controller action: '+s.pending.kind);
   apply(choice);
  }
  assert.ok(bound>0,'finite genuine event effect settlement');
 }
 function paid(id){
  // The true AP economy on player zero starts with only one ACTIVE AP.
  // Complete real turns, rather than forcing four paid events in one turn
  // or injecting arbitrary AP and misrepresenting a legal match.
  let option=null,steps=0;
  while(steps++<28){
   const actions=legalUniversalActions(packs,s);
   option=actions.find(a=>a.type==='event'&&a.uid===source[id]);
   if(option)break;
   const next=actions.find(a=>a.type==='next');
   assert.ok(next,'cannot legally advance to next paid event '+id);
   apply(next);settle();
  }
  assert.ok(option,'must find legal paid event over legitimate turns '+id+
   ' '+JSON.stringify({phase:s.phase,active:s.active,turn:s.turn,
    ap:s.players[0].apCards.map(c=>c.ready),
    inHand:s.players[0].hand.some(c=>c.uid===source[id]),
    energy:s.players[0].energy.map(c=>c?.cardId),
    opponentFront:s.players[1].front.map(c=>c?.cardId),
    actions:legalUniversalActions(packs,s).map(a=>a.type)}));
  apply(option);settle();
  assert.ok(s.players[0].outside.some(c=>c.uid===source[id]),
   'legally paid printed EVENT must move hand -> OWN OUTSIDE '+id);
  assert.ok(s.zoneMoveEvents.some(e=>e.uid===source[id]&&
   e.from==='hand'&&e.to==='outside'),
   'physical event movement must be present in CURRENT turn ledger '+id);
 }
 while(s.phase!=='main')apply(legalUniversalActions(packs,s).find(a=>a.type==='next'));
 paid('BLC-1-099'); // legal BP-limited opponent retirement while foe exists
 paid('BLC-1-097'); // real green EVENT: trait buff + draw
 paid('BLC-1-100'); // real green EVENT: AP reactivation
 paid('BLC-1-095'); // verified green EVENT: TOP4 0..2 + order bottom
 for(const id of ['BLC-1-095','BLC-1-097','BLC-1-099','BLC-1-100']){
  assert.ok(s.players[0].outside.some(c=>c.uid===source[id]),
   'printed event must reach OWN outside through legal use '+id);
  // zoneMoveEvents is a bounded recent-turn ledger; assert at each payment above,
  // not across all four genuine turns after historic entries expire.
 }
 assert.equal(countOwnOutsideDistinctPrintedNames(s,0,c=>pack.cards[c.cardId],
  {color:'green',types:['event','field']}),4);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
