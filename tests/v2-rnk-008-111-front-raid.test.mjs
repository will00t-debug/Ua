import test from 'node:test';
import assert from 'node:assert/strict';
import {createRnkBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {entryClickPlan} from '../dist/universal-v2/preview-actions.mjs';

const pack=createRnkBattlePack(),packs=[pack,pack];
// Reproduce a rear RNK-1-111 (blue energy 2, frontForbidden) under RNK-1-008.
// All cards in this reproducible 50-card blue deck are genuine RNK prints.
const counts=Object.fromEntries(Array.from({length:12},(_,i)=>[
 'RNK-1-'+String(i+1).padStart(3,'0'),4
]));
counts['RNK-1-111']=1;
counts['RNK-1-013']=1;

function take(s,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[0][zone];
  const index=list.findIndex(c=>c.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing test card '+id);
}
function seat(s,id,line,slot){
 const c=take(s,id);
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;c.entryTurn=s.turn;
 s.players[0][line][slot]=c;
 return c;
}
function match(){
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed:8111,first:0,
  openingMulligan:false});
 for(let n=0;n<8&&s.phase!=='main';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'must enter main phase');
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');
 s.players[0].apCards[1].inPlay=true;
 s.players[0].apCards[1].ready=true;
 seat(s,'RNK-1-002','front',0);
 seat(s,'RNK-1-002','front',1);
 for(let i=0;i<3;i++)seat(s,'RNK-1-004','energy',i);
 const base=seat(s,'RNK-1-111','energy',3);
 const hiko=take(s,'RNK-1-008');
 s.players[0].hand.push(hiko);
 return {s,base,hiko};
}

test('RNK-1-008 may Raid RNK-1-111 from ENERGY to open FRONT 03 or stay behind',()=>{
 assert.equal(pack.cards['RNK-1-111'].frontForbidden,true,
  'the printed restriction is on the base, not the Raid top');
 assert.equal(pack.cards['RNK-1-008'].frontForbidden,false);
 const {s,base,hiko}=match(),legal=legalUniversalActions(packs,s);
 const raids=legal.filter(a=>a.type==='raid'&&a.uid===hiko.uid&&
  a.baseUid===base.uid);
 const front=raids.find(a=>a.line===undefined&&a.slot===2);
 const rear=raids.find(a=>a.line==='energy'&&a.slot===3);
 assert.ok(front,'front slot 03 must be a legal Raid destination');
 assert.ok(rear,'energy slot 04 must remain a legal Raid destination');
 assert.equal(entryClickPlan({selectedUid:hiko.uid,entryMode:'raid',line:'energy',
  slot:3,slotUid:base.uid,legal}).type,'raid-base');
 for(const [line,slot,action] of [['front',2,front],['energy',3,rear]]){
  const gesture=entryClickPlan({selectedUid:hiko.uid,entryMode:'raid',
   raidBaseUid:base.uid,line,slot,slotUid:line==='energy'?base.uid:null,legal});
  assert.equal(gesture.type,'entry');
  assert.deepEqual(gesture.actions,[action]);
  const result=dispatchUniversalAction(packs,s,action);
  const placed=result.players[0][line][slot];
  assert.equal(placed.cardId,'RNK-1-008');
  assert.equal(placed.ready,true);
  assert.equal(placed.stack[0].cardId,'RNK-1-111');
  assert.equal(placed.stack[0].uid,base.uid);
  assert.equal(result.players[0].energy[3],line==='energy'?placed:null);
  assert.equal(assertUniversalMatch(packs,result),true);
 }
});
