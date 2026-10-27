import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {rez} from './helpers/rez-v2-match.mjs';

const body={color:'yellow',type:'character',energy:0,ap:1,bp:2000,gen:1,trigger:null,traits:[]};
const filler=id=>({id,name:id,...body,implementation:'vanilla',effects:{}});

function raidPack(){
 return createUniversalPack({id:'rez-007-fixture',cards:[
  {id:'BASE',name:'レム',...body,implementation:'dsl',effects:{onRaided:[
   {op:'drawIfAllOwnFieldNamed',name:'レム',count:1}]}},
  {id:'TOP',name:'レム',...body,raidName:'レム',implementation:'dsl',effects:{onPlay:[
   {op:'draw',count:1}]}},
  {id:'OTHER',name:'ラム',...body,implementation:'vanilla',effects:{}},
  {id:'ALIAS',name:'仮レム',...body,implementation:'dsl',effects:{},nameAliases:['レム']},
  {id:'PLOT',name:'場',color:'yellow',type:'field',energy:0,ap:1,bp:0,gen:0,trigger:null,
   implementation:'vanilla',effects:{}},
  ...Array.from({length:8},(_,i)=>filler('Y'+i))
 ]});
}

function counts(){
 const ids=['BASE','TOP','OTHER','ALIAS','PLOT',...Array.from({length:8},(_,i)=>'Y'+i)];
 const deck=Object.fromEntries(ids.map(id=>[id,4]));
 deck.Y7=2;
 return deck;
}

function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}

function toMain(pack,s){
 let guard=0;
 while(s.phase!=='main'){
  if(s.pending)throw Error(s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'},{actor:0});
  if(++guard>6)throw Error('no main');
 }
 return s;
}

test('REZ-2-007 draws on Raid only when every visible own character is Rem',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-007'].effectJa,/全て〈レム〉/);
 assert.deepEqual(rez.cards['REZ-2-007'].effects.onRaided,
  [{op:'drawIfAllOwnFieldNamed',name:'レム',count:1}]);
 assert.throws(()=>createUniversalPack({id:'rez-007-bad',cards:[{
  id:'BASE',name:'レム',...body,implementation:'dsl',effects:{onRaided:[
   {op:'drawIfAllOwnFieldNamed',name:'レム',count:2}]}}]}),/all-named/);
 const pack=raidPack(),decks=[counts(),counts()];
 function raid({other=false,alias=false,bury=false,field=false}={}){
  let s=newUniversalMatch([pack,pack],{decks,seed:2007,first:0});
  const base=take(s,'BASE');base.ready=true;base.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[0]=base;
  if(other){
   const ram=take(s,'OTHER');ram.ready=true;ram.fieldEntryStamp=s.nextFieldEntryStamp++;
   s.players[0].front[1]=ram;
  }
  if(alias){
   const named=take(s,'ALIAS');named.ready=true;named.fieldEntryStamp=s.nextFieldEntryStamp++;
   if(bury){
    const buried=take(s,'OTHER');buried.ready=false;named.stack=[buried];
   }
   s.players[0].energy[0]=named;
  }
  if(field){
   const plot=take(s,'PLOT');plot.ready=true;plot.fieldEntryStamp=s.nextFieldEntryStamp++;
   s.players[0].energy[1]=plot;
  }
  const top=take(s,'TOP');s.players[0].hand.push(top);
  s=toMain([pack,pack],s);
  const hand=s.players[0].hand.length;
  const marker=s.players[0].deck.slice(0,2).map(c=>c.uid);
  const action=legalUniversalActions([pack,pack],s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
  assert.ok(action);
  s=dispatchUniversalAction([pack,pack],s,action,{actor:0});
  assert.equal(s.pending.kind,'raid-effect-order');
  s=dispatchUniversalAction([pack,pack],s,{type:'chooseRaidOrder',mode:'baseFirst'},{actor:0});
  // The raider leaves the hand. All-Rem draws twice (onRaided plus onPlay);
  // a visible non-Rem leaves only the raider's onPlay draw.
  const entered=marker.filter(uid=>s.players[0].hand.some(c=>c.uid===uid));
  return {s,hand,entered};
 }
 const allRem=raid({field:true});
 assert.equal(allRem.entered.length,2);
 assert.equal(allRem.s.players[0].hand.length,allRem.hand+1);
 assert.equal(allRem.s.players[0].front[0].stack.length,1);
 const mixed=raid({other:true});
 assert.equal(mixed.entered.length,1);
 assert.equal(mixed.s.players[0].hand.length,mixed.hand);
 const aliased=raid({alias:true,bury:true});
 assert.equal(aliased.entered.length,2);
 assert.equal(assertUniversalMatch([pack,pack],allRem.s),true);
 assert.equal(assertUniversalMatch([pack,pack],mixed.s),true);
 assert.equal(assertUniversalMatch([pack,pack],aliased.s),true);
});
