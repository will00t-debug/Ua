// Shared EX06BT sentences. These fixtures are not the printed cards.
// B/C/D attach the same fields to a card only when the rest of its sentence
// is also complete. Set 1 and the 29 ready set-2 cards stay as they are.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createMha2Pack} from '../dist/universal-v2/mha2-pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalBp, universalEnergyByColor, zoneRequiredEnergy
} from '../dist/universal-v2/engine.mjs';

const TRAIT='ワン・フォー・オール';
const NAMES={
 kind:'ownDistinctTraitNames', turn:'any', zone:'fieldOutside',
 trait:TRAIT, min:3, excludeSelf:false
};
function card(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'yellow',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??2000, gen:extra.gen??1, traits:extra.traits||[],
  trigger:null, implementation:extra.implementation||'dsl',
  effects:extra.effects||{}, ...extra
 };
}
const bodies=[
 card({id:'GEN', name:'發生', gen:1, passiveBonuses:[{
  extraEnergy:1, condition:NAMES
 }]}),
 card({id:'AURA', name:'氣勢', bp:2000, passiveBonuses:[{
  bpEach:500, condition:{...NAMES, turn:'own', min:1}
 }]}),
 card({id:'COST', name:'費用', energy:4, ap:1, distinctNameHandEnergy:{trait:TRAIT, per:1}}),
 card({id:'BILL', name:'事件費', type:'event', energy:6, ap:1, gen:0, bp:0,
  distinctNameHandEnergy:{trait:TRAIT, per:1}}),
 card({id:'BAN', name:'限制', energy:0, ap:1, raidName:'緑谷 出久',
  playBanOtherTrait:{trait:'A組', exceptName:'緑谷 出久'}}),
 card({id:'GUEST', name:'客人', energy:1, ap:1,
  playBanOtherTrait:{trait:'A組', exceptName:'緑谷 出久'}}),
 card({id:'CALL', name:'召喚', energy:0, effects:{onPlay:[{
  op:'deployOutsideRest', name:'客人', color:'yellow', energy:1, ap:1, optional:true
 }]}}),
 card({id:'DEKU', name:'緑谷 出久', traits:['A組',TRAIT], implementation:'vanilla'}),
 card({id:'DEKU2', name:'緑谷 出久', traits:['A組',TRAIT], implementation:'vanilla'}),
 card({id:'IIDA', name:'飯田 天哉', traits:['A組',TRAIT], implementation:'vanilla'}),
 card({id:'BAKU', name:'爆豪 勝己', traits:['A組',TRAIT], implementation:'vanilla'}),
 card({id:'PLAIN', name:'路人', implementation:'vanilla'})
];
for(let n=1;n<=24;n++)
 bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n, implementation:'vanilla', effects:{}}));
const pack=createUniversalPack({id:'mha-shared', version:'mha-shared', cards:bodies});

function open(seed){
 const deck={};
 for(const id of Object.keys(pack.cards))deck[id]=1;
 for(let n=1;n<=14;n++)deck['FILL-'+String(n).padStart(2,'0')]=2;
 let total=Object.values(deck).reduce((sum,n)=>sum+n,0);
 for(const id of Object.keys(deck)){
  if(total<=50)break;
  if(!id.startsWith('FILL-'))continue;
  deck[id]-=Math.min(deck[id], total-50);
  total=Object.values(deck).reduce((sum,n)=>sum+n,0);
  if(deck[id]===0)delete deck[id];
 }
 let s=newUniversalMatch(pack,{decks:[deck,deck], seed, first:0, openingMulligan:false});
 for(let i=0;i<8&&(s.phase!=='main'||s.active!==0);i++)
  s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','life','outside','removed']){
  const index=pl[zone].findIndex(c=>c?.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const slot=pl[line].findIndex(c=>c?.cardId===id);
  if(slot>=0){const body=pl[line][slot];pl[line][slot]=null;return body;}
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 const occupant=s.players[p][line][slot];
 if(occupant){s.players[p][line][slot]=null;s.players[p].removed.push(occupant);}
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=body;
 return body;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function placeOutside(s,id,p=0){
 const body=pull(s,p,id);
 s.players[p].outside.push(body);
 return body;
}
function clearLines(s,p){
 for(const line of ['front','energy']){
  for(let slot=0;slot<s.players[p][line].length;slot++){
   const body=s.players[p][line][slot];
   if(!body)continue;
   s.players[p][line][slot]=null;
   s.players[p].removed.push(body);
  }
 }
}
function plays(s,id){
 return legalUniversalActions(pack,s).filter(action=>
  (action.type==='play'||action.type==='raid'||action.type==='event')&&
  s.players[0].hand.some(card=>card.uid===action.uid&&card.cardId===id));
}

test('three distinct One For All names add one generated energy',()=>{
 const s=open(1);
 clearLines(s,0);
 const gen=seat(s,0,'GEN','energy',0,true);
 seat(s,0,'DEKU','front',0,true);
 seat(s,0,'IIDA','front',1,true);
 assert.equal(universalEnergyByColor(pack,s,0).yellow,1);
 placeOutside(s,'BAKU');
 assert.equal(universalEnergyByColor(pack,s,0).yellow,2);
 placeOutside(s,'PLAIN');
 assert.equal(universalEnergyByColor(pack,s,0).yellow,2);
 assert.equal(universalBp(pack,s,gen),2000);
});

test('each distinct One For All name adds 500 BP on your turn only',()=>{
 const s=open(2);
 clearLines(s,0);
 const aura=seat(s,0,'AURA','front',0,true);
 seat(s,0,'DEKU','energy',0,true);
 placeOutside(s,'DEKU2');
 assert.equal(universalBp(pack,s,aura),2500);
 placeOutside(s,'IIDA');
 assert.equal(universalBp(pack,s,aura),3000);
 let guard=0;
 let foe=s;
 while(!(foe.active===1&&foe.phase==='main'&&!foe.pending)){
  if(foe.pending?.kind==='block')foe=dispatchUniversalAction(pack,foe,{type:'chooseBlock',uid:null});
  else foe=dispatchUniversalAction(pack,foe,{type:'next'});
  if(++guard>24)throw Error('stuck');
 }
 const live=foe.players[0].front.find(card=>card?.cardId==='AURA');
 assert.equal(universalBp(pack,foe,live),2000);
});

test('each distinct One For All name cuts hand energy and leaves AP in place',()=>{
 const s=open(3);
 clearLines(s,0);
 seat(s,0,'DEKU','front',0,true);
 placeOutside(s,'DEKU2');
 const cost=pack.cards.COST;
 const bill=pack.cards.BILL;
 assert.equal(zoneRequiredEnergy(pack,s,0,cost,'hand'),3);
 assert.equal(zoneRequiredEnergy(pack,s,0,bill,'hand'),5);
 assert.equal(zoneRequiredEnergy(pack,s,0,bill,'life'),6);
 seat(s,0,'IIDA','front',1,true);
 const hidden=placeOutside(s,'BAKU');
 hidden.faceDown=true;
 assert.equal(zoneRequiredEnergy(pack,s,0,cost,'hand'),2);
 hidden.faceDown=false;
 assert.equal(zoneRequiredEnergy(pack,s,0,cost,'hand'),1);
 const body=hold(s,'COST');
 seat(s,0,'GEN','energy',1,true);
 s.players[0].apCards.forEach(ap=>{ap.inPlay=true;ap.ready=false;});
 assert.equal(plays(s,'COST').length,0);
 s.players[0].apCards[0].ready=true;
 assert.equal(plays(s,'COST').some(action=>action.type==='play'),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('another A-class blocks hand play and hand raid, not an outside effect entry',()=>{
 const s=open(4);
 clearLines(s,0);
 const deku=seat(s,0,'DEKU','front',0,true);
 const iida=seat(s,0,'IIDA','front',1,true);
 hold(s,'BAN');
 s.players[0].apCards.forEach(ap=>{ap.inPlay=true;ap.ready=true;});
 assert.equal(plays(s,'BAN').length,0);
 assert.throws(()=>dispatchUniversalAction(pack,s,{
  type:'play', uid:s.players[0].hand.find(card=>card.cardId==='BAN').uid,
  line:'front', slot:2
 }));
 iida.ready=false;
 s.players[0].front[1]=null;
 s.players[0].removed.push(iida);
 assert.equal(plays(s,'BAN').some(action=>action.type==='play'),true);
 assert.equal(plays(s,'BAN').some(action=>action.type==='raid'&&action.baseUid===deku.uid),true);

 const again=open(5);
 clearLines(again,0);
 seat(again,0,'IIDA','front',0,true);
 const guestHand=hold(again,'GUEST');
 again.players[0].apCards.forEach(ap=>{ap.inPlay=true;ap.ready=true;});
 assert.equal(plays(again,'GUEST').length,0);
 again.players[0].hand=again.players[0].hand.filter(card=>card.uid!==guestHand.uid);
 again.players[0].outside.push(guestHand);
 hold(again,'CALL');
 let entered=dispatchUniversalAction(pack,again,legalUniversalActions(pack,again).find(action=>
  action.type==='play'&&again.players[0].hand.some(card=>card.uid===action.uid&&card.cardId==='CALL')&&
  action.line==='energy'));
 assert.equal(entered.pending.kind,'effect-outside-rest');
 const guest=entered.players[0].outside.find(card=>card.cardId==='GUEST');
 assert.equal(entered.pending.choices.includes(guest.uid),true);
 entered=dispatchUniversalAction(pack,entered,{
  type:'chooseOutsideRest', uid:guest.uid, line:'front', slot:1
 });
 assert.equal(entered.players[0].front[1].cardId,'GUEST');
 assert.equal(entered.players[0].front[1].ready,false);
 assert.equal(assertUniversalMatch(pack,entered),true);
});

test('set 1 stays 109 and the finished set 2 pack stays 59',()=>{
 assert.equal(Object.keys(createMhaV2Pack().cards).length,109);
 assert.equal(Object.keys(createMha2Pack().cards).length,59);
 assert.equal(createMha2Pack().cards['MHA-2-052'].id,'MHA-2-052');
 assert.equal(createMha2Pack().cards['MHA-2-055'].id,'MHA-2-055');
 assert.equal(createMha2Pack().cards['MHA-2-063'].id,'MHA-2-063');
});
