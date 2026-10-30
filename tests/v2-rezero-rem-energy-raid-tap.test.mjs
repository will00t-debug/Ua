import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rezDeck,toPhase} from './helpers/rez-v2-match.mjs';
import {createRezeroBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {boardEntrySelection,entryClickPlan} from '../dist/universal-v2/preview-actions.mjs';

const ids=[
 'REZ-1-048','REZ-1-049','REZ-1-060','REZ-1-051','REZ-1-052','REZ-1-053',
 'REZ-1-041','REZ-1-047','REZ-1-054','REZ-1-056','REZ-1-059','REZ-1-110','REZ-1-055'
];
const counts=rezDeck(ids,'REZ-1-055');
const rez=createRezeroBattlePack(),rezPacks=[rez,rez];
const fresh=(decks,seed)=>newUniversalMatch(rezPacks,{decks:[decks,decks],seed,first:0});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone],i=pile.findIndex(c=>c.cardId===id);
  if(i>=0)return pile.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function setupRem(id){
 let s=fresh(counts,id==='REZ-1-051'?5101:5301);
 const base=take(s,0,'REZ-1-048');
 base.ready=false;base.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=base;
 for(const [i,energyId] of ['REZ-1-041','REZ-1-047','REZ-1-054'].entries()){
  const card=take(s,0,energyId);card.ready=true;card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i+1]=card;
 }
 const rem=take(s,0,id);s.players[0].hand.push(rem);
 s=toPhase(rezPacks,s,'main');
 const legal=legalUniversalActions(rezPacks,s).filter(a=>a.type==='raid'&&
   a.uid===rem.uid&&a.baseUid===base.uid);
 return {s,base,rem,legal};
}
for(const id of ['REZ-1-051','REZ-1-053']){
 test(id+' 5/1 Rem from rear base offers both stay ENERGY and enter FRONT',()=>{
  assert.equal(rez.cards[id].raidName,'レム');
  assert.equal(rez.cards[id].energy,5);assert.equal(rez.cards[id].ap,1);
  const {s,base,rem,legal}=setupRem(id);
  assert.ok(legal.some(a=>a.line==='energy'&&a.slot===0),'must offer legal Raid staying on ENERGY');
  assert.ok(legal.some(a=>a.line===undefined&&a.slot===0),'must offer Raid moving to FRONT');
  const legalAll=legalUniversalActions(rezPacks,s);
  assert.equal(boardEntrySelection(legalAll,rem.uid).raid.length>=2,true);
  const chosen=entryClickPlan({selectedUid:rem.uid,entryMode:'raid',line:'energy',
   slot:0,slotUid:base.uid,legal:legalAll});
  assert.deepEqual(chosen,{type:'raid-base',baseUid:base.uid});
  const rear=entryClickPlan({selectedUid:rem.uid,entryMode:'raid',raidBaseUid:base.uid,
   line:'energy',slot:0,slotUid:base.uid,legal:legalAll});
  assert.equal(rear.type,'entry');
  assert.equal(rear.actions.length,1);
  assert.equal(rear.actions[0].line,'energy');
  const front=entryClickPlan({selectedUid:rem.uid,entryMode:'raid',raidBaseUid:base.uid,
   line:'front',slot:0,slotUid:null,legal:legalAll});
  assert.equal(front.type,'entry');
  assert.equal(front.actions.length,1);
  assert.equal(front.actions[0].baseUid,base.uid);
  for(const [move,action] of [['rear',rear.actions[0]],['front',front.actions[0]]]){
   const out=dispatchUniversalAction(rezPacks,s,action,{actor:0});
   const entered=move==='rear'?out.players[0].energy[0]:out.players[0].front[0];
   assert.equal(entered.cardId,id);
   assert.equal(entered.ready,true);
   assert.equal(entered.stack[0].uid,base.uid);
   assert.equal(move==='rear'?out.players[0].front[0]:out.players[0].energy[0],null);
   assert.equal(assertUniversalMatch(rezPacks,out),true);
  }
 });
}
test('selecting a rear base never permits another base or an occupied destination',()=>{
 const {s,base,rem}=setupRem('REZ-1-051');
 const legal=legalUniversalActions(rezPacks,s);
 const wrong=entryClickPlan({selectedUid:rem.uid,entryMode:'raid',raidBaseUid:base.uid,
  line:'front',slot:0,slotUid:'other-card',legal});
 assert.equal(wrong.type,'entry-wait');
 const invalid=entryClickPlan({selectedUid:rem.uid,entryMode:'raid',line:'energy',
  slot:2,slotUid:s.players[0].energy[2].uid,legal});
 assert.equal(invalid.type,'entry-wait');
});
test('solo and online click handlers both select an energy-line Raid base before dispatch',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 const online=readFileSync(new URL('../dist/online.mjs',import.meta.url),'utf8');
 for(const source of [preview,online]){
  assert.match(source,/plan\.type==='raid-base'/);
  assert.match(source,/raidBaseUid/);
  assert.match(source,/突襲留後線/);
  assert.match(source,/raid-base/);
 }
 assert.match(preview,/app\.raidBaseUid=plan\.baseUid/);
 assert.match(online,/raidBaseUid:plan\.baseUid/);
 assert.match(online,/raidBaseUid:pick\.raidBaseUid\|\|null/);
});
