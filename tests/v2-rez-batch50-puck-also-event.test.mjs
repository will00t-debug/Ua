import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-001','REZ-2-011','REZ-2-004','REZ-2-027','REZ-2-055','REZ-2-014',
 'REZ-2-033','REZ-2-035','REZ-2-041','REZ-2-049','REZ-2-037','REZ-2-056','REZ-2-005'
],'REZ-2-005');

test('REZ-2-001 is still a character, counts as an event, and only retires from energy',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-001'].effectJa,/全ての場所でイベントカードとしても扱う/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-001'].effectJa,/必要エナジーが0の黄の〈エミリア〉/);
 assert.equal(rez.cards['REZ-2-001'].type,'character');
 assert.equal(rez.cards['REZ-2-001'].alsoEvent,true);
 assert.equal(rez.cards['REZ-2-001'].mainAbility.op,'energyRestRetireThen');
 let s=fresh(deck,3001);
 const puck=take(s,0,'REZ-2-001');puck.ready=true;s.players[0].front[0]=puck;
 const yellow=take(s,0,'REZ-2-011');
 const purple=take(s,0,'REZ-2-027');
 const green=take(s,0,'REZ-2-055');
 s.players[0].outside.push(yellow,purple,green);
 s=toPhase(rezPacks,s,'main');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===puck.uid),false);
 s.players[0].front[0]=null;s.players[0].energy[0]=puck;
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===puck.uid);
 assert.equal(act.mode,'energyRestRetire');
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===puck.uid));
 assert.ok([yellow,purple,green].every(c=>s.players[0].outside.some(x=>x.uid===c.uid)));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('two outside Puck cards raise Emilia event discount the same way printed events do',()=>{
 let s=fresh(deck,3002);
 for(let i=0;i<3;i++){
  const ram=take(s,0,'REZ-2-004');ram.ready=true;s.players[0].energy[i]=ram;
 }
 const first=take(s,0,'REZ-2-001');const second=take(s,0,'REZ-2-001');
 s.players[0].outside.push(first,second);
 const emilia=take(s,0,'REZ-2-011');s.players[0].hand.push(emilia);
 s=toPhase(rezPacks,s,'main');
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===emilia.uid);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='event'&&a.uid===emilia.uid),false);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 const grant=s.continuousStates.find(e=>e.kind==='nextEligibleHandPlayApDiscount');
 assert.equal(grant.filter.cardType,'event');
 assert.equal(grant.filter.printedRequiredEnergyAtMost,2);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('energy REST retire can put a yellow energy-0 Emilia onto energy rested',()=>{
 const filler=(n)=>({id:'F'+n,name:'F'+n,type:'character',color:'yellow',energy:0,ap:1,bp:1000,gen:1,implementation:'vanilla'});
 const pack=createUniversalPack({id:'puck-fixture',cards:[
  ...Array.from({length:11},(_,n)=>filler(n)),
  {id:'P',name:'パック',type:'character',color:'yellow',energy:0,ap:1,bp:500,gen:1,
   implementation:'dsl',alsoEvent:true,effects:{},mainAbility:{
    op:'energyRestRetireThen',then:[{op:'deployOutsideNameColorEnergy',name:'エミリア',
     color:'yellow',maxEnergy:0,line:'energy',optional:true}]}},
  {id:'E',name:'エミリア',type:'character',color:'yellow',energy:0,ap:1,bp:1500,gen:1,implementation:'vanilla'}
 ]});
 const counts=Object.fromEntries(Object.keys(pack.cards).map((id,i)=>[id,i===0?2:4]));
 let s=newUniversalMatch([pack,pack],{decks:[counts,counts],seed:7,first:0});
 const takeId=(id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[0][zone],at=pile.findIndex(c=>c.cardId===id);
   if(at>=0)return pile.splice(at,1)[0];
  }
  throw Error(id);
 };
 const puck=takeId('P');puck.ready=true;s.players[0].energy[0]=puck;
 const emilia=takeId('E');s.players[0].outside.push(emilia);
 s=toPhase([pack,pack],s,'main');
 s=dispatchUniversalAction([pack,pack],s,legalUniversalActions([pack,pack],s)
  .find(a=>a.type==='activate'&&a.uid===puck.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.deepEqual(s.pending.choices,[emilia.uid]);
 const enter=legalUniversalActions([pack,pack],s).find(a=>a.uid===emilia.uid&&a.line==='energy');
 s=dispatchUniversalAction([pack,pack],s,enter,{actor:0});
 assert.equal(s.players[0].energy.find(c=>c?.uid===emilia.uid).ready,false);
 assert.equal(s.players[0].front.some(c=>c?.uid===emilia.uid),false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch([pack,pack],s),true);
});
